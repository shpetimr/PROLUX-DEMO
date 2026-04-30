const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const http = require('http');
const https = require('https');

let mainWindow;
let backendProcess;

function expandEnvReferences(value) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, bracedName, bareName) => {
    const name = bracedName || bareName;
    return process.env[name] || match;
  });
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = expandEnvReferences(value);
    }
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(isDev
  ? path.join(__dirname, '../../backend/.env')
  : path.join(process.resourcesPath, 'backend', '.env'));

function getFirstEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function getDatabaseProvider() {
  const configuredProvider = getFirstEnv('DATABASE_PROVIDER', 'DB_PROVIDER').toLowerCase();
  if (configuredProvider) {
    if (['postgres', 'postgresql', 'pg', 'supabase'].includes(configuredProvider)) {
      return 'postgresql';
    }

    return 'sqlite';
  }

  if (getFirstEnv('SQLITE_CONNECTION_STRING')) {
    return 'sqlite';
  }

  const sharedConnection = getFirstEnv(
    'POSTGRES_CONNECTION_STRING',
    'POSTGRESQL_CONNECTION_STRING',
    'POSTGRES_URL',
    'DATABASE_CONNECTION_STRING',
    'DATABASE_URL'
  );

  return /^(postgres|postgresql):\/\//i.test(sharedConnection) || /^Host=/i.test(sharedConnection)
    ? 'postgresql'
    : 'sqlite';
}

function normalizeUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

function normalizePath(value, fallback = '') {
  const pathValue = value?.trim() || fallback;
  if (!pathValue) {
    return '';
  }

  return `/${pathValue.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function buildUrlFromParts(prefix, fallbackPortName) {
  const scheme = getFirstEnv(`${prefix}_SCHEME`);
  const host = getFirstEnv(`${prefix}_HOST`);
  const port = getFirstEnv(`${prefix}_PORT`, fallbackPortName);

  if (!scheme || !host) {
    return '';
  }

  const normalizedScheme = scheme.replace(/[:/\\]+$/, '');
  const normalizedPort = port ? `:${port.replace(/^:/, '')}` : '';
  return `${normalizedScheme}://${host}${normalizedPort}`;
}

function firstServerUrl(value) {
  return value.split(/[;,]/).map((url) => url.trim()).find(Boolean) || '';
}

function deriveBackendOriginFromApiUrl(apiUrl) {
  try {
    const url = new URL(apiUrl);
    if (url.pathname.toLowerCase().endsWith('/api')) {
      url.pathname = url.pathname.slice(0, -4) || '/';
      url.search = '';
      url.hash = '';
      return normalizeUrl(url.toString());
    }

    return url.origin;
  } catch {
    return '';
  }
}

function getBackendOrigin() {
  const configuredOrigin = getFirstEnv('PROLUX_BACKEND_ORIGIN', 'PROLUX_BACKEND_URL');
  if (configuredOrigin) {
    return normalizeUrl(configuredOrigin);
  }

  const serverUrls = getFirstEnv('ASPNETCORE_URLS', 'PROLUX_BACKEND_URLS');
  if (serverUrls) {
    return normalizeUrl(firstServerUrl(serverUrls));
  }

  const fromParts = buildUrlFromParts('PROLUX_BACKEND', 'BACKEND_PORT');
  if (fromParts) {
    return normalizeUrl(fromParts);
  }

  const apiBaseUrl = getFirstEnv('PROLUX_API_BASE_URL', 'REACT_APP_API_URL');
  if (apiBaseUrl) {
    return deriveBackendOriginFromApiUrl(apiBaseUrl);
  }

  throw new Error('Backend URL is not configured. Set PROLUX_BACKEND_ORIGIN, PROLUX_BACKEND_SCHEME/HOST/PORT, or REACT_APP_API_URL.');
}

const backendOrigin = getBackendOrigin();
const configuredApiBaseUrl =
  getFirstEnv('PROLUX_API_BASE_URL', 'REACT_APP_API_URL') ||
  `${backendOrigin}${normalizePath(getFirstEnv('PROLUX_API_PATH', 'REACT_APP_API_PATH'), '/api')}`;
const apiBaseUrl = normalizeUrl(configuredApiBaseUrl);
const backendOriginUrl = new URL(backendOrigin);
const backendPort = Number.parseInt(
  getFirstEnv('PROLUX_BACKEND_PORT', 'BACKEND_PORT') || backendOriginUrl.port,
  10
);
const maxBackendPort = Number.parseInt(
  getFirstEnv('PROLUX_BACKEND_MAX_PORT') || (Number.isFinite(backendPort) ? String(backendPort + 11) : ''),
  10
);
const backendMode = getFirstEnv('PROLUX_BACKEND_MODE').toLowerCase() || 'bundled';

function getBackendUrl(port = backendPort) {
  const url = new URL(backendOrigin);
  if (Number.isFinite(port)) {
    url.port = String(port);
  }

  return normalizeUrl(url.toString());
}

