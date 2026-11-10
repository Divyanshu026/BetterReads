import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const base = process.env.VITE_BASE_PATH || '/';
export default defineConfig({
  base,
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  plugins: [tailwindcss(), {
    name: 'github-pages-route-fallback',
    generateBundle() {
      const basePath = JSON.stringify(base.endsWith('/') ? base : `${base}/`);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>BetterReads</title><script>(function(){var base=${basePath};var path=location.pathname;if(path.indexOf(base)!==0){return;}var route='/' + path.slice(base.length) + location.search + location.hash;location.replace(base+'?__br_path='+encodeURIComponent(route));}());</script></head><body>Opening BetterReads…</body></html>`;
      this.emitFile({ type: 'asset', fileName: '404.html', source: html });
    },
  }],
  server: { proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' } },
});
