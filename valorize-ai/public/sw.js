/* Valorize AI — Service Worker
 * Após a PRIMEIRA visita com internet, o app abre pelo atalho mesmo offline:
 *  - Tela e arquivos do app: cache (abre instantâneo)
 *  - Cotações (/api/stock/...): tenta a rede; sem internet, usa a última consulta salva
 *  - IA (/api/ai/...): só online
 * Ao publicar uma nova versão, aumente VERSION para forçar a atualização.
 */
const VERSION = 'valorize-v2.5.0';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon.svg', '/favicon.ico', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

const networkFirst = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) {
      const h = new Headers(hit.headers);
      h.set('X-Valorize-Offline', '1'); // o app pode avisar "dados da última conexão"
      return new Response(await hit.blob(), { status: 200, headers: h });
    }
    throw new Error('offline');
  }
};

const cacheFirst = async (req) => {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes do Google: cache após o primeiro uso
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(cacheFirst(req).catch(() => new Response('', { status: 504 })));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/ai/')) return; // IA sempre online
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(req, DATA).catch(() =>
      new Response(JSON.stringify({ error: 'Sem internet e sem dados salvos desta consulta. Conecte-se e tente novamente.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Navegação: rede primeiro; offline cai no app salvo
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match('/')));
    return;
  }

  // JS/CSS com hash, ícones: cache primeiro
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || /\.(ico|svg|png|webmanifest)$/.test(url.pathname)) {
    e.respondWith(cacheFirst(req));
  }
});
