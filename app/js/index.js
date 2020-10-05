'use strict';

const {remote} = require('electron');
const mainProcess = remote.require('./app.js');
const shell = require('electron').shell;

const updateService = (service, event, data) => {
	if (service === 'ws') {
		if (event === 'count') {
			document.querySelector('#wsscount').textContent = '' + data;
			return;
		}

		let target = null;
		if (event === 'start') {
			target = document.querySelector('#stopwss');
		}
		else if (event === 'stop') {
			target = document.querySelector('#startwss');
		}
		if (target !== null) {
			document.querySelector('#startwss').style.display = 'none';
			document.querySelector('#stopwss').style.display = 'none';
			target.style.display = 'inline-block';
		}
		return;
	}

	if (service === 'web') {
		if (event === 'newdir') {
			showWebDir();
			return;
		}

		let target = null;
		if (event === 'start') {
			target = document.querySelector('#stopweb');
		}
		else if (event === 'stop') {
			target = document.querySelector('#startweb');
		}
		if (target !== null) {
			document.querySelector('#startweb').style.display = 'none';
			document.querySelector('#stopweb').style.display = 'none';
			target.style.display = 'inline-block';
		}
		return;
	}
};

const showWurmDir = () => {
	mainProcess.getStorage('wurmdir').then((r) => {
		if (r !== undefined) {
			document.querySelector('#wurmdir').textContent = r;
		}
		document.querySelector('#overlay').style.display = 'none';
	});
};
const showBackupDirs = () => {
	mainProcess.getStorage('wurmdirs').then((r) => {
		if (r !== undefined) {
			const backupstable = document.querySelector('#backupstable');
			backupstable.textContent = '';
			for (const i in r) {
				const t = document.querySelector('[data-template="backupstablerow"]');
				let c = document.importNode(t.content, true);
				c.querySelector('[data-var="dir"]').textContent = r[i];
				c.querySelector('[data-remove]').addEventListener('click', (e) => {
					e.preventDefault();
					mainProcess.removeBackupDirectory(i);
					return false;
				});
				backupstable.appendChild(c);
			}
		}
		document.querySelector('#overlay').style.display = 'none';
	});
};

const showLoadOverlay = () => {
	document.querySelector('#overlay').style.display = 'grid';
};


const showWebDir = () => {
	document.querySelector('#webdir').textContent = mainProcess.getWebRoot();
};

document.addEventListener('DOMContentLoaded', () => {

	remote.app.on('wurmDirectoryUpdated', showWurmDir);
	remote.app.on('backupDirectoryUpdated', showBackupDirs);
	remote.app.on('loading', showLoadOverlay);
	remote.app.on('service', updateService);

	window.addEventListener('beforeunload', () => {
		remote.app.removeListener('wurmDirectoryUpdated', showWurmDir);
		remote.app.removeListener('backupDirectoryUpdated', showBackupDirs);
		remote.app.removeListener('loading', showLoadOverlay);
		remote.app.removeListener('service', updateService);
	});


	mainProcess.ready.then((e) => {
		if (mainProcess.updateAvailable()) {
			document.querySelector('html').classList.add('banner');
		}
	});
	document.querySelector('#openInBrowser').addEventListener('click', e => {
		e.preventDefault();
		shell.openExternal('http://localhost:' + mainProcess.getWebPort() + '/');
		return false;
	});
	document.querySelectorAll('.openInBrowser').forEach((elem) => {
		elem.addEventListener('click', (e) => {
			e.preventDefault();
			shell.openExternal(elem.href);
			return false;
		});
	});


	document.querySelectorAll('.version').forEach((elem) => {
		elem.textContent = mainProcess.getVersion();
	});
	document.querySelector('#selectwwurmdirectorybutton').addEventListener('click', e => {
		e.preventDefault();
		mainProcess.selectWurmDirectory();
		return false;
	});
	document.querySelector('#addbackupdirectorybutton').addEventListener('click', e => {
		e.preventDefault();
		mainProcess.addBackupDirectory();
		return false;
	});


	showWurmDir();
	showBackupDirs();
	document.querySelector('input[name="wssport"]').value = mainProcess.getWssPort();
	mainProcess.getStorage('wssstatus').then((r) => {
		if (r === 'start') {
			document.querySelector('#stopwss').style.display = 'inline-block';
		}
		else {
			document.querySelector('#startwss').style.display = 'inline-block';
		}
	});
	document.querySelector('input[name="wssport"]').addEventListener('input', (e) => {
		mainProcess.setWssPort(e.target.value);
	});
	document.querySelector('#startwss').addEventListener('click', (e) => {
		e.preventDefault();
		mainProcess.startWss();
		document.querySelector('input[name="wssport"]').value = mainProcess.getWssPort();
		return false;
	});
	document.querySelector('#stopwss').addEventListener('click', (e) => {
		e.preventDefault();
		mainProcess.stopWss();
		return false;
	});


	showWebDir();
	document.querySelector('input[name="webport"]').value = mainProcess.getWebPort();
	mainProcess.getStorage('webstatus').then((r) => {
		if (r === 'start') {
			document.querySelector('#stopweb').style.display = 'inline-block';
		}
		else {
			document.querySelector('#startweb').style.display = 'inline-block';
		}
	});
	document.querySelector('#selectwebdirectorybutton').addEventListener('click', e => {
		e.preventDefault();
		mainProcess.selectWebDirectory();
		return false;
	});
	document.querySelector('input[name="webport"]').addEventListener('input', (e) => {
		mainProcess.setWebPort(e.target.value);
	});
	document.querySelector('#startweb').addEventListener('click', (e) => {
		e.preventDefault();
		mainProcess.startWeb();
		document.querySelector('input[name="webport"]').value = mainProcess.getWebPort();
		return false;
	});
	document.querySelector('#stopweb').addEventListener('click', (e) => {
		e.preventDefault();
		mainProcess.stopWeb();
		return false;
	});
});
