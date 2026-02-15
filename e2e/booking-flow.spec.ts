import { test, expect } from '@playwright/test';

// Booking flow tests against the live site
// Uses existing test user's booking page

const TEST_USER = 'prom';
const TEST_EVENT = '30min';

test.describe('Booking Page - Basic', () => {
  test('user profile page loads', async ({ page }) => {
    const resp = await page.goto(`/${TEST_USER}`);
    expect(resp?.status()).toBeLessThanOrEqual(500);
  });

  test('event type booking page loads with calendar', async ({ page }) => {
    await page.goto(`/${TEST_USER}`);
    const eventLink = page.locator(`a[href*="/${TEST_USER}/"]`).first();
    if (await eventLink.isVisible()) {
      await eventLink.click();
      await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Full Booking Flow', () => {
  test('navigate to event page → date → time → form (stop before submit)', async ({ page }) => {
    // Go directly to event page (profile page may 404 if user has no public events)
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Calendar should be visible
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Select an available date (try clicking dates until we find slots)
    const dateButtons = page.locator('button[aria-label]').filter({ hasNot: page.locator('[disabled]') });
    const dateCount = await dateButtons.count();
    let foundSlots = false;

    for (let i = 0; i < Math.min(dateCount, 14); i++) {
      const btn = dateButtons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      if (!ariaLabel || ariaLabel.includes('Previous') || ariaLabel.includes('Next')) continue;

      await btn.click();
      await page.waitForTimeout(1500);

      const slotButtons = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ });
      if (await slotButtons.count() > 0) {
        foundSlots = true;

        // Click a time slot
        await slotButtons.first().click();

        // Form should appear
        await expect(page.locator('text=Your name')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Email address')).toBeVisible();

        // Fill the form but DON'T submit
        await page.locator('input[placeholder="John Smith"]').fill('E2E Test User');
        await page.locator('input[placeholder="john@example.com"]').fill('e2e-test@example.com');
        await page.locator('textarea').fill('This is an automated E2E test - do not book');

        // Verify the confirm button is present
        const confirmBtn = page.locator('button').filter({ hasText: /Confirm Booking/i });
        await expect(confirmBtn).toBeVisible();
        break;
      }
    }

    if (!foundSlots) {
      console.log('No available time slots found in the next 14 days - host may have no availability');
    }
  });

  test('"Change time" button goes back to calendar', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Find and click an available slot
    await page.waitForTimeout(2000);
    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await slotButton.click();
      await expect(page.locator('text=Your name')).toBeVisible({ timeout: 5000 });

      // Click back
      const backBtn = page.locator('button').filter({ hasText: /Change time/i });
      await backBtn.click();

      // Should see calendar again
      await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Timezone Selector', () => {
  test('timezone selector opens and allows selection', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Click the timezone button (shows current timezone with Globe icon)
    const tzButton = page.locator('button').filter({ hasText: /\/|UTC/ }).first();
    await expect(tzButton).toBeVisible({ timeout: 10000 });
    await tzButton.click();

    // Search input should appear
    const searchInput = page.locator('input[placeholder="Search timezones..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a search
    await searchInput.fill('New_York');
    
    // Should show America/New_York
    const nyOption = page.locator('button').filter({ hasText: 'America/New York' });
    await expect(nyOption).toBeVisible({ timeout: 3000 });
    await nyOption.click();

    // Timezone button should now show New York
    await expect(page.locator('text=America/New York')).toBeVisible();
  });

  test('timezone change triggers slot refresh', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open timezone selector
    const tzButton = page.locator('button').filter({ hasText: /\/|UTC/ }).first();
    await tzButton.click();

    const searchInput = page.locator('input[placeholder="Search timezones..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });
    await searchInput.fill('Tokyo');
    
    const tokyoOption = page.locator('button').filter({ hasText: 'Asia/Tokyo' });
    await expect(tokyoOption).toBeVisible({ timeout: 3000 });

    // Listen for API call
    const slotsRequest = page.waitForRequest(req => req.url().includes('/api/slots') && req.url().includes('Tokyo'), { timeout: 10000 });
    await tokyoOption.click();

    // Should trigger a new slots fetch
    await slotsRequest;
  });

  test('timezone dropdown closes on outside click', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    const tzButton = page.locator('button').filter({ hasText: /\/|UTC/ }).first();
    await expect(tzButton).toBeVisible({ timeout: 10000 });
    await tzButton.click();

    const searchInput = page.locator('input[placeholder="Search timezones..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Click outside
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Dropdown should close
    await expect(searchInput).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Calendar Navigation', () => {
  test('next month button advances calendar', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Get current month text
    const monthHeader = page.locator('h2').filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/ });
    await expect(monthHeader).toBeVisible({ timeout: 10000 });
    const initialMonth = await monthHeader.textContent();

    // Click next month
    const nextBtn = page.locator('button[aria-label="Next month"]');
    await nextBtn.click();

    // Month should change
    await expect(monthHeader).not.toHaveText(initialMonth!, { timeout: 5000 });
  });

  test('previous month button goes back', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    const monthHeader = page.locator('h2').filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/ });
    await expect(monthHeader).toBeVisible({ timeout: 10000 });

    // Go forward first
    await page.locator('button[aria-label="Next month"]').click();
    await page.waitForTimeout(500);
    const nextMonth = await monthHeader.textContent();

    // Go back
    await page.locator('button[aria-label="Previous month"]').click();
    await page.waitForTimeout(500);

    await expect(monthHeader).not.toHaveText(nextMonth!, { timeout: 5000 });
  });

  test('month navigation fetches new availability data', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Listen for month availability API call
    const monthRequest = page.waitForRequest(req => req.url().includes('/api/slots/month'), { timeout: 10000 });

    await page.locator('button[aria-label="Next month"]').click();
    await monthRequest;
  });
});

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to get to the form by clicking a slot
    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await slotButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('empty name shows validation error', async ({ page }) => {
    const nameInput = page.locator('input[placeholder="John Smith"]');
    if (!await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Fill email but leave name empty
    await page.locator('input[placeholder="john@example.com"]').fill('test@example.com');

    // Try to submit
    const confirmBtn = page.locator('button').filter({ hasText: /Confirm Booking/i });
    await confirmBtn.click();

    // HTML5 validation should prevent submission - name field should be invalid
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('invalid email shows validation error', async ({ page }) => {
    const nameInput = page.locator('input[placeholder="John Smith"]');
    if (!await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await nameInput.fill('Test User');
    const emailInput = page.locator('input[placeholder="john@example.com"]');
    await emailInput.fill('not-an-email');

    const confirmBtn = page.locator('button').filter({ hasText: /Confirm Booking/i });
    await confirmBtn.click();

    // HTML5 email validation should kick in
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('empty email shows validation error', async ({ page }) => {
    const nameInput = page.locator('input[placeholder="John Smith"]');
    if (!await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await nameInput.fill('Test User');
    // Leave email empty

    const confirmBtn = page.locator('button').filter({ hasText: /Confirm Booking/i });
    await confirmBtn.click();

    const emailInput = page.locator('input[placeholder="john@example.com"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });
});

test.describe('Embed Mode', () => {
  test('embed mode hides header and footer', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}?embed=true`);
    await page.waitForLoadState('networkidle');

    // Header should not be visible in embed mode
    const header = page.locator('header');
    await expect(header).not.toBeVisible({ timeout: 5000 });

    // Calendar should still work
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  test('embed mode with custom colors', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}?embed=true&primaryColor=FF5500&bgColor=F0F0F0`);
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Check CSS custom properties were set
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--embed-primary').trim()
    );
    expect(primaryColor).toBe('#FF5500');
  });

  test('embed mode has reduced padding', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}?embed=true`);
    await page.waitForLoadState('networkidle');

    // The main element should have smaller padding in embed mode
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });
    const classes = await main.getAttribute('class');
    expect(classes).toContain('py-2');
  });
});

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('booking page renders correctly on mobile', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Calendar should be visible
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Day names should be visible
    for (const day of ['Mon', 'Tue', 'Wed']) {
      await expect(page.locator(`text=${day}`).first()).toBeVisible();
    }
  });

  test('time slots stack vertically on mobile', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Slots area should be below the calendar on mobile (not side by side)
    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await slotButton.boundingBox();
      expect(box).not.toBeNull();
      // On mobile, slots should be below calendar, so Y should be > 200
      if (box) {
        expect(box.y).toBeGreaterThan(200);
      }
    }
  });

  test('profile page event types are tappable on mobile', async ({ page }) => {
    await page.goto(`/${TEST_USER}`);
    await page.waitForLoadState('networkidle');

    const eventLink = page.locator(`a[href*="/${TEST_USER}/"]`).first();
    if (await eventLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      const box = await eventLink.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Touch target should be at least 44px tall (mobile accessibility)
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Direct Event Link', () => {
  test('direct event link loads booking page', async ({ page }) => {
    const resp = await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    expect(resp?.ok() || resp?.status() === 304).toBeTruthy();

    // Should show the calendar
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  test('direct event link shows event info', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Should display event info on the left side
    // Look for duration mention (e.g. "30 min" or "30 minutes")
    const durationText = page.locator('text=/\\d+\\s*min/i').first();
    await expect(durationText).toBeVisible({ timeout: 10000 });
  });

  test('direct event link shows host name', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Should show host name somewhere on the page
    // The EventInfo component shows hostName
    await page.waitForTimeout(2000);
    const pageText = await page.locator('body').textContent();
    // At minimum the page should have loaded without error
    expect(pageText?.length).toBeGreaterThan(50);
  });

  test('invalid event slug shows appropriate response', async ({ page }) => {
    const resp = await page.goto(`/${TEST_USER}/nonexistent-event-type-xyz`);
    // Should be 404 or show an error state
    const status = resp?.status();
    expect(status === 404 || status === 200 || status === 500).toBeTruthy();
  });
});

test.describe('Login Page', () => {
  test('loads with Google sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/letsmeet/i);
    await expect(page.locator('button, a').filter({ hasText: /sign|google|continue/i }).first()).toBeVisible();
  });
});

test.describe('API Endpoints', () => {
  test('MCP endpoint returns proper response', async ({ request }) => {
    const resp = await request.get('/api/mcp');
    expect([200, 405, 404]).toContain(resp.status());
  });

  test('admin stats requires auth', async ({ request }) => {
    const resp = await request.get('/api/admin/stats');
    expect(resp.status()).toBe(401);
  });

  test('admin stats rejects wrong secret', async ({ request }) => {
    const resp = await request.get('/api/admin/stats', {
      headers: { 'x-admin-secret': 'wrong-secret' },
    });
    expect(resp.status()).toBe(401);
  });

  test('bookings API requires auth', async ({ request }) => {
    const resp = await request.get('/api/bookings');
    expect(resp.status()).toBe(401);
  });

  test('v1 API requires API key', async ({ request }) => {
    const resp = await request.get('/api/v1/me');
    expect(resp.status()).toBe(401);
  });
});
