const { app, BrowserWindow } = require('electron')
require('./dummy_server');

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 1366,
    height: 1080,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  //win.loadFile('dist/index.html')
  win.loadURL('http://localhost:3007');
}

app.on('ready', createWindow)