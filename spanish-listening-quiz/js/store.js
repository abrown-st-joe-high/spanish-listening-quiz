/* Local recording store (IndexedDB — holds audio blobs far better than
   localStorage's ~5 MB limit). Key = audio folder + item id,
   e.g. "audio/numbers/42". Value = { blob, ext, savedAt }. */
const RecStore = (() => {
  const DB = "oido-recordings", ST = "recs";

  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(ST, mode);
      const req = fn(t.objectStore(ST));
      t.oncomplete = () => res(req.result);
      t.onerror = () => rej(t.error);
    });
  };

  return {
    get: (k) => run("readonly", (s) => s.get(k)),
    put: (k, v) => run("readwrite", (s) => s.put(v, k)),
    del: (k) => run("readwrite", (s) => s.delete(k)),
    keys: () => run("readonly", (s) => s.getAllKeys()),
    all: async () => {
      const keys = await run("readonly", (s) => s.getAllKeys());
      const out = [];
      for (const key of keys) {
        const v = await run("readonly", (s) => s.get(key));
        if (v) out.push({ key, ...v });
      }
      return out;
    },
  };
})();
