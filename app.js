'use strict';

const {app, Menu, BrowserWindow, dialog, ipcMain, shell, powerMonitor} = require('electron');
const {Worker} = require('worker_threads');
const appConfig = require('electron-settings');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const ws = require('./module/websocket.js');
const web = require('./module/webserver.js');

console.log('Starting WurnNode…');

let ENV_MODE = 'production';

let win = null;
let isParsing = false;

const wins = {};

if (process.argv[2] === '--dev') {
	ENV_MODE = 'dev';
}

/* --- Electron setup --- */
const createWindow = () => {
	appConfig.get('windowState.main').then((windowState) => {
		let height = 600;
		if (ENV_MODE !== 'production') {
			height = 1000;
		}

		const winProp = {
			width: 1000,
			height: height,
			minWidth: 1000,
			minHeight: 400,
			webPreferences: {
				contextIsolation: true,
				preload: path.join(__dirname, 'app/js/preload.js'),
			},
			icon: path.join(__dirname, '/app/www/favicon.png'),
		};

		if (windowState !== undefined) {
			for (let prop of ['width', 'height', 'x', 'y']) {
				if (windowState[prop] !== undefined) {
					winProp[prop] = windowState[prop];
				}
			}
		}

		win = new BrowserWindow(winProp);

		if (windowState !== undefined) {
			if (windowState.isMaximized) {
				win.maximize();
			}
		}

		['resize', 'move', 'close'].forEach(event => {
			win.on(event, () => {
				if (windowState === undefined) {
					windowState = {};
				}
				if (!win.isMaximized()) {
					windowState = win.getBounds();
				}
				windowState.isMaximized = win.isMaximized();
				appConfig.set(`windowState.main`, windowState);
			});
		});

		win.loadFile('app/index.html');

		if (ENV_MODE !== 'production') {
			win.webContents.openDevTools();
		}

		win.on('closed', () => {
			for (const w in wins) {
				wins[w].close();
				wins[w] = null;
			}
			win = null;
		});
	});
};

const toggleWin = (load, width, height) => {
	if ((wins[load] === undefined) || (wins[load] === null)) {
		const winProp = {
			width: width,
			height: height,
			webPreferences: {
				contextIsolation: true,
				preload: path.join(__dirname, 'app/js/preload.js'),
			},
			icon: path.join(__dirname, '/app/www/favicon.png'),
			frame: false,
		};

		wins[load] = new BrowserWindow(winProp);
		wins[load].setAlwaysOnTop(true, 'screen');
		wins[load].setResizable(false);
		wins[load].loadFile(load);
		wins[load].on('closed', () => {
			wins[load] = null;
		});
	}
	else {
		wins[load].close();
	}
};

const menutemplate = [
	{
		label: 'File',
		submenu: [
			{ role: 'quit' }
		],
	},
];

if (ENV_MODE === 'dev') {
	menutemplate.push({
		label: 'Developer',
		submenu: [
			{ role: 'reload' },
			{ role: 'forcereload' },
			{ role: 'toggledevtools' },
			{ type: 'separator' },
			{ role: 'resetzoom' },
			{ role: 'zoomin' },
			{ role: 'zoomout' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' },
		],
	});
}

const menu = Menu.buildFromTemplate(menutemplate);
Menu.setApplicationMenu(menu);
/* === Electron setup === */


/* --- Storage setup --- */
exports.setStorageSync = (index, data) => {
	appConfig.setSync(`appSave.${index}`, data);
};
exports.setStorage = (index, data) => {
	return appConfig.set(`appSave.${index}`, data);
};
ipcMain.handle('getStorage', async (event, index) => {
	return exports.getStorage(index);
});
exports.getStorage = (index) => {
	return appConfig.get(`appSave.${index}`);
};
ipcMain.on('getStorageSync', async (event, index) => {
	return exports.getStorageSync(index);
});
exports.getStorageSync = (index) => {
	return appConfig.getSync(`appSave.${index}`);
};
exports.unsetStorageSync = (index) => {
	appConfig.unsetSync(`appSave.${index}`);
};
exports.unsetStorage = (index) => {
	return appConfig.unset(`appSave.${index}`);
};
/* === Storage setup === */


/* --- Version check --- */
let isLatest = true;
let fetchedLatest = fetch('https://www.wurmnode.com/version.txt', {
}).then((r) => {
	return r.text();
}).then((r) => {
	const latestVersion = r.trim().match(/^(\d+)\.(\d+)\.(\d+)$/)[0];
	if (app.getVersion() !== latestVersion) {
		isLatest = false;
	}
}).catch((e) => {});

ipcMain.on('updateAvailable', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'updateAvailable',
		updateAvailable: !isLatest,
	});
});
exports.updateAvailable = () => {
	return !isLatest;
};
ipcMain.on('getVersion', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'getVersion',
		version: app.getVersion(),
	});
});
exports.getVersion = () => {
	return app.getVersion();
};
/* === Version check === */

