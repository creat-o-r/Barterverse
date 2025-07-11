# BarterVerse Project (Formerly Firebase Studio NextJS Starter)

This is a Next.js application for a bartering platform, "BarterVerse".

To get started, take a look at `src/app/page.tsx`.

## Development Setup

### Prerequisites
- Node.js (version 20 or as specified in `.nvmrc`/`package.json`)
- npm
- Firebase CLI (`npm install -g firebase-tools` or use npx)

### Firebase Configuration
The application uses Firebase for backend services (Authentication, Firestore, Genkit AI Flows).
1.  **Firebase Project**: Ensure you have a Firebase project created.
2.  **Environment Variables**: Copy `.env.local.example` (if it exists, otherwise create it) to `.env.local` and populate it with your Firebase project's configuration:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id # Optional

    # For Genkit/Google AI
    GOOGLE_API_KEY=your_google_ai_api_key
    ```
    These variables are loaded by `src/lib/firebaseConfig.ts`.

### Running Locally with Firebase Emulators
For local development, it's highly recommended to use the Firebase Emulator Suite. This allows you to run and test your application locally without interacting with live Firebase services.

1.  **Start Emulators & Dev Server:**
    ```bash
    npm run dev:emulators
    ```
    This command (defined in `package.json`) concurrently starts:
    *   The Firebase Emulators (Auth, Firestore, Functions, Storage) using `firebase emulators:start --import=./firebase-emulator-data --export-on-exit`. Data will be imported from `./firebase-emulator-data` on start and exported on exit.
    *   The Next.js development server (`npm run dev`).

2.  **Emulator UI:** Access the Firebase Emulator UI at `http://localhost:4000` (default port) to view data in Firestore, manage Auth users, etc.

3.  **Seeding Emulator Data:**
    To populate your local Firestore emulator with initial data (from what was previously `src/lib/dummy-data.ts`):
    ```bash
    npm run db:seed:emulators
    ```
    This script connects to the running Firestore emulator and seeds user and item collections. Run this after starting the emulators.

### Other Useful Scripts
-   `npm run dev`: Starts only the Next.js development server.
-   `npm run build`: Builds the application for production.
-   `npm run lint`: Runs ESLint.
-   `npm run typecheck`: Runs TypeScript type checking.
-   `npm run test:unit`: Runs Jest unit/integration tests.
-   `npm run test:e2e`: Runs Playwright end-to-end tests.
-   `npm test`: Runs both unit and E2E tests.
-   `npm run emulators:start`: Starts only the Firebase emulators.
-   `npm run genkit:dev`: Starts the Genkit development server (for AI flows).

## Testing Strategy
-   **Unit/Integration Tests (Jest):**
    *   Run using `npm run test:unit`.
    *   These tests are configured to run against the Firebase Emulators. Ensure emulators are running (or use `npm run emulators:exec -- npm run test:unit` if not already running separately).
    *   Environment variables `NODE_ENV=test`, `FIRESTORE_EMULATOR_HOST="localhost:8080"`, and `FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"` are set by the npm script.
    *   Service tests (`*.test.ts` in `src/services`) directly interact with the emulated Firestore/Auth.
    *   Component/Page tests (`*.test.tsx`) use `@testing-library/react` and are wrapped with necessary providers (e.g., `AuthProvider`) to test behavior with emulated services.
-   **End-to-End Tests (Playwright):**
    *   Run using `npm run test:e2e`.
    *   These tests also run against a live application instance connected to the Firebase Emulators. Start the app with `npm run dev:emulators` in one terminal, then run E2E tests in another, or configure E2E tests to start the server.
    *   The environment variables for emulator hosts are also set for these tests via the npm script.
-   **CI (.github/workflows/ci.yml):**
    *   The CI workflow automatically installs Firebase tools, starts the Auth and Firestore emulators, and then runs all tests (unit and E2E) against these emulators.

## Cleanup Notes
-   `src/lib/dummy-data.ts`: This file is currently still in the repository as some parts of the application (e.g., `ChatsPage` for trade data) and some tests might not have been fully migrated away from it. The long-term goal is to remove this file once all data is sourced from Firestore and all tests are updated.

# Original Firebase Studio Readme Content
(Preserving for reference, can be removed later)
> This is a NextJS starter in Firebase Studio.
>
> To get started, take a look at src/app/page.tsx.
>
> # Triggering CI run to test GOOGLE_API_KEY secret (referrer restriction removed).
