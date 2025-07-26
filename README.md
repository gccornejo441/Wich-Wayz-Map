# Wich‑Wayz‑Map

**Wich‑Wayz‑Map** is a full‑stack web application for discovering, rating and managing sandwich shops.  It combines an interactive Mapbox map with a database‑driven backend, allowing users to search for shops, view details, vote on them and (for members) submit new locations.  The project is built with **React**, **TypeScript**, **Mapbox GL JS**, **Turso** (hosted SQLite) and **Stripe** for membership payments.

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment variables](#environment-variables)
  - [Running the app](#running-the-app)
  - [Testing](#testing)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Interactive map** powered by Mapbox GL JS; shops are displayed as custom markers with popups.
- **Search and filtering** with fuzzy search (Fuse.js) and filters for city, state, country, category and open status.
- **Shop details sidebar** showing description, categories, contact info and creator; includes voting buttons for up/down votes.
- **Vote tracking** via API; aggregated upvotes/downvotes are displayed for each shop.
- **Membership gating** using Stripe webhooks; only paying members can submit or edit shops and vote.
- **Shop submission/editing** with client‑side cleaning of names and addresses and server‑side persistence; supports categories.
- **IndexedDB caching** of shops and locations for faster load times and offline capability.
- **Admin functions** (planned) for managing users, roles and categories.

## Technology stack

- **Frontend:**
  - React with TypeScript
  - Vite (development/build tooling)
  - Mapbox GL JS for maps and markers
  - React Context API for state management
  - Tailwind CSS or custom styles (depending on project configuration)
  - Fuse.js for fuzzy search

- **Backend:**
  - Turso (`@libsql/client`) as a hosted SQLite database
  - Node.js/TypeScript server (configured as API routes)
  - Stripe for payment processing and webhooks

- **Testing & tooling:**
  - Vitest/Jest for unit tests (included but limited)
  - Playwright/Cypress (recommended for end‑to‑end tests)
  - ESLint and Prettier (recommended for code linting and formatting)

## Getting started

### Prerequisites

- **Node.js** ≥ 18.x and **npm** (or `pnpm`/`yarn`) installed.
- A **Mapbox** account to obtain an access token.
- A **Turso** database.  You will need the database URL and an auth token.
- A **Stripe** account to set up checkout sessions and webhooks.

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/gccornejo441/Wich-Wayz-Map.git
   cd Wich-Wayz-Map
   ```

2. Install dependencies.  Use your preferred package manager:

   ```bash
   # using npm
   npm install

   # or using pnpm
   pnpm install

   # or using yarn

### Running the app

To start the development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

This command launches the frontend and API routes, typically at `http://localhost:5173` (for Vite) or `http://localhost:3000` (for Next.js) depending on your configuration.  When the server is running, open the URL in a browser to see the map.  The application will connect to Turso and fetch shops; if the database is empty you can start by adding shops via the “Add shop” UI (requires membership).

### Testing

Unit tests are written using **Vitest/Jest** and live in the `test/` directory.  To run them:

```bash
npm test
# or
pnpm test
# or
yarn test
```

Additional tests for APIs and end‑to‑end scenarios are recommended (e.g., using Playwright or Cypress).  Continuous integration workflows can be configured in `.github/workflows/` to run tests and linting on pull requests.

## Project structure

The key directories/files include:

- **`src/`** – frontend code.
  - `components/Map/MapBox.tsx` – Mapbox implementation and marker rendering.
  - `components/Sidebar/MapSidebar.tsx` – shows shop details and voting controls.
  - `components/Search/SearchBar.tsx` – fuzzy search and filters.
  - `context/` – React context providers for shops, map, authentication, votes, modals and toasts.
  - `services/` – client‑side services for API calls, caching (`indexedDB`), search, shop management and updates.
  - `models/` – TypeScript types for shops, locations and users.

- **`api/`** – serverless API routes (if using Next.js or a similar framework).
  - `api/vote.js` – handles vote submissions and updates the `votes` table.
  - `api/votes/[shop_id].js` – returns aggregated vote counts for a shop.
  - `api/webhook.js` – processes Stripe webhook events and updates membership status.

- **`services/apiClient.ts`** – server‑side helper for executing SQL queries against Turso and performing CRUD operations.

- **`test/`** – unit tests for components and services.

## Contributing

Contributions are welcome!  To get started:

1. Fork this repository and create a new branch for your feature or bug fix.
2. Ensure your code follows the existing style (consider setting up ESLint/Prettier).  Run `npm run lint` if a script is provided.
3. Write unit tests for your changes where possible and run `npm test` to make sure they pass.
4. Commit your changes and open a pull request with a clear description of what you’ve done.
5. A maintainer will review your PR and may ask for adjustments before merging.

Before contributing code, please discuss significant changes (like large feature additions) in an issue so we can align on the roadmap.

## License

MIT

---

*Happy mapping and enjoy exploring the wonderful world of sandwiches!*
