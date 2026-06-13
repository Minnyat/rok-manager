import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:8788';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'D:\\rok\\docs\\images';

const pages = [
  { path: '/rankings', name: 'rankings.png' },
  { path: '/admin', name: 'admin-panel.png' },
  { path: '/admin/users', name: 'admin-users.png' },
  { path: '/admin/scores', name: 'admin-scores.png' },
  { path: '/accounts', name: 'accounts.png' },
  { path: '/login', name: 'login.png', noAuth: true },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  // Login first
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[name="username"]', 'admin');
  await page.type('input[name="password"]', process.env.ADMIN_PASS || 'ChangeMe123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Logged in:', page.url());

  // Take screenshots
  for (const p of pages) {
    if (p.noAuth) {
      // Open new incognito page for login screenshot
      const ctx = await browser.createBrowserContext();
      const loginPage = await ctx.newPage();
      await loginPage.setViewport({ width: 1400, height: 900 });
      await loginPage.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle2' });
      await loginPage.screenshot({ path: `${OUT}/${p.name}`, fullPage: false });
      console.log(`Saved: ${p.name}`);
      await ctx.close();
      continue;
    }
    await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${OUT}/${p.name}`, fullPage: false });
    console.log(`Saved: ${p.name}`);
  }

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
