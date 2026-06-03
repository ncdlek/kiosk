const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

const heroBg = document.querySelector(".hero__bg");
const heroTitle = document.querySelector(".hero__title");
const heroSubtitle = document.querySelector(".hero__subtitle");
const heroMeta = document.querySelector(".hero__meta");

function setHero(tab) {
const image = tab.dataset.heroImage;
const title = tab.dataset.heroTitle;
const subtitle = tab.dataset.heroSubtitle;
const meta = tab.dataset.heroMeta;

if (heroBg && image) {
  heroBg.style.opacity = "0";

  setTimeout(() => {
    heroBg.src = image;
    heroBg.style.opacity = "1";
  }, 120);
}

if (heroTitle && title) heroTitle.textContent = title;
if (heroSubtitle && subtitle) heroSubtitle.textContent = subtitle;
if (heroMeta && meta) heroMeta.textContent = meta;
}

function activateTab(tab) {
const target = tab.dataset.tab;

tabs.forEach((button) => {
  button.classList.remove("active");
});

panels.forEach((panel) => {
  const active = panel.id === `tab-${target}`;
  panel.classList.toggle("active", active);
  panel.hidden = !active;
});

tab.classList.add("active");
setHero(tab);

window.scrollTo({
  top: 0,
  behavior: "smooth"
});
}

tabs.forEach((tab) => {
tab.addEventListener("click", () => {
  activateTab(tab);
});
});

document.addEventListener("DOMContentLoaded", () => {
panels.forEach((panel) => {
  const active = panel.classList.contains("active");
  panel.hidden = !active;
});

document.querySelectorAll(".js-color-switcher").forEach((card) => {
  const activeColor = card.querySelector(".color-btn.active");
  const buildLink = card.querySelector(".js-build-link");

  if (activeColor && buildLink && activeColor.dataset.paint) {
    updateBuildLink(buildLink, activeColor.dataset.paint);
  }
});
});

function updateBuildLink(linkElement, paintCode) {
if (!linkElement || !paintCode) return;

try {
  const url = new URL(linkElement.href);
  url.searchParams.set("paint", paintCode);
  linkElement.href = url.toString();
} catch (error) {
  console.warn("Link güncellenemedi:", error);
}
}

/* Araç renk değiştirme + oluştur linki güncelleme */
document.querySelectorAll(".js-color-switcher").forEach((card) => {
const carImage = card.querySelector(".js-model-img");
const colorButtons = card.querySelectorAll(".color-btn");
const buildLink = card.querySelector(".js-build-link");

colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const newImage = button.dataset.image;
    const newAlt = button.dataset.alt || "";
    const paintCode = button.dataset.paint;

    if (carImage && newImage) {
      carImage.style.opacity = "0";

      setTimeout(() => {
        carImage.src = newImage;
        carImage.alt = newAlt;
        carImage.style.opacity = "1";
      }, 120);
    }

    colorButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    if (buildLink && paintCode) {
      updateBuildLink(buildLink, paintCode);
    }
  });
});
});

/* Anasayfa feature pill aktiflik + yazı değiştirme */
document.querySelectorAll(".feature-pills .pill").forEach((pill) => {
pill.addEventListener("click", (event) => {
  event.preventDefault();

  const group = pill.closest(".feature-pills");
  const pills = group.querySelectorAll(".pill");
  const featureBanner = pill.closest(".feature-banner");
  const copyText = featureBanner?.querySelector(".feature-copy h3");

  pills.forEach((item) => {
    item.classList.remove("active");
  });

  pill.classList.add("active");

  if (copyText && pill.dataset.copy) {
    copyText.textContent = pill.dataset.copy;
  }
});
});