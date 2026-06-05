// === TAB SWITCHING ===
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const heroBg = document.querySelector('.hero__bg');
const heroTitle = document.querySelector('.hero__title');
const heroSubtitle = document.querySelector('.hero__subtitle');
const heroMeta = document.querySelector('.hero__meta');

function setHero(tab) {
	const image = tab.dataset.heroImage;
	const title = tab.dataset.heroTitle;
	const subtitle = tab.dataset.heroSubtitle;
	const meta = tab.dataset.heroMeta;

	if (heroBg && image) {
		heroBg.style.opacity = '0';
		setTimeout(() => {
			heroBg.src = image;
			heroBg.style.opacity = '1';
		}, 120);
	}

	if (heroTitle && title) heroTitle.textContent = title;
	if (heroSubtitle && subtitle) heroSubtitle.textContent = subtitle;
	if (heroMeta && meta) heroMeta.textContent = meta;
}

function activateTab(tab) {
	const target = tab.dataset.tab;

	tabs.forEach(btn => btn.classList.remove('active'));
	panels.forEach(panel => {
		const active = panel.id === `tab-${target}`;
		panel.classList.toggle('active', active);
		panel.hidden = !active;
	});

	tab.classList.add('active');
	setHero(tab);

	window.scrollTo({ top: 0, behavior: 'smooth' });
}

tabs.forEach(tab => {
	tab.addEventListener('click', () => activateTab(tab));
});

// Initialize panels on load
document.addEventListener('DOMContentLoaded', () => {
	panels.forEach(panel => {
		panel.hidden = !panel.classList.contains('active');
	});
});

// === COLOR SWITCHER ===
document.querySelectorAll('.js-color-switcher').forEach(card => {
	const img = card.querySelector('.js-model-img');
	const buttons = card.querySelectorAll('.color-btn');

	buttons.forEach(button => {
		button.addEventListener('click', () => {
			const newImage = button.dataset.image;
			const newAlt = button.dataset.alt || '';

			if (img && newImage) {
				img.style.opacity = '0';
				setTimeout(() => {
					img.src = newImage;
					img.alt = newAlt;
					img.style.opacity = '1';
				}, 120);
			}

			buttons.forEach(btn => btn.classList.remove('active'));
			button.classList.add('active');
		});
	});
});

// === FEATURE PILLS ===
document.querySelectorAll('.feature-pills .pill').forEach(pill => {
	pill.addEventListener('click', (e) => {
		e.preventDefault();
		const group = pill.closest('.feature-pills');
		group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
		pill.classList.add('active');

		const newImage = pill.dataset.image;
		const newDesc = pill.dataset.desc;
		const banner = pill.closest('.feature-banner');
		if (banner && newImage) {
			const bgImg = banner.querySelector('.feature-banner__bg');
			const copy = banner.querySelector('.feature-copy h3');
			if (bgImg) {
				bgImg.style.opacity = '0';
				if (copy && newDesc) copy.style.opacity = '0';
				setTimeout(() => {
					bgImg.src = newImage;
					bgImg.style.opacity = '1';
					if (copy && newDesc) {
						copy.innerHTML = newDesc;
						copy.style.opacity = '1';
					}
				}, 120);
			}
		}
	});
});
