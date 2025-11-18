// This script checks if the environment.local.ts file exists.
// If it doesn't, it creates a new one by copying the content of environment.ts.
// Use it for development with ng serve.

const fs = require('fs');
const path = require('path');

const baseEnvPath = path.join(__dirname, '../src/environments/environment.ts');
const devEnvPath = path.join(__dirname, '../src/environments/environment.local.ts');

const HEADER_COMMENT = `// ⚠️ This file was auto-generated from environment.ts.
// You can customize it with secrets or local overrides.
// It is ignored in Git and safe for local development.
// -----------------------------------------------

`;

function getModifiedTime(filePath) {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null;
}

if (!fs.existsSync(devEnvPath)) {
  console.log('[env-bootstrap] ⚠️ environment.local.ts not found. Creating it from environment.ts...');

  try {
    const baseContent = fs.readFileSync(baseEnvPath, 'utf8');
    const devContent = HEADER_COMMENT + baseContent;
    fs.writeFileSync(devEnvPath, devContent);
    console.log('[env-bootstrap] ✅ environment.local.ts created successfully.');
  } catch (error) {
    console.error('[env-bootstrap] ❌ Failed to copy environment.ts:', error);
    process.exit(1);
  }

} else {
  const baseTime = getModifiedTime(baseEnvPath);
  const devTime = getModifiedTime(devEnvPath);

  console.log('[env-bootstrap] ✅ environment.local.ts already exists.');

  if (baseTime && devTime && baseTime > devTime) {
    console.warn('[env-bootstrap] ⚠️ Warning: environment.ts is newer than environment.local.ts. Consider syncing or updating your local dev file if needed.');
  }
}
