import fs from 'node:fs';
import path from 'node:path';

const ENV_FILE = path.join(process.cwd(), '.env.e2e');

let loaded = false;

export function loadE2EEnv(): void {
  if (loaded || !fs.existsSync(ENV_FILE)) {
    return;
  }

  const file = fs.readFileSync(ENV_FILE, 'utf8');

  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = rawLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const rawValue = rawLine.slice(separatorIndex + 1).trim();
    process.env[key] = stripWrappingQuotes(rawValue);
  }

  loaded = true;
}

function stripWrappingQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}
