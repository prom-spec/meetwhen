// Gmail compose integration — injects a "Schedule with letsmeet.link" button
(function () {
  const BUTTON_CLASS = 'letsmeet-gmail-btn';
  const CHECK_INTERVAL = 2000;

  function createButton() {
    const btn = document.createElement('div');
    btn.className = BUTTON_CLASS;
    btn.setAttribute('role', 'button');
    btn.setAttribute('data-tooltip', 'Insert letsmeet.link scheduling link');
    btn.style.cssText = `
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; margin-left: 8px; border-radius: 4px;
      background: #2563eb; color: #fff; font-size: 12px; font-family: inherit;
      cursor: pointer; user-select: none; vertical-align: middle;
    `;
    btn.innerHTML = '📅 letsmeet.link';

    btn.addEventListener('mouseenter', () => { btn.style.background = '#1d4ed8'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#2563eb'; });

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { link } = await chrome.runtime.sendMessage({ type: 'getBookingLink' });
      if (!link) {
        alert('Please configure your letsmeet.link booking slug in the extension popup.');
        return;
      }
      // Find the compose body (contenteditable div)
      const compose = btn.closest('.iN');
      const body = compose
        ? compose.querySelector('[role="textbox"][contenteditable="true"], .Am.Al.editable')
        : document.querySelector('[role="textbox"][contenteditable="true"]');
      if (body) {
        const p = document.createElement('p');
        p.innerHTML = `<br>Book a time with me: <a href="${link}">${link}</a>`;
        body.appendChild(p);
        body.focus();
      }
    });

    return btn;
  }

  function inject() {
    // Gmail compose toolbar rows
    const toolbars = document.querySelectorAll('.btC');
    toolbars.forEach((toolbar) => {
      if (toolbar.querySelector(`.${BUTTON_CLASS}`)) return;
      const sendBtn = toolbar.querySelector('[role="button"]');
      if (sendBtn) {
        const btn = createButton();
        // Insert after the send button row area
        sendBtn.parentElement.appendChild(btn);
      }
    });
  }

  // Poll for new compose windows
  setInterval(inject, CHECK_INTERVAL);
  inject();
})();
