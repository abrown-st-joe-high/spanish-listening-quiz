const $ = (id) => document.getElementById(id);
let modules = [], data = null, keys = new Set(), cur = null;
let recorder = null, chunks = [], stream = null;

const keyOf = (item) => data.audioPath + item.id;
const status = (msg, cls = "") => { $("rec-status").textContent = msg; $("rec-status").className = "feedback-row " + cls; };
const tileOf = (item) => $("item-grid").querySelector(`[data-id="${CSS.escape(item.id)}"]`);

async function init() {
  modules = await (await fetch("data/modules.json")).json();
  $("set-select").innerHTML = modules.map((m, i) => `<option value="${i}">${m.label}</option>`).join("");
  $("set-select").addEventListener("change", loadSet);
  $("rec-btn").addEventListener("click", toggleRecord);
  $("play-btn").addEventListener("click", playCurrent);
  $("del-btn").addEventListener("click", deleteCurrent);
  $("next-btn").addEventListener("click", () => select(nextUnrecorded()));
  $("zip-btn").addEventListener("click", downloadZip);
  $("clear-btn").addEventListener("click", clearAll);
  loadSet();
}

async function loadSet() {
  data = await (await fetch(modules[$("set-select").value].dataFile)).json();
  keys = new Set(await RecStore.keys());
  const grid = $("item-grid");
  grid.innerHTML = "";
  data.items.forEach((item) => {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "listen-tile" + (keys.has(keyOf(item)) ? " done" : "");
    t.dataset.id = item.id;
    t.textContent = item.label;
    t.addEventListener("click", () => select(item));
    grid.appendChild(t);
  });
  select(nextUnrecorded(-1));
}

function nextUnrecorded(from) {
  const items = data.items;
  const start = from === undefined ? items.indexOf(cur) : from;
  for (let i = 1; i <= items.length; i++) {
    const it = items[(start + i) % items.length];
    if (!keys.has(keyOf(it))) return it;
  }
  return cur || items[0];
}

function select(item) {
  if (recorder && recorder.state === "recording") return;
  cur = item;
  document.querySelectorAll(".listen-tile.current").forEach((t) => t.classList.remove("current"));
  const t = tileOf(item);
  if (t) { t.classList.add("current"); t.scrollIntoView({ block: "nearest" }); }
  $("rec-label").textContent = item.label;
  $("rec-spoken").textContent = item.spoken;
  refresh();
  status("");
}

function refresh() {
  const has = keys.has(keyOf(cur));
  $("play-btn").disabled = !has;
  $("del-btn").disabled = !has;
  const done = data.items.filter((i) => keys.has(keyOf(i))).length;
  $("rec-progress").textContent = `${done} of ${data.items.length} recorded in this set`;
}

async function toggleRecord() {
  if (recorder && recorder.state === "recording") { recorder.stop(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    status("Microphone blocked or unavailable.", "incorrect");
    return;
  }
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
  recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
  chunks = [];
  const item = cur;
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    const type = recorder.mimeType || mime || "audio/webm";
    const ext = type.includes("mp4") ? "m4a" : "webm";
    await RecStore.put(keyOf(item), { blob: new Blob(chunks, { type }), ext, savedAt: Date.now() });
    keys.add(keyOf(item));
    const t = tileOf(item);
    if (t) t.classList.add("done");
    $("rec-btn").textContent = "Record";
    $("rec-btn").classList.remove("recording");
    refresh();
    status(`Saved ${item.label}.`, "correct");
    playCurrent();
  };
  recorder.start();
  $("rec-btn").textContent = "Stop";
  $("rec-btn").classList.add("recording");
  status("Recording… say it, then tap Stop.");
}

async function playCurrent() {
  const rec = await RecStore.get(keyOf(cur));
  if (rec) new Audio(URL.createObjectURL(rec.blob)).play().catch(() => {});
}

async function deleteCurrent() {
  await RecStore.del(keyOf(cur));
  keys.delete(keyOf(cur));
  tileOf(cur).classList.remove("done");
  refresh();
  status("Deleted.");
}

async function clearAll() {
  if (!confirm("Delete ALL local recordings in this browser? Download the ZIP first if they are needed.")) return;
  for (const k of await RecStore.keys()) await RecStore.del(k);
  await loadSet();
  status("All local recordings cleared.");
}

/* ---------- ZIP export (store-only, no library needed) ---------- */

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

async function downloadZip() {
  const all = await RecStore.all();
  if (!all.length) { status("Nothing recorded yet."); return; }
  const files = [];
  for (const r of all) files.push({ name: `${r.key}.${r.ext}`, data: new Uint8Array(await r.blob.arrayBuffer()) });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(buildZip(files));
  a.download = "oido-recordings.zip";
  a.click();
  status(`ZIP with ${files.length} recordings downloaded.`, "correct");
}

init();
