'use strict';

gimle(window).on('wurmnode.page', event => {
	if (event.detail.event === 'wurmDirectoryUpdated') {
		window.app.send('getWurmDir');
	}
	else if (event.detail.event === 'backupDirectoryUpdated') {
		window.app.send('getBackupDirs');
	}
	else if (event.detail.event === 'getWurmDir') {
		if (event.detail.dir !== undefined) {
			document.querySelector('#wurmdir').value = event.detail.dir;
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
					setTimeout(() => {
						window.app.send('removeBackupDirectory', i);
					}, 1);
					return false;
				});
				backupstable.appendChild(c);
			}
		}
	}
});

window.app.send('getWurmDir');
window.app.send('getBackupDirs');


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
