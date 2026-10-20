#!/usr/bin/env python3
"""Generate data/numbers-30.json, numbers-100.json, numbers-1000.json.
All three share audio/numbers/, so each sound is recorded only once.
Usage: python scripts/generate_numbers.py
"""
import json
from pathlib import Path

UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
         "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
         "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
         "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"]
TENS = {3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa"}
HUNDREDS = {1: "ciento", 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos",
            6: "seiscientos", 7: "setecientos", 8: "ochocientos", 9: "novecientos"}


def words(n):
    if n < 30:
        return UNITS[n]
    if n < 100:
        t, r = divmod(n, 10)
        return TENS[t] if r == 0 else f"{TENS[t]} y {UNITS[r]}"
    if n == 100:
        return "cien"
    if n < 1000:
        h, r = divmod(n, 100)
        return HUNDREDS[h] if r == 0 else f"{HUNDREDS[h]} {words(r)}"
    return "mil"


def confusables(n, top):
    """Teen/tens pairs (13/30, 14/40 ...) first, then neighbours."""
    d = n % 100
    base = n - d
    out = []
    if 13 <= d <= 19:
        out.append(base + (d - 10) * 10)
    elif d in (30, 40, 50, 60, 70, 80, 90):
        out.append(base + d // 10 + 10)
    out += [n + 1, n - 1]
    return [str(x) for x in out if 0 <= x <= top and x != n]


def build(top, title):
    return {
        "id": f"numbers-{top}", "title": title,
        "instructions": "Listen to the number and choose the matching digits.",
        "audioPath": "audio/numbers/", "fallbackLang": "es-ES",
        "items": [{"id": str(n), "label": str(n), "spoken": words(n),
                   "confuseGroup": confusables(n, top)} for n in range(top + 1)],
    }


out = Path(__file__).resolve().parent.parent / "data"
for top in (30, 100, 1000):
    data = build(top, f"Numbers 0–{top}")
    lines = ",\n".join("    " + json.dumps(i, ensure_ascii=False) for i in data.pop("items"))
    head = json.dumps(data, ensure_ascii=False, indent=2)[:-2]
    (out / f"numbers-{top}.json").write_text(f'{head},\n  "items": [\n{lines}\n  ]\n}}\n', encoding="utf-8")
    print("wrote", f"numbers-{top}.json")
