const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const http = require('http');

let mainWindow;
let backendProcess;

// Function to check if backend is ready
function checkBackendReady(port = 5069) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      if (res.statusCode === 200) {
        console.log(`Backend is ready on port ${port}!`);
        resolve(port);
      } else {
        console.log(`Backend responded with status: ${res.statusCode}`);
        reject(new Error(`Backend responded with status: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      console.log(`Backend not ready on port ${port}:`, err.message);
      reject(err);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error(`Backend connection timeout on port ${port}`));
    });
  });
}

// Function to wait for backend to be ready
async function waitForBackend() {
  const maxAttempts = 30; // 30 seconds max
  let attempts = 0;
  let currentPort = 5069;
  
  while (attempts < maxAttempts) {
    try {
      const port = await checkBackendReady(currentPort);
      return port;
    } catch (error) {
      attempts++;
      console.log(`Backend check attempt ${attempts}/${maxAttempts} failed on port ${currentPort}:`, error.message);
      
      // Try next port if current one fails
      if (attempts % 5 === 0) { // Try new port every 5 attempts
        currentPort++;
        if (currentPort > 5080) currentPort = 5069; // Reset to original port
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }
  
  throw new Error('Backend failed to start within 30 seconds');
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'rio-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  if (isDev) {
    // In development, start the backend using dotnet run
    const backendPath = path.join(__dirname, '../../backend');
    const fs = require('fs');
    if (!fs.existsSync(backendPath)) {
      console.error('Backend directory not found:', backendPath);
      return;
    }
    backendProcess = spawn('dotnet', ['run'], {
      cwd: backendPath,
      stdio: 'inherit'
    });
    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      const { dialog } = require('electron');
      dialog.showErrorBox('Backend Error',
        'Failed to start backend server.\n\n' +
        'Please make sure:\n' +
        '1. .NET 7.0 is installed\n' +
        '2. Backend directory exists\n' +
        '3. No other application is using port 5000/5001'
      );
    });
    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0) {
        console.error('Backend process exited with error code:', code);
      }
    });
  } else {
    // In production, launch the published backend executable
    const backendExe = process.platform === 'win32'
      ? path.join(process.resourcesPath, 'backend', 'backend.exe')
      : path.join(process.resourcesPath, 'backend', 'backend');
    const dbPath = path.join(process.resourcesPath, 'backend', 'BusinessManagement.db');
    const backendDir = path.dirname(backendExe);
    const fs = require('fs');
    
    console.log('Looking for backend executable at:', backendExe);
    console.log('Looking for database at:', dbPath);
    
    if (!fs.existsSync(backendExe)) {
      console.error('Backend executable not found:', backendExe);
      const { dialog } = require('electron');
      dialog.showErrorBox('Backend Error',
        'Backend executable not found.\n\n' +
        'Please reinstall the application or contact support.\n\n' +
        'Expected location: ' + backendExe
      );
      return;
    }
    
    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found:', dbPath);
      const { dialog } = require('electron');
      dialog.showErrorBox('Database Error',
        'Database file not found.\n\n' +
        'Please reinstall the application or contact support.\n\n' +
        'Expected location: ' + dbPath
      );
      return;
    }
    
    console.log('Starting backend executable...');
    backendProcess = spawn(backendExe, [], {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'], // Enable stdio to see output
      detached: false, // Don't detach so we can monitor it
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: 'http://localhost:5069'
      }
    });
    
    // Log backend output
    backendProcess.stdout.on('data', (data) => {
      console.log('Backend stdout:', data.toString());
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error('Backend stderr:', data.toString());
    });
    
    backendProcess.on('error', (error) => {
      console.error('Backend process error:', error);
      const { dialog } = require('electron');
      dialog.showErrorBox('Backend Error',
        'Failed to start backend server.\n\n' +
        'Error: ' + error.message
      );
    });
    
    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0) {
        console.error('Backend process exited with error code:', code);
        const { dialog } = require('electron');
        dialog.showErrorBox('Backend Error',
          'Backend server stopped unexpectedly.\n\n' +
          'Exit code: ' + code
        );
      }
    });
    
    console.log('Backend process started with PID:', backendProcess.pid);
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  createMenu();
  startBackend();
  
  try {
    console.log('Waiting for backend to be ready...');
    const backendPort = await waitForBackend();
    console.log(`Backend is ready on port ${backendPort}, creating window...`);
    
    // Set the backend port for the frontend to use
    process.env.BACKEND_PORT = backendPort;
    
    createWindow();
  } catch (error) {
    console.error('Failed to start backend:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Backend Error',
      'Failed to start backend server.\n\n' +
      'Please try:\n' +
      '1. Restart the application\n' +
      '2. Check if ports 5069-5080 are available\n' +
      '3. Reinstall the application\n\n' +
      'Error: ' + error.message
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up backend process when app quits
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Handle app quit
app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
}); 