const { spawn } = require('child_process');

function run(cmd, args, label) {
  const p = spawn(cmd, args, { shell: true, stdio: 'inherit' });
  console.log(`[${label}] Starting...`);
  p.on('close', (code) => console.log(`[${label}] Exited with code ${code}`));
  return p;
}

// Start Frontend on Port 3000
run('node', ['frontend/index.js'], 'Frontend');

// Start Backend on Port 5000 (Uses nodemon for auto-restarts on save)
run('npx nodemon', ['backend/src/server.js'], 'Backend');
