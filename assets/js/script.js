// === CROSSFADE HELPER ===
// Fades `img` out, swaps its src (and runs onUpdate) at the midpoint, then
// fades back in. A per-element token guards against re-entrancy: if a newer
// click arrives before the swap fires, the stale swap is discarded.
function crossfade(img, src, onUpdate) {
	if (!img || !src) return;
	img.dataset.fadeToken = String((Number(img.dataset.fadeToken) || 0) + 1);
	const token = img.dataset.fadeToken;
	img.style.opacity = '0';
	setTimeout(() => {
		if (img.dataset.fadeToken !== token) return;
		img.src = src;
		if (onUpdate) onUpdate();
		img.style.opacity = '1';
	}, 120);
}

// === TAB SWITCHING ===
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const heroBg = document.querySelector('.hero__bg');

function setHero(tab) {
	crossfade(heroBg, tab.dataset.heroImage);
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

			crossfade(img, newImage, () => { img.alt = newAlt; });

			buttons.forEach(btn => btn.classList.remove('active'));
			button.classList.add('active');
		});
	});
});

// === FEATURE PILLS ===
document.querySelectorAll('.feature-pills .pill').forEach(pill => {
	pill.addEventListener('click', () => {
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
				if (copy && newDesc) copy.style.opacity = '0';
				crossfade(bgImg, newImage, () => {
					if (copy && newDesc) {
						copy.innerHTML = newDesc;
						copy.style.opacity = '1';
					}
				});
			}
		}
	});
});

// === POPUPS ===
const page = document.querySelector('.page');
if (page) {
	const closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false"><path d="M18 3.21429L12.2143 9L18 14.7857L14.7857 18L9 12.2143L3.21429 18L0 14.7857L5.78571 9L0 3.21429L3.21429 0L9 5.78571L14.7857 0L18 3.21429Z" fill="white"/></svg>';
	const POPUP_LABELS = { brochure: 'Teknik Broşür', emission: 'CO2 Emisyon Değerleri' };
	let lastFocused = null;

	function createPopup(type) {
		const overlay = document.createElement('div');
		overlay.className = `popup-overlay popup-overlay--${type}`;
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-label', POPUP_LABELS[type] || 'Diyalog');
		overlay.innerHTML = `
			<div class="popup-close-bar" role="button" tabindex="0">
				${closeSvg}
				<span class="popup-close-text">KAPAT</span>
			</div>
			<div class="popup-body"></div>
		`;

		const closeBar = overlay.querySelector('.popup-close-bar');
		const close = () => {
			overlay.classList.remove('active');
			if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
		};

		closeBar.addEventListener('click', close);
		closeBar.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); }
		});
		// Escape to close + keep Tab focus trapped inside the dialog
		overlay.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') { close(); return; }
			if (e.key !== 'Tab') return;
			const focusable = overlay.querySelectorAll('[tabindex="0"], button:not([disabled]), a[href]');
			if (!focusable.length) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		});

		return overlay;
	}

	function openPopup(overlay) {
		lastFocused = document.activeElement;
		overlay.classList.add('active');
		const closeBar = overlay.querySelector('.popup-close-bar');
		if (closeBar) closeBar.focus();
	}

	// Brochure popup
	const brochurePopup = createPopup('brochure');
	page.appendChild(brochurePopup);

	// Emission popup
	const emissionPopup = createPopup('emission');
	page.appendChild(emissionPopup);

	// Trigger: Teknik Brosur
	document.querySelectorAll('.brochure-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const qrSrc = btn.dataset.qr;
			brochurePopup.querySelector('.popup-body').innerHTML = `
				<p class="popup-brochure-text">Teknik broşüre erişmek için<br>QR kodu okutun</p>
				<div class="popup-qr">
					${qrSrc
						? `<img src="${qrSrc}" alt="Teknik Broşür QR Kod">`
						: `<span style="color:#999;font-family:FordF1;font-size:18px;">QR Kod</span>`
					}
				</div>
			`;
			openPopup(brochurePopup);
		});
	});

	// Trigger: CO2 Emisyon
	document.querySelectorAll('.co2').forEach(co2 => {
		const open = () => {
			const emisyonSrc = co2.dataset.emisyon;
			if (emisyonSrc) {
				emissionPopup.querySelector('.popup-body').innerHTML =
					`<img class="popup-emission-img" src="${emisyonSrc}" alt="CO2 Emisyon Değerleri">`;
			}
			openPopup(emissionPopup);
		};
		co2.addEventListener('click', open);
		co2.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
		});
	});
}
