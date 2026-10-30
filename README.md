# Branchwork

A branching to-do app: Domain › Milestone › Project › Task › Subtask, with focus mode, Today's Big 2, a progress dashboard, a mind map and a lungs view where finished work clears mucus and ventilates the airways.

This repository hosts the installable version on GitHub Pages. Open the site in Chrome and choose **Install app** (or **Add to Home screen**), or in Safari on iPad/iPhone use **Share → Add to Home Screen**.

Sign in with Google to sync your branches across devices and to use battles and the feed. Data is stored in Firebase (project `branchwork-70dc2`) and works offline.

## Files
- `index.html` – the built app (generated; don't edit by hand)
- `src/branchwork.html` – app source
- `src/shim-fire.js` – Google sign-in and Firestore sync used by the installable version
- `src/shim-local.js` – older on-device-only storage (kept for reference)
- `firestore.rules` – database security rules (paste into Firebase → Firestore → Rules)
- `src/build.py` – run `python3 src/build.py` to rebuild `index.html`
- `sw.js`, `manifest.webmanifest`, icons – what makes it installable and work offline
