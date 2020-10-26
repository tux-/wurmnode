'use strict';

const {parentPort} = require('worker_threads');
const parser = require('../module/parser.js');
const profiler = require('../module/profiler.js');

parentPort.on('message', (data) => {
	if (data.call === 'parse') {
		parentPort.postMessage({name: 'getWurmDirs', param: data.param});
	}
	else if (data.call === 'realParse') {
		try {
			parser.parse(data.dirs, data.param);
		}
		catch (e) {
			parentPort.postMessage({name: 'error', message: e});
		};
	}
	else if (data.call === 'getCharacters') {
		parentPort.postMessage({name: 'getData', original: 'getCharacters', data: profiler.getCharacters(), instance: data.instance, message: data.message});
	}
	else if (data.call === 'getChar') {
		parentPort.postMessage({name: 'getData', original: 'getChar', data: profiler.getCharacterData(data.char), instance: data.instance, message: data.message});
	}
});

parser.event.on('event', (type, data) => {
	parentPort.postMessage({name: 'event', type: type, data: data});
});
parser.event.on('parsed', (type) => {
	parentPort.postMessage({name: 'parsed', type: type});
	parentPort.postMessage({name: 'screenshotDirs', data: parser.screenshotDirs});
});
profiler.event.on('profile', (type, data) => {
	parentPort.postMessage({name: 'profile', type: type, data: data});
});
