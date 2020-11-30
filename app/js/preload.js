'use strict';

const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld(
	'app', {
		send: (channel, data) => {
			ipcRenderer.send(channel, data);
		},
	}
);

ipcRenderer.on('wurmnode', (event, data) => {
	window.dispatchEvent(new CustomEvent('wurmnode', {detail: data}));
});
