# AGENTS.md

Guide for AI agents working in the Wich-Wayz-Map codebase.

## Project Overview

**Wich-Wayz-Map** is a full-stack React + TypeScript application for discovering, rating, and managing sandwich shops. It features an interactive Mapbox map, Turso (hosted SQLite) database, Firebase authentication, and Stripe payment processing for membership gating.

- **Tech Stack**: React 18, TypeScript 5, Vite 6, Mapbox GL JS, Turso, Firebase Auth, Stripe
- **Node Version**: 20.x (specified in package.json engines)
- **Dev Server Port**: 3100
- **Preview Server Port**: 5000

## Essential Commands

### Development

```bash
npm run dev              # Start dev server on port 3100
npm run build            # TypeScript compile + Vite build
npm start                # Preview production build on port 5000
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run test-build       # Full CI pipeline: format + lint + build + analyze
```

### Testing

```bash
npm test                 # Run Vitest tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Analysis

```bash
npm run analyze          # Build + bundle size visualization
```

## Project Structure

```
Wich-Wayz-Map/
├── api/                      # Serverless API routes (Vercel)
│   ├── vote.js               # Vote submission endpoint
│   ├── votes/[shop_id].js    # Get vote counts
│   ├── webhook.js            # Stripe webhook handler
│   └── add-new-shop.js       # Shop submission endpoint
├── src/
│   ├── components/           # React components
│   │   ├── App/              # Page-level components & routes
│   │   ├── Map/              # Mapbox components
│   │   ├── Sidebar/          # Sidebar components
│   │   ├── Search/           # Search bar & filters
│   │   ├── Form/             # Form components
│   │   ├── Modal/            # Modal dialogs
│   │   ├── Filter/           # Filter UI
│   │   ├── Profile/          # User profile components
│   │   ├── Analytics/        # Analytics charts
│   │   ├── Avatar/           # Avatar/Gravatar components
│   │   ├── NavBar/           # Navigation
│   │   ├── Dial/             # Speed dial FAB
│   │   └── Utilites/         # Utility components
│   ├── context/              # React Context providers
│   │   ├── authContext.tsx
│   │   ├── shopContext.tsx
│   │   ├── mapContext.tsx
│   │   ├── modalContext.tsx
│   │   ├── voteContext.tsx
│   │   └── ...
│   ├── services/             # Business logic & API clients
│   │   ├── apiClient.ts      # Turso database client
│   │   ├── firebase.ts       # Firebase Auth config
│   │   ├── shopService.ts    # Shop CRUD operations
│   │   ├── categoryService.ts
│   │   ├── vote.ts           # Vote API calls
│   │   ├── search.ts         # Fuse.js search
│   │   ├── indexedDB.ts      # IndexedDB caching
│   │   └── ...
│   ├── hooks/                # Custom React hooks
│   ├── models/               # TypeScript entity interfaces
│   │   ├── Shop.ts
│   │   ├── Location.ts
│   │   ├── User.ts
│   │   └── ShopWithUser.ts
│   ├── types/                # General TypeScript types
│   │   ├── dataTypes.ts      # Payloads, props, etc.
│   │   └── shopFilter.ts     # Filter types
│   ├── constants/            # App constants
│   │   ├── routes.ts         # Route definitions
│   │   └── validators.ts     # Yup validation schemas
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Root component with providers
│   └── main.tsx              # Entry point
├── test/                     # Vitest test files
│   ├── setupTests.ts
│   ├── components/
│   ├── context/
│   ├── hook/
│   ├── services/
│   └── utils/
├── public/                   # Static assets
├── .env.sample               # Environment variable template
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── tailwind.config.cjs
```

## Environment Variables

Required environment variables (see `.env.sample`):

```bash
# Turso Database
VITE_TURSO_AUTH_TOKEN=
VITE_TURSO_URL=

# JWT/Auth
VITE_SECRET_PHASE=
VITE_JWT_SECRET=

