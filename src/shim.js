/* Branchwork local mode: stands in for claude.ai's storage so the app runs on its own, saving to this device. */
(function () {
  window.BW_LOCAL = true;
  const KEY = "bwdb:";
  const read = p => { try { const v = localStorage.getItem(KEY + p); return v ? JSON.parse(v) : null; } catch { return null; } };
  const write = (p, v) => { try { if (v == null) localStorage.removeItem(KEY + p); else localStorage.setItem(KEY + p, JSON.stringify(v)); return true; } catch (e) { return e; } };
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => { try { fn(); } catch {} });
  const meta = { fromCache: false, hasPendingWrites: false };
  const snap = (path) => { const d = read(path); const id = path.split("/").pop(); return { id, exists: !!d, data: () => d ? JSON.parse(JSON.stringify(d)) : undefined, metadata: meta }; };
  const merge = (a, b) => { const o = { ...(a || {}) }; for (const k in b) { const v = b[k]; o[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(o[k], v) : v; } return o; };
  const err = (code, message) => Object.assign(new Error(message), { code, message });
  const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      get: async () => snap(path),
      set: async d => { const r = write(path, d); if (r !== true) throw err("quota_exceeded", "This device's storage is full"); notify(); },
      update: async d => { const cur = read(path); if (!cur) throw err("invalid_argument", "Document does not exist"); const r = write(path, merge(cur, d)); if (r !== true) throw err("quota_exceeded", "This device's storage is full"); notify(); },
      delete: async () => { write(path, null); notify(); },
      onSnapshot(next) { let last; const fn = () => { const s = snap(path); const k = JSON.stringify(s.exists ? s.data() : null); if (k !== last) { last = k; next(s); } }; listeners.add(fn); setTimeout(fn, 0); return () => listeners.delete(fn); },
      collection: sub => collRef(path + "/" + sub),
    };
  }
  function query(path, opts) {
    const run = () => { const pre = KEY + path + "/"; const depth = path.split("/").length + 1; const docs = [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(pre) && k.slice(KEY.length).split("/").length === depth) docs.push(snap(k.slice(KEY.length))); } } catch {}
      if (opts.order) { const [f, dir] = opts.order; docs.sort((a, b) => { const x = a.data()[f], y = b.data()[f]; return (x > y ? 1 : x < y ? -1 : 0) * (dir === "desc" ? -1 : 1); }); }
      const out = opts.limit ? docs.slice(0, opts.limit) : docs;
      return { docs: out, size: out.length, empty: !out.length, docChanges: () => [], metadata: meta }; };
    return {
      where: () => query(path, opts),
      orderBy: (f, dir) => query(path, { ...opts, order: [f, dir || "asc"] }),
      limit: n => query(path, { ...opts, limit: n }),
      get: async () => run(),
      onSnapshot(next) { let last; const fn = () => { const r = run(); const k = JSON.stringify(r.docs.map(d => [d.id, d.data()])); if (k !== last) { last = k; next(r); } }; listeners.add(fn); setTimeout(fn, 0); return () => listeners.delete(fn); },
    };
  }
  function collRef(path) { const q = query(path, {}); return { ...q, path, doc: id => docRef(path + "/" + (id || gid())), add: async d => { const r = docRef(path + "/" + gid()); await r.set(d); return r; } }; }
  const db = Object.freeze({ doc: docRef, collection: collRef });
  const ME = "me";
  const user = Object.freeze({
    id: async () => ME, isOwner: async () => true, canEdit: async () => true, can: async () => true,
    me: async () => ({ id: ME, name: "You", avatarUrl: "", color: "", email: null, isOwner: true, canEdit: true }),
    profiles: async ids => { const o = {}; [].concat(ids).forEach(i => o[i] = { id: i, name: i === ME ? (localStorage.getItem("bw:name") ? JSON.parse(localStorage.getItem("bw:name")) : "You") : "", avatarUrl: "", color: "", email: null, isMe: i === ME, guest: false }); return o; },
    name: async () => "You", avatarUrl: async () => null, search: async () => [],
  });
  const assets = Object.freeze({
    async upload(blob) {
      if (!/^image\//.test(blob.type)) throw err("unsupported_type", "Only photos can be saved on this device");
      const url = URL.createObjectURL(blob); const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
      const s = Math.min(1, 1000 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const data = c.toDataURL("image/jpeg", 0.72); return { id: gid(), url: data, sizeBytes: data.length, contentType: "image/jpeg" };
    },
    list: async () => ({ assets: [], usage: { files: 0, bytes: 0, maxFiles: 0, maxBytes: 0 } }), delete: async () => ({ deleted: true }),
  });
  const downloads = Object.freeze({
    async save({ filename, data }) { const blob = data instanceof Blob ? data : new Blob([data], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return { status: "saved" }; },
  });
  const caps = { db, user, assets, downloads };
  window.claude = Object.freeze({ use: name => Promise.resolve(caps[name] || null) });
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); window.BW_INSTALL = e; });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
