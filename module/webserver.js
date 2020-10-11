'use strict';

const http = require('http');
const fs = require('fs');
const EventEmitter = require('events');

const webServerSockets = new Set();
let webServer = null;

exports.event = new EventEmitter();

exports.start = (root, port) => {
	if (webServer !== null) {
		return;
	}

	webServer = http.createServer(function (req, res) {
		let file = req.url.substr(1);
		if (file === '') {
			file = 'index.html';
		}
		if (file.includes('?')) {
			file = file.slice(0, file.indexOf('?'));
		}
		fs.readFile(root + file, function (err,data) {
			if (err) {
				res.writeHead(404);
				res.end(JSON.stringify(err));
				return;
			}
			if (file.endsWith('.css')) {
				res.writeHead(200, {'Content-type': 'text/css'});
			}
			else if (file.endsWith('.js')) {
				res.writeHead(200, {'Content-type': 'application/javascript'});
			}
			else {
				res.writeHead(200);
			}
			res.end(data);
		});
	});

	webServer.on('connection', (socket) => {
		webServerSockets.add(socket);
		webServer.once('close', () => {
			webServerSockets.delete(socket);
		});
	});

	webServer.listen(port);

	exports.event.emit('start');
};

exports.stop = () => {
	if (webServer === null) {
		return;
	}
	for (const socket of webServerSockets) {
		socket.destroy();
		webServerSockets.delete(socket);
	}
	webServer.close(() => {
		webServer = null;
		exports.event.emit('close');
	});
};
