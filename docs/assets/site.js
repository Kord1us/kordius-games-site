const toggle = document.querySelector("[data-menu]");
const nav = document.querySelector("#site-nav");
if (toggle && nav) {
  const open = (expanded) => {
    toggle.setAttribute("aria-expanded", String(expanded));
    nav.classList.toggle("open", expanded);
  };
  toggle.addEventListener("click", () => open(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) open(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      open(false);
      toggle.focus();
    }
  });
  document.documentElement.classList.add("has-menu");
}

const dialog = document.querySelector("#gallery-dialog");
if (dialog && typeof dialog.showModal === "function") {
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector("figcaption");
  const close = dialog.querySelector("button");
  let trigger;
  document.querySelectorAll("[data-gallery]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector("img").alt;
      caption.textContent = link.dataset.gallery;
      dialog.showModal();
      close.focus();
    });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => trigger?.focus());
}
