#!/usr/bin/env python3
"""Claude Code hook'u: olayi .claude/ofis/durum.json dosyasina yazar. Ofis sayfasi bu dosyayi okur.

Kurallar:
- Yalnizca standart kutuphane.
- Ekrana hicbir sey yazmaz (SessionStart / UserPromptSubmit cikisi baglama eklenebilir), hata olsa bile 0 ile cikar.
- Durum "tahmin" degil, gelen olayin soyledigi neyse odur. Gelmeyen olay icin hicbir sey uydurulmaz:
  sayfa, uzun suredir sinyal gelmeyen "calisiyor" masasini "bilinmiyor" diye gosterir.
- Dosyada istek metni ve ajan cevabinin yalnizca kisaltilmis hali durur; dosya git'e girmez.

Yapi:
  desks.ana      ana oturum
  agents[id]     her alt ajan KIMLIGIYLE ayri kayit (tur, durum, son is, saat). Masaya cevirme isini sayfa yapar:
                 agents.json'da tanimli turler kendi masasina, digerleri "Diger ajanlar" masasina gider.
  pending[tur]   Agent aracina verilen gorev metinleri; SubagentStart gelince sirayla eslesir.
"""
import fcntl
import json
import os
import re
import sys
import time

DIR = os.environ.get("CV_OFIS_DIR") or os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(DIR, "durum.json")
LOCK = os.path.join(DIR, ".durum.lock")
MAIN = "ana"
MAX_LOG = 40
MAX_AGENTS = 30
DEFAULT_TYPE = "general-purpose"
ID_RE = re.compile(r"^[0-9a-f]{8,}$")


def clip(s, n=140):
    s = " ".join(str(s or "").split())
    return s if len(s) <= n else s[: n - 1] + "…"


def load():
    try:
        with open(FILE, encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save(d):
    tmp = FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)
    os.replace(tmp, FILE)


def desk(d, key, name=None):
    desks = d.setdefault("desks", {})
    x = desks.setdefault(key, {"name": name or key, "status": "bilinmiyor", "last": "", "at": 0, "seen": 0})
    if name:
        x["name"] = name
    return x


def agent(d, key, atype):
    ag = d.setdefault("agents", {})
    x = ag.setdefault(key, {"type": "", "status": "bilinmiyor", "last": "", "at": 0, "seen": 0})
    if atype:
        x["type"] = atype
        x.pop("inferred", None)
    return x


def migrate(d):
    """Eski bicim: her ajan kendi masasiydi. Ana oturum disindaki calismis masalari agents'a tasir."""
    desks = d.get("desks") or {}
    for k in [k for k in desks if k != MAIN]:
        v = desks.pop(k)
        if v.get("at"):
            d.setdefault("agents", {}).setdefault(k, {
                "type": "" if ID_RE.match(k) else k, "status": v.get("status", "bilinmiyor"),
                "last": v.get("last", ""), "at": v.get("at", 0), "seen": v.get("seen", 0)})


def prune(d):
    ag = d.get("agents") or {}
    if len(ag) > MAX_AGENTS:
        for k in sorted(ag, key=lambda k: ag[k].get("at", 0))[: len(ag) - MAX_AGENTS]:
            del ag[k]


def apply(d, ev, now):
    migrate(d)
    name = ev.get("hook_event_name", "")
    aid, atype = ev.get("agent_id"), ev.get("agent_type")
    tool = ev.get("tool_name") or ""
    if aid or atype:
        who, label = agent(d, aid or atype, atype), (atype or aid)
    else:
        who, label = desk(d, MAIN, "Claude (ana oturum)"), MAIN

    if name == "SessionStart":
        who.update(status="bosta", last="Oturum başladı", at=now, seen=now)
    elif name == "UserPromptSubmit":
        who.update(status="calisiyor", last="İstek: " + clip(ev.get("prompt"), 90), at=now, seen=now)
    elif name == "PreToolUse":
        if tool in ("Agent", "Task"):
            ti = ev.get("tool_input") or {}
            q = d.setdefault("pending", {}).setdefault(ti.get("subagent_type") or DEFAULT_TYPE, [])
            q.append(clip(ti.get("description") or ti.get("prompt"), 100))
            del q[:-5]
        who.update(status="calisiyor", last="Araç: " + (tool or "?"), at=now, seen=now)
    elif name in ("PostToolUse", "PostToolUseFailure"):
        who["seen"] = now
        if who.get("status") == "bekliyor":
            who["status"] = "calisiyor"
    elif name == "SubagentStart":
        key = atype or DEFAULT_TYPE
        q = d.setdefault("pending", {}).get(key) or []
        task = q.pop(0) if q else ""
        if not atype and task:           # ajan turu bos geldi ama Agent aracinin istegi turu soyluyor: tahmin diye isaretle
            who["type"], who["inferred"] = key, True
        who.update(status="calisiyor", last=task or "Başladı", at=now, seen=now, started=now)
    elif name == "SubagentStop":
        who.update(status="bitirdi", last=clip(ev.get("last_assistant_message"), 160) or "Bitti", at=now, seen=now)
    elif name == "PermissionRequest":
        who.update(status="bekliyor", last="İzin istendi: " + (tool or "?"), at=now, seen=now)
    elif name == "Notification":
        kind = ev.get("notification_type") or ""
        if kind == "permission_prompt":
            who.update(status="bekliyor", last="İzin bekliyor: " + clip(ev.get("message"), 80), at=now, seen=now)
        elif kind == "idle_prompt":
            who.update(status="bosta", last="Yanıtını bekliyor", at=now, seen=now)
    elif name == "Stop":
        last = clip(ev.get("last_assistant_message"), 160) or "Bitti"
        bg = ev.get("background_tasks")
        if isinstance(bg, list) and bg:
            last += " · arka planda %d iş var" % len(bg)
        who.update(status="bitirdi", last=last, at=now, seen=now)
    elif name == "SessionEnd":
        who.update(status="bosta", last="Oturum kapandı (%s)" % (ev.get("reason") or "?"), at=now, seen=now)

    prune(d)
    d["updated"] = now
    # Gercekte hangi olaylar ve hangi alanlar geliyor: degerler degil, yalnizca alan adlari saklanir.
    d.setdefault("keys", {})[name or "?"] = sorted(ev.keys())
    log = d.setdefault("log", [])
    log.append({"t": now, "e": name or "?", "who": label, "tool": tool, "agent": bool(atype or aid)})
    del log[:-MAX_LOG]


def main():
    try:
        raw = sys.stdin.read()
        ev = json.loads(raw) if raw.strip() else {}
        if not isinstance(ev, dict):
            return
        os.makedirs(DIR, exist_ok=True)
        with open(LOCK, "w") as lf:
            fcntl.flock(lf, fcntl.LOCK_EX)
            d = load()
            apply(d, ev, time.time())
            save(d)
    except Exception:
        pass


if __name__ == "__main__":
    main()
    sys.exit(0)
