'use strict';

gimle(window).on('wurmnode.page', event => {
	if ((event.detail.event === 'response') && (event.detail.data.original === 'getChar') && (event.detail.data.data.name === gimle.hash.deep[0].qs)) {
		let info = event.detail.data.data;
		document.querySelector('#server').textContent = info.server.name + ', since ' + showTime(info.server.date);
		if (info.village.name !== null) {
			document.querySelector('#village').textContent = info.village.name + ', since ' + showTime(info.village.date);
		}
		if (info.premium !== undefined) {
			document.querySelector('#premium').textContent = showTime(info.premium.until);
		}
		if (info.god !== undefined) {
			document.querySelector('#god').textContent = info.god.name;
		}
		if (info.path !== undefined) {
			const path = info.path[Object.keys(info.path)[Object.keys(info.path).length - 1]];
			document.querySelector('#path').textContent = path.path.substr(0, 1).toUpperCase() + path.path.substr(1) + ', Level: ' + path.rank + ' (' + showTime(path.date) + ')';
		}

		for (const utime in info.meditation) {
			let node = document.createElement('div');
			node.innerHTML = showTime(info.meditation[utime].date);
			document.querySelector('#meditation').prepend(node);
		}
		for (const utime in info.sermon) {
			let node = document.createElement('div');
			node.innerHTML = showTime(info.sermon[utime].date);
			document.querySelector('#sermon').prepend(node);
		}
		for (const utime in info.faith) {
			let node = document.createElement('div');
			node.innerHTML = showTime(info.faith[utime].date) + ' - by: ' + info.faith[utime].by + ' - to: ' + info.faith[utime].to + '';
			document.querySelector('#faith').prepend(node);
		}

		for (const skill in info.skills) {
			const target = document.querySelector('[data-skill="' + skill + '"]');
			if (target !== null) {
				target.textContent = info.skills[skill].value;
			}
			else  {
				// Easter skills
				// console.log(skill, info.skills[skill]);
			}
		}
	}
	else if ((event.detail.event === 'profile') && (event.detail.data.data.char === gimle.hash.deep[0].qs)) {
		if (event.detail.data.type === 'village') {
			const target = document.querySelector('#village');
			target.parentElement.classList.add('change');
			if (event.detail.data.data.data.name === null) {
				target.textContent = '';
			}
			else {
				target.textContent = event.detail.data.data.data.name + ', since ' + showTime(event.detail.data.data.data.date);
			}
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else if (event.detail.data.type === 'server') {
			const target = document.querySelector('#server');
			target.parentElement.classList.add('change');
			target.textContent = event.detail.data.data.data.name + ', since ' + showTime(event.detail.data.data.data.date);
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else if (event.detail.data.type === 'meditation') {
			const target = document.querySelector('#meditation');
			target.parentElement.classList.add('change');
			target.textContent = '';
			for (const utime in event.detail.data.data.data) {
				let node = document.createElement('div');
				node.innerHTML = showTime(event.detail.data.data.data[utime].date);
				target.prepend(node);
			}
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else if (event.detail.data.type === 'sermon') {
			const target = document.querySelector('#sermon');
			target.parentElement.classList.add('change');
			target.textContent = '';
			for (const utime in event.detail.data.data.data) {
				let node = document.createElement('div');
				node.innerHTML = showTime(event.detail.data.data.data[utime].date);
				target.prepend(node);
			}
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else if (event.detail.data.type === 'faith') {
			const target = document.querySelector('#faith');
			target.parentElement.classList.add('change');
			target.textContent = '';
			for (const utime in event.detail.data.data.data) {
				let node = document.createElement('div');
				node.innerHTML = showTime(event.detail.data.data.data[utime].date) + ' - by: ' + event.detail.data.data.data[utime].by + ' - to: ' + event.detail.data.data.data[utime].to + '';
				target.prepend(node);
			}
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else {
			console.log(event.detail.data);
		}
	}
	else if ((event.detail.event === 'event') && (event.detail.data.type === 'skill') && (event.detail.data.data.char === gimle.hash.deep[0].qs)) {
		const target = document.querySelector('[data-skill="' + event.detail.data.data.name + '"]');
		if (target !== null) {
			target.parentElement.classList.add('change');
			target.textContent = event.detail.data.data.to;
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else  {
			console.log(event.detail.data);
		}
	}
	else if ((event.detail.event === 'event') && (event.detail.data.type === 'favor') && (event.detail.data.data.char === gimle.hash.deep[0].qs)) {
		const target = document.querySelector('[data-skill="Favor"]');
		if (target !== null) {
			target.parentElement.classList.add('change');
			target.textContent = event.detail.data.data.to;
			setTimeout(() => {
				target.parentElement.classList.remove('change');
			}, 100);
		}
		else  {
			console.log(event.detail.data);
		}
	}
});

document.querySelector('main h1').textContent = gimle.hash.deep[0].qs;

window.app.send('getChar', gimle.hash.deep[0].qs);
