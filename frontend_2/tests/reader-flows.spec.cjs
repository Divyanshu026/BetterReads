const { test, expect } = require('@playwright/test');

const me = '111111111111111111111111';
const other = '222222222222222222222222';
const target = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const own = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const chatId = 'cccccccccccccccccccccccc';
const makeBook = (id, title, owner, city, genre) => ({ _id: id, title, author: id === own ? 'Local Author' : 'Franz Kafka', genre, condition: 'Used', status: 'available', barterAvailable: true, borrowAvailable: true, priceCents: 0, location: { city }, description: 'A reader listing', photos: [], ownerId: { _id: owner, name: owner === me ? 'Test Reader' : 'Book Owner' }, createdAt: '2026-01-01T00:00:00Z' });

async function setup(page) {
  const state = { books: [makeBook(target, 'Metamorphosis', other, 'Pune', 'Fantasy'), makeBook(own, 'My Book', me, 'Delhi', 'History')], offers: [], wishlist: [], chats: [], messages: [], posts: [], comments: [] };
  await page.addInitScript(() => { localStorage.setItem('betterreads.authToken', 'test-token'); });
  await page.route('**/api/**', async (route) => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const method = req.method(); let body = null; try { body = req.postDataJSON(); } catch {}
    const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
    if (path === '/api/community/posts' && method === 'GET') return json({ posts: state.posts.filter((post) => (!url.searchParams.get('author') || post.author._id === url.searchParams.get('author')) && (!url.searchParams.get('category') || post.category === url.searchParams.get('category'))), hasMore: false });
    if (path === '/api/community/posts' && method === 'POST') { const post = { _id: '123456789012345678901234', ...body, author: { _id: me, name: 'Test Reader' }, likes: [], commentCount: 0, createdAt: new Date().toISOString() }; state.posts.unshift(post); return json(post, 201); }
    if (path.endsWith('/comments') && path.startsWith('/api/community/posts/')) { if (method === 'GET') return json({ comments: state.comments, hasMore: false }); const comment = { _id: 'comment-1', body: body.body, author: { _id: me, name: 'Test Reader' } }; state.comments.push(comment); state.posts[0].commentCount++; return json(comment, 201); }
    if (path.endsWith('/like') && path.startsWith('/api/community/posts/')) { state.posts[0].likes = body.liked ? [me] : []; return json({ likes: state.posts[0].likes.length, liked: body.liked }); }
    if (path === '/api/auth/me') return json({ user: { id: me, name: 'Test Reader', email: 'test@example.invalid' } });
    if (path === '/api/books' && method === 'GET') { let books = state.books; if (url.searchParams.get('sellerId')) books = books.filter((b) => b.ownerId._id === url.searchParams.get('sellerId')); return json(books, 200, { 'X-Total-Count': String(books.length) }); }
    if (path === '/api/books' && method === 'POST') { const book = { ...makeBook('dddddddddddddddddddddddd', body.title, me, body.city, body.genre), ...body, ownerId: { _id: me, name: 'Test Reader' } }; state.books.unshift(book); return json(book, 201); }
    if (path.startsWith('/api/books/')) { const id = path.split('/').pop(); const book = state.books.find((b) => b._id === id); if (method === 'PATCH') { Object.assign(book, body); return json(book); } if (method === 'DELETE') { state.books = state.books.filter((b) => b._id !== id); return json({ success: true }); } return book ? json(book) : json({ error: { message: 'Not found' } }, 404); }
    if (path === '/api/upload') return json({ url: '/covers/placeholder.svg', publicId: 'test/photo' });
    if (path === '/api/offers' && method === 'GET') return json(state.offers);
    if (path === '/api/offers' && method === 'POST') { const offer = { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', listingId: { _id: target, title: 'Metamorphosis', ownerId: other }, proposerId: { _id: me, name: 'Test Reader' }, offeredBookIds: [{ _id: own, title: 'My Book' }], status: 'pending', type: body.type }; state.offers.push(offer); return json(offer, 201); }
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
  await setup(page); await page.goto(`/books/${target}`); await page.getByRole('button', { name: 'Ask for exchange' }).click(); await page.getByLabel('Offer one of your available books').selectOption(own); await page.getByRole('button', { name: 'Submit request' }).click(); await expect(page.getByText('Request sent.')).toBeVisible(); await page.getByRole('button', { name: 'View requests' }).click(); await expect(page.getByText('pending', { exact: true })).toBeVisible(); await expect(page.getByText(/Offered: My Book/)).toBeVisible();
});

test('message lister opens book context and sends a message', async ({ page }) => {
  await setup(page); await page.goto(`/books/${target}`); await page.getByRole('button', { name: 'Message lister' }).click(); await expect(page.getByRole('dialog', { name: 'Your inbox' })).toBeVisible(); await expect(page.getByText('Discussing')).toBeVisible(); await page.getByLabel('Your message').fill('Can we exchange this book?'); await page.getByRole('button', { name: 'Send message' }).click(); await expect(page.getByLabel('Message history').getByText('Can we exchange this book?')).toBeVisible();
});

test('shared community allows posting, replying and liking', async ({ page }) => {
  await setup(page); await page.goto('/community'); await page.getByLabel('Title', { exact: true }).fill('A new discussion'); await page.getByLabel('Your thoughts').fill('What should I read next?'); await page.getByRole('button', { name: 'Publish discussion' }).click(); await expect(page.getByRole('heading', { name: 'A new discussion' })).toBeVisible(); await page.getByRole('button', { name: /0 replies/ }).click(); await page.getByLabel('Join the conversation').fill('Try a classic.'); await page.getByRole('button', { name: 'Reply', exact: true }).click(); await expect(page.getByText('Try a classic.')).toBeVisible(); await page.getByRole('button', { name: 'Appreciate A new discussion' }).click(); await expect(page.getByRole('button', { name: 'Appreciate A new discussion' })).toHaveAttribute('aria-pressed', 'true'); await page.reload(); await expect(page.getByRole('heading', { name: 'A new discussion' })).toBeVisible();
});

test('listing creation and editing use the API', async ({ page }) => {
  await setup(page); await page.goto('/list-book'); await page.getByLabel('Book title').fill('A New Book'); await page.getByLabel('Author', { exact: true }).fill('An Author'); await page.getByLabel('City or area').fill('Delhi'); await page.getByLabel('Genre', { exact: true }).fill('History'); await page.getByLabel('Description').fill('A book to exchange.'); await page.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }); await page.getByRole('button', { name: 'List book', exact: true }).click(); await expect(page).toHaveURL(/\/books$/); await expect(page.getByRole('heading', { name: 'A New Book' })).toBeVisible(); await page.goto('/readers/me'); await page.getByRole('button', { name: 'Edit', exact: true }).first().click(); await page.getByLabel('Title', { exact: true }).fill('Updated Book'); await page.getByRole('button', { name: 'Save listing' }).click(); await expect(page.getByText('Listing updated.')).toBeVisible();
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

test('shared navigation and catalog location work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/books');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Browse books' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: /Messages, .* unread/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close navigation menu' }).click();
  await page.getByRole('button', { name: 'All locations' }).click();
  await page.locator('#catalog-location').getByLabel('City or area').fill('Pune');
  await page.getByRole('button', { name: 'Apply location' }).click();
  await expect(page.getByRole('heading', { name: 'Metamorphosis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My Book' })).toHaveCount(0);
});

