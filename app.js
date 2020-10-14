'use strict';

const {app, Menu, BrowserWindow, dialog} = require('electron');
const appConfig = require('electron-settings');
const profiler = require('./module/profiler.js');
const parser = require('./module/parser.js');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const ws = require('./module/websocket.js');
const web = require('./module/webserver.js');

console.log('Starting WurnNode…');

let ENV_MODE = 'production';

let win = null;

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
			height:height,
			minWidth: 1000,
			minHeight: 400,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: true
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
			win = null;
		});
	});
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
exports.getStorage = (index) => {
	return appConfig.get(`appSave.${index}`);
};
exports.getStorageSync = (index) => {
	return appConfig.getSync(`appSave.${index}`);
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

exports.updateAvailable = () => {
	return !isLatest;
};
exports.getVersion = () => {
	return app.getVersion();
};
/* === Version check === */


/* --- General --- */
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

exports.selectWurmDirectory = () => {
	let wowDir = dialog.showOpenDialog(win, {
		properties: ['openDirectory']
	});

	wowDir.then(basePath => {
		if (basePath.canceled === false) {
			if (validateWurmDirectory(basePath.filePaths[0]  + path.sep)) {
				exports.setStorageSync(`wurmdir`, basePath.filePaths[0]  + path.sep);
				app.emit('loading');
				parser.parse('wurmDirectoryUpdated');
			}
			else {
				app.emit('service', 'dir', 'invalid');
			}
		}
	});
};

exports.addBackupDirectory = () => {
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
					app.emit('loading');
					parser.parse('backupDirectoryUpdated');
				});
			}
			else {
				app.emit('service', 'dir', 'invalid');
			}
		}
	});
};

exports.removeBackupDirectory = (index) => {
	exports.getStorage(`wurmdirs`).then((wurmdirs) => {
		wurmdirs.splice(index, 1);
		exports.setStorageSync(`wurmdirs`, wurmdirs);
		parser.parse('backupDirectoryUpdated');
	});
};

exports.getChar = (name) => {
	if (name === undefined) {
		return profiler.getCharacters();
	}
	return profiler.getCharacterData(name);
};

exports.uiLoaded = () => {
	parser.parse('initialized');
};

exports.ready = Promise.all([fetchedLatest]);

parser.event.on('event', (type, data) => {
	app.emit('event', type, data);
	ws.broadcast('event', type, data);
});
parser.event.on('parsed', (type) => {
	app.emit(type);
});
profiler.event.on('profile', (type, data) => {
	app.emit('profile', type, data);
	ws.broadcast('profile', type, data);
});

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
/* === General === */


/* --- WebSocket --- */
ws.event.on('close', () => {
	app.emit('service', 'ws', 'stop');
});
ws.event.on('start', () => {
	app.emit('service', 'ws', 'start');
});
ws.event.on('count', (count) => {
	app.emit('service', 'ws', 'count', count);
});
ws.event.on('message', (data, instance) => {
	const message = JSON.parse(data);
	if (message.get === 'chars') {
		ws.send('response', instance, message, profiler.getCharacters());
	}
	else if ((message.get === 'char') && (message.name !== undefined)) {
		ws.send('response', instance, message, profiler.getCharacterData(message.name));
	}
	else {
		console.log(message);
	}
});
exports.startWss = () => {
	exports.setStorage(`wssstatus`, 'start');
	const port = exports.getWssPort();
	ws.start(port);
};
exports.stopWss = () => {
	exports.setStorage(`wssstatus`, 'stop');
	ws.stop();
};
exports.getWssPort = () => {
	let port = parseInt(exports.getStorageSync(`wssport`));
	if ((isNaN(port)) || (port < 1024) || (port > 65535)) {
		port = 60606;
	}
	return port;
};
exports.setWssPort = (port) => {
	exports.setStorageSync(`wssport`, parseInt(port));
	fs.writeFileSync(__dirname + '/examples/config.js', "'use strict';\n\nlet config = `{\"wsport\":" + exports.getWssPort() + "}`;\n");
};
exports.getStorage(`wssstatus`).then((status) => {
	if (status === 'start') {
		exports.startWss();
	}
});
exports.setWssPort();
/* === WebSocket === */


/* --- Web Server --- */
web.event.on('close', () => {
	app.emit('service', 'web', 'stop');
});
web.event.on('start', () => {
	app.emit('service', 'web', 'start');
});

exports.selectWebDirectory = () => {
	let webDir = dialog.showOpenDialog(win, {
		properties: ['openDirectory']
	});

	webDir.then(basePath => {
		if (basePath.canceled === false) {
			exports.setStorageSync(`webmdir`, basePath.filePaths[0]  + path.sep);
			app.emit('service', 'web', 'newdir');
		}
	});
};
exports.resetWebDirectory = () => {
	appConfig.unsetSync(`appSave.webmdir`);
	app.emit('service', 'web', 'newdir');
};

exports.getWebRoot = () => {
	let dir = exports.getStorageSync(`webmdir`);
	if ((typeof dir !== 'string') || (!fs.existsSync(dir))) {
		dir = __dirname + path.sep + 'examples' + path.sep;
	}
	return dir;
};
exports.getWebPort = () => {
	let port = parseInt(exports.getStorageSync(`webport`));
	if ((isNaN(port)) || (port < 1024) || (port > 65535)) {
		port = 8080;
	}
	return port;
};

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
exports.setWebPort = (port) => {
	exports.setStorageSync(`webport`, parseInt(port));
};
exports.getStorage(`webstatus`).then((status) => {
	if (status === 'start') {
		exports.startWeb();
	}
});
/* === Web Server === */
