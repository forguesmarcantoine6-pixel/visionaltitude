(() => {
  const viewer = document.querySelector("[data-photo-viewer]");
  if (!viewer || typeof viewer.showModal !== "function") {
    return;
  }

  const stage = viewer.querySelector("[data-photo-stage]");
  const title = viewer.querySelector("[data-photo-title]");
  const caption = viewer.querySelector("[data-photo-caption]");
  const counter = viewer.querySelector("[data-photo-count]");
  const close = viewer.querySelector("[data-photo-close]");
  let slides = [];
  let activeIndex = 0;
  let trigger = null;
  let touchStart = null;

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const position = i === activeIndex ? "current"
        : i === (activeIndex - 1 + slides.length) % slides.length ? "previous"
        : i === (activeIndex + 1) % slides.length ? "next" : "";
      slide.hidden = !position;
      slide.dataset.photoPosition = position;
      slide.setAttribute("aria-hidden", String(i !== activeIndex));
    });
    const slide = slides[activeIndex];
    caption.textContent = slide.dataset.caption;
    counter.textContent = `${activeIndex + 1} / ${slides.length}`;
  };

  document.querySelectorAll("[data-photo-album]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }
      const album = document.getElementById(link.dataset.photoAlbum);
      if (!(album instanceof HTMLTemplateElement) || !album.content.querySelector("[data-photo-slide]")) {
        return;
      }
      event.preventDefault();
      trigger = link;
      stage.querySelectorAll("[data-photo-slide]").forEach((slide) => slide.remove());
      stage.prepend(album.content.cloneNode(true));
      slides = [...stage.querySelectorAll("[data-photo-slide]")];
      title.textContent = link.dataset.photoTitle;
      document.body.classList.add("photo-viewer-open");
      viewer.showModal();
      showSlide(0);
      close.focus({ preventScroll: true });
    });
  });

  close.addEventListener("click", () => viewer.close());
  viewer.querySelector("[data-photo-prev]").addEventListener("click", () => showSlide(activeIndex - 1));
  viewer.querySelector("[data-photo-next]").addEventListener("click", () => showSlide(activeIndex + 1));
  stage.addEventListener("click", (event) => {
    const position = event.target.closest("[data-photo-slide]")?.dataset.photoPosition;
    if (position === "previous" || position === "next") {
      showSlide(activeIndex + (position === "previous" ? -1 : 1));
    }
  });
  viewer.addEventListener("close", () => {
    document.body.classList.remove("photo-viewer-open");
    touchStart = null;
    trigger?.focus({ preventScroll: true });
  });

  viewer.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "Tab") {
      const focusable = [...viewer.querySelectorAll("button")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });

  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) {
      return;
    }
    const box = viewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom) {
      viewer.close();
    }
  });

  stage.addEventListener("touchstart", (event) => {
    touchStart = event.touches.length === 1 && !event.target.closest("button")
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }, { passive: true });

  stage.addEventListener("touchend", (event) => {
    if (!touchStart || event.touches.length || !event.changedTouches.length) {
      touchStart = null;
      return;
    }
    const x = event.changedTouches[0].clientX - touchStart.x;
    const y = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(y) * 1.2) {
      showSlide(activeIndex + (x < 0 ? 1 : -1));
    }
    touchStart = null;
  }, { passive: true });

  stage.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });
})();
