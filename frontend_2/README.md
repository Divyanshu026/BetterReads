# BetterReads frontend 2

The React/Vite frontend for BetterReads' book exchange experience.

## Run and verify

Use Node.js 22.12 or later in WSL. Start the backend with MongoDB and the settings described in `backend/.env.example`, then run `npm install` and `npm run dev` in this directory. Vite proxies `/api` to the backend. Run `npm run build` to build the frontend. With the root Playwright dependencies and Chromium installed, run `../node_modules/.bin/playwright test -c playwright.config.cjs` for the browser flows; those tests mock API responses and do not touch the database.

Production hosting must serve `index.html` for frontend routes such as `/books/:id`, `/inbox`, `/community`, and `/readers/:id`. Route `/api` to the backend or set `VITE_API_URL` at build time.

## Data and current limits

Accounts, listings, uploaded photos, reader profiles, signed-in wishlists, chats, and exchange offers use the existing API. Readers can create an exchange request offering one of their own books, and the recipient can accept or decline it; the sender can cancel a pending offer. The current backend immediately marks both books exchanged on acceptance. An optional request message is sent separately as a chat message, rather than stored on the offer.

The inbox uses the existing chat API and polls for unread counts; it does not provide live Socket.IO updates. Book context is passed when opening a conversation from a book and is not permanently associated with a chat by the current API. Borrow requests can be accepted and returned; a separate exchange completion workflow, durable request notifications, and server-side duplicate-request protection still need backend support. Acceptance and delivery of a message depend on the running API.

Community posts, replies, and likes use the backend and are shared between readers. Earlier browser-local preview posts are not automatically published. The feed updates when loaded or refreshed; it does not currently use real-time updates. City filtering is available, but geocoding, distance matching, and meetup preferences need additional services and data. Some catalog filters only apply if listings contain the corresponding fields. Built-in example listings and their locally stored wishlist entries are illustrative, not real exchange offers.

## GitHub Pages deployment

The Pages workflow in `.github/workflows/pages.yml` builds `frontend_2` on pushes to `main` or when run manually. In the repository settings, select **Pages → Build and deployment → Source → GitHub Actions**. A repository site is served from `https://<owner>.github.io/<repository>/`; a user site named `<owner>.github.io` is served from the root. The workflow sets `VITE_BASE_PATH` for either case. The generated `404.html` restores direct links and page refreshes on GitHub Pages.

GitHub Pages serves only the static frontend. Deploy the Node/Express API and MongoDB separately. In GitHub repository settings under **Secrets and variables → Actions → Variables**, set `VITE_API_URL` to the HTTPS backend origin (for example, `https://api.example.com`, with no trailing `/api`) before running the workflow. Set the backend `FRONTEND_URL` to the frontend origin (for example, `https://<owner>.github.io`) for CORS. Configure durable image storage, such as Cloudinary, for uploads on hosts with ephemeral filesystems. The development-only Vite proxy does not exist on GitHub Pages.

For a local production build under a repository path, run `VITE_BASE_PATH=/BetterReads/ VITE_API_URL=https://api.example.com npm run build`. Build-time frontend environment variables are public; never put secrets in `VITE_` variables. The workflow does not deploy the backend or configure MongoDB, and the GitHub Pages site must be enabled in repository settings.
