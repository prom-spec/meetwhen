import { test, expect } from "@playwright/test";

test.describe("Marketing Pages", () => {
  test("homepage loads and has key elements", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/letsmeet/i);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /start scheduling/i })).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveTitle(/pricing/i);
    await expect(page.getByText("$1")).toBeVisible();
    await expect(page.getByText("Free")).toBeVisible();
  });

  test("blog index loads with articles", async ({ page }) => {
    await page.goto("/blog");
    await expect(page).toHaveTitle(/blog/i);
    await expect(page.getByText("Calendly")).toBeVisible();
  });

  test("Calendly alternative page loads", async ({ page }) => {
    await page.goto("/alternatives/calendly");
    await expect(page).toHaveTitle(/calendly alternative/i);
    await expect(page.getByText("letsmeet.link")).toBeVisible();
    await expect(page.getByRole("link", { name: /start scheduling/i })).toBeVisible();
  });

  test("comparison page loads", async ({ page }) => {
    await page.goto("/compare/calendly-vs-letsmeet");
    await expect(page.getByText("Calendly")).toBeVisible();
    await expect(page.getByText("The Verdict")).toBeVisible();
  });

  test("use case page loads", async ({ page }) => {
    await page.goto("/use-cases/freelancers");
    await expect(page).toHaveTitle(/freelancers/i);
    await expect(page.getByText("Sound familiar?")).toBeVisible();
  });

  test("blog article loads", async ({ page }) => {
    await page.goto("/blog/calendly-free-plan-isnt-free");
    await expect(page.getByText("Calendly")).toBeVisible();
    await expect(page.getByText("letsmeet.link")).toBeVisible();
  });
});

test.describe("SEO", () => {
  test("sitemap.xml is accessible", async ({ page }) => {
    const res = await page.goto("/sitemap.xml");
    expect(res?.status()).toBe(200);
  });

  test("robots.txt is accessible", async ({ page }) => {
    const res = await page.goto("/robots.txt");
    expect(res?.status()).toBe(200);
    const text = await page.textContent("body");
    expect(text).toContain("sitemap");
  });

  test("homepage has FAQ schema", async ({ page }) => {
    await page.goto("/");
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasOrg = schema.some((s) => s.includes('"Organization"'));
    const hasFaq = schema.some((s) => s.includes('"FAQPage"'));
    expect(hasOrg).toBeTruthy();
    expect(hasFaq).toBeTruthy();
  });
});

test.describe("Login Page", () => {
  test("login page loads with Google and email options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/google/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});

test.describe("Booking Page", () => {
  test("user profile page returns 404 for nonexistent user", async ({ page }) => {
    const res = await page.goto("/nonexistent-user-12345");
    // Should either 404 or show not found
    const text = await page.textContent("body");
    expect(res?.status() === 404 || text?.includes("not found") || text?.includes("Not Found")).toBeTruthy();
  });
});

test.describe("Mobile Navigation", () => {
  test("mobile nav opens and shows links", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile only");
    await page.goto("/");
    await page.getByLabel("Toggle menu").click();
    await expect(page.getByRole("link", { name: /pricing/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /blog/i })).toBeVisible();
  });
});
