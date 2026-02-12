const $ = (s) => document.querySelector(s);

const BASE = 'https://letsmeet.link';

async function init() {
  const { apiKey, bookingSlug } = await chrome.storage.sync.get(['apiKey', 'bookingSlug']);

  if (!apiKey || !bookingSlug) {
    $('#no-config').style.display = 'block';
    $('#configured').style.display = 'none';
  } else {
    $('#no-config').style.display = 'none';
    $('#configured').style.display = 'block';
    const link = `${BASE}/${bookingSlug}`;
    $('#booking-link').value = link;
    $('#dashboard-link').href = `${BASE}/dashboard`;
    loadEventTypes(apiKey);
  }
}

async function loadEventTypes(apiKey) {
  const container = $('#event-types');
  try {
    const res = await fetch(`${BASE}/api/event-types`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const types = data.eventTypes || data.event_types || data || [];
    if (!Array.isArray(types) || types.length === 0) {
      container.innerHTML = '<p class="muted">No event types found.</p>';
      return;
    }
    container.innerHTML = types.map(et => {
      const name = et.title || et.name || 'Untitled';
      const slug = et.slug || et.id || '';
      return `<div class="event-item"><span>${name}</span><a href="${BASE}/${slug}" target="_blank">Open</a></div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = `<p class="muted">Could not load event types.</p>`;
  }
}

// Copy link
$('#copy-link').addEventListener('click', async () => {
  const link = $('#booking-link').value;
  await navigator.clipboard.writeText(link);
  const btn = $('#copy-link');
  btn.textContent = '✓';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1500);
});

// Share
$('#share-btn').addEventListener('click', async () => {
  const link = $('#booking-link').value;
  if (navigator.share) {
    navigator.share({ title: 'Book a meeting with me', url: link }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(link);
    $('#share-btn').textContent = 'Link copied!';
    setTimeout(() => { $('#share-btn').textContent = 'Share scheduling link'; }, 1500);
  }
});

// Settings navigation
$('#gear-btn').addEventListener('click', showSettings);
$('#open-settings').addEventListener('click', showSettings);
$('#back-btn').addEventListener('click', () => {
  $('#settings-view').style.display = 'none';
  $('#main-view').style.display = 'block';
  init();
});

async function showSettings() {
  $('#main-view').style.display = 'none';
  $('#settings-view').style.display = 'block';
  const { apiKey, bookingSlug } = await chrome.storage.sync.get(['apiKey', 'bookingSlug']);
  $('#api-key').value = apiKey || '';
  $('#booking-slug').value = bookingSlug || '';
}

$('#save-settings').addEventListener('click', async () => {
  const apiKey = $('#api-key').value.trim();
  const bookingSlug = $('#booking-slug').value.trim();
  await chrome.storage.sync.set({ apiKey, bookingSlug });
  $('#settings-view').style.display = 'none';
  $('#main-view').style.display = 'block';
  init();
});

init();
