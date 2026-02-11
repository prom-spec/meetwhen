/**
 * letsmeet.link Embed Widget
 * Lightweight embed script (<5KB) - no dependencies
 * 
 * Usage:
 *   <div data-letsmeet-url="https://letsmeet.link/john/30min" data-letsmeet-mode="inline"></div>
 *   <script src="https://letsmeet.link/embed.js" async></script>
 */
(function() {
  'use strict';
  if (window.__letsmeetLoaded) return;
  window.__letsmeetLoaded = true;

  var STYLES_ID = 'letsmeet-styles';
  var CSS = '\
.lm-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s}\
.lm-overlay.lm-active{opacity:1}\
.lm-modal{background:#fff;border-radius:12px;width:90%;max-width:680px;height:85vh;max-height:700px;position:relative;overflow:hidden;transform:scale(0.95);transition:transform .2s}\
.lm-overlay.lm-active .lm-modal{transform:scale(1)}\
.lm-close{position:absolute;top:8px;right:8px;width:32px;height:32px;border:none;background:rgba(0,0,0,0.06);border-radius:50%;cursor:pointer;font-size:18px;line-height:32px;text-align:center;z-index:1;color:#333}\
.lm-close:hover{background:rgba(0,0,0,0.12)}\
.lm-iframe{width:100%;height:100%;border:none}\
.lm-inline{width:100%;min-height:600px;border:none;border-radius:8px}\
.lm-panel{position:fixed;top:0;right:-420px;width:420px;max-width:100%;height:100%;z-index:99999;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,0.15);transition:right .3s}\
.lm-panel.lm-active{right:0}\
.lm-panel-backdrop{position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;background:rgba(0,0,0,0.3);opacity:0;transition:opacity .2s}\
.lm-panel-backdrop.lm-active{opacity:1}\
.lm-fab{position:fixed;bottom:24px;right:24px;z-index:99997;border:none;color:#fff;padding:12px 24px;border-radius:50px;cursor:pointer;font-size:15px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:transform .15s,box-shadow .15s}\
.lm-fab:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.25)}\
';

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    var s = document.createElement('style');
    s.id = STYLES_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function embedUrl(url) {
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    return url + sep + 'embed=true';
  }

  function createIframe(url, cls) {
    var f = document.createElement('iframe');
    f.src = embedUrl(url);
    f.className = cls;
    f.setAttribute('loading', 'lazy');
    f.allow = 'payment';
    return f;
  }

  function setupInline(el, url) {
    el.innerHTML = '';
    el.appendChild(createIframe(url, 'lm-inline'));
  }

  function setupPopup(el, url) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function(e) {
      e.preventDefault();
      openModal(url);
    });
  }

  function openModal(url) {
    var overlay = document.createElement('div');
    overlay.className = 'lm-overlay';
    var modal = document.createElement('div');
    modal.className = 'lm-modal';
    var close = document.createElement('button');
    close.className = 'lm-close';
    close.innerHTML = '&times;';
    close.onclick = function() { destroy(); };
    overlay.onclick = function(e) { if (e.target === overlay) destroy(); };
    modal.appendChild(close);
    modal.appendChild(createIframe(url, 'lm-iframe'));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('lm-active'); });
    function destroy() {
      overlay.classList.remove('lm-active');
      setTimeout(function() { overlay.remove(); }, 200);
    }
  }

  function setupFloating(el, url) {
    var text = el.getAttribute('data-letsmeet-text') || 'Book a meeting';
    var color = el.getAttribute('data-letsmeet-color') || '#0066FF';
    el.style.display = 'none';

    var fab = document.createElement('button');
    fab.className = 'lm-fab';
    fab.textContent = text;
    fab.style.backgroundColor = color;
    document.body.appendChild(fab);

    var backdrop = null, panel = null;
    fab.addEventListener('click', function() {
      if (panel) { closePanel(); return; }
      backdrop = document.createElement('div');
      backdrop.className = 'lm-panel-backdrop';
      backdrop.onclick = closePanel;
      panel = document.createElement('div');
      panel.className = 'lm-panel';
      var close = document.createElement('button');
      close.className = 'lm-close';
      close.innerHTML = '&times;';
      close.onclick = closePanel;
      panel.appendChild(close);
      panel.appendChild(createIframe(url, 'lm-iframe'));
      document.body.appendChild(backdrop);
      document.body.appendChild(panel);
      requestAnimationFrame(function() {
        backdrop.classList.add('lm-active');
        panel.classList.add('lm-active');
      });
    });

    function closePanel() {
      if (backdrop) { backdrop.classList.remove('lm-active'); }
      if (panel) { panel.classList.remove('lm-active'); }
      setTimeout(function() {
        if (backdrop) { backdrop.remove(); backdrop = null; }
        if (panel) { panel.remove(); panel = null; }
      }, 300);
    }
  }

  function init() {
    injectStyles();
    var els = document.querySelectorAll('[data-letsmeet-url]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.__letsmeetInit) continue;
      el.__letsmeetInit = true;
      var url = el.getAttribute('data-letsmeet-url');
      var mode = el.getAttribute('data-letsmeet-mode') || 'inline';
      if (mode === 'inline') setupInline(el, url);
      else if (mode === 'popup') setupPopup(el, url);
      else if (mode === 'floating') setupFloating(el, url);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