const publishEvent = (event, data) => {
	win.webContents.send('wurmnode', {
		event: event,
		data: data,
	});
	for (const w in wins) {
		if (wins[w] !== null) {
			wins[w].webContents.send('wurmnode', {
				event: event,
				data: data,
			});
		}
	}
	app.emit(event, data.type, data.data);
	ws.broadcast(event, data.type, data.data);
};

/* --- General --- */
const parser = new Worker(__dirname + '/worker/parser.js');

const getAccountsDir = basePath => {
	return basePath + 'players' + path.sep;
};

const validateWurmDirectory = basePath => {
	const accountDir = getAccountsDir(basePath);
	if (fs.existsSync(accountDir)) {
		return true;
	}
	return false;
};

ipcMain.on('isParsing', (event, index) => {
	win.webContents.send('wurmnode', {
		event: 'isParsing',
		isParsing: isParsing,
	});
});

Promise.all([fetchedLatest]).then(() => {
	win.webContents.send('wurmnode', {
		event: 'ready',
	});
});

exports.ready = Promise.all([fetchedLatest]);

exports.screenshotsDirs = [];

parser.on('message', (data) => {
	if (data.name === 'parsed') {
		win.webContents.send('wurmnode', {
			event: data.type,
		});
		app.emit(data.type);
	}
	else if (data.name === 'event') {
		publishEvent('event', data);
	}
	else if (data.name === 'profile') {
		publishEvent('profile', data);
	}
	else if (data.name === 'getWurmDirs') {
		const wurmdirPromise = appConfig.get(`appSave.wurmdir`);
		const wurmdirsPromise = appConfig.get(`appSave.wurmdirs`);
		const watchPolling = appConfig.getSync(`appSave.watchPolling`);

		Promise.all([wurmdirPromise, wurmdirsPromise]).then((result) => {
			parser.postMessage({call: 'realParse', dirs: result, watchPolling: watchPolling, param: data.param});
		});
	}
	else if (data.name === 'screenshotDirs') {
		exports.screenshotsDirs = data.data;
	}
	else if (data.name === 'getData') {
		if (data.instance === 'app') {
			win.webContents.send('wurmnode', {
				event: 'response',
				data: data,
			});
		}
		else {
			ws.send('response', data.instance, data.message, data.data);
		}
	}
	else if (data.name === 'parsing') {
		isParsing = data.message;
	}
	else if (data.name === 'working') {
		win.webContents.send('wurmnode', {
			event: 'working',
			data: data.data,
		});
	}
	else if (data.name === 'error') {
		win.webContents.send('wurmnode', {
			event: 'error',
			data: data,
		});
		console.log('errordata', data);
		// throw data;
	}
});

parser.postMessage({call: 'parse', param: 'initialized'});

app.on('ready', () => {
	createWindow();
});

app.on('window-all-closed', () => {
	app.quit();
});

app.on('activate', () => {
	if (win === null) {
		createWindow();
	}
});

ipcMain.on('togglegroundimperwindow', (event, args) => {
	toggleWin('app/groundimp.html', 291, 55);
});
/* === General === */


/* --- Directories --- */
ipcMain.on('selectWurmDirectory', (event, args) => {
	let wurmDir = dialog.showOpenDialog(win, {
		properties: ['openDirectory']
	});

	wurmDir.then(basePath => {
		if (basePath.canceled === false) {
			if (validateWurmDirectory(basePath.filePaths[0]  + path.sep)) {
				exports.setStorageSync(`wurmdir`, basePath.filePaths[0]  + path.sep);
				win.webContents.send('wurmnode', {
					event: 'loading',
				});
				app.emit('loading');
				parser.postMessage({call: 'parse', param: 'wurmDirectoryUpdated'});
			}
			else {
				win.webContents.send('wurmnode', {
					event: 'service',
					dir: 'invalid',
				});
				app.emit('service', 'dir', 'invalid');
			}
		}
	});
});

