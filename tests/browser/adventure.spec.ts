import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function swimTo(page: Page, x: number, y: number): Promise<void> {
  const bounds = await page.locator('#aquarium').boundingBox();
  if (!bounds) throw new Error('The aquarium is missing.');
  await page.mouse.move(bounds.x + bounds.width * x / 960, bounds.y + bounds.height * y / 600);
}

test('a real dive catches shrimp, loses a heart to litter, and pauses and resumes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Into the deep.' })).toBeVisible();
  await page.getByRole('button', { name: 'Dive in' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await swimTo(page, 480, 300);
  await expect.poll(async () => Number(await page.locator('#score').textContent())).toBeGreaterThan(0);
  await swimTo(page, 640, 415);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '2 of 3 hearts', { timeout: 5000 });
  await page.getByRole('button', { name: 'Pause adventure' }).click();
  await expect(page.getByRole('heading', { name: 'Catch your breath. Stay a little longer.' })).toBeVisible();
  const pausedClock = await page.locator('#clock').textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator('#clock')).toHaveText(pausedClock!);
  await page.getByRole('button', { name: 'Keep swimming' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect.poll(async () => page.locator('#clock').textContent()).not.toBe(pausedClock);
  expect(errors).toEqual([]);
});

test('keyboard controls, instructions, and sound work during a round', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dive in' }).click();
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(await page.locator('#score').textContent())).toBeGreaterThan(0);
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const clock = await page.locator('#clock').textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator('#clock')).toHaveText(clock!);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.getByRole('button', { name: 'Turn sound on' }).click();
  await expect(page.getByRole('button', { name: 'Turn sound off' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('p');
  await expect(page.locator('#overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();
});

test('a phone-sized viewport supports touch play without horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Dive in' })).toBeVisible();
  await page.getByRole('button', { name: 'Dive in' }).tap();
  const bounds = await page.locator('#aquarium').boundingBox();
  if (!bounds) throw new Error('The aquarium is missing.');
  await page.touchscreen.tap(bounds.x + bounds.width * 480 / 960, bounds.y + bounds.height * 300 / 600);
  await expect.poll(async () => Number(await page.locator('#score').textContent())).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
