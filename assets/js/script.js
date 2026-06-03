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
});

/* Araç renk değiştirme */
document.querySelectorAll(".js-color-switcher").forEach((card) => {
const img = card.querySelector(".js-model-img");
const buttons = card.querySelectorAll(".color-btn");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const newImage = button.dataset.image;
    const newAlt = button.dataset.alt || "";

    if (img && newImage) {
      img.style.opacity = "0";

      setTimeout(() => {
        img.src = newImage;
        img.alt = newAlt;
        img.style.opacity = "1";
      }, 120);
    }

    buttons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});
});

/* Anasayfa feature pill aktiflik */
document.querySelectorAll(".feature-pills .pill").forEach((pill) => {
pill.addEventListener("click", (event) => {
  event.preventDefault();

  const group = pill.closest(".feature-pills");
  const pills = group.querySelectorAll(".pill");

  pills.forEach((item) => item.classList.remove("active"));
  pill.classList.add("active");
});
});