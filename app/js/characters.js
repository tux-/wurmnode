'use strict';

window.wurmnode.pathprogression = [
	{
		skill: 15,
		delay: 0,
		hate: 'Uninitiated',
		insanity: 'Uninitiated',
		knowledge: 'Uninitiated',
		love: 'Uninitiated',
		power: 'Uninitiated',
	},
	{
		skill: 15,
		delay: 12,
		hate: 'Initiate',
		insanity: 'Initiate',
		knowledge: 'Initiate',
		love: 'Initiate',
		power: 'Initiate',
	},
	{
		skill: 15,
		delay: 24,
		hate: 'Ridiculous',
		insanity: 'Disturbed',
		knowledge: 'Eager',
		love: 'Nice',
		power: 'Gatherer',
	},
	{
		skill: 15,
		delay: 48,
		hate: 'Envious',
		insanity: 'Crazed',
		knowledge: 'Explorer',
		love: 'Gentle',
		power: 'Greedy',
	},
	{
		skill: 15,
		delay: 108,
		hate: 'Hateful',
		insanity: 'Deranged',
		knowledge: 'Sheetfolder',
		love: 'Warm',
		power: 'Strong',
	},
	{
		skill: 15,
		delay: 192,
		hate: 'Finger',
		insanity: 'Sicko',
		knowledge: 'Desertmind',
		love: 'Goodhearted',
		power: 'Released',
	},
	{
		skill: 20,
		delay: 300,
		hate: 'Sheep',
		insanity: 'Mental',
		knowledge: 'Observer',
		love: 'Giving',
		power: 'Unafraid',
	},
	{
		skill: 30,
		delay: 432,
		hate: 'Snake',
		insanity: 'Psycho',
		knowledge: 'Bookkeeper',
		love: 'Rock',
		power: 'Brave',
	},
	{
		skill: 40,
		delay: 432,
		hate: 'Shark',
		insanity: 'Beast',
		knowledge: 'Mud-dweller',
		love: 'Splendid',
		power: 'Performer',
	},
	{
		skill: 50,
		delay: 432,
		hate: 'Infection',
		insanity: 'Maniac',
		knowledge: 'Thought Eater',
		love: 'Protector',
		power: 'Liberator',
	},
];

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
			window.app.send('getChar', char);
		}
	}
	else if ((event.detail.event === 'response') && (event.detail.data.original === 'getChar')) {
		if (event.detail.data.data.skills === undefined) {
			document.querySelector('#meditation').insertAdjacentHTML('beforeend', '<p style="color: #c00;">Missing skill information about ' + event.detail.data.data.name + '.</p>');
		}
		else if (event.detail.data.data.path === undefined) {
			if (event.detail.data.data.skills.Meditating === undefined) {
				document.querySelector('#meditation').insertAdjacentHTML('beforeend', '<p>' + event.detail.data.data.name + ' has not meditated yet.</p>');
			}
			else if (event.detail.data.data.skills.Meditating.value < 15) {
				document.querySelector('#meditation').insertAdjacentHTML('beforeend', '<p>' + event.detail.data.data.name + ' is progressing to skill level 15.</p>');
			}
			else {
				document.querySelector('#meditation').insertAdjacentHTML('afterbegin', '<p style="color: #0c0;">' + event.detail.data.data.name + ' is ready to choose a path!</p>');
			}
		}
		else if (event.detail.data.data.skills.Meditating === undefined) {
			document.querySelector('#meditation').insertAdjacentHTML('beforeend', '<p style="color: #c00;">Missing skill information about ' + event.detail.data.data.name + '.</p>');
		}
		else {
			const pathKeys = Object.keys(event.detail.data.data.path);
			const lastPath = event.detail.data.data.path[pathKeys[pathKeys.length - 1]];
			let pathWait = null;
			for (const i in window.wurmnode.pathprogression) {
				if (window.wurmnode.pathprogression[i].skill > event.detail.data.data.skills.Meditating.value) {
					document.querySelector('#meditation').insertAdjacentHTML('beforeend', '<p>' + event.detail.data.data.name + ' is progressing to skill level ' + window.wurmnode.pathprogression[i].skill + '.</p>');
					break;
				}
				if (pathWait !== null) {
					const hourmsec = 3600000;
					let nextPathAt = lastPath.date.getTime() + (window.wurmnode.pathprogression[i].delay * hourmsec);
					if (nextPathAt < new Date().getTime()) {
						document.querySelector('#meditation').insertAdjacentHTML('afterbegin', '<p style="color: #0c0;">' + event.detail.data.data.name + ' may now progress to path level ' + i + ' "' + window.wurmnode.pathprogression[i][lastPath.path] + '".</p>');
					}
					else {
						document.querySelector('#meditation').insertAdjacentHTML('afterbegin', '<p>' + event.detail.data.data.name + ' can progress to path level ' + i + ' "' + window.wurmnode.pathprogression[i][lastPath.path] + '" on ' + showTime(new Date(nextPathAt)) + '.</p>');
					}
					break;
				}
				if (window.wurmnode.pathprogression[i][lastPath.path] === lastPath.rank) {
					pathWait = window.wurmnode.pathprogression[i];
				}
			}
		}
	}
});

window.app.send('getCharacters');
