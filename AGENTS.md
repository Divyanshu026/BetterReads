# Repository Guidelines

## Project Structure & Module Organization

`frontend/` contains the main React/Vite marketplace, including pages, shared components, and public assets. `backend/src/` holds the Express API, models, routes, and demo server; `backend/tests/` contains backend tests. Browser tests live in `tests/e2e/`. `frontend_2/` is a standalone React/Vite editorial frontend with its own `package.json`, `src/`, and `public/` assets. Keep changes scoped to the relevant app; root scripts currently target `frontend/` and `backend/`, not `frontend_2/`.

## Build, Test, and Development Commands

Use Node.js 22.12 or newer and run npm commands inside WSL for a WSL checkout.

- `npm run installAll` installs root, backend, and main frontend dependencies.
- `npm run demo` starts the sample API and main frontend; open `http://localhost:5173`.
- `npm run dev` starts the persistent backend and main frontend.
- `npm run build` builds `frontend/`; use `npm --prefix frontend_2 run build` for the editorial frontend.
- `npm run lint` runs frontend and backend linting; `npm test` runs backend Jest tests.
- `npx playwright install chromium` then `npm run test:e2e` runs browser tests.
- `npm run format` formats the configured source and test paths with Prettier.

## Coding Style & Naming Conventions

Follow the existing code style: two-space indentation, semicolons in JavaScript, and single quotes where the local Prettier config applies. Use React components in PascalCase, hooks and functions in camelCase, and descriptive filenames consistent with neighboring files. Keep frontend-specific conventions consistent with each app's existing ESLint and Vite configuration.

## Testing Guidelines

Backend tests use Jest and Supertest; browser tests use Playwright. Name browser test files `*.spec.js` under `tests/e2e/`; follow neighboring backend test names and fixtures. Run targeted checks for the affected app, then the root lint, build, or test command when practical. `frontend_2/` currently has no dedicated test script.

## Commit & Pull Request Guidelines

Recent commits use short, direct subjects, sometimes with conventional prefixes such as `docs:`. Use imperative summaries (for example, `fix: preserve cart after refresh`). Pull requests should explain the user-visible change, list validation commands and results, link related issues when applicable, and include screenshots for visual changes.

## Security & Configuration

Keep secrets in local environment files and never commit credentials or real user data. Use `backend/.env.example` as the configuration reference. The demo uses disposable data; do not expose it as a public service.