test('profile tabs reuse wishlist and requests and edit profile previews an avatar', async ({ page }) => {
  const state = await setup(page);
  state.wishlist.push(target);
  await page.goto('/readers/me');
  await page.getByRole('button', { name: 'Wishlist', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Metamorphosis' })).toBeVisible();
  await page.getByRole('button', { name: 'Requests', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Incoming' })).toBeVisible();
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(page.getByText('No activity yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Username').fill('reader_name');
  await page.getByLabel('Profile photo').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByAltText('New profile photo preview')).toBeVisible();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile updated.')).toBeVisible();
  await expect(page.getByText('@reader_name')).toBeVisible();
});

test('public reader profile hides private tabs and follows locally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto(`/readers/${other}`);
  await expect(page.getByRole('button', { name: 'Message reader' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Requests', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
});

test('profile tabs default correctly and preserve explicitly selected URL tabs', async ({ page }) => {
  await setup(page);
  await page.goto('/readers/me');
  await expect(page.getByRole('button', { name: 'My Books' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Wishlist', exact: true }).click();
  await expect(page).toHaveURL(/tab=wishlist/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Wishlist', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goto(`/readers/${other}`);
  await expect(page.getByRole('button', { name: 'Listed Books' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Requests', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/tab=about/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'About', exact: true })).toHaveAttribute('aria-current', 'page');
});


test('a reader can submit a borrow request without offering another book', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`/books/${target}`);
  await page.getByRole('button', { name: 'Ask for exchange or borrow' }).click();
  await page.getByLabel('Request type').selectOption('borrow');
  await expect(page.getByLabel('Offer one of your available books')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText('Request sent.')).toBeVisible();
  expect(state.offers[0].type).toBe('borrow');
});

test('a listing with no sharing preferences explains how to contact its owner', async ({ page }) => {
  const state = await setup(page);
  state.books[0].barterAvailable = false;
  state.books[0].borrowAvailable = false;
  await page.goto(`/books/${target}`);
  await page.getByRole('button', { name: 'Ask for exchange or borrow' }).click();
  await expect(page.getByText('The owner has not offered this book for exchange or borrowing yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Message the lister' }).click();
  await expect(page.getByRole('dialog', { name: 'Your inbox' })).toBeVisible();
});
