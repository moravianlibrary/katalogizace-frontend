import { loadE2EEnv } from './load-env';

loadE2EEnv();

type RequiredEnvName = 'E2E_USER_EMAIL' | 'E2E_USER_PASSWORD';
type OptionalEnvName =
  | 'E2E_ADMIN_EMAIL'
  | 'E2E_ADMIN_PASSWORD'
  | 'E2E_LIMITED_EMAIL'
  | 'E2E_LIMITED_PASSWORD'
  | 'E2E_FIXTURE_BATCH_ID'
  | 'E2E_UPLOAD_BATCH_ID'
  | 'E2E_FIXTURE_BOOK_IDS'
  | 'E2E_ENABLE_RERUN_MUTATION';

type OptionalCredentials = {
  email: string | null;
  password: string | null;
  configured: boolean;
};

function requireEnv(name: RequiredEnvName): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.e2e.example to .env.e2e and fill in the E2E credentials before running Playwright.`,
    );
  }

  return value;
}

function optionalEnv(name: OptionalEnvName): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function optionalCredentials(
  emailName: Extract<OptionalEnvName, 'E2E_ADMIN_EMAIL' | 'E2E_LIMITED_EMAIL'>,
  passwordName: Extract<
    OptionalEnvName,
    'E2E_ADMIN_PASSWORD' | 'E2E_LIMITED_PASSWORD'
  >,
): OptionalCredentials {
  const email = optionalEnv(emailName);
  const password = optionalEnv(passwordName);

  return {
    email,
    password,
    configured: !!email && !!password,
  };
}

function parseNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNumberList(value: string | null, fallback: number[]): number[] {
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

  return parsed.length > 0 ? parsed : fallback;
}

export const e2eEnv = {
  apiUrl:
    process.env['E2E_API_URL']?.trim() ||
    'https://ai-katalogizace-api.trinera.cloud',
  baseUrl: process.env['E2E_BASE_URL']?.trim() || 'http://127.0.0.1:4200',
  email: requireEnv('E2E_USER_EMAIL'),
  password: requireEnv('E2E_USER_PASSWORD'),
  admin: optionalCredentials('E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'),
  limited: optionalCredentials('E2E_LIMITED_EMAIL', 'E2E_LIMITED_PASSWORD'),
  fixtures: {
    batchId: parseNumber(optionalEnv('E2E_FIXTURE_BATCH_ID'), 127),
    uploadBatchId: parseNumber(optionalEnv('E2E_UPLOAD_BATCH_ID'), 126),
    bookIds: parseNumberList(optionalEnv('E2E_FIXTURE_BOOK_IDS'), [839, 840]),
  },
  enableRerunMutation: optionalEnv('E2E_ENABLE_RERUN_MUTATION') === 'true',
};
