/* Explicit-click, same-origin file delivery only. No lesson answers or progress. */
(function (root) {
  'use strict';
  const MAX_BYTES = 65536;
  const TIMEOUT_MS = 15000;
  const FILES = Object.freeze({
    'blank-draft.document.json': 'application/json',
    'worked-v1.document.json': 'application/json',
    'worked-v2.document.json': 'application/json',
    'starter/worked/cv-v1.document.json': 'application/json',
    'starter/worked/cv-v2.document.json': 'application/json',
    'starter/worked/cover-letter-v1.document.json': 'application/json',
    'starter/worked/cover-letter-v2.document.json': 'application/json',
    'index.txt': 'text/plain', 'guided.txt': 'text/plain',
    'transfer.txt': 'text/plain', 'hints.txt': 'text/plain',
    'checks.txt': 'text/plain', 'keep-and-reopen.txt': 'text/plain'
  });
  function install(env) {
    const doc = env.document;
    const status = doc.getElementById('download-status');
    const script = doc.currentScript;
    if (!status || !script || !env.fetch || !env.AbortController || !env.Blob || !env.TextDecoder || !env.URL.createObjectURL || !/^https?:$/.test(env.location.protocol)) return null;
    const base = new env.URL('./', script.src);
    if (base.origin !== env.location.origin) return null;
    let busy = false;
    const say = message => { status.textContent = message; };
    async function handle(event) {
      // Keep navigation, modified clicks and ordinary no-JS anchors intact.
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest && event.target.closest('a[download]');
      if (!anchor || (anchor.target && anchor.target !== '_self')) return;
      let url;
      try { url = new env.URL(anchor.getAttribute('href'), env.location.href); } catch (_) { return; }
      if (url.origin !== base.origin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(base.pathname)) return;
      const route = url.pathname.slice(base.pathname.length);
      if (!Object.hasOwn(FILES, route)) return;
      const filename = route.split('/').pop();
      if (anchor.getAttribute('download') !== filename) return;
      event.preventDefault();
      if (busy) { say('A download is being prepared. Please wait before requesting another.'); return; }
      busy = true;
      say('Preparing ' + filename + ' for download.');
      const controller = new env.AbortController();
      const timer = env.setTimeout(() => controller.abort(), TIMEOUT_MS);
      let reader;
      try {
        const response = await env.fetch(url.href, { method: 'GET', mode: 'same-origin', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal });
        if (!response.ok || response.redirected || response.url !== url.href || !response.body) throw new Error('Unavailable response');
        const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (type !== FILES[route]) throw new Error('Unexpected file type');
        const declared = response.headers.get('content-length');
        if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) throw new Error('Invalid file length');
        reader = response.body.getReader();
        const chunks = []; let count = 0;
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          count += item.value.byteLength;
          if (count > MAX_BYTES) throw new Error('File too large');
          chunks.push(item.value);
        }
        if (!count || controller.signal.aborted) throw new Error('Empty or expired download');
        const blob = new env.Blob(chunks, { type: FILES[route] + ';charset=utf-8' });
        const text = new env.TextDecoder('utf-8', { fatal: true }).decode(await blob.arrayBuffer());
        if (type === 'application/json') {
          const parsed = JSON.parse(text);
          if (!parsed || parsed.schema !== 'free4allhub-document' || parsed.version !== 1 || !parsed.document) throw new Error('Unexpected document');
        }
        if (controller.signal.aborted) throw new Error('Expired download');
        const objectURL = env.URL.createObjectURL(blob);
        const link = doc.createElement('a');
        link.href = objectURL; link.download = filename;
        try { doc.body.append(link); link.click(); }
        finally { link.remove(); env.setTimeout(() => env.URL.revokeObjectURL(objectURL), 60000); }
        say('Download requested; locate and reopen the saved file.');
      } catch (_) {
        say('Could not prepare this download. No saved file is confirmed. You can retry the link, or use the ordinary link with JavaScript disabled.');
      } finally {
        if (reader) { try { reader.cancel().catch(() => {}); } catch (_) {} }
        controller.abort(); env.clearTimeout(timer); busy = false;
      }
    }
    doc.addEventListener('click', handle);
    return { handle };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { install, MAX_BYTES, TIMEOUT_MS, FILES };
  else install(root);
})(globalThis);
