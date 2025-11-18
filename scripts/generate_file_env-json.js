// This script generates a JSON file with environment variables for the application.
// It reads the environment variables from process.env and writes them to a file src/assets/env.json.
// The generated file can be used in the application to access environment-specific settings.

const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../src/assets/env.json');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`⚠️  Dir ${outputDir} not found. Creating it...`);
}

const config = {
  useStaticRuntimeConfig: false,

  devMode: process.env.APP_DEV_MODE === 'true',
  environmentName: process.env.APP_ENV_NAME || '',
  environmentCode: process.env.APP_ENV_CODE || '',

  apiServiceBaseUrl: process.env.APP_API_SERVICE_URL || '',
  apiServiceKey: process.env.APP_API_SERVICE_KEY || ''
};

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
console.log(`✔️  env.json generated at ${outputPath}`);
