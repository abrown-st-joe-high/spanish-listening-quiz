/* Pixel-art renderer. Turns a tiny drawing script (see
   scripts/generate_nouns.py for the format) into a 16x16 image URL. */
const PIX_SIZE = 16;
const PIX_PALETTE = {
  k: "#1e1e24", w: "#ffffff", a: "#b8bcc4", A: "#6b7078", r: "#d93a2f",
  o: "#f58a2d", y: "#f7cf3d", g: "#3fae52", G: "#1f6f3a", b: "#3f74d8",
  B: "#1d3f8f", c: "#7ccdf0", p: "#8d5bd0", n: "#9a6232", N: "#5b3a1c",
  t: "#e8c994", s: "#f3c9a6", m: "#f293b5",
};
const pixCache = new Map();

function pixelArtURL(script) {
  if (pixCache.has(script)) return pixCache.get(script);
  const cv = document.createElement("canvas");
  cv.width = cv.height = PIX_SIZE;
  const ctx = cv.getContext("2d");

  const dot = (x, y, col) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= PIX_SIZE || y >= PIX_SIZE) return;
    if (col === ".") { ctx.clearRect(x, y, 1, 1); return; }
    ctx.fillStyle = PIX_PALETTE[col] || "#ff00ff";
    ctx.fillRect(x, y, 1, 1);
  };

  script.split(";").forEach((part) => {
    const t = part.trim().split(/\s+/);
    if (!t[0]) return;
    const op = t[0], col = t[t.length - 1], n = t.slice(1, -1).map(Number);
    if (op === "r") {
      for (let y = n[1]; y < n[1] + n[3]; y++)
        for (let x = n[0]; x < n[0] + n[2]; x++) dot(x, y, col);
    } else if (op === "c") {
      const [cx, cy, rad] = n;
      for (let y = cy - rad; y <= cy + rad; y++)
        for (let x = cx - rad; x <= cx + rad; x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + rad) dot(x, y, col);
    } else if (op === "l") {
      const [x1, y1, x2, y2] = n;
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) || 1;
      for (let i = 0; i <= steps; i++) dot(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps, col);
    } else if (op === "p") {
      for (let i = 0; i + 1 < n.length; i += 2) dot(n[i], n[i + 1], col);
    }
  });

  const url = cv.toDataURL();
  pixCache.set(script, url);
  return url;
}
