'use strict';

const fs = require('fs');
const EventEmitter = require('events');

const chars = {};

const now = new Date();
const msinday = 60 * 60 * 24 * 1000;
const twodaysago = new Date(now.getTime() - (msinday * 2));

exports.event = new EventEmitter();

exports.getCharacters = () => {
	return Object.keys(chars);
};

exports.getCharacterData = (name) => {
	return chars[name];
};

let inah = false;

exports.checkEvent = (data) => {
	createChar(data.char);

	if (data.text.includes('. You are on ')) {
		let servername = data.text.split('. You are on ')[1];
		servername = servername.substr(0, servername.indexOf('(') - 1);
		if (chars[data.char].server !== undefined) {
			if (data.date.getTime() > chars[data.char].server.date.getTime()) {
				chars[data.char].server = {
					name: servername,
					date: data.date,
				};
			}
		}
		else  {
			chars[data.char].server = {
				name: servername,
				date: data.date,
			};
		}
		if (chars[data.char].serverlog === undefined) {
			chars[data.char].serverlog = [];
		}
		chars[data.char].serverlog.push({
			name: servername,
			date: data.date,
		});
		if (data.live === true) {
			exports.event.emit('profile', 'server', {char: data.char, data: chars[data.char].server});
		}
	}
	else if (data.text.startsWith('Congratulations! You have now reached the level of ')) {
		let pathinfo = data.text.slice(51, -1).split(' of the path of ');
		if (chars[data.char].path === undefined) {
			chars[data.char].path = {};
		}
		chars[data.char].path[data.date.getTime()] = {
			path: pathinfo[1],
			rank: pathinfo[0],
			date: data.date,
		};
		chars[data.char].path = sort(chars[data.char].path);
		if (data.live === true) {
			exports.event.emit('profile', 'path', {char: data.char, data: chars[data.char].path});
		}
	}
	else if (data.text.startsWith('You have premium time until ')) {
		const premium = new Date(data.text.substr(28));
		if (chars[data.char].premium === undefined) {
			chars[data.char].premium = {
				date: data.date,
				until: premium,
			};
		}
		else if (data.date.getTime() > chars[data.char].premium.date.getTime()) {
			/* If for any reason premium time is subtracted, we compare with the recoded time, not just if it is greater. */
			chars[data.char].premium = {
				date: data.date,
				until: premium,
			};
		}
		if (data.live === true) {
			exports.event.emit('profile', 'premium', {char: data.char, data: chars[data.char].premium});
		}
	}
	else if (data.text.startsWith('You finish your prayer to ')) {
		if (chars[data.char].god === undefined) {
			chars[data.char].god = {
				date: data.date,
				name: data.text.slice(26, -1),
			};
		}
		else if (data.date.getTime() > chars[data.char].god.date.getTime()) {
			chars[data.char].god = {
				date: data.date,
				name: data.text.slice(26, -1),
			};
		}

		if (data.date.getTime() > twodaysago.getTime()) {
			if (chars[data.char].pray === undefined) {
				chars[data.char].pray = {};
			}
			chars[data.char].pray[data.date.getTime()] = {
				text: data.text,
				date: data.date,
			};
			chars[data.char].pray = sort(chars[data.char].pray);
		}
		if (data.live === true) {
			exports.event.emit('profile', 'pray', {char: data.char, data: chars[data.char].pray});
		}
	}
	else if (data.text === 'You finish your meditation.') {
		if (data.date.getTime() > twodaysago.getTime()) {
			if (chars[data.char].meditation === undefined) {
				chars[data.char].meditation = {};
			}
			chars[data.char].meditation[data.date.getTime()] = {
				text: data.text,
				date: data.date,
			};
			chars[data.char].meditation = sort(chars[data.char].meditation);
		}
		if (data.live === true) {
			exports.event.emit('profile', 'meditation', {char: data.char, data: chars[data.char].meditation});
		}
	}
	else if ((data.text.startsWith('You leave ')) && (!data.text.startsWith('You leave the '))) {
		if (chars[data.char].village !== undefined) {
			delete chars[data.char].village;
		}
		if (chars[data.char].villagelog === undefined) {
			chars[data.char].villagelog = [];
		}
		chars[data.char].villagelog.push({
			name: null,
			date: data.date,
		});
		if (data.live === true) {
			exports.event.emit('profile', 'village', {char: data.char, data: chars[data.char].village});
		}
	}
	else if (data.text.startsWith('You enter ')) {
		const village = data.text.slice(10, -1);
		if (!['Freedom Isles', 'the cave'].includes(village)) {
			if (chars[data.char].village === undefined) {
				chars[data.char].village = {
					date: data.date,
					name: village,
				};
			}
			else if (data.date.getTime() > chars[data.char].village.date.getTime()) {
				chars[data.char].village = {
					date: data.date,
					name: village,
				};
			}
			if (chars[data.char].villagelog === undefined) {
				chars[data.char].villagelog = [];
			}
			chars[data.char].villagelog.push({
				name: village,
				date: data.date,
			});
			if (data.live === true) {
				exports.event.emit('profile', 'village', {char: data.char, data: chars[data.char].village});
			}
		}
	}
	else if (data.text.startsWith('You finish this sermon by yet again praising ')) {
		if (data.date.getTime() > twodaysago.getTime()) {
			if (chars[data.char].sermon === undefined) {
				chars[data.char].sermon = {};
			}
			chars[data.char].sermon[data.date.getTime()] = {
				text: data.text,
				date: data.date,
			};
			chars[data.char].sermon = sort(chars[data.char].sermon);
		}
		if (data.live === true) {
			exports.event.emit('profile', 'sermon', {char: data.char, data: chars[data.char].sermon});
		}
	}
};

const sort = (data) => {
	const sorted = {};
	Object.keys(data).sort().forEach(function(key) {
		sorted[key] = data[key];
	});
	return sorted;
};

exports.loadDump = (dumpinfo) => {
	const data = fs.readFileSync(dumpinfo.file, {encoding:'utf8', flag:'r'});
	const lines = data.split("\n");
	let started = false;
	let group = null;
	const skills = {};
	for (const line of lines) {
		const data = line.replace("\r", '').split(':');
		if (data[1] !== undefined) {
			const skill = data[0];
			if (skill.startsWith('Skills')) {
				started = true;
			}
			if (started === false) {
				continue;
			}
			if (!skill.startsWith(' ')) {
				group = skill;
				continue;
			}
			const values = data[1].trim().split(' ');
			const value = parseFloat(values[0]);
			const affinities = parseInt(values[2]);

			skills[skill.trim()] = {
				name: skill.trim(),
				value: value,
				affinities: (isNaN(affinities) ? 0 : affinities),
				date: dumpinfo.date,
			};
		}
	}
	createChar(dumpinfo.char);
	chars[dumpinfo.char].dumpdate = dumpinfo.date;
	chars[dumpinfo.char].skills = skills;
};

exports.checkSkill = (data) => {
	createChar(data.char);

	if (chars[data.char].skills === undefined) {
		chars[data.char].skills = {};
	}
	if (chars[data.char].skills[data.name] === undefined) {
		chars[data.char].skills[data.name] = {
			name: data.name,
			value: data.to,
			date: data.date,
		};
	}
	else if (data.date.getTime() > chars[data.char].skills[data.name].date.getTime()) {
		chars[data.char].skills[data.name] = {
			name: data.name,
			value: data.to,
			date: data.date,
		};
	}
};

const createChar = (name) => {
	if (chars[name] === undefined) {
		chars[name] = {
			name: name,
		};
	}
};
