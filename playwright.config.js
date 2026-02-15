module.exports = {
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'https://www.letsmeet.link',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};
