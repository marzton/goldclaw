const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Goldclaw</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f7f5ef;
        color: #171717;
      }
      main {
        width: min(680px, calc(100vw - 48px));
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 6vw, 4.5rem);
        line-height: 1;
      }
      p {
        margin: 0 0 16px;
        font-size: 1rem;
      }
      code {
        font: 0.95em ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      }
      .meta {
        color: #545454;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #141411;
          color: #f7f5ef;
        }
        .meta {
          color: #b8b4aa;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Goldclaw</h1>
      <p>Collaboration repo for Goldshore planning, MCP, and Cloudflare Worker experiments.</p>
      <p class="meta">The deployable Worker lives in <code>workers/goldshore</code>. This Pages build type-checks that Worker and publishes this repo status page.</p>
    </main>
  </body>
</html>
`;

fs.writeFileSync(path.join(outDir, "index.html"), html);
fs.writeFileSync(
  path.join(outDir, "_headers"),
  "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n",
);
