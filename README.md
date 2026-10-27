# Branchwork

A branching to-do app: Domain › Milestone › Project › Task › Subtask, with focus mode, Today's Big 2, a progress dashboard, a mind map and a lungs view where finished work clears mucus and ventilates the airways.

This repository hosts the installable version on GitHub Pages. Open the site in Chrome and choose **Install app** (or **Add to Home screen**), or in Safari on iPad/iPhone use **Share → Add to Home Screen**.

Data is saved on the device. Use **Back up** and **Restore** in the Tree tab to move or keep a copy.

## Files
- `index.html` – the built app (generated; don't edit by hand)
- `src/branchwork.html` – app source
- `src/shim.js` – on-device storage used by the installable version
- `src/build.py` – run `python3 src/build.py` to rebuild `index.html`
- `sw.js`, `manifest.webmanifest`, icons – what makes it installable and work offline
