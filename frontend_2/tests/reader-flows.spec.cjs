const { test, expect } = require('@playwright/test');

const me = '111111111111111111111111';
const other = '222222222222222222222222';
const target = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const own = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const chatId = 'cccccccccccccccccccccccc';
const makeBook = (id, title, owner, city, genre) => ({ _id: id, title, author: id === own ? 'Local Author' : 'Franz Kafka', genre, condition: 'Used', status: 'available', barterAvailable: true, priceCents: 0, location: { city }, description: 'A reader listing', photos: [], ownerId: { _id: owner, name: owner === me ? 'Test Reader' : 'Book Owner' }, createdAt: '2026-01-01T00:00:00Z' });

async function setup(page) {
  const state = { books: [makeBook(target, 'Metamorphosis', other, 'Pune', 'Fantasy'), makeBook(own, 'My Book', me, 'Delhi', 'History')], offers: [], wishlist: [], chats: [], messages: [] };
  await page.addInitScript(() => { localStorage.setItem('betterreads.authToken', 'test-token'); });
  await page.route('**/api/**', async (route) => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const method = req.method(); let body = null; try { body = req.postDataJSON(); } catch {}
    const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
    if (path === '/api/auth/me') return json({ user: { id: me, name: 'Test Reader', email: 'test@example.invalid' } });
    if (path === '/api/books' && method === 'GET') { let books = state.books; if (url.searchParams.get('sellerId')) books = books.filter((b) => b.ownerId._id === url.searchParams.get('sellerId')); return json(books, 200, { 'X-Total-Count': String(books.length) }); }
    if (path === '/api/books' && method === 'POST') { const book = { ...makeBook('dddddddddddddddddddddddd', body.title, me, body.city, body.genre), ...body, ownerId: { _id: me, name: 'Test Reader' } }; state.books.unshift(book); return json(book, 201); }
    if (path.startsWith('/api/books/')) { const id = path.split('/').pop(); const book = state.books.find((b) => b._id === id); if (method === 'PATCH') { Object.assign(book, body); return json(book); } if (method === 'DELETE') { state.books = state.books.filter((b) => b._id !== id); return json({ success: true }); } return book ? json(book) : json({ error: { message: 'Not found' } }, 404); }
    if (path === '/api/upload') return json({ url: '/covers/placeholder.svg', publicId: 'test/photo' });
    if (path === '/api/offers' && method === 'GET') return json(state.offers);
    if (path === '/api/offers' && method === 'POST') { const offer = { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', listingId: { _id: target, title: 'Metamorphosis', ownerId: other }, proposerId: { _id: me, name: 'Test Reader' }, offeredBookIds: [{ _id: own, title: 'My Book' }], status: 'pending', type: 'barter' }; state.offers.push(offer); return json(offer, 201); }
    if (path.startsWith('/api/offers/') && method === 'PATCH') { const offer = state.offers.find((o) => o._id === path.split('/').pop()); offer.status = body.status; return json(offer); }
    if (path.startsWith('/api/offers/') && method === 'DELETE') { const offer = state.offers.find((o) => o._id === path.split('/').pop()); offer.status = 'cancelled'; return json({ success: true }); }
    if (path.startsWith('/api/wishlist/check/')) return json({ inWishlist: state.wishlist.includes(path.split('/').pop()) });
    if (path === '/api/wishlist') return json({ wishlist: state.books.filter((b) => state.wishlist.includes(b._id)) });
    if (path.startsWith('/api/wishlist/')) { const id = path.split('/').pop(); state.wishlist = method === 'POST' ? [...new Set([...state.wishlist, id])] : state.wishlist.filter((v) => v !== id); return json({ wishlist: state.wishlist }); }
    if (path === '/api/chats' && method === 'GET') return json(state.chats);
    if (path === '/api/chats' && method === 'POST') { const chat = { _id: chatId, participant: { _id: other, name: 'Book Owner' }, messages: [] }; state.chats = [chat]; return json(chat, 201); }
    if (path === `/api/chats/${chatId}`) return json({ _id: chatId, messages: state.messages });
    if (path === `/api/chats/${chatId}/read`) return json({ success: true });
    if (path === `/api/chats/${chatId}/messages`) { const message = { _id: `message-${state.messages.length}`, senderId: me, text: body.text, createdAt: '2026-01-01T00:00:00Z' }; state.messages.push(message); return json(message, 201); }
    if (path.startsWith('/api/users/')) return json({ user: { _id: me, id: me, name: 'Test Reader', city: 'Delhi', bio: 'Reader', genres: ['History'] } });
    return json({ error: { message: `Unhandled ${method} ${path}` } }, 404);
  });
  return state;
}

test('catalog combines city and genre filters', async ({ page }) => {
  await setup(page); await page.goto('/books'); await expect(page.getByText('2 books')).toBeVisible(); await page.getByRole('button', { name: /Filters/ }).click(); await page.getByRole('combobox', { name: 'Genre', exact: true }).selectOption('Fantasy'); await page.getByLabel('City or area').fill('Pune'); await page.getByRole('button', { name: 'Apply filters' }).click(); await expect(page.getByRole('heading', { name: 'Metamorphosis' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'My Book' })).toHaveCount(0); await page.getByRole('button', { name: 'Clear all' }).click(); await expect(page.getByText('2 books')).toBeVisible();
});

test('wishlist persists across details and wishlist page', async ({ page }) => {
  await setup(page); await page.goto(`/books/${target}`); await page.getByRole('button', { name: 'Save to wishlist' }).click(); await page.goto('/wishlist'); await expect(page.getByRole('heading', { name: 'Metamorphosis' })).toBeVisible(); await page.getByRole('button', { name: 'Saved' }).click(); await expect(page.getByRole('heading', { name: 'Metamorphosis' })).toHaveCount(0);
});

test('exchange request appears as pending in sent requests', async ({ page }) => {
  await setup(page); await page.goto(`/books/${target}`); await page.getByRole('button', { name: 'Ask for exchange' }).click(); await page.getByLabel('Offer one of your available books').selectOption(own); await page.getByRole('button', { name: 'Submit request' }).click(); await expect(page.getByText('Exchange request sent.')).toBeVisible(); await page.getByRole('link', { name: 'View requests' }).click(); await expect(page.getByText('pending', { exact: true })).toBeVisible(); await expect(page.getByText(/Offered: My Book/)).toBeVisible();
});

test('message lister opens book context and sends a message', async ({ page }) => {
  await setup(page); await page.goto(`/books/${target}`); await page.getByRole('button', { name: 'Message lister' }).click(); await expect(page).toHaveURL(/\/inbox\?chat=/); await expect(page.getByText('Discussing')).toBeVisible(); await page.getByLabel('Your message').fill('Can we exchange this book?'); await page.getByRole('button', { name: 'Send message' }).click(); await expect(page.getByLabel('Message history').getByText('Can we exchange this book?')).toBeVisible();
});

test('local community allows posting, commenting and liking', async ({ page }) => {
  await setup(page); await page.goto('/community'); await page.getByLabel('Title', { exact: true }).fill('A new discussion'); await page.getByLabel('Your thoughts').fill('What should I read next?'); await page.getByRole('button', { name: 'Publish locally' }).click(); await expect(page.getByRole('heading', { name: 'A new discussion' })).toBeVisible(); await page.getByRole('button', { name: /0 comments/ }).click(); await page.getByLabel('Comment', { exact: true }).fill('Try a classic.'); await page.getByRole('button', { name: 'Add comment' }).click(); await page.getByRole('button', { name: /0 likes/ }).click(); await expect(page.getByRole('button', { name: /1 likes/ })).toBeVisible(); await page.reload(); await expect(page.getByRole('heading', { name: 'A new discussion' })).toBeVisible();
});

test('listing creation and editing use the API', async ({ page }) => {
  await setup(page); await page.goto('/list-book'); await page.getByLabel('Book title').fill('A New Book'); await page.getByLabel('Author', { exact: true }).fill('An Author'); await page.getByLabel('City or area').fill('Delhi'); await page.getByLabel('Genre').fill('History'); await page.getByLabel('Description').fill('A book to exchange.'); await page.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }); await page.getByRole('button', { name: 'List book', exact: true }).click(); await expect(page).toHaveURL(/\/books$/); await expect(page.getByRole('heading', { name: 'A New Book' })).toBeVisible(); await page.goto('/readers/me'); await page.getByRole('button', { name: 'Edit', exact: true }).first().click(); await page.getByLabel('Title', { exact: true }).fill('Updated Book'); await page.getByRole('button', { name: 'Save listing' }).click(); await expect(page.getByText('Listing updated.')).toBeVisible();
});

