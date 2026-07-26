import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GameGenie dev writer: lets the in-game "Capture layout" button save a captured
 * scene straight into `public/gg/<name>.gg.json` via `POST /__gg/write`.
 * Dev-only (Vite middleware); does nothing in a production build.
 */
function ggWriter(): Plugin {
  return {
    name: 'gg-writer',
    configureServer(server) {
      server.middlewares.use('/__gg/write', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { name, json } = JSON.parse(body) as { name: string; json: string };
            const safe = String(name).replace(/[^a-z0-9_-]/gi, '') || 'scene';
            const root = server.config.root;
            fs.mkdirSync(path.resolve(root, 'public/gg'), { recursive: true });
            // Never clobber a curated/wired file: write `.captured` if it exists.
            let rel = `public/gg/${safe}.gg.json`;
            if (fs.existsSync(path.resolve(root, rel))) {
              rel = `public/gg/${safe}.captured.gg.json`;
            }
            fs.writeFileSync(path.resolve(root, rel), String(json));
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: rel }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [ggWriter()],
});
