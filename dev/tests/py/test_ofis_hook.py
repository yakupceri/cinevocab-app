"""Ajan ofisi hook'u: olay -> durum.json. Gercek bir oturum acilmadan, sahte olaylarla ve gecici klasorde."""
import json
import os
import subprocess
import sys

import pytest

from conftest import ROOT

HOOK = os.path.join(ROOT, ".claude", "ofis", "hook.py")


@pytest.fixture
def ofis(tmp_path):
    env = dict(os.environ, CV_OFIS_DIR=str(tmp_path), PYTHONDONTWRITEBYTECODE="1")

    def send(event, **fields):
        payload = dict(hook_event_name=event, session_id="s1", cwd="/x", **fields)
        r = subprocess.run([sys.executable, HOOK], input=json.dumps(payload), text=True, env=env, capture_output=True, timeout=20)
        assert r.returncode == 0
        assert r.stdout == "" and r.stderr == ""      # hook hicbir sey yazdirmamali (baglama karismasin)
    send.state = lambda: json.loads((tmp_path / "durum.json").read_text(encoding="utf-8"))
    send.path = tmp_path
    return send


def test_prompt_then_stop_main_session(ofis):
    ofis("UserPromptSubmit", prompt="  bunu   yap\nlutfen ")
    x = ofis.state()["desks"]["ana"]
    assert x["status"] == "calisiyor" and x["last"] == "İstek: bunu yap lutfen"
    ofis("Stop", last_assistant_message="Bitti kanka")
    x = ofis.state()["desks"]["ana"]
    assert x["status"] == "bitirdi" and x["last"] == "Bitti kanka"


def test_named_subagent_lifecycle_uses_task_from_the_agent_tool_call(ofis):
    ofis("PreToolUse", tool_name="Agent", tool_input={"subagent_type": "tasarimci", "description": "Popup tasarimi", "prompt": "..."})
    ofis("SubagentStart", agent_id="a1", agent_type="tasarimci")
    x = ofis.state()["agents"]["a1"]
    assert x["type"] == "tasarimci" and x["status"] == "calisiyor" and x["last"] == "Popup tasarimi"
    ofis("SubagentStop", agent_id="a1", agent_type="tasarimci", last_assistant_message="Iki yon cizdim.")
    x = ofis.state()["agents"]["a1"]
    assert x["status"] == "bitirdi" and x["last"] == "Iki yon cizdim."


def test_agents_never_create_their_own_desk(ofis):
    """Hook yalnizca ana oturumu 'desks' altinda tutar; her ajan agents[id] altinda kayit olur (masayi sayfa kurar)."""
    ofis("SubagentStart", agent_id="a54e3b7bc493898dc", agent_type="")
    ofis("SubagentStart", agent_id="b2", agent_type="tasarimci")
    s = ofis.state()
    assert s.get("desks", {}) == {}          # ajanlar masa acmaz; ana masa da yalnizca ana oturum olayiyla olusur
    assert set(s["agents"]) == {"a54e3b7bc493898dc", "b2"}


def test_unnamed_agent_takes_its_type_from_the_agent_tool_call_and_is_marked_as_a_guess(ofis):
    ofis("PreToolUse", tool_name="Agent", tool_input={"description": "Rakip arastirmasi", "prompt": "..."})   # tur verilmemis
    ofis("SubagentStart", agent_id="a54e3b7bc493898dc", agent_type="")
    x = ofis.state()["agents"]["a54e3b7bc493898dc"]
    assert x["type"] == "general-purpose" and x.get("inferred") is True
    assert x["last"] == "Rakip arastirmasi"


def test_unnamed_agent_without_any_hint_keeps_an_empty_type(ofis):
    ofis("SubagentStart", agent_id="a54e3b7bc493898dc", agent_type="")
    x = ofis.state()["agents"]["a54e3b7bc493898dc"]
    assert x["type"] == "" and x["last"] == "Başladı"


def test_a_real_agent_type_from_the_hook_beats_the_guess(ofis):
    ofis("PreToolUse", tool_name="Agent", tool_input={"description": "x", "prompt": "..."})
    ofis("SubagentStart", agent_id="a1", agent_type="Explore")
    x = ofis.state()["agents"]["a1"]
    assert x["type"] == "Explore" and "inferred" not in x


def test_tool_calls_inside_a_subagent_go_to_that_agents_record_not_the_main_desk(ofis):
    ofis("PreToolUse", tool_name="Read", agent_id="a1", agent_type="denetci")
    s = ofis.state()
    assert s["agents"]["a1"]["last"] == "Araç: Read"
    assert "ana" not in s.get("desks", {})


def test_permission_prompt_waits_and_next_tool_result_resumes(ofis):
    ofis("Notification", notification_type="permission_prompt", message="Bash izni")
    assert ofis.state()["desks"]["ana"]["status"] == "bekliyor"
    ofis("PostToolUse", tool_name="Bash")
    assert ofis.state()["desks"]["ana"]["status"] == "calisiyor"


def test_old_format_state_is_migrated_into_agents(ofis):
    """Eski durum.json: her ajan kendi masasiydi. Tasinir, hic calismamis (at=0) masalar atilir."""
    (ofis.path / "durum.json").write_text(json.dumps({"desks": {
        "ana": {"name": "Claude (ana oturum)", "status": "bitirdi", "last": "x", "at": 5, "seen": 5},
        "a54e3b7bc493898dc": {"name": "a54e3b7bc493898dc", "status": "bitirdi", "last": "Ozet", "at": 7, "seen": 7},
        "tasarimci": {"name": "tasarimci", "status": "bilinmiyor", "last": "", "at": 0, "seen": 0, "task": "bekleyen"},
    }}), encoding="utf-8")
    ofis("Stop", last_assistant_message="Tamam")
    s = ofis.state()
    assert set(s["desks"]) == {"ana"}
    assert set(s["agents"]) == {"a54e3b7bc493898dc"}
    assert s["agents"]["a54e3b7bc493898dc"]["type"] == "" and s["agents"]["a54e3b7bc493898dc"]["last"] == "Ozet"


def test_only_the_30_most_recent_agents_are_kept(ofis):
    for i in range(35):
        ofis("SubagentStop", agent_id="id%02d%s" % (i, "0" * 6), agent_type="", last_assistant_message="k")
    ag = ofis.state()["agents"]
    assert len(ag) == 30
    assert "id00000000" not in ag and "id34000000" in ag


def test_log_keeps_only_field_names_and_is_capped(ofis):
    for i in range(60):
        ofis("PostToolUse", tool_name="Edit", tool_input={"file_path": "/gizli/yol"}, tool_response={"x": 1})
    s = ofis.state()
    assert len(s["log"]) == 40
    assert s["keys"]["PostToolUse"] == sorted(["hook_event_name", "session_id", "cwd", "tool_name", "tool_input", "tool_response"])
    assert "/gizli/yol" not in json.dumps(s, ensure_ascii=False)   # alan degerleri saklanmaz


def test_garbage_input_never_breaks_the_session(ofis, tmp_path):
    env = dict(os.environ, CV_OFIS_DIR=str(tmp_path), PYTHONDONTWRITEBYTECODE="1")
    for raw in ["", "bu json degil", "[1,2]", "null"]:
        r = subprocess.run([sys.executable, HOOK], input=raw, text=True, env=env, capture_output=True, timeout=20)
        assert r.returncode == 0 and r.stdout == ""


def test_long_text_is_clipped(ofis):
    ofis("Stop", last_assistant_message="a" * 1000)
    assert len(ofis.state()["desks"]["ana"]["last"]) <= 160
