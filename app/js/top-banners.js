'user strict'

window.customElements.define('top-banners', class extends HTMLElement {
	constructor () {
		super();

		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}
			</style>
			<slot></slot>
		`;
	}

	connectedCallback () {
		(new ResizeObserver(entries => {
			for (let entry of entries) {
				const cr = entry.contentRect;

				if (cr.height !== 0) {
					document.querySelector('#framework').style.height = 'calc(100% - ' + cr.height + 'px)';
				}
			}
		})).observe(this);
	}
});
