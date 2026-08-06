const fs = require('fs');
const path = require('path');

function patchFile(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`[Patch SDK] File not found: ${filepath}`);
    return;
  }

  let content = fs.readFileSync(filepath, 'utf8');
  
  // Find and replace role: "function" with role: "user"
  const target1 = 'role: "function"';
  const target2 = 'role:"function"';
  
  let modified = false;
  if (content.includes(target1)) {
    content = content.replaceAll(target1, 'role: "user"');
    modified = true;
  }
  if (content.includes(target2)) {
    content = content.replaceAll(target2, 'role:"user"');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`[Patch SDK] Successfully patched: ${filepath}`);
  } else {
    console.log(`[Patch SDK] Already patched or target not found in: ${filepath}`);
  }
}

// Resolve relative to backend/node_modules
const baseDir = path.join(__dirname, 'node_modules', '@google', 'generative-ai');
patchFile(path.join(baseDir, 'dist', 'index.mjs'));
patchFile(path.join(baseDir, 'dist', 'index.js'));
patchFile(path.join(baseDir, 'dist', 'index.cjs'));
