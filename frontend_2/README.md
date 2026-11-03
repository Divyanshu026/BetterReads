# BetterReads frontend 2

A standalone editorial homepage concept for BetterReads, with six illustrative book listings. The shelf, search, saved-books panel, mobile navigation, listings, and messaging use the frontend and existing API. Saved books are temporary browser-session state. Exchange requests are sent as messages; community features and location matching are not yet connected.

## Run locally

Use the repository's Linux Node.js setup from WSL:

```sh
cd /home/dvyanshu_linux/projects/BetterReads/frontend_2
npm install
npm run dev
```

Vite uses port 5173, or the next available port. Use `npm run build` to create a production bundle.

## Accounts and API

Start the backend on port 5000 with a persistent MongoDB connection and `JWT_SECRET` configured in `backend/.env` (see `backend/.env.example`), then run the frontend. Vite proxies `/api` requests to the backend during development; restart Vite after changing its configuration. The profile button opens signup and login. Account sessions last for the browser tab unless Remember me is selected; remembered sessions remain until logout or token expiry. Sessions are validated with the API when the profile opens. The wishlist on this frontend remains browser-session state.

For a deployed frontend, route `/api` to the backend on the same origin or set `VITE_API_URL` at build time to the backend origin. Use HTTPS and configure the backend `FRONTEND_URL` to match the deployed frontend. The demo server uses disposable data and does not persist accounts after it stops.

## Book listings

Signed-in readers can use the **List a book** page at `/list-book` to create a listing through the backend. Configure deployed hosting to serve the frontend entry point for this route. The shelf loads available listings from `/api/books` and marks the built-in example books. Readers can upload up to four PNG, JPEG or WebP photos (5 MB each); the first is the cover. Photos use Cloudinary if configured, or backend local storage otherwise. Book listings are stored in MongoDB; the homepage wishlist remains temporary. Restart Vite after updating its proxy configuration.

## Book details and messages

The shelf links to `/books/:id` for reader listings and `/books/example/:title` for illustrative books. Production hosting must route these paths to the frontend entry point. The detail page uses the existing book and chat APIs; signed-in readers can message a lister and read or reply from **Profile → Messages**. The wishlist is a browser-session list; exchange requests are messages and are not yet structured offers.

## Browse books

The `/books` catalog loads available reader listings from the backend and supports title, author, and genre search. Configure deployed hosting to serve the frontend entry point for `/books` and `/books/:id`.
