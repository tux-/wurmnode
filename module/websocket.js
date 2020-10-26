'use strict';

const WebSocket = require('ws');
const EventEmitter = require('events');

let wss = null;

let cconnections = 0;

exports.event = new EventEmitter();

exports.start = (port) => {
	if (wss !== null) {
		return;
	}
	wss = new WebSocket.Server({
		port: port,
		perMessageDeflate: {
			zlibDeflateOptions: {
				// See zlib defaults.
				chunkSize: 1024,
				memLevel: 7,
				level: 3
			},
			zlibInflateOptions: {
				chunkSize: 10 * 1024
			},
			// Other options settable:
			clientNoContextTakeover: true, // Defaults to negotiated value.
			serverNoContextTakeover: true, // Defaults to negotiated value.
			serverMaxWindowBits: 10, // Defaults to negotiated value.
			// Below options specified as default values.
			concurrencyLimit: 10, // Limits zlib concurrency for perf.
			threshold: 1024 // Size (in bytes) below which messages
			// should not be compressed.
		}
	});

	exports.event.emit('start');

	wss.on('connection', (ws, req, client) => {
		cconnections++;
		ws.id = cconnections;
		ws.isAlive = true;

		exports.event.emit('count', wss.clients.size);

		ws.on('message', function incoming(message) {
			ws.isAlive = true;
			let json = JSON.parse(message);
			if (json.type === 'pong') {
			}
			else if (json.type === 'ping') {
				ws.send(JSON.stringify({
					type: 'pong',
				}));
			}
			else {
				exports.event.emit('message', json, ws);
			}
		});

	});

	const interval = setInterval(function ping() {
		wss.clients.forEach(function each(ws) {
			if (ws.isAlive === false) {
				ws.terminate();
				exports.event.emit('count', wss.clients.size);
				return;
			}

			ws.isAlive = false;
			try {
				// Will crash if the socket is not open.
				ws.send(JSON.stringify({
					type: 'ping',
				}));
			}
			catch (e) {
				console.log(e);
			}
		});
	}, 30000);

	wss.on('close', () => {
		exports.event.emit('close');
		clearInterval(interval);
		wss = null;
	});
};

exports.stop = () => {
	if (wss === null) {
		return;
	}
	wss.close();
};

exports.send = (type, client, message, data) => {
	if (typeof client === 'number') {
		wss.clients.forEach(function each(instance) {
			if (instance.id === client) {
				client = instance;
			}
		});
	}
	if (typeof client !== 'number') {
		client.send(JSON.stringify({
			type: type,
			message: message,
			data: data,
		}));
	}
};

exports.broadcast = (type, subtype, data) => {
	if (wss === null) {
		return;
	}
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			if (type === 'profile') {
				client.send(JSON.stringify({
					type: type,
					section: subtype,
					data: data,
				}));
			}
			else {
				client.send(JSON.stringify({
					type: subtype,
					data: data,
				}));
			}
		}
	});
};
