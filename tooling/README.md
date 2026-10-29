# Herramientas de render "Sin rodeos"
Para re-renderizar en una sesión nueva:
1. Copia `tooling/fonts/*.ttf` a `/home/claude/fonts/` y `tooling/bg/*.mp4` a `/home/claude/build/bg/`; copia los .py a `/home/claude/build/`.
2. `pip install --break-system-packages pillow` si falta; requiere ffmpeg.
3. Edita la pieza en `content.py` (lista P). Marcadores en líneas de reel: `*` dorado, `_` itálica; `strike='palabra'` tacha.
4. Render de una pieza: `python3 -c "import sys;sys.path.insert(0,'/home/claude/build');from engine import *;from content import schedule;[render_reel(p) for p in schedule() if p['id']=='R07']"` (carruseles: usa `job` de render.py).
5. Salida en `/home/claude/build/out/`. Copia los archivos a `sin-rodeos/` con el mismo nombre y actualiza `sin-rodeos/plan.json`.
