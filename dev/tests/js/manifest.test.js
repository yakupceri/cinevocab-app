// Eklenti paketi: manifest ve dil klasorleri (yayin oncesi kontrolun testli kismi).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const EXT = path.resolve(__dirname, "../../../extension");
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
const localeDirs = fs.readdirSync(path.join(EXT, "_locales"));

test("manifest: MV3 ve surum bicimi", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test("manifest: isim ve aciklama dil dosyalarindan gelir, varsayilan dil var", () => {
  assert.equal(manifest.name, "__MSG_extName__");
  assert.equal(manifest.description, "__MSG_extDesc__");
  assert.ok(localeDirs.includes(manifest.default_locale));
});

test("manifest: dosyalarin hepsi paketin icinde var", () => {
  const files = new Set([manifest.action.default_popup, manifest.background.service_worker]);
  for (const cs of manifest.content_scripts) for (const f of cs.js) files.add(f);
  for (const f of Object.values(manifest.icons)) files.add(f);
  for (const f of files) assert.ok(fs.existsSync(path.join(EXT, f)), "eksik dosya: " + f);
});

test("_locales: her dilde extName ve extDesc var, extDesc en cok 132 karakter (magaza siniri)", () => {
  assert.ok(localeDirs.length >= 16);
  for (const l of localeDirs) {
    const m = JSON.parse(fs.readFileSync(path.join(EXT, "_locales", l, "messages.json"), "utf8"));
    assert.ok(m.extName && m.extName.message, l + ": extName yok");
    assert.ok(m.extDesc && m.extDesc.message, l + ": extDesc yok");
    assert.ok(m.extDesc.message.length <= 132, l + ": extDesc " + m.extDesc.message.length + " karakter");
  }
});

test("izinler: yalnizca bilinen dort izin var (izin sayisi artmamali)", () => {
  assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "identity", "scripting", "storage"]);
});
