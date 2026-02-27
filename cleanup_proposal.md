# Cleanup Proposal

This file lists candidate files and folders that appear duplicate or unnecessary and suggests either removing or consolidating them.

Proposed deletions (please confirm before I remove anything):

- `COMPLETION_REPORT.md` (root) — duplicate: `docs/COMPLETION_REPORT.md`
- `DOCUMENTATION_INDEX.md` (root) — duplicate index in `docs/` directory
- `FIREBASE_RULES.md` (root) — duplicate: `docs/FIREBASE_RULES.md` and `RT_FIREBASE.md` + new `REALTIME_RULES.json` in root
- `RT_FIREBASE.md` (root) — duplicate: `docs/RT_FIREBASE.md`
- `qr-share.html` — (single-purpose old page; function may be covered by Global Share modal in `index.html`)

Notes:
- I will NOT delete any code files (`js/`, `styles/`, `index.html`) or configuration files (`netlify.toml`, `manifest.json`, `sw.js`) without explicit confirmation.
- If you want me to proceed, tell me which items to delete or if you prefer I move duplicates into a `legacy/` folder for archival.