test('incoming requests can be declined and sent requests cancelled', async ({ page }) => {
  const state = await setup(page);
  state.offers.push({ _id: 'incoming', listingId: { _id: own, title: 'My Book', ownerId: me }, proposerId: { _id: other, name: 'Book Owner' }, offeredBookIds: [{ _id: target, title: 'Metamorphosis' }], status: 'pending', type: 'barter' });
  state.offers.push({ _id: 'outgoing', listingId: { _id: target, title: 'Metamorphosis', ownerId: other }, proposerId: { _id: me, name: 'Test Reader' }, offeredBookIds: [{ _id: own, title: 'My Book' }], status: 'pending', type: 'barter' });
  await page.goto('/inbox?tab=requests');
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.getByText('Request declined.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel request' }).click();
  await expect(page.getByText('Request cancelled.')).toBeVisible();
  expect(state.offers.map((offer) => offer.status)).toEqual(['declined', 'cancelled']);
});

test('mobile conversations open and return to the list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  state.chats.push({ _id: chatId, participant: { _id: other, name: 'Book Owner' }, messages: [] });
  await page.goto('/inbox');
  await page.getByRole('button', { name: /Book Owner/ }).click();
  await expect(page.getByLabel('Your message')).toBeVisible();
  await page.getByRole('button', { name: 'Back to conversations' }).click();
  await expect(page.getByRole('button', { name: /Book Owner/ })).toBeVisible();
});