ipcMain.on('addBackupDirectory', (event, args) => {
	let wowDir = dialog.showOpenDialog(win, {
		properties: ['openDirectory']
	});

	wowDir.then(basePath => {
		if (basePath.canceled === false) {
			if (validateWurmDirectory(basePath.filePaths[0]  + path.sep)) {
				exports.getStorage(`wurmdirs`).then((wurmdirs) => {
					if (wurmdirs === undefined) {
						wurmdirs = [];
					}
					wurmdirs.push(basePath.filePaths[0]  + path.sep);
					exports.setStorageSync(`wurmdirs`, wurmdirs);
					win.webContents.send('wurmnode', {
						event: 'loading',
					});
					app.emit('loading');
					parser.postMessage({call: 'parse', param: 'backupDirectoryUpdated'});
				});
			}
			else {
				win.webContents.send('wurmnode', {
					event: 'service',
					dir: 'invalid',
				});
				app.emit('service', 'dir', 'invalid');
			}
		}
	});
});


ipcMain.on('getWurmDir', (event, args) => {
	exports.getStorage('wurmdir').then((r) => {
		win.webContents.send('wurmnode', {
			event: 'getWurmDir',
			dir: r,
		});
	});
});
ipcMain.on('getWatchPolling', (event, args) => {
	exports.getStorage('watchPolling').then((r) => {
		win.webContents.send('wurmnode', {
			event: 'getWatchPolling',
			polling: (r === true ? true : false),
		});
	});
});
ipcMain.on('setWatchPolling', (event, args) => {
	exports.setStorageSync('watchPolling', args);
	parser.postMessage({call: 'parse', param: 'watchPollingUpdated'});
});

ipcMain.on('getBackupDirs', (event, args) => {
	exports.getStorage('wurmdirs').then((r) => {
		win.webContents.send('wurmnode', {
			event: 'getBackupDirs',
			dirs: r,
		});
	});
});

ipcMain.on('removeBackupDirectory', (event, index) => {
	exports.getStorage(`wurmdirs`).then((wurmdirs) => {
		wurmdirs.splice(index, 1);
		exports.setStorageSync(`wurmdirs`, wurmdirs);
		parser.postMessage({call: 'parse', param: 'backupDirectoryUpdated'});
	});
});
/* === Directories === */


/* --- WebSocket --- */
ws.event.on('close', () => {
	win.webContents.send('wurmnode', {
		event: 'getWssStatus',
		value: 'stop',
	});
	app.emit('service', 'ws', 'stop');
});
ws.event.on('start', () => {
	if (win !== null) {
		win.webContents.send('wurmnode', {
			event: 'getWssStatus',
			value: 'start',
		});
	}
	app.emit('service', 'ws', 'start');
});
ws.event.on('count', (count) => {
	win.webContents.send('wurmnode', {
		event: 'service',
		ws: 'count',
		count: count,
	});
	app.emit('service', 'ws', 'count', count);
});
ws.event.on('message', (data, instance) => {
	try {
		if (typeof data === 'object') {
			data = JSON.stringify(data);
		}
		const message = JSON.parse(data);
		if (message.get === 'chars') {
			parser.postMessage({call: 'getCharacters', instance: instance.id, message: message});
		}
		else if ((message.get === 'char') && (message.name !== undefined)) {
			parser.postMessage({call: 'getChar', char: message.name, instance: instance.id, message: message});
		}
		else {
			console.log('message:', message);
		}
	}
	catch (e) {
		console.log(e);
		console.log(typeof data);
		console.log(data);
	}
});
ipcMain.on('getCharacters', (event, args) => {
	parser.postMessage({call: 'getCharacters', instance: 'app', message: null});
});
ipcMain.on('getChar', (event, args) => {
	parser.postMessage({call: 'getChar', char: args, instance: 'app', message: null});
});
ipcMain.on('startWss', (event, args) => {
	exports.setStorage(`wssstatus`, 'start');
	const port = exports.getWssPort();
	ws.start(port);
});
exports.startWss = () => {
	exports.setStorage(`wssstatus`, 'start');
	const port = exports.getWssPort();
	ws.start(port);
};
ipcMain.on('stopWss', (event, args) => {
	exports.setStorage(`wssstatus`, 'stop');
	ws.stop();
});
exports.stopWss = () => {
	exports.setStorage(`wssstatus`, 'stop');
	ws.stop();
};
ipcMain.on('getWssPort', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'getWssPort',
		value: exports.getWssPort(),
	});
});
ipcMain.on('resetWssPort', (event, args) => {
	exports.unsetStorage('wssport').then(() => {
		ws.event.once('close', () => {
			const port = exports.getWssPort();
			ws.start(port);
			win.webContents.send('wurmnode', {
				event: 'getWssPort',
				value: port,
			});
		});
		ws.stop();
	});
});
ipcMain.on('getWssStatus', (event, args) => {
	exports.getStorage('wssstatus').then((r) => {
		win.webContents.send('wurmnode', {
			event: 'getWssStatus',
			value: r,
		});
	});
});
ipcMain.on('getWssCount', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'service',
		ws: 'count',
		count: ws.getCount(),
	});
});
ipcMain.on('openExternal', (event, args) => {
	shell.openExternal(args);
});
ipcMain.on('openLocalServer', (event, args) => {
	shell.openExternal('http://localhost:' + exports.getWebPort() + '/');
});
exports.getWssPort = () => {
	let port = parseInt(exports.getStorageSync(`wssport`));
	if ((isNaN(port)) || (port < 1024) || (port > 65535)) {
		port = 60606;
	}
	return port;
};
ipcMain.on('setWssPort', (event, port) => {
	exports.setStorageSync(`wssport`, parseInt(port));
});
exports.setWssPort = (port) => {
	exports.setStorageSync(`wssport`, parseInt(port));
};
exports.getStorage(`wssstatus`).then((status) => {
	if (status === 'start') {
		exports.startWss();
	}
});
/* === WebSocket === */


