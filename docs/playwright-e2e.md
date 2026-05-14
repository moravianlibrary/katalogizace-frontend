# Playwright E2E Tests

This application includes a Playwright end-to-end suite that runs against a locally started frontend and a live backend deployment. The suite combines read-only smoke coverage with carefully controlled mutation scenarios that perform cleanup after execution so they do not leave fixture data in a modified state.

For stable coverage of the main user workflows, the suite uses a controlled fixture dataset:

- `PW-E2E-FIXTURE` (`batchId=127`) for book detail, context panel, and most read/write scenarios
- `PW-E2E-UPLOAD` (`batchId=126`) for upload scenarios

## What The Suite Covers

- redirecting unauthenticated users to `/login`
- successful sign-in and entry into the protected part of the application
- searching in the batch list and opening a specific batch
- searching in the book list and opening the detail of a processed book
- filtering books by processing state and record state
- loading the three main panels on the book detail page
- opening field editing in the context panel
- resetting an unsaved field change
- saving an edited record and verifying that the change survives a page reload
- taking an external record into the main panel and resetting back to the extracted baseline
- opening export and generating MARCXML
- editing the fixture batch description and restoring it through API cleanup
- creating a new batch and opening its books page
- creating a user, editing that user, and resetting the user's password in administration
- redirecting a non-admin user to the `forbidden` page
- uploading an image into the upload fixture batch and removing the created book through cleanup
- opening compare mode
- opening the candidates panel
- opening the field provenance timeline
- optionally restarting book processing through rerun

## Prerequisites

Before running the tests, make sure that:

1. the local frontend points to the live backend
2. an E2E user account exists
3. the default E2E account has access to the fixture batches used by the tests
4. at least one configured fixture book exposes a text-editable MARC field
5. at least one configured fixture book exposes an extracted record and at least one external record
6. an admin account is configured if the user administration tests should run
7. a limited non-admin account is configured if the forbidden-flow test should run

## 1. Install Dependencies

If dependencies are not installed yet:

```bash
npm install
```

Install the Playwright browser:

```bash
npm run test:e2e:install
```

If you want the upload test to use a realistic book image instead of the fallback placeholder image, place the file at one of these paths:

- `e2e/fixtures/upload-book.jpg`
- `e2e/fixtures/upload-book.jpeg`
- `e2e/fixtures/upload-book.png`
- `e2e/fixtures/upload-book.webp`

## 2. Verify Frontend Backend Configuration

For local development, Angular uses `src/environments/environment.local.ts`. Verify that `apiServiceBaseUrl` points to the deployed backend.

## 3. Create `.env.e2e`

Copy the example file:

```bash
cp .env.e2e.example .env.e2e
```

Fill in the credentials and fixture configuration:

```dotenv
E2E_BASE_URL=http://127.0.0.1:4200
E2E_API_URL=https://ai-katalogizace-api.trinera.cloud
E2E_USER_EMAIL=test-user@example.com
E2E_USER_PASSWORD="secret"
E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD="secret"
E2E_LIMITED_EMAIL=limited@example.com
E2E_LIMITED_PASSWORD="secret"
E2E_FIXTURE_BATCH_ID=127
E2E_UPLOAD_BATCH_ID=126
E2E_FIXTURE_BOOK_IDS=839,840
E2E_ENABLE_RERUN_MUTATION=false
E2E_USE_EXISTING_SERVER=false
```

If a password contains `#`, spaces, or other special characters, keep it wrapped in quotes. For example:

```dotenv
E2E_USER_PASSWORD="abc#123"
```

`E2E_USE_EXISTING_SERVER` behaves as follows:

- `false`: Playwright starts the frontend automatically
- `true`: Playwright connects to an already running frontend

Optional variables:

- `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`: enable admin user-management tests
- `E2E_LIMITED_EMAIL` and `E2E_LIMITED_PASSWORD`: enable the forbidden-flow test for a non-admin user
- `E2E_FIXTURE_BATCH_ID`: batch used for stable smoke, detail, and editing scenarios
- `E2E_UPLOAD_BATCH_ID`: batch reserved for upload testing
- `E2E_FIXTURE_BOOK_IDS`: preferred fixture books in the order in which helpers should prioritize them
- `E2E_ENABLE_RERUN_MUTATION=true`: explicitly enables the rerun test

## 4. Run The Tests

Standard run:

```bash
npm run test:e2e
```

Run with a visible browser:

```bash
npm run test:e2e:headed
```

Interactive mode:

```bash
npm run test:e2e:ui
```

HTML report after the run:

```bash
npm run test:e2e:report
```

## Stability Notes

- The suite runs sequentially with a single worker because it talks to a shared live backend and includes mutation scenarios with cleanup.
- Most tests are tied to the `PW-E2E-FIXTURE` batch so they do not depend on random live data.
- The save test restores the original record baseline through API cleanup.
- The edit-batch test restores the original fixture batch description through API cleanup.
- The create-batch test deletes the temporary batch through API cleanup.
- The admin create-user test deletes the temporary user through API cleanup.
- The upload test deletes the newly created book from the upload fixture batch through API cleanup.
- The rerun test is opt-in by design and should only run when you explicitly enable it.
- Context-driven scenarios may still skip if the configured fixture books do not expose the required UI state or record structure in the current dataset.
