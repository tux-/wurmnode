'use strict';

gimle(window).on('wurmnode.page', event => {
	if ((event.detail.event === 'response') && (event.detail.data.original === 'getChar') && (event.detail.data.data.name === gimle.hash.deep[0].qs)) {
		let info = event.detail.data.data;
		document.querySelector('#server').textContent = info.server.name + ', since ' + info.server.date.toLocaleString();
		if (info.village !== undefined) {
			document.querySelector('#village').textContent = info.village.name + ', since ' + info.village.date.toLocaleString();
		}
		if (info.premium !== undefined) {
			document.querySelector('#premium').textContent = info.premium.until.toLocaleString();
		}
		if (info.god !== undefined) {
			document.querySelector('#god').textContent = info.god.name;
		}
		if (info.path !== undefined) {
			const path = info.path[Object.keys(info.path)[Object.keys(info.path).length - 1]];
			document.querySelector('#path').textContent = path.path.substr(0, 1).toUpperCase() + path.path.substr(1) + ', Level: ' + path.rank;
		}

		for (const utime in info.meditation) {
			let node = document.createElement('div');
			node.innerHTML = info.meditation[utime].date.toLocaleString();
			document.querySelector('#meditation').prepend(node);
		}

		for (const skill in info.skills) {
			const target = document.querySelector('[data-skill="' + skill + '"]');
			if (target !== null) {
				target.textContent = info.skills[skill].value;
			}
			else  {
				console.log(skill, info.skills[skill]);
			}
		}
	}
	else if ((event.detail.event === 'profile') && (event.detail.data.data.char === gimle.hash.deep[0].qs)) {
		if (event.detail.data.type === 'village') {
			if (event.detail.data.data.data === undefined) {
				document.querySelector('#village').textContent = '';
			}
			else {
				document.querySelector('#village').textContent = event.detail.data.data.data.name + ', since ' + event.detail.data.data.data.date.toLocaleString();
			}
		}
		else if (event.detail.data.type === 'server') {
			document.querySelector('#server').textContent = event.detail.data.data.data.name + ', since ' + event.detail.data.data.data.date.toLocaleString();
		}
		else if (event.detail.data.type === 'meditation') {
			document.querySelector('#meditation').textContent = '';
			for (const utime in event.detail.data.data.data) {
				let node = document.createElement('div');
				node.innerHTML = event.detail.data.data.data[utime].date.toLocaleString();
				document.querySelector('#meditation').prepend(node);
			}
		}
		else {
			console.log(event.detail.data);
		}
	}
	else if ((event.detail.event === 'event') && (event.detail.data.type === 'skill')) {
		const target = document.querySelector('[data-skill="' + event.detail.data.data.name + '"]');
		if (target !== null) {
			target.textContent = event.detail.data.data.to;
		}
		else  {
			console.log(event.detail.data);
		}
	}
});

document.querySelector('main h1').textContent = gimle.hash.deep[0].qs;

window.app.send('getChar', gimle.hash.deep[0].qs);
