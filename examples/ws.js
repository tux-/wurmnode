'use strict';

window.ws = (() => {
	let ws = () => {
		return new ws.fn.init();
	};

	ws.fn = ws.prototype = {
		init: function () {
		}
	};

	ws.fn.init.prototype = ws.fn;

	ws.pingTimeout = null;

	ws.listeners = {};

	ws.connect = function (url) {
		console.log('Connecting…');
		try {
			this.socket = new WebSocket(url);

			const heartbeat = () => {
				this.socket.send(JSON.stringify({
					'type': 'pong'
				}));
				clearTimeout(ws.pingTimeout);
				ws.pingTimeout = setTimeout(() => {
					console.log('hb timeout');
					this.socket.close();
				}, 30000 + 5000);
			};

			this.socket.addEventListener('open', (e) => {
				console.log('open', e);
				clearTimeout(ws.pingTimeout);
				document.dispatchEvent(new Event('wsready'));
			});
			this.socket.addEventListener('message', (e) => {
				let message = JSON.parse(e.data);
				if (message.type === 'ping') {
					heartbeat();
					return false;
				}
				for (let index in ws.listeners) {
					ws.listeners[index](message);
				}
				return Promise.resolve('Dummy response to keep the console quiet');
			});
			this.socket.addEventListener('error', (e) => {
				console.log('error', e);
			});
			this.socket.addEventListener('close', (e) => {
				console.log('close');
				clearTimeout(ws.pingTimeout);
				setTimeout(() => {
					ws.connect(url);
				}, 1000);
			});
		}
		catch (e) {
		}
	};

	ws.on = function (name, callback) {
		ws.listeners[name] = callback;
	}

	ws.off = function (name) {
		delete ws.listeners[name];
	};

	ws.send = function (data) {
		if ((this.socket !== undefined) && (this.socket.readyState === 1)) {
			this.socket.send(JSON.stringify(data));
			return true;
		}
		return false;
	}

	return ws;
})();