# Firebase Authentication
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=
```

**Important**: API routes (in `api/`) use non-prefixed env vars (`TURSO_URL`, `TURSO_AUTH_TOKEN`). Frontend code uses `VITE_` prefix.

## Path Aliases

Configured in `vite.config.ts` and `tsconfig.app.json`:

```typescript
@/           → ./src/
@components/ → ./src/components/
@context/    → ./src/context/
@constants/  → ./src/constants/
@hooks/      → ./src/hooks/
@services/   → ./src/services/
@types/      → ./src/types/
@utils/      → ./src/utils/
@models/     → ./src/models/
```

**Always use path aliases** instead of relative imports for better maintainability.

## Code Conventions

### Naming

- **Files**:
  - Components: `PascalCase.tsx` (e.g., `MapBox.tsx`)
  - Services: `camelCase.ts` (e.g., `apiClient.ts`)
  - Contexts: `camelCase.tsx` with "Context" suffix (e.g., `authContext.tsx`)
  - Hooks: `camelCase.ts` with "use" prefix (e.g., `useAddShopForm.ts`)
  - Models: `PascalCase.ts` (e.g., `Shop.ts`)

- **Variables & Functions**:
  - Variables: `camelCase` (e.g., `shopData`, `isManualEntry`)
  - Functions: `camelCase` (e.g., `getShops`, `executeQuery`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `TURSO_URL`, `SHOPS_STORE`)
  - Booleans: Prefix with `is`, `has`, `should` (e.g., `isAuthenticated`, `hasVoted`)

- **Types & Interfaces**:
  - Interfaces: `PascalCase` (e.g., `Shop`, `UserMetadata`)
  - Props: Component name + `Props` suffix (e.g., `ShopFormProps`)
  - Context types: Name + `Type` or `Data` suffix (e.g., `ShopsContextType`)

### Component Structure

```typescript
// 1. Imports (external libraries first, then path aliases, then relative)
import React, { useState, useEffect } from "react";
import { useShops } from "@context/shopContext";
import { Category } from "@services/categoryService";
import "./styles.css";

// 2. Types/Interfaces
interface MyComponentProps {
  shopId: number;
  onClose: () => void;
}

// 3. Helper functions (if needed)
const helperFunction = (data: string) => { /* ... */ };

