'use strict';

window.wurmnode = {
	groundimp: {
		last: 'Examine to update.',
		damage: 0,
		working: false,
	},
};

gimle(window).on('wurmnode.page', event => {
	if ((event.detail.event === 'event') && (event.detail.data.type === 'event')) {
		const message = event.detail.data.data.text;
		if (message !== undefined) {
			let ql = Array.from(message.matchAll(/\. Ql\: ([\d\.\,]*) Dam\: (.*)$/ig));
			if (ql[0] !== undefined) {
				document.querySelector('#quality').textContent = ql[0][1].slice(0, -1);
				window.wurmnode.groundimp.damage = parseFloat(ql[0][2].slice(0, -1).replace(',', '.'));
			}
			if (message.includes(' is in too poor shape to improve the ')) {
				document.querySelector('#action').textContent = 'Item too low quality.';
				window.wurmnode.groundimp.working = false;
				return;
			}
			if (message.startsWith('You damage the ')) {
				document.querySelector('.gameicon').className = "gameicon";
				document.querySelector('#action').textContent = 'repair!';
				window.wurmnode.groundimp.damage = true;
				window.wurmnode.groundimp.working = false;
				return;
			}
			if (message.startsWith('You start repairing')) {
				document.querySelector('.gameicon').className = "gameicon";
				document.querySelector('#action').textContent = 'repairing…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You start to improve ')) {
				document.querySelector('#action').textContent = 'improving…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You start chipping ')) {
				document.querySelector('#action').textContent = 'improving…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You start carving ')) {
				document.querySelector('#action').textContent = 'improving…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You start filing ')) {
				document.querySelector('#action').textContent = 'improving…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You start polishing ')) {
				document.querySelector('#action').textContent = 'improving…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You start hammering ')) {
				document.querySelector('#action').textContent = 'improving…';
				window.wurmnode.groundimp.working = true;
				return;
			}
			if (message.startsWith('You stop ')) {
				if (window.wurmnode.groundimp.damage > 0) {
					document.querySelector('#action').textContent = 'repair!';
				}
				else {
					document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
					document.querySelector('#action').textContent = window.wurmnode.groundimp.last;
				}
				window.wurmnode.groundimp.working = false;
				return;
			}

			if (message.startsWith('You repair the ')) {
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
				document.querySelector('#action').textContent = window.wurmnode.groundimp.last;
				window.wurmnode.groundimp.damage = 0;
				window.wurmnode.groundimp.working = false;
				return;
			}

			if (message.includes(' could be improved with a log.')) {
				window.wurmnode.groundimp.last = 'log';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.endsWith(' could be improved with some more log.')) {
				window.wurmnode.groundimp.last = 'log';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes(' has some irregularities that must be removed with a stone chisel.')) {
				window.wurmnode.groundimp.last = 'chisel';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes(' could be improved with some stone shards.')) {
				window.wurmnode.groundimp.last = 'stone shards';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes(' could be improved with some more stone shards.')) {
				window.wurmnode.groundimp.last = 'stone shards';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes('You will want to polish the ')) {
				window.wurmnode.groundimp.last = 'pelt';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes('You must use a file to smooth out the ')) {
				window.wurmnode.groundimp.last = 'file';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes('You must use a mallet on the ')) {
				window.wurmnode.groundimp.last = 'mallet';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else if (message.includes('You notice some notches you must carve away in order to improve the ')) {
				window.wurmnode.groundimp.last = 'carving knife';
				document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			}
			else {
				return;
			}

			if (window.wurmnode.groundimp.damage > 0) {
				document.querySelector('.gameicon').className = "gameicon";
				if ((ql[0] === undefined) || (window.wurmnode.groundimp.working === false)) {
					document.querySelector('#action').textContent = 'repair!';
				}
				return;
			}

			document.querySelector('.gameicon').className = "gameicon " + window.wurmnode.groundimp.last.replace(' ', '-');
			if ((ql[0] === undefined) || (window.wurmnode.groundimp.working === false)) {
				document.querySelector('#action').textContent = window.wurmnode.groundimp.last;
			}
		}
		else {
			console.log(event.detail);
		}
	}
});
