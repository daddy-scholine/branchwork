# Builds the installable app's index.html from the main Branchwork page (synced Firebase mode).
import pathlib, sys
here = pathlib.Path(__file__).parent
src_path = here / "branchwork.html" if (here / "branchwork.html").exists() else here.parent / "index.html"
src = src_path.read_text()
shim = (here / "shim-fire.js").read_text()
FB = "https://www.gstatic.com/firebasejs/10.14.1/"
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#2E7748">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Branchwork">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script src=\"""" + FB + """firebase-app-compat.js\"></script>
<script src=\"""" + FB + """firebase-auth-compat.js\"></script>
<script src=\"""" + FB + """firebase-firestore-compat.js\"></script>
<script>
""" + shim + """
</script>
</head>
<body>
"""
out = here.parent / "index.html" if src_path.name == "branchwork.html" else here / "index.html"
out.write_text(head + src + "\n</body>\n</html>\n")
print("built", out, len(head + src))
