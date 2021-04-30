'use strict';

const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld(
	'app', {
		send: (channel, data) => {
			ipcRenderer.send(channel, data);
		},
		receive: (channel, func) => {
			let validChannels = ['fromMain'];
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.on(channel, (event, ...args) => func(...args));
			}
		}
	}
);

ipcRenderer.on('wurmnode', (event, data) => {
	window.dispatchEvent(new CustomEvent('wurmnode', {detail: data}));
});
