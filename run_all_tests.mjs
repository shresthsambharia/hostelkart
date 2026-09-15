import { spawn } from 'child_process';

const testProcess = spawn('node', ['backend/run_all_tests.mjs'], { stdio: 'inherit' });
testProcess.on('close', (code) => {
  process.exit(code);
});
