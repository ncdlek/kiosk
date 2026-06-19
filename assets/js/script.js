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
		// Yeni görseli ARKA PLANDA yükleyip onload'ta değiştir + göster.
		// src'yi atar atmaz opacity=1 yaparsak, yeni görsel yüklenene kadar
		// tarayıcı ESKİ bitmap'i gösterir → "eski görsel yanıp gelir" hatası.
		// (Cache'te ise onload anında tetiklenir.)
		const reveal = () => {
			if (img.dataset.fadeToken !== token) return;
			img.src = src;
			if (onUpdate) onUpdate();
			img.style.opacity = '1';
		};
		const pre = new Image();
		pre.onload = reveal;
		pre.onerror = reveal;
		pre.src = src;
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

// Hero görsellerini ön yükle — tab geçişinde yeni görsel anlık gelsin, eski yanıp gelmesin
tabs.forEach(tab => {
	const s = tab.dataset.heroImage;
	if (s) { const p = new Image(); p.src = s; }
});

// Initialize panels on load
document.addEventListener('DOMContentLoaded', () => {
	panels.forEach(panel => {
		panel.hidden = !panel.classList.contains('active');
	});
});

// === COLOR SWITCHER ===
// A card may hold one image (Puma/Explorer) or several side-by-side (Capri:
// 3 angles). For each .js-model-img in the card, slot index i reads its path
// from data-image-1 / -2 / -3 ...; the first slot falls back to the legacy
// single `data-image` so older one-image cards keep working unchanged.
document.querySelectorAll('.js-color-switcher').forEach(card => {
	const imgs = Array.from(card.querySelectorAll('.js-model-img'));
	const buttons = card.querySelectorAll('.color-btn');

	buttons.forEach(button => {
		button.addEventListener('click', () => {
			imgs.forEach((img, i) => {
				// getAttribute (dataset değil): data-image-1 / -2 / -3'teki tire+rakam
				// DOMStringMap'e yansımaz, dataset.image1 undefined olur. data-image-1/2/3
				// (Capri) literal okunur; tek görselli kartlar (Puma/Explorer) data-image'a düşer.
				const src = button.getAttribute('data-image-' + (i + 1)) || (i === 0 ? button.getAttribute('data-image') : '');
				if (!src) return;
				const alt = button.getAttribute('data-alt-' + (i + 1)) || button.getAttribute('data-alt') || '';
				crossfade(img, src, () => { img.alt = alt; });
			});

			buttons.forEach(btn => btn.classList.remove('active'));
			button.classList.add('active');
		});
	});
});

// === COLOR CAROUSEL (Capri v2) ===
// Ortadaki slide seçili renk; sol/sağ komşu renkler taşan viewport'ta peek eder.
// Etkileşim: renk swatch'ına tıklama + doğrudan sürükleme/kaydırma (fare ve dokunma).
// Doğrusal (loop yok) — uçlarda sürükleyince yerine döner.
document.querySelectorAll('.js-carousel').forEach(carousel => {
	const track = carousel.querySelector('.js-carousel__track');
	const slides = Array.from(carousel.querySelectorAll('.carousel__slide'));
	const card = carousel.closest('.model-card');
	const buttons = Array.from(card.querySelectorAll('.js-carousel-btn'));

	const activeBtn = buttons.find(b => b.classList.contains('active'));
	let current = activeBtn ? Number(activeBtn.dataset.index) : 0;

	// slide genişliği, stride (slide + gap) ve peek (kenar boşluğu).
	// translateX'ten bağımsız oldukları için gap/viewport değişse de doğru kalır.
	function geometry() {
		const slideW = slides[0].getBoundingClientRect().width;
		const stride = slides.length > 1
			? slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left
			: slideW;
		const peek = (carousel.getBoundingClientRect().width - slideW) / 2;
		return { slideW, stride, peek };
	}

	// idx'inci slide'ı ortaya getir; delta canlı sürükleme offset'i (drag sırasında).
	function setTrack(idx, delta = 0) {
		const { peek, stride } = geometry();
		track.style.transform = `translateX(${peek - idx * stride + delta}px)`;
	}

	function goTo(idx) {
		current = Math.max(0, Math.min(idx, slides.length - 1));
		track.style.transition = '';   // transition geri aç (drag sırasında kapatılmış olabilir)
		setTrack(current);
		slides.forEach((s, i) => s.classList.toggle('is-center', i === current));
		buttons.forEach(b => b.classList.toggle('active', Number(b.dataset.index) === current));
	}

	buttons.forEach(b => b.addEventListener('click', () => goTo(Number(b.dataset.index))));

	// --- Sürükleme / kaydırma (Pointer Events: fare + dokunma) ---
	let dragging = false, startX = 0, dragDelta = 0, dragGeom = null;

	carousel.addEventListener('pointerdown', (e) => {
		dragging = true;
		startX = e.clientX;
		dragDelta = 0;
		dragGeom = geometry();           // drag boyunca geometri sabit kalsın (pürüzsüz)
		track.style.transition = 'none'; // drag akıcı, serbest takip etsin
		carousel.classList.add('dragging');
		carousel.setPointerCapture(e.pointerId);
	});

	carousel.addEventListener('pointermove', (e) => {
		if (!dragging) return;
		dragDelta = e.clientX - startX;
		const { peek, stride } = dragGeom;
		track.style.transform = `translateX(${peek - current * stride + dragDelta}px)`;
	});

	function endDrag() {
		if (!dragging) return;
		dragging = false;
		carousel.classList.remove('dragging');
		const { stride } = dragGeom;
		// dragDelta < 0 (sola sürükle) → sonraki renk; > 0 (sağa) → önceki.
		// round() ~ %50 eşik: slide'ın yarısından az sürükleyince yerine döner.
		goTo(current + Math.round(-dragDelta / stride));
		dragGeom = null;
	}
	carousel.addEventListener('pointerup', endDrag);
	carousel.addEventListener('pointercancel', endDrag);

	// İlk konum: animasyonsuz yerleştir, sonra transition'u aç (açılışta kaymasın).
	track.style.transition = 'none';
	setTrack(current);
	track.getBoundingClientRect(); // reflow
	track.style.transition = '';

	window.addEventListener('resize', () => goTo(current));
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
	const POPUP_LABELS = { brochure: 'Teknik Broşür', emission: 'CO₂ Emisyon Değerleri' };
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

	// Trigger: CO₂ Emisyon
	document.querySelectorAll('.co2').forEach(co2 => {
		const open = () => {
			const emisyonSrc = co2.dataset.emisyon;
			if (emisyonSrc) {
				emissionPopup.querySelector('.popup-body').innerHTML =
					`<img class="popup-emission-img" src="${emisyonSrc}" alt="CO₂ Emisyon Değerleri">`;
			}
			openPopup(emissionPopup);
		};
		co2.addEventListener('click', open);
		co2.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
		});
	});
}
