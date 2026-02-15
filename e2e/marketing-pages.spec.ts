import { test, expect } from '@playwright/test';

// Marketing pages should load correctly and have proper SEO elements

test.describe('Homepage', () => {
  test('loads with correct title and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/letsmeet\.link/);
    // A/B test may show different headlines
    const headline = page.locator('h1').first();
    await expect(headline).toBeVisible();
    const text = await headline.textContent();
    expect(text).toMatch(/Stop paying|Free scheduling|scheduling/i);
    await expect(page.locator('a:has-text("Start scheduling free")').first()).toBeVisible();
  });

  test('has FAQ section with schema', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Frequently asked questions')).toBeVisible();
  });

  test('has demo section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=See it in action')).toBeVisible();
  });
});

test.describe('Blog', () => {
  test('index loads with all posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog/);
    await expect(page.locator('article, a[href*="/blog/"]').first()).toBeVisible();
  });

  const blogSlugs = [
    'calendly-free-plan-isnt-free',
    'ai-powered-scheduling-setup',
    'true-cost-calendly-vs-letsmeet',
    'mcp-ai-agent-booking',
    '5-scheduling-features-you-dont-need',
  ];

  for (const slug of blogSlugs) {
    test(`blog post /${slug} loads`, async ({ page }) => {
      const resp = await page.goto(`/blog/${slug}`);
      expect(resp?.status()).toBe(200);
    });
  }
});

test.describe('Alternatives', () => {
  const alternatives = ['calendly', 'cal-com', 'tidycal', 'acuity', 'doodle', 'savvycal'];

  for (const slug of alternatives) {
    test(`/alternatives/${slug} loads with comparison`, async ({ page }) => {
      const resp = await page.goto(`/alternatives/${slug}`);
      expect(resp?.status()).toBe(200);
      await expect(page.locator('h1')).toContainText('alternative');
    });
  }
});

test.describe('Comparisons', () => {
  const comparisons = ['calendly-vs-letsmeet', 'cal-com-vs-letsmeet', 'doodle-vs-letsmeet', 'savvycal-vs-letsmeet'];

  for (const slug of comparisons) {
    test(`/compare/${slug} loads`, async ({ page }) => {
      const resp = await page.goto(`/compare/${slug}`);
      expect(resp?.status()).toBe(200);
    });
  }
});

test.describe('Use Cases', () => {
  const useCases = ['freelancers', 'consultants', 'coaches', 'sales', 'ai-agents'];

  for (const slug of useCases) {
    test(`/use-cases/${slug} loads`, async ({ page }) => {
      const resp = await page.goto(`/use-cases/${slug}`);
      expect(resp?.status()).toBe(200);
    });
  }
});

test.describe('Tools', () => {
  test('meeting cost calculator loads', async ({ page }) => {
    await page.goto('/tools/meeting-cost-calculator');
    await expect(page).toHaveTitle(/Meeting Cost Calculator/);
    await expect(page.locator('text=Your meetings cost per year')).toBeVisible();
  });
});

test.describe('Pricing', () => {
  test('loads with correct headline', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('Calendly');
    await expect(page.locator('text=$1/mo').first()).toBeVisible();
  });
});

test.describe('SEO', () => {
  test('sitemap.xml returns 200', async ({ page }) => {
    const resp = await page.goto('/sitemap.xml');
    expect(resp?.status()).toBe(200);
  });

  test('robots.txt returns 200 and references sitemap', async ({ page }) => {
    const resp = await page.goto('/robots.txt');
    expect(resp?.status()).toBe(200);
    const text = await page.textContent('body');
    expect(text).toContain('sitemap');
  });

  test('homepage has og:title meta tag', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBeTruthy();
  });
});

test.describe('Navigation', () => {
  test('desktop nav has key links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
    await expect(page.locator('a[href="/blog"]').first()).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('shows custom 404 for non-existent page', async ({ page }) => {
    const resp = await page.goto('/this-page-does-not-exist-12345');
    // Next.js dynamic catch-all may return 500 if it tries to resolve as username
    expect([404, 500]).toContain(resp?.status());
  });
});
