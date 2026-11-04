const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../dist');
const targets = [
  path.resolve(__dirname, '../../node_modules/@workspace/db/dist'),
  path.resolve(__dirname, '../../artifacts/api-server/node_modules/@workspace/db/dist'),
  path.resolve(__dirname, '../../artifacts/hotel-management/node_modules/@workspace/db/dist'),
];

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

for (const target of targets) {
  copyDir(src, target);
}
console.log('Synchronized @workspace/db/dist to workspace consumers.');
