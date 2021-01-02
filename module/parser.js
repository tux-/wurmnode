'use strict';

const fs = require('fs');
const EventEmitter = require('events');
const profiler = require('./profiler.js');
const EOL = require('os').EOL;
const chokidar = require('chokidar');

const now = new Date();
const msinday = 60 * 60 * 24 * 1000;

let watchers = {};
let logfiles = {};
let usePolling = false;

exports.event = new EventEmitter();

exports.parse = (result, watchPolling, returnEvent) => {
	usePolling = watchPolling;
	init(result);
	exports.event.emit('parsed', returnEvent);
};

exports.screenshotDirs = [];

const init = (result) => {
	for (const dir in watchers) {
		// If a watcher limit is reached, the watcher is never attached, so check it first.
		if (watchers[dir].watcher !== undefined) {
			watchers[dir].watcher.close();
		}
	}
	watchers = {};
	logfiles = {};

	let wurmdirs = [];
	if (result[1] !== undefined) {
		wurmdirs = result[1];
	}
	wurmdirs.unshift(result[0]);

	loadDumpFiles(wurmdirs);
	loadLogs(wurmdirs);
	followLogs();
	mainLoop();
};

const parseChatLine = (char, type, date, text, live) => {
	let sender = null;
	let message = text;
	if (text.startsWith('<')) {
		sender = text.substr(1, text.indexOf('>') - 1);
		message = text.substr(sender.length + 3);
	}

	const result = {
		sender: sender,
		message: message,
	};

	return result;
};

const parseSkillLine = (char, date, line, live) => {
	let data = null;
	let inc = true;
	if (line.includes(' increased ')) {
		data = line.split(' increased ');
	}
	else if (line.includes(' decreased ')) {
		data = line.split(' decreased ');
		inc = false;
	}
	if (data === null) {
		console.log('parseSkillLine', char, date, line);
		return;
	}
	const result = {
		name: data[0],
		to: null,
		by: null,
		from: null,
	}
	if (data[1].startsWith('to')) {
		result.to = parseInt(data[1].substr(3));
		if (inc === true) {
			result.by = 1;
		}
		else {
			result.by = -1;
		}
	}
	else {
		data = data[1].split(' to ');
		result.to = parseFloat(data[1].replace(',', '.'));
		if (inc === true) {
			result.by = parseFloat(data[0].substr(3).replace(',', '.'));
		}
		else {
			result.by = -parseFloat(data[0].substr(3).replace(',', '.'));
		}
	}
	result.from = Math.round((result.to - result.by) * 10000) / 10000;

	return result;
};

const parseCharEventLive = (char, date, text, live) => {
	const result = {
		sender: text.substr(0, text.indexOf(' ')),
		text: text.substr(text.indexOf(' ') + 1),
	};

	return result;
};

const handleLine = (char, type, date, text, live) => {

	text = text.replace(/^\s+|\s+$/g, '');

	if (type === '_Event') {
		const data = {
			char: char,
			date: date,
			text: text,
		};
		if (live) {
			exports.event.emit('event', 'event', data);
		}
		data.live = live;
		profiler.checkEvent(data);
		return data;
	}
	else if (type === '_Skills') {
		const data = parseSkillLine(char, date, text, live);
		data.char = char;
		data.date = date;
		if (live) {
			if (data.name !== 'Favor') {
				exports.event.emit('event', 'skill', data);
				if ((parseInt(data.to)) > (parseInt(data.from))) {
					exports.event.emit('event', 'level', data);
				}
			}
			else {
				exports.event.emit('event', 'favor', data);
			}
		}
		data.live = live;
		profiler.checkSkill(data);
		return data;
	}
	else if (type === '_Friends') {
		const data = parseCharEventLive(char, date, text, live);
		data.char = char;
		data.date = date;
		if (live) {
			exports.event.emit('event', 'friend', data);
		}
		return data;
	}
	else if (type === '_Deaths') {
		const data = parseCharEventLive(char, date, text, live);
		data.char = char;
		data.date = date;
		if (live) {
			exports.event.emit('event', 'death', data);
		}
		return data;
	}
	else if (type === '_Support') {
		const data = {
			char: char,
			date: date,
			text: text,
		};
		if (live) {
			exports.event.emit('event', 'support', data);
		}
		return data;
	}
	else if (type === '_Combat') {
		const data = {
			char: char,
			date: date,
			text: text,
		};
		if (live) {
			exports.event.emit('event', 'combat', data);
		}
		return data;
	}
	else {
		const data = parseChatLine(char, type, date, text, live);
		data.char = char;
		data.date = date;
		if (live) {
			if (type.startsWith('PM__')) {
				data.channel = type.substr(4);
				exports.event.emit('event', 'pm', data);
			}
			else {
				data.channel = type;
				exports.event.emit('event', 'chat', data);
			}
		}
		return data;
	}
};

