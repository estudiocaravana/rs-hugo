// editor-bridge.js (Versión Quirúrgica con Índices de Cheerio)
const http = require("http");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const { filePath, elementId, childTag, childIndex, newClasses } = JSON.parse(body);
        const fullPath = path.join(process.cwd(), filePath);

        if (!fs.existsSync(fullPath)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: `Archivo no encontrado: ${filePath}` }));
        }

        let htmlContent = fs.readFileSync(fullPath, "utf8");
        const $ = cheerio.load(htmlContent, { xmlMode: false }, false);

        const parentSelector = `[data-editable="${filePath}:${elementId}"]`;
        const $parent = $(parentSelector);

        if ($parent.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "No se encontró el contenedor padre." }));
        }

        // USO DEL ÍNDICE ESTRICTO (.eq) PARA EVITAR MUTACIONES HERMANAS
        if (childTag && childTag.trim() !== "") {
          const $children = $parent.find(childTag);
          // Buscamos el elemento exacto por su número de orden recibido
          const targetIndex = parseInt(childIndex, 10) || 0;
          const $specificChild = $children.eq(targetIndex);

          if ($specificChild.length > 0) {
            $specificChild.attr("class", newClasses);
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "No se encontró el hijo en esa posición específica." }));
          }
        } else {
          $parent.attr("class", newClasses);
        }

        fs.writeFileSync(fullPath, $.html(), "utf8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => console.log(`🚀 Puente Quirúrgico corriendo en http://localhost:${PORT}`));
