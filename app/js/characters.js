'use strict';


gimle(window).on('wurmnode.page', event => {
	if ((event.detail.event === 'response') && (event.detail.data.original === 'getCharacters')) {
		const chars = event.detail.data.data;
		chars.sort();
		let target = document.querySelector('#chars');
		target.textContent = '';
		for (const char of chars) {
			let node = document.createElement('div');
			node.innerHTML = '<a href="#char?' + char + '">' + char + '</a>';
			target.appendChild(node);
		}
	}
});

window.app.send('getCharacters');