const loadLine = (file, line, live = true) => {
	line = line.replace(/[^\x20-\x7E]+/g, '');
	if (line === '') {
		return;
	}

	if (line.startsWith('Logging started')) {
		const date = line.substr(16);
		if (date.length !== 10) {
			return;
		}
		logfiles[file].date = new Date(line.substr(16) + ' 00:00:00');
		logfiles[file].time = 0;
		return;
	}
	const linetime = line.substr(1, 8);
	const time = parseInt(linetime.substr(0, 2) + linetime.substr(3, 2) + linetime.substr(6, 2));
	if (time < logfiles[file].time) {
		logfiles[file].date = new Date(logfiles[file].date.getTime() + msinday);
	}

	const timezoneoffset = (logfiles[file].date.getTimezoneOffset() * 60 * 1000);
	const localDate = new Date(logfiles[file].date.getTime() - timezoneoffset);
	const linedate = localDate.toISOString().substr(0, 10);
	const date = new Date(linedate + ' ' + linetime);
	const linestring = line.substr(11);

	logfiles[file].time = time;
	return handleLine(logfiles[file].char, logfiles[file].type, date, linestring, live);
};

const handleLogEvent = (file) => {
	let buffer = new Buffer.alloc(1024);

	let fd = fs.openSync(file, 'r');
	let bytes = fs.readSync(fd, buffer, 0, buffer.length, logfiles[file].size);
	if (bytes > 0) {
		let data = buffer.slice(0, bytes).toString();
		fs.close(fd, (err) => {
			if (err) {
				console.log('err', err);
			}
		});

		data = data.substr(0, data.lastIndexOf(EOL) + EOL.length);
		logfiles[file].size += Buffer.byteLength(data, 'utf8');
		const lines = data.substr(0, data.length - EOL.length).split(EOL);

		for (const line of lines) {
			if (line.length > 11) {
				loadLine(file, line);
			}
			else {
				console.log('Line too short', file, line);
			}
		}
	}
	else {
		fs.close(fd, (err) => {
			if (err) {
				console.log('err', err);
			}
		});
		logfiles[file].state = 'pending';
	}
}

const mainLoop = () => {
	for (const file in logfiles) {
		if (logfiles[file].state === 'changed') {
			handleLogEvent(file);
		}
	}
	setTimeout(() => {
		mainLoop();
	}, 100);
};

const loadLog = (char, file, type, live = false) => {
	let data = fs.readFileSync(file, {encoding:'utf8', flag:'r'});
	data = data.substr(0, data.lastIndexOf(EOL));
	const size = Buffer.byteLength(data, 'utf8') + EOL.length;
	const lines = data.split(EOL);

	logfiles[file] = {
		size: size,
		char: char,
		type: type,
		state: 'changed',
		date: null,
		time: 0,
	};

	for (const line of lines) {
		loadLine(file, line, live);
	}
};

const followLogs = () => {
	for (const dir in watchers) {
		console.log('Watching: ' + dir);

		watchers[dir].watcher = chokidar.watch(dir, {
			persistent: true,
			usePolling: usePolling,
		});
		watchers[dir].watcher.on('change', (filename) => {
			if (watchers[dir].type === 'log') {
				if (logfiles[filename] !== undefined) {
					logfiles[filename].state = 'changed';
				}
				else {
					const fileinfo = filename.split('.');
					if (fileinfo[2] !== 'txt') {
						return;
					}
					logfiles[filename] = {
						size: 0,
						char: watchers[dir].char,
						type: fileinfo[0],
						state: 'changed',
						date: null,
						time: 0,
					};
				}
			}
			else if (watchers[dir].type === 'screenshot') {
				exports.event.emit('event', 'screenshot', {
					char: watchers[dir].char,
					dir: dir,
					filename: filename,
				});
			}
		});
		watchers[dir].watcher.on('error', (error) => {
			exports.event.emit('error', error);
		});
	}
};

