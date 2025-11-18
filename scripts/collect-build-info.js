// This script retrieves the latest git commit hash, the nearest tag, and checks if the working directory is dirty (i.e., has uncommitted changes).
// It then creates a JSON file with this information, which can be used for versioning or build purposes.
// This script is intended to be run in a Node.js environment and requires the 'child_process' and 'fs' modules.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let commitHash;
let commitTag;
let isDirty;

try {
    // Get the latest commit hash
    commitHash = execSync('git rev-parse HEAD').toString().trim();
    console.log('[collect-build-info] ✅ Commit Hash:', commitHash);
} catch (error) {
    console.error('[env-bootstrap] ❌ Error running git commands:', error);
}

try {
    // Get the nearest tag if available
    commitTag = execSync('git describe --tags --abbrev=0 --always').toString().trim();
    if (commitTag === commitHash) {
        commitTag = undefined; // If the tag is the same as the commit hash, set it to undefined
        console.log('[collect-build-info] ⚠️ No tags found. Commit Tag is undefined.');
    } else {
        console.log('[collect-build-info] ✅ Commit Tag:', commitTag);
    }
} catch (error) {
    commitTag = undefined;
    console.log('[collect-build-info] ⚠️ No tags found. Commit Tag is undefined.');
}

try {
    // Get the status of the working directory
    isDirty = execSync('git status --porcelain').toString().trim().length > 0;
    console.log('[collect-build-info] ✅ Is Dirty:', isDirty);
} catch (error) {
    console.error('[env-bootstrap] ❌ Error running git commands:', error);
}

const info = {
    git_commit_hash: commitHash,
    git_tag: commitTag,
    git_dirty: isDirty,
    build_date: new Date().toISOString()
};
const versionInfoJson = JSON.stringify(info, null, 2);

const fileName = path.join(__dirname, '../src/assets/build-info.json');
console.log('[collect-build-info] ✅ Build info JSON generated, saving to file ' + fileName);
fs.writeFileSync(fileName, versionInfoJson, 'utf8', (err) => {
    if (err) {
        console.error('[env-bootstrap] ❌ Error writing file:', err);
    }
});
