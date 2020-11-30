'use strict';

const updateService = (data) => {
	if (data.ws === 'count') {
		document.querySelector('#wsscount').textContent = '' + data.count;
		return;
	}
	else if (data.web === 'newdir') {
		document.querySelector('#webdir').textContent = data.value;
		return;
	}
	console.log(data);
};

const showLoadOverlay = () => {
	document.querySelector('#overlay').style.display = 'grid';
};

const showWebDir = () => {
	document.querySelector('#webdir').textContent = mainProcess.getWebRoot();
};

const dataLoaded = () => {
	initialized = true;
	document.querySelector('#overlay').style.display = 'none';
	window.app.send('updateAvailable');
};

let initialized = false;

document.addEventListener('DOMContentLoaded', () => {
	window.addEventListener('wurmnode', event => {
		if (event.detail.event === 'wurmDirectoryUpdated') {
			window.app.send('getWurmDir');
		}
		else if (event.detail.event === 'backupDirectoryUpdated') {
			window.app.send('getBackupDirs');
		}
		else if (event.detail.event === 'initialized') {
			dataLoaded();
		}
		else if (event.detail.event === 'loading') {
			showLoadOverlay();
		}
		else if (event.detail.event === 'service') {
			updateService(event.detail);
		}
		else if (event.detail.event === 'ready') {
		}
		else if (event.detail.event === 'updateAvailable') {
			if (event.detail.updateAvailable === true) {
				document.querySelector('html').classList.add('banner');
			}
		}
		else if (event.detail.event === 'isParsing') {
			if (event.detail.isParsing === false) {
				dataLoaded();
			}
		}
		else if (event.detail.event === 'getVersion') {
			document.querySelectorAll('.version').forEach((elem) => {
				elem.textContent = event.detail.version;
			});
		}
		else if (event.detail.event === 'getWurmDir') {
			if (event.detail.dir !== undefined) {
				document.querySelector('#wurmdir').textContent = event.detail.dir;
			}
			if (initialized) {
				document.querySelector('#overlay').style.display = 'none';
			}
		}
		else if (event.detail.event === 'getBackupDirs') {
			const backupstable = document.querySelector('#backupstable');
			backupstable.textContent = '';
			if (event.detail.dirs !== undefined) {
				for (const i in event.detail.dirs) {
					const t = document.querySelector('[data-template="backupstablerow"]');
					let c = document.importNode(t.content, true);
					c.querySelector('[data-var="dir"]').textContent = event.detail.dirs[i];
					c.querySelector('[data-remove]').addEventListener('click', (e) => {
						e.preventDefault();
						showLoadOverlay();
						setTimeout(() => {
							window.app.send('removeBackupDirectory', i);
						}, 1);
						return false;
					});
					backupstable.appendChild(c);
				}
			}
			if (initialized) {
				document.querySelector('#overlay').style.display = 'none';
			}
		}
		else if (event.detail.event === 'getWssPort') {
			document.querySelector('input[name="wssport"]').value = event.detail.value;
		}
		else if (event.detail.event === 'getWssStatus') {
			if (event.detail.value === 'start') {
				document.querySelector('#startwss').style.display = 'none';
				document.querySelector('#stopwss').style.display = 'inline-block';
			}
			else {
				document.querySelector('#stopwss').style.display = 'none';
				document.querySelector('#startwss').style.display = 'inline-block';
			}
		}
		else if (event.detail.event === 'getWebRoot') {
			document.querySelector('#webdir').textContent = event.detail.value;
		}
		else if (event.detail.event === 'getWebPort') {
			document.querySelector('input[name="webport"]').value = event.detail.value;
		}
		else if (event.detail.event === 'getWebStatus') {
			if (event.detail.value === 'start') {
				document.querySelector('#startweb').style.display = 'none';
				document.querySelector('#stopweb').style.display = 'inline-block';
			}
			else {
				document.querySelector('#stopweb').style.display = 'none';
				document.querySelector('#startweb').style.display = 'inline-block';
			}
		}
		else if ((event.detail.data === undefined) || (event.detail.data.type !== 'favor')) {
			// console.log(event.detail);
		}
	});
	showLoadOverlay();
	window.app.send('isParsing');

	document.querySelector('#openInBrowser').addEventListener('click', e => {
		e.preventDefault();
		window.app.send('openLocalServer');
		return false;
	});
	document.querySelectorAll('.openInBrowser').forEach((elem) => {
		elem.addEventListener('click', (e) => {
			e.preventDefault();
			window.app.send('openExternal', elem.href);
			return false;
		});
	});

	window.app.send('getVersion');
	document.querySelector('#selectwwurmdirectorybutton').addEventListener('click', e => {
		e.preventDefault();
		window.app.send('selectWurmDirectory');
		return false;
	});
	document.querySelector('#addbackupdirectorybutton').addEventListener('click', e => {
		e.preventDefault();
		window.app.send('addBackupDirectory');
		return false;
	});


	window.app.send('getWurmDir');
	window.app.send('getBackupDirs');
	window.app.send('getWssPort');
	window.app.send('getWssStatus');
	window.app.send('getWssCount');
	document.querySelector('input[name="wssport"]').addEventListener('input', (e) => {
		window.app.send('setWssPort', e.target.value);
	});
	document.querySelector('#startwss').addEventListener('click', (e) => {
		e.preventDefault();
		window.app.send('startWss');
		return false;
	});
	document.querySelector('#stopwss').addEventListener('click', (e) => {
		e.preventDefault();
		window.app.send('stopWss');
		return false;
	});


	window.app.send('getWebRoot');
	window.app.send('getWebPort');
	window.app.send('getWebStatus');
	document.querySelector('#selectwebdirectorybutton').addEventListener('click', e => {
		e.preventDefault();
		window.app.send('selectWebDirectory');
		return false;
	});
	document.querySelector('input[name="webport"]').addEventListener('input', (e) => {
		window.app.send('setWebPort', e.target.value);
	});
	document.querySelector('#startweb').addEventListener('click', (e) => {
		e.preventDefault();
		window.app.send('startWeb');
		return false;
	});
	document.querySelector('#stopweb').addEventListener('click', (e) => {
		e.preventDefault();
		window.app.send('stopWeb');
		return false;
	});
	document.querySelector('#resetwebdirectorybutton').addEventListener('click', (e) => {
		e.preventDefault();
		window.app.send('resetWebDirectory');
		return false;
	});

	setTimeout(() => {
		window.app.send('uiLoaded');
	}, 50);
});
