// Extra Claude Code accounts are edited as rows (a label and a folder) with add and remove buttons, and what the
// rows hold is what the page saves.
const { test, expect } = require('@playwright/test');

async function seed(page, dirs) {
  await page.goto('/panel/style.css');
  await page.evaluate((c) => localStorage.setItem('pb-demo-config', JSON.stringify(c)), {
    display: { language: 'en', theme: 'default' },
    pages: [],
    claude: { extraCredentialDirs: dirs },
  });
  await page.goto('/settings/#general');
}

test('accounts can be added, edited and removed, and are saved as label and folder', async ({ page }) => {
  await seed(page, [{ label: 'work', dir: '~/.claude-work' }]);
  const rows = page.locator('#claudeDirList .cdir-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0).locator('input').nth(1)).toHaveValue('~/.claude-work');

  await page.locator('#claudeDirAdd').click();
  await expect(rows).toHaveCount(2);
  await rows.nth(1).locator('input').nth(0).fill('personal');
  await rows.nth(1).locator('input').nth(1).fill(' ~/.claude-personal ');
  await rows.nth(0).getByRole('button').click(); // remove "work"
  await expect(rows).toHaveCount(1);

  await page.evaluate(() => {
    const original = window.fetch;
    window.__savedBodies = [];
    window.fetch = (url, options) => {
      if (String(url).includes('/api/settings') && options?.method === 'PUT') window.__savedBodies.push(options.body);
      return original(url, options);
    };
  });
  await page.locator('#save').click();
  await expect(page.locator('#toast')).toHaveText(/^Saved/);
  const saved = JSON.parse((await page.evaluate(() => window.__savedBodies))[0]);
  expect(saved.claude.extraCredentialDirs).toEqual([{ label: 'personal', dir: '~/.claude-personal' }]);
});