/* --- Web Server --- */
web.event.on('close', () => {
	win.webContents.send('wurmnode', {
		event: 'getWebStatus',
		value: 'stop',
	});
	app.emit('service', 'web', 'stop');
});
web.event.on('start', () => {
	if (win !== null) {
		win.webContents.send('wurmnode', {
			event: 'getWebStatus',
			value: 'start',
		});
	}
	app.emit('service', 'web', 'start');
});
ipcMain.on('selectWebDirectory', (event, args) => {
	let webDir = dialog.showOpenDialog(win, {
		properties: ['openDirectory']
	});

	webDir.then(basePath => {
		if (basePath.canceled === false) {
			exports.setStorageSync(`webmdir`, basePath.filePaths[0]  + path.sep);
			win.webContents.send('wurmnode', {
				event: 'service',
				web: 'newdir',
				value: basePath.filePaths[0]  + path.sep,
			});
			app.emit('service', 'web', 'newdir');
		}
	});
});
ipcMain.on('resetWebDirectory', (event, args) => {
	appConfig.unsetSync(`appSave.webmdir`);
	win.webContents.send('wurmnode', {
		event: 'getWebRoot',
		value: exports.getWebRoot(),
	});
});

ipcMain.on('getWebRoot', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'getWebRoot',
		value: exports.getWebRoot(),
	});
});
exports.getWebRoot = () => {
	let dir = exports.getStorageSync(`webmdir`);
	if ((typeof dir !== 'string') || (!fs.existsSync(dir))) {
		dir = __dirname + path.sep + 'examples' + path.sep;
	}
	return dir;
};
ipcMain.on('getWebPort', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'getWebPort',
		value: exports.getWebPort(),
	});
});
ipcMain.on('resetWebPort', (event, args) => {
	exports.unsetStorage('webport').then(() => {
		web.event.once('close', () => {
			const root = exports.getWebRoot();
			const port = exports.getWebPort();
			web.start(root, port);
			win.webContents.send('wurmnode', {
				event: 'getWebPort',
				value: port,
			});
		});
		web.stop();
	});
});
exports.getWebPort = () => {
	let port = parseInt(exports.getStorageSync(`webport`));
	if ((isNaN(port)) || (port < 1024) || (port > 65535)) {
		port = 8080;
	}
	return port;
};

ipcMain.on('startWeb', (event, args) => {
	exports.setStorage(`webstatus`, 'start');
	const root = exports.getWebRoot();
	const port = exports.getWebPort();
	web.start(root, port);
});
exports.startWeb = () => {
	exports.setStorage(`webstatus`, 'start');
	const root = exports.getWebRoot();
	const port = exports.getWebPort();
	web.start(root, port);
};
exports.stopWeb = () => {
	exports.setStorage(`webstatus`, 'stop');
	web.stop();
};
ipcMain.on('stopWeb', (event, args) => {
	exports.setStorage(`webstatus`, 'stop');
	web.stop();
});
ipcMain.on('setWebPort', (event, port) => {
	exports.setStorageSync(`webport`, parseInt(port));
});
exports.setWebPort = (port) => {
	exports.setStorageSync(`webport`, parseInt(port));
};
ipcMain.on('getWebStatus', (event, args) => {
	win.webContents.send('wurmnode', {
		event: 'getWebStatus',
		value: exports.getStorageSync(`webstatus`),
	});
});
exports.getStorage(`webstatus`).then((status) => {
	if (status === 'start') {
		exports.startWeb();
	}
});
/* === Web Server === */
