'use strict';

gimle(window).on('wurmnode.page', event => {
	if (event.detail.event === 'getWebRoot') {
		document.querySelector('input[name="webdir"]').value = event.detail.value;
	}
	else if (event.detail.event === 'getWebPort') {
		document.querySelector('#openlocalweb').href = 'http://localhost:' + event.detail.value;
		document.querySelector('input[name="webport"]').value = event.detail.value;
	}
	else if (event.detail.event === 'getWebStatus') {
		if (event.detail.value === 'start') {
			document.querySelector('button[name="startweb"]').style.display = 'none';
			document.querySelector('button[name="stopweb"]').style.display = 'inline-block';
		}
		else {
			document.querySelector('button[name="stopweb"]').style.display = 'none';
			document.querySelector('button[name="startweb"]').style.display = 'inline-block';
		}
	}
	else if (event.detail.event === 'getWssPort') {
		document.querySelector('input[name="wssport"]').value = event.detail.value;
	}
	else if (event.detail.event === 'getWssStatus') {
		if (event.detail.value === 'start') {
			document.querySelector('button[name="startwss"]').style.display = 'none';
			document.querySelector('button[name="stopwss"]').style.display = 'inline-block';
		}
		else {
			document.querySelector('button[name="stopwss"]').style.display = 'none';
			document.querySelector('button[name="startwss"]').style.display = 'inline-block';
		}
	}
	else if (event.detail.event === 'service') {
		if (event.detail.ws === 'count') {
			document.querySelector('input[name="wsscount"]').value = event.detail.count;
			return;
		}
		if (event.detail.web === 'newdir') {
			document.querySelector('input[name="webdir"]').value = event.detail.value;
			return;
		}
	}
	else {
		console.log(event.detail);
	}
});

window.app.send('getWebRoot');
window.app.send('getWebPort');
window.app.send('getWebStatus');

window.app.send('getWssPort');
window.app.send('getWssStatus');
window.app.send('getWssCount');



document.querySelector('button[name="selectwebdirectorybutton"]').addEventListener('click', e => {
	e.preventDefault();
	window.app.send('selectWebDirectory');
	return false;
});
document.querySelector('button[name="resetwebdirectorybutton"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('resetWebDirectory');
	return false;
});
document.querySelector('input[name="webport"]').addEventListener('input', (e) => {
	window.app.send('setWebPort', e.target.value);
});
document.querySelector('button[name="resetwebport"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('resetWebPort');
	return false;
});
document.querySelector('button[name="startweb"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('startWeb');
	window.app.send('getWebPort');
	return false;
});
document.querySelector('button[name="stopweb"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('stopWeb');
	return false;
});


document.querySelector('input[name="wssport"]').addEventListener('input', (e) => {
	window.app.send('setWssPort', e.target.value);
});
document.querySelector('button[name="resetwssport"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('resetWssPort');
	return false;
});
document.querySelector('button[name="startwss"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('startWss');
	return false;
});
document.querySelector('button[name="stopwss"]').addEventListener('click', (e) => {
	e.preventDefault();
	window.app.send('stopWss');
	return false;
});
