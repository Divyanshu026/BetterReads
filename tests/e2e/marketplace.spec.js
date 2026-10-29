const { test, expect } = require('@playwright/test');
const signIn = async (page) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('demo-reader-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/profile/);
};
test('desktop homepage, catalog filtering, and responsive mobile layout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Less scrolling. More page turning.' }),
  ).toBeVisible();
  await expect(page.locator('.reading-card')).toHaveCount(6);
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Explore the shelves' }).click();
  await expect(page.getByRole('heading', { name: 'Find your next chapter.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search books or authors' }).fill('Atomic');
  await page.getByRole('button', { name: 'Find a book' }).click();
  await expect(page.locator('.book-card')).toHaveCount(1);
  await expect(page.locator('.book-card')).toContainText('Atomic Habits');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.book-card')).toHaveCount(8);
  await page.getByLabel('Genre', { exact: true }).selectOption('Fantasy');
  await expect(page.locator('.book-card')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.reading-card')).toHaveCount(6);
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('reader can save a book, send offers and messages, persist cart and see unavailable payments honestly', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/browse');
  await page.getByRole('heading', { name: 'The Midnight Library', exact: true }).click();
  await page.getByRole('button', { name: 'Save for later' }).click();
  await expect(page.getByRole('button', { name: 'Saved to wishlist' })).toBeVisible();
  await page.getByRole('button', { name: 'Make an offer', exact: true }).click();
  await page.getByLabel('Your offer (₹)').fill('250');
  await page.getByRole('button', { name: 'Send proposal' }).click();
  await expect(page.getByRole('status')).toContainText('Offer sent');
  await page.getByRole('button', { name: 'Add to book bag' }).click();
  await page.goto('/cart');
  await expect(page.locator('.cart-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.cart-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.getByRole('alert')).toContainText('Payments are not configured');
  await page.getByRole('heading', { name: 'The Midnight Library', exact: true }).click();
  await page.getByRole('button', { name: 'Message seller' }).click();
  await expect(page).toHaveURL(/chat\//);
  await page.setViewportSize({ width: 375, height: 850 });
  await expect(page.locator('.chat-panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('textbox', { name: 'Your message' }).fill('Is this copy still available?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.message')).toContainText('Is this copy still available?');
  await page.goto('/profile?tab=offers');
  await expect(page.locator('.account-card')).toContainText('The Midnight Library');
  await page.goto('/profile?tab=wishlist');
  await expect(page.locator('.book-card')).toContainText('The Midnight Library');
});
test('create, edit, exchange, review and delete listings through the UI', async ({ page }) => {
  await signIn(page);
  await page.goto('/add-book');
  await page.getByLabel('Book title').fill('Browser Test Book');
  await page.getByLabel('Author', { exact: true }).fill('Test Author');
  await page.getByLabel('Price (₹)').fill('150');
  await page.getByLabel('Your city').fill('Delhi');
  await page.getByLabel('Tell us about this copy').fill('A carefully kept test book.');
  await page.getByLabel("I'm open to exchanging this book").check();
  await page.getByRole('button', { name: 'Publish your listing' }).click();
  await expect(page.getByRole('heading', { name: 'Browser Test Book', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit your listing' }).click();
  await page.getByLabel('Book title').fill('Edited Browser Book');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Edited Browser Book', exact: true }),
  ).toBeVisible();
  await page.goto('/browse');
  await page.getByRole('heading', { name: 'The Midnight Library', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest an exchange' }).click();
  await page.getByLabel('Edited Browser Book').check();
  await page.getByRole('button', { name: 'Send proposal' }).click();
  await expect(page.getByRole('status')).toContainText('Offer sent');
  await page.getByLabel('Your review').fill('A beautiful idea for a novel.');
  await page.getByRole('button', { name: 'Publish review' }).click();
  await expect(page.locator('.review')).toContainText('A beautiful idea');
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete Edited Browser Book' }).click();
  await page.getByRole('button', { name: 'Delete listing', exact: true }).click();
  await expect(page.locator('.book-card')).toHaveCount(0);
});

test('catalogue and sign-in pages fit phone, tablet, and desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await signIn(page);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/browse');
    await expect(page.locator('.catalog')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `/browse should not overflow at ${width}px`,
    ).toBeTruthy();
  }
});
