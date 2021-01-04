'use strict';

document.querySelector('#togglegroundimperwindow').addEventListener('click', e => {
	e.preventDefault();
	window.app.send('togglegroundimperwindow');
	return false;
});
