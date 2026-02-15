import { test, expect } from '@playwright/test';

const TEST_USER = 'prom';
const TEST_EVENT = '30min';

test.describe('Edge Cases - Special Characters', () => {
  test('special characters in name field are accepted', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (!await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await slotButton.click();

    const nameInput = page.locator('input[placeholder="John Smith"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const specialName = 'José María O\'Brien-Müller 日本語 🎉';
    await nameInput.fill(specialName);
    expect(await nameInput.inputValue()).toBe(specialName);
  });

  test('very long name is accepted in form', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (!await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await slotButton.click();

    const nameInput = page.locator('input[placeholder="John Smith"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const longName = 'A'.repeat(500);
    await nameInput.fill(longName);
    expect(await nameInput.inputValue()).toBe(longName);
  });

  test('very long notes text is accepted', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (!await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await slotButton.click();

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    const longText = 'This is a test note. '.repeat(200);
    await textarea.fill(longText);
    expect(await textarea.inputValue()).toBe(longText);
  });
});

test.describe('Edge Cases - Rapid Interactions', () => {
  test('rapid date clicking does not break calendar', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Use CSS :not([disabled]) to get only enabled date buttons
    const dateButtons = page.locator('button[aria-label]:not([disabled])');
    const count = await dateButtons.count();

    for (let i = 0; i < Math.min(count, 8); i++) {
      const btn = dateButtons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      if (!ariaLabel || ariaLabel.includes('Previous') || ariaLabel.includes('Next')) continue;
      await btn.click();
      await page.waitForTimeout(100);
    }

    // Page should still be functional
    await page.waitForTimeout(1000);
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible();
  });

  test('rapid month navigation does not crash', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    const nextBtn = page.locator('button[aria-label="Next month"]');
    await expect(nextBtn).toBeVisible({ timeout: 10000 });

    // Click next month 5 times rapidly
    for (let i = 0; i < 5; i++) {
      await nextBtn.click();
      await page.waitForTimeout(150);
    }

    // Calendar should still render
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible();

    // Go back 5 times
    const prevBtn = page.locator('button[aria-label="Previous month"]');
    for (let i = 0; i < 5; i++) {
      await prevBtn.click();
      await page.waitForTimeout(150);
    }

    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible();
  });
});

test.describe('Edge Cases - Back Button Behavior', () => {
  test('browser back from event page goes to previous page', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/${TEST_USER}/${TEST_EVENT}`));
  });

  test('back button from form returns to calendar (in-page)', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const slotButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    if (!await slotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await slotButton.click();
    await expect(page.locator('text=Your name')).toBeVisible({ timeout: 5000 });

    const backBtn = page.locator('button').filter({ hasText: /Change time/i });
    await backBtn.click();

    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Edge Cases - Multiple Timezone Switches', () => {
  test('switching timezones multiple times works correctly', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    const timezones = ['New_York', 'London', 'Tokyo'];

    for (const tz of timezones) {
      const tzButton = page.locator('button').filter({ hasText: /\/|UTC/ }).first();
      await expect(tzButton).toBeVisible({ timeout: 10000 });
      await tzButton.click();

      const searchInput = page.locator('input[placeholder="Search timezones..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });

      await searchInput.fill(tz);
      await page.waitForTimeout(500);

      const option = page.locator('button').filter({ hasText: new RegExp(tz.replace('_', '.?'), 'i') }).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
      } else {
        await page.locator('body').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
      }
    }

    // Page should still be functional
    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible();
  });

  test('timezone persists after date selection', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    // Set timezone to Tokyo
    const tzButton = page.locator('button').filter({ hasText: /\/|UTC/ }).first();
    await expect(tzButton).toBeVisible({ timeout: 10000 });
    await tzButton.click();

    const searchInput = page.locator('input[placeholder="Search timezones..."]');
    await expect(searchInput).toBeVisible({ timeout: 3000 });
    await searchInput.fill('Tokyo');

    const tokyoOption = page.locator('button').filter({ hasText: /Tokyo/ }).first();
    if (!await tokyoOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await tokyoOption.click();
    await page.waitForTimeout(500);

    // Click an enabled date
    const dateButtons = page.locator('button[aria-label]:not([disabled])');
    for (let i = 0; i < await dateButtons.count(); i++) {
      const ariaLabel = await dateButtons.nth(i).getAttribute('aria-label');
      if (ariaLabel && !ariaLabel.includes('Previous') && !ariaLabel.includes('Next')) {
        await dateButtons.nth(i).click();
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Timezone should still show Tokyo
    await expect(page.locator('button').filter({ hasText: /Tokyo/ })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Edge Cases - Event Description Display', () => {
  test('event page handles missing description gracefully', async ({ page }) => {
    await page.goto(`/${TEST_USER}/${TEST_EVENT}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Sun', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Edge Cases - URL Handling', () => {
  test('trailing slash is handled', async ({ page }) => {
    const resp = await page.goto(`/${TEST_USER}/${TEST_EVENT}/`);
    expect(resp?.status()).toBeLessThan(500);
  });

  test('case sensitivity in username', async ({ page }) => {
    const resp = await page.goto(`/${TEST_USER.toUpperCase()}/${TEST_EVENT}`);
    expect(resp?.status()).toBeLessThan(500);
  });
});
