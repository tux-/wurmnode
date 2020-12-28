'use strict';

class Overlay {
	close () {
		gimle(window).off('.onOverlayOff');
		gimle(document).off('.onOverlayOff');
		gimle('#overlay').off('.onOverlayOff');
		document.getElementById('overlay').removeAttribute('style');
		document.getElementById('overlay').textContent = '';
	}
	setTitle (title) {
		document.querySelector('#overlay .header').innerHTML = title;
	}
	content (html) {
		if (typeof html === 'string') {
			document.querySelector('#overlay .content').innerHTML = html;
			return;
		}
		document.querySelector('#overlay .content').textContent = '';
		document.querySelector('#overlay .content').appendChild(html);
	}
	openBox (params = {}) {
		if (params.width === undefined) {
			params.width = 400;
		}
		if (params.closable === undefined) {
			params.closable = true;
		}
		let closeButton = '';
		if (params.closable) {
			closeButton = '<a style="float: right;" class="close-overlay"><i class="fa fa-window-close"></i></a>';
		}
		let content = html`
			<div id="overlay-size-observable" style="overflow: hidden; display: grid; height: 100%;">
				<div style="max-height: 90%; display: grid; overflow: hidden; margin: auto; width: 100%; max-width: ${params.width}px; background-color: var(--bg); border: 1px solid var(--border-color); box-shadow: var(--overlay-shadow); border-radius: 2px;">
					<div style="display: block; height: 100%; overflow: hidden;">
						<div style="height: 24px; background-color: var(--top-bg); border-bottom: 1px solid var(--border-color); padding: 4px 8px;">
							<span class="header"></span>
							${closeButton}
							<!-- a style="float: right;"><i class="fa fa-window-minimize"></i></a -->
						</div>
						<div class="content" style="min-height: 20px; overflow-y: auto;"></div>
					</div>
				</div>
			</div>`
		this.open(params, content);

		(new ResizeObserver(entries => {
			if (document.querySelector('#overlay .content') === null) {
				return;
			}
			if (document.querySelector('#overlay .content').style.height !== '') {
				document.querySelector('#overlay .content').style.removeProperty('height');
			}
			let style = window.getComputedStyle(document.querySelector('#overlay-size-observable > div'), null);
			document.querySelector('#overlay .content').style.height = (parseInt(style.getPropertyValue('height')) - 24) + 'px';
		})).observe(document.querySelector('#overlay-size-observable'));

		(new MutationObserver(entries => {
			if (document.querySelector('#overlay .content') === null) {
				return;
			}
			if (document.querySelector('#overlay .content').style.height !== '') {
				document.querySelector('#overlay .content').style.removeProperty('height');
			}
			let style = window.getComputedStyle(document.querySelector('#overlay-size-observable > div'), null);
			document.querySelector('#overlay .content').style.height = (parseInt(style.getPropertyValue('height')) - 24) + 'px';
		})).observe(document.querySelector('#overlay .content'), {
			attributes: false,
			childList: true,
			subtree: true
		});

		if (params.closable) {
			document.querySelector('.close-overlay').addEventListener('click', e => {
				e.preventDefault();
				this.close();
				return false;
			});
		}
	}
	open (params = {}, content) {
		if (params.width === undefined) {
			params.width = 400;
		}
		if (params.closable === undefined) {
			params.closable = true;
		}

		document.getElementById('overlay').style.display = 'block';
		document.getElementById('overlay').style.backgroundColor = '#000b';
		document.getElementById('overlay').innerHTML = content;

		document.activeElement.blur();

		if (params.closable) {
			gimle('#overlay').on('click.onOverlayOff', e => {
				if (e.target.parentElement.getAttribute('id') === 'overlay') {
					e.preventDefault();
					this.close();
					return false;
				}
			});
			gimle(document).on('keydown.onOverlayOff', e => {
				e.stopPropagation();
				if (['input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) !== -1) {
					return;
				}
				if (e.target.getAttribute('contenteditable') !== null) {
					return;
				}
				if ((e.ctrlKey === true) && (e.key === 'r')) {
					return;
				}
				e.preventDefault();
				if (e.key === 'Escape') {
					this.close();
				}
				return false;
			}, true);
		}
	}
}

const escapeHtml = unsafe => {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
	;
};

const insertHtml = function (target, html) {
	let fragment = document.createElement('div');
	fragment.innerHTML = html;
	let scripts = fragment.querySelectorAll('script');
	let styles = fragment.querySelectorAll('link');
	let insertions = scripts.length + styles.length;

	const appendHtml = function () {
		insertions--;
		if (insertions <= 0) {
			setTimeout(function () {
				target.innerHTML = fragment.innerHTML;

				let scripts = document.getElementById('framework-canvas').querySelectorAll('script');
				for (let script of scripts) {
					let range = document.createRange();
					range.setStart(document.getElementById('framework-canvas'), 0);
					let scriptTag = '<script src="' + script.src + '"></script>';
					if (script.src === '') {
						scriptTag = '<script>' + script.textContent + '</script>';
					}
					if (script.type === 'application/vnd.gimle.page') {
						script.parentNode.insertBefore(range.createContextualFragment(scriptTag), script.nextSibling);
						script.parentElement.removeChild(script);
					}
				}

			}, 1);
		}
	};

	if (insertions === 0) {
		appendHtml();
	}
	else {
		for (let script of scripts) {
			if (script.type === 'application/vnd.gimle.page') {
				appendHtml();
				continue;
			}

			if (script.type === 'application/vnd.gimle.subpage') {
				appendHtml();
				continue;
			}

			if (document.head.querySelector('#' + script.id) !== null) {
				appendHtml();
				continue;
			}

			let scriptId = document.createElement('script');
			scriptId.onload = function () {
				appendHtml();
			};

			scriptId.setAttribute('id', script.id);
			scriptId.setAttribute('src', script.src);
			script.parentNode.removeChild(script);
			document.querySelector('head').appendChild(scriptId);
		}
		for (let style of styles) {
			if (document.head.querySelector('#' + style.id) !== null) {
				appendHtml();
				continue;
			}

			let styleId = document.createElement('link');
			styleId.onload = function () {
				appendHtml();
			};
			styleId.setAttribute('id', style.id);
			styleId.setAttribute('rel', style.rel);
			styleId.setAttribute('href', style.href);
			style.parentNode.removeChild(style);
			document.querySelector('head').appendChild(styleId);
		}
	}
};

const html = function (pieces) {
	let result = pieces[0];
	let substitutions = [].slice.call(arguments, 1);
	for (var i = 0; i < substitutions.length; ++i) {
		result += substitutions[i] + pieces[i + 1];
	}
	return result;
};

const locationHashChanged = function (hash) {
	if (hash.deep[0].address === '') {
		document.location.hash = 'dashboard';
		return true;
	}

	gimle(window).off('.subpage');
	gimle(document).off('.subpage');
	gimle(document.body).off('.subpage');
	document.dispatchEvent(new CustomEvent('unloadsubpage', {detail: hash}));

	if (hash.first !== 0) {
		return true;
	}

	gimle(document).off('unloadsubpage');

	gimle(window).off('.page');
	gimle(document).off('.page');
	gimle(document.body).off('.page');
	document.dispatchEvent(new CustomEvent('unloadpage', {detail: hash}));
	gimle(document).off('unloadpage');

	let address = hash.deep[0].page.slice();
	address = address.join('/');

	fetch('html/' + address + '.html').then(r => {
		return r.text();
	}).then(r => {
		insertHtml(document.getElementById('framework-canvas'), r);
	});
};

const overlay = new Overlay();
const closeParseOverlay = () => {
	overlay.close();
};
const showParse = (data) => {
	if (document.getElementById('overlay').style.display !== 'block') {
		overlay.openBox({
			width: 550,
			closable: false
		});
		overlay.setTitle('Parsing logs…');
		overlay.content(``);
	}
	if (data.type === 'file') {
		overlay.content('<p style="padding: 10px;">' + data.file + '</p>');
	}
};

document.addEventListener('DOMContentLoaded', () => {
	showParse({
		type: 'dummy'
	});
	gimle(window).on('wurmnode', event => {
		if (event.detail.event === 'error') {
			const messager = document.createElement('div');
			messager.style.display = 'block';
			messager.style.background = '#900';
			messager.style.color = '#eee';
			document.querySelector('top-banners').textContent = '';
			document.querySelector('top-banners').appendChild(messager);
			messager.innerHTML = `<div style="padding: 4px 10px;">
				<i class="fa fa-exclamation-triangle"></i>
				<span class="selectable">${event.detail.data.message.message}</span>
			</div>`;
		}
		else if (event.detail.event === 'working') {
			if (event.detail.data.type === 'finish') {
				closeParseOverlay();
			}
			else {
				showParse(event.detail.data);
			}
		}
		else if (event.detail.event === 'isParsing') {
			if (event.detail.isParsing === true) {
				showParse({
					type: 'dummy'
				});
			}
			else {
				closeParseOverlay();
			}
		}
		else if (event.detail.event === 'updateAvailable') {
			if (event.detail.updateAvailable === true) {
				const messager = document.createElement('div');
				messager.style.display = 'block';
				messager.style.background = '#900';
				messager.style.color = '#eee';
				document.querySelector('top-banners').textContent = '';
				document.querySelector('top-banners').appendChild(messager);
				messager.innerHTML = `<div style="padding: 4px 10px;">
					<i class="fa fa-exclamation-triangle"></i>
					<span>Update available! Please check <a href="https://www.wurmnode.com/download" class="openInBrowser" style="color: #fff; text-decoration: underline;"">wurmnode.com</a></span>
				</div>`;
			}
		}
	});
	window.app.send('isParsing');
	window.app.send('updateAvailable');


	document.getElementById('framework-nav-toggle-button').addEventListener('click', () => {
		if (document.body.classList.contains('mini-menu')) {
			localStorage.removeItem('mini-menu');
			document.body.classList.remove('mini-menu');
		}
		else {
			localStorage.setItem('mini-menu', true);
			document.body.classList.add('mini-menu');
		}
	});

	if (localStorage.getItem('mini-menu') === 'true') {
		document.body.classList.add('mini-menu');
	}

	gimle('#framework-nav').on('click', '.framework-heading', function () {
		let open = true;
		if (this.closest('li').classList.contains('open')) {
			open = false;
		}
		gimle('#framework-nav').each('li', function () {
			this.classList.remove('open');
		});
		localStorage.removeItem('framework-active-nav');
		if (open) {
			let li = this.closest('li');
			let current = li;
			let index = 0;
			while (current = current.previousElementSibling) {
				index++;
			}
			localStorage.setItem('framework-active-nav', index);
			li.classList.add('open');
		}
	});
	let activeMenu = localStorage.getItem('framework-active-nav');
	if (activeMenu !== null) {
		activeMenu = parseInt(activeMenu) + 1;
		activeMenu = document.querySelector(`#framework-nav > ul:first-child > li:nth-child(${activeMenu}) > .framework-heading`);
	}
	if (activeMenu === null) {
		activeMenu = document.querySelector(`#framework-nav > ul:first-child > li:first-child > .framework-heading`);
	}
	activeMenu.click();

	gimle(document).on('click', '.openInBrowser', function (e) {
		e.preventDefault();
		window.app.send('openExternal', this.closest('a').href);
		return false;
	});

	gimle('#framework-nav').on('click', 'a', function () {
		const li = this.closest('li');
		if (li.dataset.about !== undefined) {
			let overlay = new Overlay();

			let tpl = document.querySelector('#about-' + li.dataset.about);
			let width = parseInt(tpl.dataset.width);
			overlay.openBox({
				width: width,
				closable: true
			});
			overlay.setTitle(tpl.dataset.title);
			let tplc = document.importNode(tpl.content, true).firstElementChild;
			overlay.content(tplc);
		}
	});

	gimle('#framework-nav').on('mouseover', 'li', function () {
		if (!gimle.parentMatch(this, '#framework-nav-slice')) {
			let hint = document.getElementById('menuHint');
			hint.textContent = this.closest('li').querySelector('span').textContent;
			hint.style.top = this.closest('li').getBoundingClientRect().top + 'px';
			hint.style.left = (this.closest('li').getBoundingClientRect().left + 40) + 'px';
			document.getElementById('menuHint').classList.add('visible');
		}

		gimle('#framework-nav').each('li', function () {
			this.classList.remove('hover');
		});
		if (this.closest('li').parentElement.closest('li') !== null) {
			this.closest('li').parentElement.closest('li').classList.add('hover');
		}
		this.closest('li').classList.add('hover');
	});
	gimle('#framework-nav').on('mouseout', 'li', function () {
		document.getElementById('menuHint').textContent = '';
		document.getElementById('menuHint').classList.remove('visible');
	});


	gimle(document).on('click', 'body.subminimenu #overlay', () => {
		document.body.classList.remove('subminimenu');
	});
	gimle(document).on('click', 'body.subminimenu a', () => {
		document.body.classList.remove('subminimenu');
	});
	gimle(document).on('click', '.pageHeaderMenu', () => {
		document.body.classList.toggle('subminimenu');
	});

	gimle(document).on('input textarea', '[data-replace]', function (e) {
		const mode = this.dataset.replace;
		let value = this.value;
		if (mode === 'az-') {
			const before = e.target.selectionStart;
			value = value.replace(/[^A-Za-z\-]/g, '-').toLowerCase();
			this.value = value;
			e.target.selectionStart = before;
			e.target.selectionEnd = before;
		}
		else if (mode === 'n') {
			const before = e.target.selectionStart;
			value = value.replace(/[\n]/g, '').toLowerCase();
			this.value = value;
			e.target.selectionStart = before;
			e.target.selectionEnd = before;
		}
	});

	document.addEventListener('locationHashChanged', (data) => {
		locationHashChanged(data.detail);
	});
	gimle.locationHashChanged();
});