const loadDumpFiles = (wurmdirs) => {
	const dumpfiles = {};
	for (const wurmdir of wurmdirs) {
		if (wurmdir === undefined) {
			continue;
		}
		if (fs.existsSync(wurmdir + 'players/')) {
			fs.readdirSync(wurmdir + 'players/').forEach(char => {
				if (char.startsWith('.')) {
					return;
				}
				const stat = fs.statSync(wurmdir + 'players/' + char + '/');
				if (stat.isDirectory()) {
					if (fs.existsSync(wurmdir + 'players/' + char + '/dumps/')) {
						fs.readdirSync(wurmdir + 'players/' + char + '/dumps/').forEach(file => {
							const fileinfo = file.split('.');
							if ((fileinfo[0] !== 'skills') || (fileinfo[3] !== 'txt')) {
								return;
							}
							const filedate = fileinfo[1].substr(0, 4) + '-' + fileinfo[1].substr(4, 2) + '-' + fileinfo[1].substr(6, 2);
							const filetime = fileinfo[2].substr(0, 2) + ':' + fileinfo[2].substr(2, 2) + ':00';
							const filedatatime = new Date(filedate + ' ' + filetime);

							if (dumpfiles[char] === undefined) {
								dumpfiles[char] = {
									date: filedatatime,
									char: char,
									file: wurmdir + 'players/' + char + '/dumps/' + file,
								};
							}
							else if (filedatatime.getTime() > dumpfiles[char].date.getTime()) {
								dumpfiles[char] = {
									date: filedatatime,
									char: char,
									file: wurmdir + 'players/' + char + '/dumps/' + file,
								};
							}
						});
					}
				}
			});
		}
	}
	for (const dumpfile in dumpfiles) {
		profiler.loadDump(dumpfiles[dumpfile]);
	}
};

const loadLogs = (wurmdirs) => {
	exports.event.emit('working', 'parsing', {
		type: 'start',
		date: new Date(),
	});
	let first = true;
	for (const wurmdir of wurmdirs) {
		if (wurmdir === undefined) {
			first = false;
			continue;
		}
		console.log(`Scanning '${wurmdir}' for character data…`);

		if (fs.existsSync(wurmdir + 'players/')) {
			fs.readdirSync(wurmdir + 'players/').forEach(char => {
				if (char.startsWith('.')) {
					return;
				}
				const stat = fs.statSync(wurmdir + 'players/' + char + '/');
				if (stat.isDirectory()) {
					if (first === true) {
						if (!fs.existsSync(wurmdir + 'players/' + char + '/logs/')) {
							fs.mkdirSync(wurmdir + 'players/' + char + '/logs/');
						}
						watchers[wurmdir + 'players/' + char + '/logs/'] = {
							type: 'log',
							char: char,
						};
						if (!fs.existsSync(wurmdir + 'players/' + char + '/screenshots/')) {
							fs.mkdirSync(wurmdir + 'players/' + char + '/screenshots/');
						}
						watchers[wurmdir + 'players/' + char + '/screenshots/'] = {
							type: 'screenshot',
							char: char,
						};
					}
					fs.readdirSync(wurmdir + 'players/' + char + '/logs/').forEach(file => {
						const fileinfo = file.split('.');
						if (fileinfo[2] !== 'txt') {
							return;
						}
						exports.event.emit('working', 'parsing', {
							type: 'file',
							file: wurmdir + 'players/' + char + '/logs/' + file,
							date: new Date(),
						});
						loadLog(char, wurmdir + 'players/' + char + '/logs/' + file, fileinfo[0]);
					});
					if (fs.existsSync(wurmdir + 'players/' + char + '/screenshots/')) {
						exports.screenshotDirs.push(wurmdir + 'players/' + char + '/screenshots/');
					}
				}
			});
		}
		first = false;
	}
	exports.event.emit('working', 'parsing', {
		type: 'finish',
		date: new Date(),
	});
};
