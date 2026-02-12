const BASE = 'https://letsmeet.link';

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'letsmeet-schedule',
    title: 'Schedule with letsmeet.link',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'letsmeet-schedule') {
    const { bookingSlug } = await chrome.storage.sync.get(['bookingSlug']);
    const url = bookingSlug ? `${BASE}/${bookingSlug}` : BASE;
    chrome.tabs.create({ url });
  }
});

// Message handler for content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getBookingLink') {
    chrome.storage.sync.get(['bookingSlug']).then(({ bookingSlug }) => {
      sendResponse({ link: bookingSlug ? `${BASE}/${bookingSlug}` : null });
    });
    return true; // async
  }
});
