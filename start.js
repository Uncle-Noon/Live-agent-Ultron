const { spawn } = require('child_process');

function run(cmd, args, label) {
  const p = spawn(cmd, args, { shell: true, stdio: 'inherit' });
  p.on('close', (code) => console.log(`[${label}] Exited with code ${code}`));
  return p;
}

// Start Backend on Port 3000 (Uses nodemon for auto-restarts on save)
require("./backend/src/server.js");