function getApiBaseUrl(port = backendPort) {
  const url = new URL(apiBaseUrl);
  if (Number.isFinite(port)) {
    url.port = String(port);
  }

  return normalizeUrl(url.toString());
}

function getFrontendDevUrl() {
  const configuredUrl =
    getFirstEnv('PROLUX_FRONTEND_DEV_URL', 'REACT_APP_DEV_SERVER_URL') ||
    buildUrlFromParts('PROLUX_FRONTEND', 'PORT') ||
    buildUrlFromParts('REACT_APP_FRONTEND', 'PORT');

  if (!configuredUrl) {
    throw new Error('Frontend dev URL is not configured. Set PROLUX_FRONTEND_DEV_URL or PROLUX_FRONTEND_SCHEME/HOST/PORT.');
  }

  return normalizeUrl(configuredUrl);
}

function addQuery(targetUrl, query) {
  const url = new URL(targetUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

// Function to check if backend is ready
function checkBackendReady(port = backendPort) {
  return new Promise((resolve, reject) => {
    const healthUrl = `${getApiBaseUrl(port)}/health`;
    const client = new URL(healthUrl).protocol === 'https:' ? https : http;
    const req = client.get(healthUrl, (res) => {
      if (res.statusCode === 200) {
        console.log(`Backend is ready at ${healthUrl}!`);
        resolve(port);
      } else {
        console.log(`Backend responded with status: ${res.statusCode}`);
        reject(new Error(`Backend responded with status: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      console.log(`Backend not ready at ${healthUrl}:`, err.message);
      reject(err);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error(`Backend connection timeout at ${healthUrl}`));
    });
  });
}

// Function to wait for backend to be ready
async function waitForBackend() {
  const maxAttempts = 30; // 30 seconds max
  let attempts = 0;
  let currentPort = Number.isFinite(backendPort) ? backendPort : undefined;
  
  while (attempts < maxAttempts) {
    try {
      const port = await checkBackendReady(currentPort);
      return port;
    } catch (error) {
      attempts++;
      console.log(`Backend check attempt ${attempts}/${maxAttempts} failed:`, error.message);
      
      // Try next port if current one fails
      if (Number.isFinite(currentPort) && Number.isFinite(maxBackendPort) && attempts % 5 === 0) { // Try new port every 5 attempts
        currentPort++;
        if (currentPort > maxBackendPort) currentPort = backendPort; // Reset to original port
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }
  
  throw new Error('Backend failed to start within 30 seconds');
}

function createWindow(activeBackendPort = backendPort) {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'prolux-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false, // Don't show until ready
  });

  const rendererConfig = {
    apiBaseUrl: getApiBaseUrl(activeBackendPort)
  };

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(addQuery(getFrontendDevUrl(), rendererConfig));
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'), {
      query: rendererConfig
    });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  if (backendMode === 'external') {
    console.log(`Using external backend at ${apiBaseUrl}`);
    return;
  }

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
      stdio: 'inherit',
      env: {
        ...process.env,
        ASPNETCORE_URLS: process.env.ASPNETCORE_URLS || getBackendUrl()
      }
    });
    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      const { dialog } = require('electron');
      dialog.showErrorBox('Backend Error',
        'Failed to start backend server.\n\n' +
        'Please make sure:\n' +
        '1. .NET 7.0 is installed\n' +
        '2. Backend directory exists\n' +
        `3. No other application is using ${getBackendUrl()}`
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
    const backendDir = path.dirname(backendExe);
    const fs = require('fs');
    const databaseProvider = getDatabaseProvider();
    
    console.log('Looking for backend executable at:', backendExe);
    console.log('Database provider:', databaseProvider);
    
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
    
    if (databaseProvider === 'sqlite') {
      const dbPath = path.join(process.resourcesPath, 'backend', 'BusinessManagement.db');
      console.log('Looking for database at:', dbPath);

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
    } else {
      console.log('Cloud database configured; skipping bundled SQLite database file check.');
    }
    
    console.log('Starting backend executable...');
    backendProcess = spawn(backendExe, [], {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe'], // Enable stdio to see output
      detached: false, // Don't detach so we can monitor it
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: process.env.ASPNETCORE_URLS || getBackendUrl()
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
    console.log(`Backend is ready at ${getApiBaseUrl(backendPort)}, creating window...`);
    
    // Set the backend port for the frontend to use
    if (Number.isFinite(backendPort)) {
      process.env.BACKEND_PORT = String(backendPort);
    }
    
    createWindow(backendPort);
  } catch (error) {
    console.error('Failed to start backend:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Backend Error',
      'Failed to start backend server.\n\n' +
      'Please try:\n' +
      '1. Restart the application\n' +
      `2. Check the configured backend URL: ${apiBaseUrl}\n` +
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
