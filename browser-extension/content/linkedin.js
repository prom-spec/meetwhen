// LinkedIn profile integration — adds a "Schedule a meeting" button
(function () {
  const BUTTON_CLASS = 'letsmeet-linkedin-btn';
  const CHECK_INTERVAL = 2500;

  function createButton() {
    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.textContent = '📅 Schedule a meeting';
    btn.style.cssText = `
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; margin: 8px 8px 8px 0; border-radius: 20px;
      background: #2563eb; color: #fff; font-size: 14px; font-weight: 600;
      border: none; cursor: pointer; font-family: inherit;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#1d4ed8'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#2563eb'; });

    btn.addEventListener('click', async () => {
      const { link } = await chrome.runtime.sendMessage({ type: 'getBookingLink' });
      if (!link) {
        alert('Please configure your letsmeet.link booking slug in the extension popup.');
        return;
      }
      window.open(link, '_blank');
    });
    return btn;
  }

  function inject() {
    if (document.querySelector(`.${BUTTON_CLASS}`)) return;
    // LinkedIn profile action buttons area
    const actionBar = document.querySelector('.pvs-profile-actions') ||
                      document.querySelector('.pv-top-card-v2-ctas') ||
                      document.querySelector('.pv-top-card__cta-container') ||
                      document.querySelector('[class*="profile-actions"]');
    if (actionBar) {
      actionBar.appendChild(createButton());
      return;
    }
    // Fallback: insert after the main profile section
    const header = document.querySelector('.pv-top-card') || document.querySelector('.scaffold-layout__main');
    if (header && !document.querySelector(`.${BUTTON_CLASS}`)) {
      header.appendChild(createButton());
    }
  }

  setInterval(inject, CHECK_INTERVAL);
  inject();
})();
