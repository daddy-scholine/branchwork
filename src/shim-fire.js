/* Branchwork synced mode: Google sign-in + Firestore, behind the same window.claude.use() API the app expects. */
(function () {
  window.BW_FIRE = true;
  const CONFIG = {
    apiKey: "AIzaSyBPVgKyXOLLO7EqMIiCJjrh4I8cKzqriKc",
    authDomain: "branchwork-70dc2.firebaseapp.com",
    projectId: "branchwork-70dc2",
    storageBucket: "branchwork-70dc2.firebasestorage.app",
    messagingSenderId: "239571397540",
    appId: "1:239571397540:web:1b428f6ceaefed27a1af31"
  };
  const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const err = (code, message) => Object.assign(new Error(message), { code, message });
  const mapErr = e => { const c = (e && e.code) || ""; if (c === "permission-denied" || c === "not-found" || c === "invalid-argument" || c === "failed-precondition") return err("invalid_argument", e.message); if (c === "resource-exhausted") return err("quota_exceeded", e.message); return err("unavailable", (e && e.message) || "unavailable"); };
  const flatten = (o, pre = "", out = {}) => { for (const k in o) { const v = o[k]; const p = pre ? pre + "." + k : k; if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length) flatten(v, p, out); else out[p] = v; } return out; };
  let fb = window.firebase, fs = null, auth = null;
  let resolveReady; const ready = new Promise(r => resolveReady = r); let current = null;

  function wrapDoc(r) { return {
    id: r.id, path: r.path,
    get: () => r.get().catch(e => { throw mapErr(e); }),
    set: d => r.set(d).catch(e => { throw mapErr(e); }),
    update: d => r.update(flatten(d)).catch(e => { throw mapErr(e); }),
    delete: () => r.delete().catch(e => { throw mapErr(e); }),
    onSnapshot: (n, e) => r.onSnapshot(n, x => e && e(mapErr(x))),
    collection: s => wrapColl(r.collection(s)),
  }; }
  function wrapQ(q) { return {
    where: (...a) => wrapQ(q.where(...a)), orderBy: (...a) => wrapQ(q.orderBy(...a)), limit: n => wrapQ(q.limit(n)),
    get: () => q.get().catch(e => { throw mapErr(e); }),
    onSnapshot: (n, e) => q.onSnapshot(n, x => e && e(mapErr(x))),
  }; }
  function wrapColl(c) { return Object.assign(wrapQ(c), { path: c.path, doc: id => wrapDoc(id ? c.doc(id) : c.doc()), add: d => c.add(d).then(wrapDoc).catch(e => { throw mapErr(e); }) }); }

  const profCache = {};
  const userApi = Object.freeze({
    id: async () => current && current.uid, isOwner: async () => true, canEdit: async () => true, can: async () => !!current,
    me: async () => ({ id: current.uid, name: current.displayName || "You", avatarUrl: current.photoURL || "", color: "", email: current.email, isOwner: true, canEdit: true }),
    profiles: async ids => { const out = {}; await Promise.all([].concat(ids).map(async i => {
      if (!profCache[i]) { try { const s = await fs.collection("users").doc(i).get(); profCache[i] = s.exists ? s.data() : {}; } catch { profCache[i] = {}; } }
      out[i] = { id: i, name: profCache[i].name || "", avatarUrl: profCache[i].photo || "", color: "", email: null, isMe: current && i === current.uid, guest: false }; })); return out; },
    name: async () => current.displayName || "", avatarUrl: async () => current.photoURL || null, search: async () => [],
  });
  const assets = Object.freeze({
    async upload(blob) {
      if (!/^image\//.test(blob.type)) throw err("unsupported_type", "Only photos can be uploaded. Share videos as a link.");
      const url = URL.createObjectURL(blob); const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
      const s = Math.min(1, 900 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let q = 0.7, data = c.toDataURL("image/jpeg", q); while (data.length > 220000 && q > 0.35) { q -= 0.1; data = c.toDataURL("image/jpeg", q); }
      return { id: gid(), url: data, sizeBytes: data.length, contentType: "image/jpeg" };
    },
    list: async () => ({ assets: [], usage: { files: 0, bytes: 0, maxFiles: 0, maxBytes: 0 } }), delete: async () => ({ deleted: true }),
  });
  const downloads = Object.freeze({
    async save({ filename, data }) { const blob = data instanceof Blob ? data : new Blob([data], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return { status: "saved" }; },
  });
  let db = null;
  window.claude = Object.freeze({ use: name => ready.then(() => ({ db, user: userApi, assets, downloads })[name] || null) });

  /* ---------- sign-in screen ---------- */
  const css = `#bw-gate{position:fixed;inset:0;z-index:200;background:var(--bg,#F2F4EF);color:var(--fg,#17201A);display:flex;align-items:center;justify-content:center;padding:24px;font-family:var(--f-body,system-ui,sans-serif)}
  #bw-gate .box{max-width:360px;width:100%;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center}
  #bw-gate img{width:84px;height:84px;border-radius:20px}
  #bw-gate h1{font-family:var(--f-display,system-ui);font-size:1.8rem;margin:0}
  #bw-gate p{margin:0;color:var(--muted,#5C695F);line-height:1.45}
  #bw-gate button{display:flex;gap:10px;align-items:center;justify-content:center;width:100%;padding:13px 16px;border-radius:999px;border:1px solid var(--line,#D5DCD0);background:var(--surface,#fff);color:inherit;font:600 1rem var(--f-body,system-ui);cursor:pointer}
  #bw-gate button:disabled{opacity:.6}
  #bw-gate .err{color:var(--danger,#B13E2D);font-size:.9rem;min-height:1.2em}
  #bw-note{position:fixed;left:50%;transform:translateX(-50%);top:calc(14px + env(safe-area-inset-top,0px));z-index:210;background:var(--fg,#17201A);color:var(--bg,#fff);padding:9px 16px;border-radius:999px;font:600 .9rem system-ui;max-width:calc(100% - 32px)}`;
  const G = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  function note(msg) { const n = document.createElement("div"); n.id = "bw-note"; n.textContent = msg; document.body.appendChild(n); setTimeout(() => n.remove(), 4500); }
  function showGate(message) {
    let g = document.getElementById("bw-gate");
    if (!g) { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); g = document.createElement("div"); g.id = "bw-gate"; document.body.appendChild(g); }
    const offline = navigator.onLine === false;
    g.innerHTML = `<div class="box"><img src="icon-192.png" alt=""><h1>Branchwork</h1><p>Sign in to keep your branches synced across your phone and iPad, and to join battles and the feed with friends.</p>
      <button id="bw-signin" ${offline || !auth ? "disabled" : ""}>${G}Continue with Google</button><div class="err" id="bw-err">${offline ? "You're offline. Connect to the internet to sign in." : !auth ? "Couldn't load sign-in. Check your connection and reopen the app." : (message || "")}</div>
      <p style="font-size:.85rem">Your tree stays private to you. Only battles and posts you share are visible to others.</p></div>`;
    const b = document.getElementById("bw-signin"); if (b) b.onclick = signIn;
  }
  function hideGate() { const g = document.getElementById("bw-gate"); if (g) g.remove(); }
  async function signIn() {
    const b = document.getElementById("bw-signin"), e = document.getElementById("bw-err"); if (b) b.disabled = true; if (e) e.textContent = "";
    const provider = new fb.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
    try { await auth.signInWithPopup(provider); }
    catch (x) {
      const c = x && x.code;
      if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment" || c === "auth/cancelled-popup-request") { try { await auth.signInWithRedirect(provider); return; } catch (y) { x = y; } }
      if (b) b.disabled = false;
      if (e) e.textContent = c === "auth/popup-closed-by-user" ? "Sign-in was closed. Tap the button to try again." : c === "auth/unauthorized-domain" ? "This website isn't allowed to sign in yet. Add daddy-scholine.github.io under Firebase → Authentication → Settings → Authorized domains." : c === "auth/network-request-failed" ? "Network problem. Check your connection and try again." : "Couldn't sign in (" + (c || "unknown error") + ").";
    }
  }
  window.BW_ACCOUNT = () => current ? `<div class="field"><span class="lbl">Account</span><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span style="min-width:0;overflow-wrap:anywhere">${(current.displayName || "").replace(/[<>&]/g, "")}<br><span class="muted" style="font-size:.85rem">${(current.email || "").replace(/[<>&]/g, "")} · synced</span></span><button type="button" class="btn small" data-act="bw-signout">Sign out</button></div></div>` : "";
  document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-act=bw-signout]"); if (!t) return; if (t.dataset.sure) { auth.signOut().then(() => location.reload()); } else { t.dataset.sure = "1"; t.textContent = "Tap again to sign out"; } });

  /* ---------- move this device's data to the account (once) ---------- */
  async function migrate(uid) {
    let moved = false;
    try {
      if (localStorage.getItem("bw:migrated:" + uid)) return;
      const lt = localStorage.getItem("bwdb:data/users/me/tree"); const ll = localStorage.getItem("bwdb:data/users/me/log");
      const base = fs.collection("data/users/" + uid);
      if (lt) { const cur = await base.doc("tree").get(); const t = JSON.parse(lt);
        if ((!cur.exists || !Object.keys((cur.data() || {}).nodes || {}).length) && t && Object.keys(t.nodes || {}).length) { await base.doc("tree").set({ nodes: t.nodes, bigHist: t.bigHist || {}, v: 1, at: Date.now() }); moved = true;
          if (ll) { const lg = await base.doc("log").get(); if (!lg.exists) await base.doc("log").set(JSON.parse(ll)); } } }
      localStorage.setItem("bw:migrated:" + uid, "1");
    } catch {}
    if (moved) setTimeout(() => note("Moved your branches from this device into your account"), 1200);
  }

  /* ---------- start ---------- */
  function start() {
    fb = window.firebase;
    if (!fb || !fb.initializeApp) { showGate(); return; }
    try { fb.initializeApp(CONFIG); auth = fb.auth(); fs = fb.firestore(); try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch {}
      fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (x) { showGate("Couldn't start: " + x.message); return; }
    db = Object.freeze({ doc: p => wrapDoc(fs.doc(p)), collection: p => wrapColl(fs.collection(p)) });
    auth.getRedirectResult().catch(x => { if (x && x.code) showGate("Couldn't sign in (" + x.code + ")."); });
    let first = true;
    auth.onAuthStateChanged(async u => {
      if (!u) { if (current) location.reload(); showGate(); return; }
      if (current && current.uid !== u.uid) { location.reload(); return; }
      current = u; hideGate();
      try { await fs.collection("users").doc(u.uid).set({ name: u.displayName || "", photo: u.photoURL || "", at: Date.now() }, { merge: true }); } catch {}
      if (first) { first = false; await migrate(u.uid); resolveReady(); }
    });
  }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); window.BW_INSTALL = e; });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