// 4. Component
export const MyComponent: React.FC<MyComponentProps> = ({ shopId, onClose }) => {
  // 4a. Hooks at top
  const [state, setState] = useState<string>("");
  const { shops } = useShops();

  // 4b. Effects
  useEffect(() => {
    // ...
  }, []);

  // 4c. Event handlers
  const handleClick = () => {
    // ...
  };

  // 4d. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Context Pattern

Every context follows this structure:

```typescript
// 1. Define interface
interface MyContextType {
  data: string;
  updateData: (value: string) => void;
}

// 2. Create context
const MyContext = createContext<MyContextType | undefined>(undefined);

// 3. Provider component
export const MyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<string>("");

  const updateData = (value: string) => {
    setData(value);
  };

  return (
    <MyContext.Provider value={{ data, updateData }}>
      {children}
    </MyContext.Provider>
  );
};

// 4. Custom hook
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error("useMyContext must be used within MyProvider");
  }
  return context;
};
```

### Service Pattern

Services export async functions with consistent error handling:

```typescript
export const fetchShops = async (): Promise<Shop[]> => {
  try {
    const { rows } = await executeQuery<Shop>(
      `SELECT * FROM shops WHERE active = ?`,
      [1],
    );
    return rows;
  } catch (error) {
    console.error("Error fetching shops:", error);
    throw new Error("Failed to fetch shops");
  }
};
```

**Key patterns**:

- Try-catch blocks for all async operations
- `console.error()` for logging (never `console.log()` in production code)
- Throw user-friendly error messages
- Return typed data

### Database Access

Use `apiClient.ts` for all Turso database operations:

```typescript
import { executeQuery, insertData, updateData } from "@services/apiClient";

// Generic query
const { rows } = await executeQuery<Shop>(query, params);

// Insert
await insertData("shops", { name: "...", description: "..." });

// Update
await updateData("shops", { name: "..." }, { id: 1 });
```

**Important**: API routes (in `api/`) create their own Turso client because they run server-side.

### Form Validation

Use Yup schemas from `@constants/validators.ts` with `react-hook-form`:

```typescript
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { locationSchema } from "@constants/validators";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: yupResolver(locationSchema),
  defaultValues: {
    /* ... */
  },
});
```

**Validation schemas available**:

- `userCredentialSchema` - Email + password (registration)
- `userLoginSchema` - Login form
- `locationSchema` - Shop location + description
- `updateShopSchema` - Update existing shop
- `userProfileSchema` - User profile fields
- `registerSchema` - Full registration with password confirmation
- `resetPasswordSchema` - Password reset

### Error Handling

**Frontend**:

```typescript
try {
  await someOperation();
  showToast("Success message", "success");
} catch (error) {
  console.error("Context:", error);
  if (error instanceof FirebaseError) {
    showToast(errorMessages[error.code] || "Default message", "error");
  } else {
    showToast("Operation failed", "error");
  }
}
```

**Backend (API routes)**:

```typescript
try {
  await tursoClient.execute({ sql: query, args: params });
  res.status(200).json({ success: true });
} catch (err) {
  console.error("Error:", err);
  res.status(500).json({ message: "User-friendly error" });
}
```

### State Management

**Local State**: Use `useState` for component-level state
**Shared State**: Use Context API (no Redux)
**Persistence**:

- `localStorage` - Long-term (auth tokens, categories)
- `sessionStorage` - Session-specific (filtered shops, user metadata)
- `IndexedDB` - Large datasets (shops, locations) via `idb` library

**Context hierarchy** (from `App.tsx`):

```
Router
  └─ MapProvider
      └─ ToastProvider
          └─ ModalProvider
              └─ VoteProvider
                  └─ UserLeaderboardProvider
                      └─ ShopSidebarProvider
                          └─ SavedShopsProvider
                              └─ SidebarProvider
                                  └─ AppLayout
                                      └─ Routes
```

## Styling

**CSS Framework**: Tailwind CSS with custom theme

**Key Theme Values** (from `tailwind.config.cjs`):

- Brand colors: `brand-primary` (#DA291C red), `brand-secondary` (#FFC72C yellow)
- Surface colors: `surface-light`, `surface-dark`, `surface-darker`, `surface-muted`
- Text colors: `text-base`, `text-inverted`, `text-muted`
- Dark mode: `dark:` prefix (class-based: `darkMode: "class"`)

**Custom animations**:

- `animate-fade-in-up`
- `animate-check-bounce`
- `animate-modalEnter` / `animate-modalExit`
- `animate-slideUp`

**Styling approach**:

- Inline Tailwind classes for most styling
- Custom CSS files for complex components (e.g., `CustomCheckbox.css`, `Filter.css`)
- Flowbite React components (`flowbite-react`) for common UI elements

## Testing

**Framework**: Vitest with happy-dom
**Test Location**: `test/` directory (mirrors `src/` structure)
**Setup**: `test/setupTests.ts` imports `@testing-library/jest-dom`

**Running tests**:

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

**Test patterns**:

- Use `@testing-library/react` for component tests
- Use `@testing-library/user-event` for interactions
- Mock contexts when needed
- Test files: `*.test.ts` or `*.test.tsx`

**Vitest config** (in `vite.config.ts`):

```typescript
test: {
  include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  globals: true,
  environment: "happy-dom",
  setupFiles: "./test/setupTests.ts",
}
```

## ESLint Rules

Key rules to follow (from `eslint.config.js`):

```javascript
{
  "react-refresh/only-export-components": "warn", // Export components only
  "no-console": ["warn", { allow: ["warn", "error"] }], // Only console.warn/error allowed
  // Plus recommended rules from:
  // - @eslint/js
  // - typescript-eslint
  // - react-hooks
}
```

**Never use**:

- `console.log()` in production code (use `console.error()` or `console.warn()`)
- `any` type without good reason (prefer `unknown` or proper types)

## Authentication Flow

1. **Firebase Auth**: User signs in via Firebase (email/password or Google)
2. **JWT Tokens**: Backend generates JWT tokens for API authorization (using `jose` library)
3. **Token Storage**: Access token in `localStorage`, metadata in `sessionStorage`
4. **Membership**: Stripe webhook updates user's `is_member` status
5. **Protected Actions**: Voting, shop submission require membership

**Auth context** provides:

- `user` - Current user object
- `isAuthenticated` - Boolean flag
- `signIn()`, `signOut()`, `register()`
- `updateProfile()`

## Data Caching Strategy

**IndexedDB** (via `idb` library):

1. Check cache first
2. Validate cache count against DB count
3. Fetch fresh if invalid/missing
4. Update cache after mutations

**Cache keys**:

- `SHOPS_STORE` - Shops data
- `LOCATIONS_STORE` - Locations data
- `FILTERED_SHOPS_KEY` - Filtered results (sessionStorage)

**Implementation** in `src/services/indexedDB.ts`

## API Routes (Serverless)

Located in `api/` directory (Vercel serverless functions):

- `POST /api/vote` - Submit vote
- `GET /api/votes/[shop_id]` - Get vote counts
- `POST /api/webhook` - Stripe webhook
- `POST /api/add-new-shop` - Submit new shop

**Important**:

- API routes use Node.js environment
- Access env vars without `VITE_` prefix
- Create Turso client in each route (no shared connection)
- Return proper HTTP status codes

## Common Gotchas

1. **Environment Variables**:
   - Frontend: Use `import.meta.env.VITE_*`
   - API routes: Use `process.env.*` (no `VITE_` prefix)

2. **Path Aliases**:
   - Always use `@components/`, not `../components/`
   - Aliases only work in `.ts`/`.tsx` files (not in config files)

3. **Context Usage**:
   - Always use custom hooks (e.g., `useShops()`)
   - Never use `useContext(ShopsContext)` directly
   - Ensure component is within provider tree

4. **Forms**:
   - Use `react-hook-form` with `yupResolver`
   - Don't mix controlled/uncontrolled inputs
   - Use `setValue()` for programmatic updates

5. **Database Queries**:
   - Use parameterized queries (never string interpolation)
   - Handle `null` vs `undefined` (SQLite uses `null`)
   - Transaction for multi-step operations

6. **Styling**:
   - Dark mode requires `class` on `<html>` element
   - Use `dark:` prefix for dark mode styles
   - Custom colors via `brand-*` or `surface-*` classes

7. **TypeScript**:
   - Strict mode enabled
   - Prefer interfaces over types for objects
   - Use `unknown` instead of `any` when possible

## Build & Deployment

**Build process**:

1. TypeScript compilation (`tsc -b`)
2. Vite build (bundles & optimizes)
3. Manual chunk splitting for vendor code

**Deployment** (Vercel):

- Push to `main` branch triggers auto-deploy
- API routes deployed as serverless functions
- Environment variables configured in Vercel dashboard

**Production checklist**:

- Run `npm run test-build` before committing
- Ensure all env vars set in Vercel
- Test API routes in staging/preview

## Key Dependencies

**Frontend**:

- `react` / `react-dom` - UI framework
- `react-router-dom` - Routing
- `mapbox-gl` / `react-map-gl` - Maps
- `firebase` / `firebaseui` - Authentication
- `react-hook-form` + `yup` - Forms & validation
- `@tanstack/react-table` - Data tables
- `recharts` - Analytics charts
- `fuse.js` - Fuzzy search
- `idb` - IndexedDB wrapper

**Backend**:

- `@libsql/client` - Turso database client
- `stripe` - Payment processing
- `jose` - JWT tokens
- `bcryptjs` - Password hashing
- `axios` - HTTP client

**Dev Tools**:

- `vite` - Build tool
- `vitest` - Testing
- `eslint` + `prettier` - Linting & formatting
- `tailwindcss` - Styling
- `typescript` - Type checking

## Best Practices

1. **Always read files before editing** - Understand context and patterns
2. **Use path aliases** - Cleaner imports, easier refactoring
3. **Follow existing patterns** - Check similar files for guidance
4. **Test after changes** - Run tests, lint, and manual verification
5. **Error handling** - Try-catch blocks with user-friendly messages
6. **Type safety** - Avoid `any`, use proper interfaces
7. **Component size** - Keep components focused, extract when >200 lines
8. **No console.log** - Use console.error/warn only
9. **Comments** - Explain _why_, not _what_ (code should be self-documenting)
10. **Git commits** - Clear messages, small focused commits

## Common Tasks

### Adding a new context provider

1. Create `src/context/myContext.tsx`
2. Define interface, context, provider, and custom hook
3. Add provider to `App.tsx` hierarchy
4. Import and use custom hook in components

### Adding a new API route

1. Create `api/my-route.js`
2. Import and configure Turso client
3. Handle HTTP methods (check `req.method`)
4. Return proper status codes
5. Handle errors gracefully

### Adding a new page

1. Create component in `src/components/App/`
2. Add route definition in `src/constants/routes.ts`
3. Add route in `src/components/App/Routes.tsx`
4. Update `useRouteCheck` if needed (e.g., hide/show navbar elements)

### Adding a new service

1. Create `src/services/myService.ts`
2. Export async functions
3. Use `executeQuery` from `apiClient.ts`
4. Add try-catch error handling
5. Return typed data

### Adding a new validation schema

1. Add schema to `src/constants/validators.ts`
2. Use Yup schema builder
3. Include helpful error messages
4. Export schema

## Resources

- **Mapbox GL JS**: https://docs.mapbox.com/mapbox-gl-js/
- **Turso (LibSQL)**: https://docs.turso.tech/
- **React Hook Form**: https://react-hook-form.com/
- **Yup Validation**: https://github.com/jquense/yup
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Vitest**: https://vitest.dev/
- **Tailwind CSS**: https://tailwindcss.com/

---

**Last Updated**: 2026-01-16
