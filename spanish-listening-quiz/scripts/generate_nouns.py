#!/usr/bin/env python3
"""Build data/nouns.json from the table below.

Each line:  id | Label | English | category | pixel art
Pixel art is a tiny drawing script on a 16x16 grid, drawn in order:
    r x y w h C     filled rectangle
    c cx cy rad C   filled circle
    l x1 y1 x2 y2 C line
    p x y [x y ..] C  single pixels
Colour letters: k black, w white, a light gray, A dark gray, r red,
o orange, y yellow, g green, G dark green, b blue, B dark blue,
c sky, p purple, n brown, N dark brown, t tan, s skin, m pink,
and '.' erases (cuts holes). js/pixelart.js draws these in the browser.

To add a noun: add a line, run  python scripts/generate_nouns.py
Distractors in the quiz are drawn from the same category first.
"""
import json
from pathlib import Path

TABLE = """
libro|El libro|book|school|r 3 2 10 12 b; r 3 2 2 12 B; r 6 5 6 2 w; r 6 8 4 1 w
mapa|El mapa|map|school|r 2 3 12 10 c; r 3 4 5 4 g; r 8 8 5 4 g; r 4 9 3 2 g; p 11 5 r
mochila|La mochila|backpack|school|r 4 4 8 10 b; r 5 3 6 1 b; r 6 1 4 1 A; r 6 1 1 3 A; r 9 1 1 3 A; r 5 9 6 4 B; r 5 8 6 1 k; r 7 11 2 1 y
boligrafo|El bolígrafo|pen|school|l 4 11 11 4 b; l 5 12 12 5 b; l 4 12 11 5 b; p 3 14 3 13 4 14 k; l 12 4 13 3 r; l 12 5 13 4 r
coche|El coche|car|transport|r 1 8 14 4 r; r 4 5 8 3 r; r 5 6 3 2 c; r 9 6 3 2 c; c 4 12 2 k; c 11 12 2 k; p 4 12 11 12 a; p 14 9 y
llave|La llave|key|home|c 4 8 3 y; c 4 8 1 .; r 7 7 8 2 y; r 12 9 1 3 y; r 14 9 1 2 y
camisa|La camisa|shirt|wear|r 4 4 8 10 b; r 1 4 3 4 b; r 12 4 3 4 b; r 6 3 4 2 w; r 7 5 2 1 .; p 8 7 8 9 8 11 w
ropa|La ropa|clothes|wear|l 8 3 3 5 A; l 8 3 13 5 A; l 3 5 13 5 A; p 8 2 8 1 9 1 A; r 4 6 8 8 r; r 2 6 3 3 r; r 11 6 3 3 r; r 7 6 2 1 .
mesa|La mesa|table|home|r 1 5 14 2 n; r 2 7 2 7 N; r 12 7 2 7 N; r 3 7 10 1 N
receta|La receta|recipe|food|r 3 2 10 12 w; r 3 2 10 2 r; r 5 6 6 1 A; r 5 8 6 1 A; r 5 10 6 1 A; r 5 12 3 1 A
manzana|La manzana|apple|food|c 8 9 5 r; r 8 2 1 3 N; r 9 3 3 2 g
platano|El plátano|banana|food|l 3 4 4 10 y; l 4 4 5 10 y; l 4 10 11 13 y; l 5 10 12 13 y; l 11 13 14 9 y; l 12 13 14 10 y; p 3 3 n; p 14 8 n
naranja|La naranja|orange|food|c 8 9 5 o; r 8 2 1 2 N; r 9 2 2 2 g; p 6 7 y
pan|El pan|bread|food|r 2 8 12 5 n; r 3 6 10 3 n; r 4 7 8 5 t; l 5 7 6 9 n; l 8 7 9 9 n
queso|El queso|cheese|food|r 2 8 12 5 y; r 2 6 9 2 y; r 2 5 5 1 y; p 6 10 o; p 10 11 o; p 4 8 o
huevo|El huevo|egg|food|r 5 4 6 9 w; r 4 6 8 5 w; r 6 3 4 1 w; r 6 13 4 1 w; p 10 11 a
leche|La leche|milk|food|r 4 5 8 9 w; r 4 2 8 3 b; r 6 1 4 1 b; r 6 9 4 3 b
agua|El agua|water|food|r 7 2 2 2 c; r 6 4 4 2 c; r 5 6 6 3 c; r 4 9 8 3 c; r 5 12 6 1 c; p 6 9 w
cafe|El café|coffee|food|r 3 6 8 7 w; r 11 7 3 3 w; r 12 8 1 1 .; r 4 7 6 2 N; r 2 13 10 1 a; p 5 2 5 4 7 3 7 5 a
helado|El helado|ice cream|food|c 8 5 3 m; r 5 7 7 1 m; r 5 8 7 1 t; r 6 9 5 1 t; r 7 10 3 1 t; r 7 11 2 2 t; p 8 14 t; p 6 4 w
pastel|El pastel|cake|food|r 2 10 12 4 n; r 2 8 12 2 m; r 7 4 2 4 c; r 7 2 2 2 y
tomate|El tomate|tomato|food|c 8 9 5 r; r 6 3 5 2 g; r 8 2 1 2 G
zanahoria|La zanahoria|carrot|food|r 2 5 6 2 o; r 4 7 6 2 o; r 6 9 6 2 o; r 8 11 4 2 o; r 10 13 2 1 o; r 1 2 2 3 g; r 2 1 3 2 g; r 4 3 2 2 g
uva|La uva|grapes|food|r 8 1 1 3 N; r 9 1 3 1 g; c 5 7 2 p; c 11 7 2 p; c 8 8 2 p; c 6 11 2 p; c 10 11 2 p; c 8 14 1 p
perro|El perro|dog|animal|r 4 4 8 7 n; r 2 4 2 5 N; r 12 4 2 5 N; r 6 8 4 3 t; r 7 8 2 1 k; p 6 6 9 6 k; p 8 11 m
gato|El gato|cat|animal|r 3 5 10 8 o; r 3 3 2 3 o; r 11 3 2 3 o; p 5 8 10 8 k; p 7 10 8 10 m
pajaro|El pájaro|bird|animal|c 7 9 4 b; c 11 6 2 b; p 13 6 14 6 o; p 11 5 k; r 5 8 4 2 B; r 1 9 3 2 B; p 6 14 8 14 o
pez|El pez|fish|animal|c 6 8 4 o; r 10 6 2 4 o; r 12 5 2 6 o; p 4 7 k; r 6 5 1 7 y
caballo|El caballo|horse|animal|r 4 3 4 3 n; r 4 6 7 5 n; r 5 11 5 3 n; r 9 8 4 4 n; p 6 5 k; r 3 3 1 6 N; p 12 10 k; r 5 1 1 2 n
vaca|La vaca|cow|animal|r 3 4 10 8 w; r 1 4 2 3 w; r 13 4 2 3 w; r 3 2 1 2 y; r 12 2 1 2 y; r 4 5 3 3 k; p 10 6 k; r 5 9 6 3 m; p 6 10 9 10 k
cerdo|El cerdo|pig|animal|r 3 4 10 9 m; r 3 3 2 2 m; r 11 3 2 2 m; r 5 8 6 4 s; p 6 10 9 10 N; p 5 6 10 6 k
conejo|El conejo|rabbit|animal|r 5 1 2 6 w; r 9 1 2 6 w; r 4 6 8 7 w; p 6 8 9 8 k; p 7 10 8 10 m; r 6 2 1 4 m; r 10 2 1 4 m
sol|El sol|sun|nature|c 8 8 3 y; p 8 1 8 2 8 14 8 15 1 8 2 8 14 8 15 8 3 3 12 3 3 12 12 12 y
luna|La luna|moon|nature|c 8 8 5 y; c 11 6 4 .
estrella|La estrella|star|nature|r 7 1 2 3 y; r 6 4 4 2 y; r 1 6 14 3 y; r 3 9 10 2 y; r 3 11 3 3 y; r 10 11 3 3 y
nube|La nube|cloud|nature|c 5 9 3 w; c 9 7 4 w; c 12 10 3 w; r 5 10 8 3 w
arbol|El árbol|tree|nature|c 8 6 5 g; r 7 10 2 5 n; p 5 5 10 7 G
flor|La flor|flower|nature|r 8 13 1 3 g; c 8 4 2 m; c 4 8 2 m; c 12 8 2 m; c 8 12 2 m; c 8 8 2 y
montana|La montaña|mountain|nature|r 7 3 2 2 w; r 6 5 4 2 A; r 5 7 6 2 A; r 4 9 8 2 A; r 3 11 10 2 A; r 1 13 14 2 A; r 6 5 4 1 w
casa|La casa|house|home|r 7 1 2 1 r; r 5 2 6 1 r; r 3 3 10 1 r; r 1 4 14 2 r; r 3 6 10 8 t; r 7 9 3 5 n; r 4 8 2 2 c
puerta|La puerta|door|home|r 4 1 8 14 N; r 5 2 6 12 n; r 6 3 4 4 N; r 6 9 4 4 N; p 10 8 y
ventana|La ventana|window|home|r 2 2 12 12 n; r 3 3 10 10 c; r 7 3 2 10 n; r 3 7 10 2 n
cama|La cama|bed|home|r 1 6 2 8 n; r 13 8 2 6 n; r 3 10 10 2 n; r 3 8 10 2 b; r 3 7 3 1 w
silla|La silla|chair|home|r 4 2 2 8 n; r 4 9 8 2 n; r 4 11 2 4 N; r 10 11 2 4 N; r 4 2 6 1 n
lampara|La lámpara|lamp|home|r 5 2 6 2 y; r 4 4 8 3 y; r 7 7 2 6 A; r 5 13 6 2 A
reloj|El reloj|clock|home|c 8 8 6 k; c 8 8 5 w; r 8 4 1 5 k; r 8 8 3 1 k
telefono|El teléfono|phone|home|r 4 1 8 14 k; r 5 2 6 9 c; c 8 13 1 A
cuchara|La cuchara|spoon|home|c 8 4 3 a; r 7 7 2 8 a
tenedor|El tenedor|fork|home|r 4 1 1 5 a; r 6 1 1 5 a; r 8 1 1 5 a; r 10 1 1 5 a; r 4 6 7 2 a; r 6 8 2 7 a
vaso|El vaso|glass|home|r 4 2 8 12 c; r 5 6 6 7 b
taza|La taza|mug|home|r 3 4 8 9 b; r 11 6 3 4 b; r 12 7 1 2 .
plato|El plato|plate|home|c 8 8 6 w; c 8 8 3 a
botella|La botella|bottle|home|r 7 1 2 4 G; r 5 5 6 10 g; r 5 8 6 3 w
cuchillo|El cuchillo|knife|home|r 7 1 2 9 a; r 9 3 1 6 a; r 6 10 4 5 N
television|La televisión|television|home|r 1 3 14 9 k; r 2 4 12 7 c; r 5 12 6 1 A; r 4 13 8 1 A
zapato|El zapato|shoe|wear|r 2 3 4 9 n; r 5 8 9 4 n; r 2 12 13 1 N; p 3 4 w
sombrero|El sombrero|hat|wear|r 5 3 6 7 t; r 1 10 14 2 t; r 5 8 6 2 r
gafas|Las gafas|glasses|wear|c 4 8 3 k; c 4 8 2 c; c 12 8 3 k; c 12 8 2 c; r 7 7 2 1 k
bolso|El bolso|bag|wear|r 5 3 6 1 N; r 5 3 1 5 N; r 10 3 1 5 N; r 3 7 10 7 r; r 3 7 10 2 N; p 8 9 y
paraguas|El paraguas|umbrella|wear|c 8 7 6 r; r 1 8 14 6 .; r 8 8 1 6 k; p 7 14 6 14 k
bicicleta|La bicicleta|bicycle|transport|c 4 11 3 k; c 4 11 2 .; c 12 11 3 k; c 12 11 2 .; l 4 11 7 6 r; l 7 6 12 11 r; l 4 11 8 11 r; r 11 4 3 1 k; l 12 11 11 4 r; r 5 4 3 1 k; l 7 6 6 4 r
autobus|El autobús|bus|transport|r 1 3 14 10 y; r 2 4 3 3 c; r 6 4 3 3 c; r 10 4 3 3 c; r 1 9 14 1 o; c 4 13 2 k; c 11 13 2 k
avion|El avión|airplane|transport|r 1 7 14 2 w; r 6 3 3 10 a; r 1 5 2 2 a; r 1 9 2 2 a; p 13 7 c
tren|El tren|train|transport|r 2 3 12 10 b; r 3 4 4 3 c; r 9 4 4 3 c; r 2 9 12 1 y; r 6 1 4 2 k; c 4 13 2 k; c 11 13 2 k
barco|El barco|boat|transport|r 8 1 1 8 N; r 9 2 4 6 w; r 2 9 12 2 r; r 3 11 10 1 r; r 0 13 16 2 b
lapiz|El lápiz|pencil|school|l 4 11 11 4 y; l 5 12 12 5 y; l 4 12 11 5 y; p 3 14 3 13 4 14 k; p 3 12 4 13 t; l 11 4 13 2 m; l 12 5 14 3 m
cuaderno|El cuaderno|notebook|school|r 3 2 10 12 g; r 3 2 2 12 G; r 6 4 6 9 w; r 7 6 4 1 A; r 7 8 4 1 A; r 7 10 4 1 A
tijeras|Las tijeras|scissors|school|l 5 1 11 11 a; l 11 1 5 11 a; c 4 13 2 r; c 12 13 2 r; c 4 13 1 .; c 12 13 1 .
ordenador|El ordenador|computer|school|r 2 2 12 8 A; r 3 3 10 6 c; r 7 10 2 2 A; r 3 13 10 2 a
pelota|La pelota|ball|misc|c 8 8 6 w; c 8 8 2 k; r 8 2 1 4 k; r 8 10 1 4 k; r 2 8 4 1 k; r 10 8 4 1 k
regalo|El regalo|gift|misc|r 2 6 12 8 r; r 7 6 2 8 y; r 2 9 12 2 y; r 5 3 3 3 y; r 8 3 3 3 y
moneda|La moneda|coin|misc|c 8 8 6 y; c 8 8 4 o; r 7 5 2 6 y
carta|La carta|letter|misc|r 1 4 14 9 w; l 1 4 7 9 a; l 14 4 8 9 a; l 1 13 6 8 a; l 14 13 9 8 a
guitarra|La guitarra|guitar|misc|c 5 11 4 n; c 8 8 2 n; c 5 11 1 N; l 9 7 14 2 N; l 10 7 14 3 N; r 13 0 3 2 N
bandera|La bandera|flag|misc|r 3 1 1 14 N; r 4 2 10 2 r; r 4 4 10 4 y; r 4 8 10 2 r
globo|El globo|balloon|misc|c 8 6 5 r; p 7 11 8 11 9 11 r; l 8 12 8 15 a; p 6 4 w
vela|La vela|candle|misc|r 6 7 4 7 m; r 8 5 1 2 k; r 7 2 2 3 y; p 8 3 o
cohete|El cohete|rocket|misc|r 6 3 4 9 w; r 7 1 2 3 r; r 4 9 2 4 r; r 10 9 2 4 r; c 8 6 1 c; r 7 12 2 3 o
mano|La mano|hand|body|r 4 7 8 6 s; r 4 3 1 4 s; r 6 2 1 5 s; r 8 2 1 5 s; r 10 3 1 4 s; r 2 8 2 3 s; r 5 13 6 2 s
ojo|El ojo|eye|body|r 2 6 12 4 w; r 4 5 8 6 w; r 3 4 10 1 k; r 3 11 10 1 k; c 8 8 2 b; p 8 8 k
corazon|El corazón|heart|body|c 5 5 3 r; c 11 5 3 r; r 3 6 10 2 r; r 4 8 8 2 r; r 5 10 6 1 r; r 7 11 2 2 r
boca|La boca|mouth|body|r 2 5 12 6 r; r 3 7 10 2 k; r 4 7 8 1 w
diente|El diente|tooth|body|r 4 2 8 7 w; r 4 8 3 6 w; r 9 8 3 6 w
escalera|La escalera|ladder|misc|r 4 1 2 14 n; r 10 1 2 14 n; r 6 3 4 1 n; r 6 6 4 1 n; r 6 9 4 1 n; r 6 12 4 1 n
martillo|El martillo|hammer|misc|r 7 6 2 9 n; r 3 2 10 4 A; r 3 2 10 1 a
bombilla|La bombilla|light bulb|home|c 8 6 5 y; r 6 10 4 2 y; r 6 12 4 1 a; r 6 13 4 1 A; r 7 14 2 1 A; p 6 4 w
corona|La corona|crown|misc|r 2 7 12 6 y; r 2 4 2 3 y; r 7 3 2 4 y; r 12 4 2 3 y; p 5 10 r; p 8 10 b; p 11 10 r
castillo|El castillo|castle|misc|r 2 6 12 8 A; r 2 3 3 3 A; r 7 3 2 3 A; r 11 3 3 3 A; r 6 10 4 4 N; p 3 8 12 8 k
campana|La campana|bell|misc|r 7 1 2 2 y; c 8 7 4 y; r 4 8 8 4 y; r 2 12 12 2 y; c 8 15 1 o
trofeo|El trofeo|trophy|misc|r 4 2 8 5 y; r 5 7 6 2 y; r 7 9 2 3 y; r 5 12 6 2 y; r 2 3 2 3 y; r 12 3 2 3 y
"""

rows = [ln.split("|") for ln in TABLE.strip().splitlines()]
assert all(len(r) == 5 for r in rows), "every line needs 5 fields"
ids = [r[0] for r in rows]
assert len(ids) == len(set(ids)), "duplicate id"
cats = {}
for r in rows:
    cats.setdefault(r[3], []).append(r[0])

items = [
    {"id": i, "label": label, "spoken": label.lower(), "gloss": gloss,
     "art": art.strip(), "confuseGroup": [x for x in cats[cat] if x != i]}
    for i, label, gloss, cat, art in rows
]
head = {"id": "nouns", "title": "Common nouns (pictures)",
        "instructions": "Listen to the noun and choose the matching picture.",
        "audioPath": "audio/nouns/", "fallbackLang": "es-ES"}
out = Path(__file__).resolve().parent.parent / "data" / "nouns.json"
body = ",\n".join("    " + json.dumps(it, ensure_ascii=False) for it in items)
out.write_text(json.dumps(head, ensure_ascii=False, indent=2)[:-2]
               + f',\n  "items": [\n{body}\n  ]\n}}\n', encoding="utf-8")
print(f"wrote {out.name}: {len(items)} nouns")
