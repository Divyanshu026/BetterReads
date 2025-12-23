# Backend Guide — BookVerse

This is the Express + MongoDB backend for BookVerse (MERN). It provides REST APIs, Socket.io for realtime chat, and Stripe for payments.

## Setup

1) Environment

- Copy `.env.example` → `.env` and set:
  - `PORT` (default 5000)
  - `MONGO_URI` (local MongoDB or Atlas URI)
  - `JWT_SECRET` (long random string)
  - Optional: Cloudinary (`CLOUDINARY_*`) and Stripe (`STRIPE_*`) if you use uploads/payments.

2) Install & Run

```cmd
cd backend
npm install
npm run dev
```

Health check: `GET http://localhost:5000/health` → `{ "status": "ok" }`

## Project Structure

- `src/app.js` — Express app, middleware (helmet, cors, rate-limit), routes.
- `src/server.js` — DB connect, HTTP server, Socket.io initialization.
- `src/config/index.js` — reads environment variables.
- `src/db/index.js` — MongoDB connection via Mongoose.
- `src/models/*` — Mongoose schemas (`User`, `Book`, `Offer`, `Chat`).
- `src/controllers/*` — Route handlers (auth, users, books...).
- `src/routes/*` — Express routers mounting controller methods.
- `src/sockets/index.js` — Socket.io server, JWT handshake, chat events.
- `src/services/*` — Integrations (Stripe, Cloudinary).
- `tests/*` — Jest + Supertest tests (health check).

## Auth Flow (JWT)

1. Register: `POST /api/auth/register`
	- Body: `{ email, password, name }`
	- Response: `{ token, user }`
2. Login: `POST /api/auth/login`
	- Body: `{ email, password }`
	- Response: `{ token, user }`
3. Use token: `Authorization: Bearer <token>` on protected endpoints.

Notes
- Passwords are hashed with bcrypt (salted).
- JWT payload contains `{ userId }` and expires per `JWT_EXPIRES_IN`.

## Core Routes

Users
- `GET /api/users/:id` — get public profile (email omitted).
- `PATCH /api/users/:id` — update own profile (JWT required; must be owner).

Books
- `GET /api/books` — list books with filters: `q, genre, minPrice, maxPrice, city, page, limit`.
- `POST /api/books` — create listing (JWT).
- `GET /api/books/:id` — get a book by id.
- `PATCH /api/books/:id` — update own listing (JWT, owner-only).
- `DELETE /api/books/:id` — delete own listing (JWT, owner-only).

Offers (planned)
- `POST /api/offers` — propose purchase/barter.
- `PATCH /api/offers/:id` — accept/decline/cancel.

Payments (Stripe)
- `POST /api/payments/create-checkout` — create Checkout Session.
- `POST /api/payments/webhook` — handle payment events.

## Realtime (Socket.io)

- Connect with JWT via handshake `auth: { token }`.
- Join room: `join_chat` (chatId)
- Leave room: `leave_chat` (chatId)
- Send message: `message` → `{ chatId, text }` (persists to Mongo and emits to room)

Server protects connections by verifying the JWT during the handshake.

## Error Format

On errors, endpoints return:
```json
{ "error": { "code": "ERR_CODE", "message": "Human readable", "details": {} } }
```

Common statuses: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict).

## Try it

Register → Login → Create a book → List books

```cmd
rem Register
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"a@b.com\",\"password\":\"pass123\",\"name\":\"Alice\"}"

rem Login (capture token)
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"a@b.com\",\"password\":\"pass123\"}"

rem Create book
curl -X POST http://localhost:5000/api/books -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"Dune\",\"author\":\"Frank Herbert\",\"genre\":\"Sci-Fi\",\"priceCents\":1999}"

rem List books
curl http://localhost:5000/api/books?genre=Sci-Fi
```

## Notes

- For `q` search, add a MongoDB text index (e.g., on `title`, `author`, `description`).
- Tighten CORS and rate-limit settings in production.
- Configure Cloudinary and Stripe when enabling uploads/payments.
