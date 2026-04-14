const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('Testing backend startup...');

// Test the backend executable
const backendExe = path.join(__dirname, '../backend/publish/backend.exe');
const fs = require('fs');

if (!fs.existsSync(backendExe)) {
  console.error('Backend executable not found:', backendExe);
  process.exit(1);
}

console.log('Backend executable found:', backendExe);

// Start the backend
const backendProcess = spawn(backendExe, [], {
  cwd: path.dirname(backendExe),
  stdio: ['pipe', 'pipe', 'pipe']
});

console.log('Backend process started with PID:', backendProcess.pid);

// Log backend output
backendProcess.stdout.on('data', (data) => {
  console.log('Backend stdout:', data.toString());
});

backendProcess.stderr.on('data', (data) => {
  console.error('Backend stderr:', data.toString());
});

backendProcess.on('error', (error) => {
  console.error('Backend process error:', error);
});

backendProcess.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Wait a bit and test the health endpoint
setTimeout(() => {
  console.log('Testing health endpoint...');
  
  const req = http.get('http://localhost:5069/api/health', (res) => {
    console.log('Health check response status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Health check response:', data);
      backendProcess.kill();
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.error('Health check failed:', err.message);
    backendProcess.kill();
    process.exit(1);
  });
  
  req.setTimeout(5000, () => {
    console.error('Health check timeout');
    req.destroy();
    backendProcess.kill();
    process.exit(1);
  });
}, 5000); 