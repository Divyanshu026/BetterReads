# BetterReads
A full-stack marketplace for buying, selling, and exchanging pre-loved books. The React storefront uses locally owned shadcn/ui components (Radix, CVA, Tailwind v4), with an editorial layout inspired by [Storezar](https://storezar.com/). Express, MongoDB, Socket.io, Cloudinary, and Stripe power the API.

## Quick demo
Requires **Node.js 22.12+** (Node 24 recommended) and npm. On Windows with a WSL checkout, run all npm commands in WSL using a Linux Node installation.

```sh
npm run installAll
npm run demo
```

Open [localhost:5173](http://localhost:5173).
- Reader: `reader@example.com` / `demo-reader-2026`
- Seller: `shelf@example.com` / `demo-reader-2026`

The demo starts an isolated, temporary MongoDB replica set with eight sample listings. Its first run downloads a MongoDB binary; it needs internet access and a supported OS. Data disappears when the process stops. Demo covers are original typographic illustrations, not publisher artwork. Stripe is deliberately disabled in the demo. No real database or credentials are needed.

## Persistent local development
1. Install dependencies with `npm run installAll`.
2. Start MongoDB with `docker compose up -d --wait`, or use a MongoDB Atlas connection. Checkout and exchanges require a **replica set**, because inventory and orders commit together.
3. Copy `backend/.env.example` to `backend/.env`.
4. Generate a JWT secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set `JWT_SECRET`. Set the MongoDB URI and frontend origin.
5. Run `npm run dev`.

Frontend: port 5173. API and Socket.io: port 5000. Vite proxies `/api`, `/uploads`, and `/socket.io`. The config reads `backend/.env` regardless of the launch directory.

## Features
- Signup/login with normalized email, bcrypt passwords, expiring JWTs, and server-validated session restoration.
- Catalog search, genre, price, availability and exchange filters; sorting and pagination.
- Create, edit and delete your available listings, with up to five images.
- Cloudinary uploads when configured; otherwise local images in `backend/uploads`. PNG/JPEG/WebP only, 5 MB maximum each, owned deletion paths.
- User profiles, profile photos, wishlists, book and reader reviews.
- Purchase proposals and exchanges, with ownership validation and atomic inventory transitions.
- Private persistent chat, authenticated Socket.io room membership, REST send fallback, and reconnect synchronization.
- Per-account persistent book bag. Server-priced Stripe Checkout and durable order history.
- Verified, idempotent payment fulfillment; reservation expiry; seller sales and shipping updates; buyer delivery confirmation.

## Payments
Use Stripe **test mode** locally. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Forward events with:

```sh
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Use the signing secret printed by Stripe CLI. The webhook receives the original raw request body before JSON middleware. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `checkout.session.async_payment_failed`.

Checkout accepts only INR listings, quantities of one, and unique book IDs. Price comes from the database or accepted offer, never from the browser. Shipping is included in the displayed price; sellers should price accordingly. Stripe collects an Indian shipping address. Checkout reserves copies for 30 minutes. Closing the checkout page does not release them immediately; the expiry webhook does.

A redirect is not proof of payment: the confirmation page waits for the verified order status. Webhooks check session identity, currency and total and fulfill once. A multi-book order commits in one transaction. Expired accepted-offer checkouts return the reservation to that offer so the buyer can retry.

The integration collects payments into the configured Stripe account. **Automated payouts to individual sellers, refunds, disputes, tax calculation and carrier label purchasing are not implemented.** Sellers fulfill orders and record tracking details; the marketplace operator handles settlement/refunds externally. Do not launch a public multi-seller payment business without completing those operational flows.

Uncertain Stripe network failures keep inventory reserved to avoid double sales. Reconcile any stale pending orders against Stripe before releasing inventory. Monitor failed webhooks and retry them after outages.

## Validation
```sh
npm run lint
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Backend tests use a disposable MongoDB replica set and mock Stripe session creation while exercising real webhook signatures. They cover auth, ownership, literal search, wishlists, exchanges, concurrent checkout, order privacy, webhook replay and expiry, chat membership, uploads, and reviews. Browser tests use the demo API and cover desktop/mobile rendering, filters, login, listing edits, cart persistence, offers, chat and reviews. Screenshots are written to `artifacts/`; test traces are saved on failures.

## Deployment
Build the frontend with `npm run build`. Serve `frontend/dist` with SPA fallback and proxy `/api`, `/uploads`, and `/socket.io` (including WebSocket upgrades) to the backend. Start the API with `npm --prefix backend start`. Configure HTTPS, the exact `FRONTEND_URL`, strong secrets, Atlas/replica-set MongoDB, Stripe webhooks, and Cloudinary. Local uploads require persistent storage.

Never expose the local demo or development MongoDB to the internet. CORS uses the configured origin. Bearer tokens are stored in browser localStorage; protect the application from XSS. Configure Express's trusted proxy setting to match your hosting topology if running behind a proxy so rate limiting sees the correct client address.

For an existing database, inspect and migrate legacy USD listings before accepting INR payments; no automatic currency conversion occurs. The review indexes changed from a sparse offer index to partial unique indexes; use a reviewed migration (e.g. `Review.syncIndexes()`) after resolving historical duplicates. Back up existing data first.

## Project layout
- `frontend/src/components/ui`: shadcn/ui primitives.
- `frontend/src/components/Shared.jsx`: layout, cards and form helpers.
- `frontend/src/pages`: marketplace, account and chat screens.
- `backend/src/controllers`, `models`, `routes`: business logic and API.
- `backend/src/demo.js`: isolated sample-data server.
- `backend/tests`, `tests/e2e`: integration and browser tests.

## License
ISC. shadcn/ui-derived component code is MIT; see `THIRD_PARTY_NOTICES.md`.
