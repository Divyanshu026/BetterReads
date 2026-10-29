# BetterReads API

See [the root README](../README.md) for installation, environment variables, the temporary demo, Stripe setup, deployment and current production limitations.

Run `npm run dev` for Node's watch mode, `npm start` for the API, or `npm test` for the disposable-replica-set integration tests.

Routes:
- `/api/auth`: register, login, authenticated `GET /me`.
- `/api/books`: public catalog and detail, owner-only writes.
- `/api/users`: public profiles, allowlisted self-updates.
- `/api/wishlist`: authenticated saved books.
- `/api/offers`: private purchase and exchange proposals.
- `/api/chats`: participant-only history, messages and read markers.
- `/api/reviews`: book/reader reviews and reputation summaries.
- `/api/upload`: authenticated image upload and owned deletion.
- `/api/payments`: Stripe checkout, signature-verified raw webhook, private offer payment status.
- `/api/orders`: buyer orders, seller sales via `?view=sales`, shipping and delivery updates.
- `/health`: process health.

MongoDB must be a replica set for checkout, exchange and cancellation transactions. The API fails startup if the JWT secret is missing or too short. Cloudinary is optional for local use; Stripe checkout returns an explicit service-unavailable error when payment credentials are absent.

All prices are integer INR minor units (`priceCents` keeps the legacy API field name). A price of 25000 means ₹250. Do not submit quantities above one: each listing is a unique physical copy.
