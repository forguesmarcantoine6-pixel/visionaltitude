const header = document.querySelector("[data-header]");
const headerBrand = document.querySelector(".site-header .brand");
const menuButton = document.querySelector("[data-menu-button]");
const navLinks = document.querySelector("[data-nav-links]");
const contactForm = document.querySelector("[data-contact-form]");
const heroLogo = document.querySelector(".hero-brand-stage");
const year = document.querySelector("[data-year]");
const faqButtons = [...document.querySelectorAll("[data-faq-trigger]")];
const carouselImageSets = {
  chantier: [
    {
      src: "../assets/suivi-chantier-01.jpg",
      alt: "Vue aérienne verticale d'un chantier en excavation à Montréal"
    },
    {
      src: "../assets/suivi-chantier-02.png",
      alt: "Vue rapprochée d'un chantier avec travailleurs et excavation"
    },
    {
      src: "../assets/suivi-chantier-03-dji0135.jpg",
      alt: "Vue aérienne d'un chantier commercial captée par drone"
    }
  ],
  inspection: [
    {
      src: "../assets/inspection-facade-01.jpg",
      alt: "Vue détaillée d'une façade inspectée par drone"
    },
    {
      src: "../assets/inspection-toiture-01.jpg",
      alt: "Vue aérienne verticale d'une toiture inspectée par drone"
    }
  ]
};
const motionTextSelector = [
  "main h1",
  "main h2",
  "main h3",
  "main p",
  "main li",
  "main .button",
  "main .eyebrow",
  "main .project-content span",
  "main .project-details span",
  "main .hero-meta strong",
  "main .hero-meta span"
].join(",");
const motionTextElements = [...document.querySelectorAll(motionTextSelector)]
  .filter((element) => !element.closest(".hero-brand-stage") && !element.closest(".faq-section") && !element.closest(".case-faq") && !element.matches("[data-form-status]"));

if (window.location.protocol === "file:") {
  document.querySelectorAll("a[href$='/']").forEach((link) => {
    link.setAttribute("href", `${link.getAttribute("href")}index.html`);
  });
}

if (year) {
  year.textContent = new Date().getFullYear();
}

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const image = carousel.querySelector("[data-carousel-image]");
  const previousButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const carouselImages = carouselImageSets[carousel.dataset.carousel] || carouselImageSets.chantier;
  let currentIndex = 0;

  const setCarouselImage = (direction) => {
    if (!image) {
      return;
    }

    currentIndex = (currentIndex + direction + carouselImages.length) % carouselImages.length;
    carousel.classList.add("is-changing");

    window.setTimeout(() => {
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = carouselImages[currentIndex].src;
      image.alt = carouselImages[currentIndex].alt;
      carousel.classList.remove("is-changing");
    }, 130);
  };

  if (previousButton) {
    previousButton.addEventListener("click", () => setCarouselImage(-1));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => setCarouselImage(1));
  }
});

document.querySelectorAll("[data-video-sequence]").forEach((frame) => {
  const sources = frame.dataset.videoSequence.split("|").filter(Boolean);
  const firstVideo = frame.querySelector("video");
  let currentVideoIndex = 0;
  let isSwitching = false;
  const transitionLeadTime = 1;

  if (!firstVideo || sources.length < 2) {
    return;
  }

  const sequenceVideos = sources.map((source, index) => {
    const video = index === 0 ? firstVideo : firstVideo.cloneNode(false);
    video.src = source;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.loop = false;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "metadata");

    if (index > 0) {
      video.classList.remove("is-active");
      frame.appendChild(video);
      video.load();
    }

    return video;
  });

  const switchToVideo = (nextVideoIndex) => {
    const currentVideo = sequenceVideos[currentVideoIndex];
    const nextVideo = sequenceVideos[nextVideoIndex];
    let fallbackTimer;
    let hasShownNextVideo = false;

    isSwitching = true;
    nextVideo.currentTime = 0;

    const showNextVideo = () => {
      if (hasShownNextVideo) {
        return;
      }

      hasShownNextVideo = true;
      window.clearTimeout(fallbackTimer);
      nextVideo.removeEventListener("playing", showNextVideo);
      nextVideo.removeEventListener("canplay", showNextVideo);
      nextVideo.classList.add("is-active");
      currentVideo.classList.remove("is-active");

      window.setTimeout(() => {
        currentVideo.pause();
        currentVideo.currentTime = 0;
        currentVideoIndex = nextVideoIndex;
        isSwitching = false;
      }, 160);
    };

    nextVideo.addEventListener("playing", showNextVideo, { once: true });
    nextVideo.addEventListener("canplay", showNextVideo, { once: true });
    nextVideo.play().then(() => {
      if (nextVideo.readyState >= 2) {
        window.requestAnimationFrame(showNextVideo);
      }
    }).catch(() => {});

    fallbackTimer = window.setTimeout(() => {
      if (nextVideo.readyState < 2) {
        return;
      }

      showNextVideo();
    }, 700);

    window.setTimeout(() => {
      if (!isSwitching || currentVideoIndex !== sequenceVideos.indexOf(currentVideo)) {
        return;
      }

      showNextVideo();
    }, 1200);
  };

  sequenceVideos.forEach((video, index) => {
    video.addEventListener("timeupdate", () => {
      if (isSwitching || index !== currentVideoIndex || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      if (video.duration - video.currentTime <= transitionLeadTime) {
        switchToVideo((index + 1) % sequenceVideos.length);
      }
    });

    video.addEventListener("ended", () => {
      if (!isSwitching && index === currentVideoIndex) {
        switchToVideo((index + 1) % sequenceVideos.length);
      }
    });

  });

  const playVisibleSequence = () => {
    sequenceVideos.forEach((video) => {
      if (video.preload !== "auto") {
        video.preload = "auto";
        video.setAttribute("preload", "auto");
        video.load();
      }
    });

    sequenceVideos[currentVideoIndex].play().catch(() => {});
  };

  const pauseHiddenSequence = () => {
    sequenceVideos.forEach((video) => video.pause());
  };

  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playVisibleSequence();
        } else {
          pauseHiddenSequence();
        }
      });
    }, { rootMargin: "160px 0px", threshold: 0.2 });

    videoObserver.observe(frame);
  } else {
    playVisibleSequence();
  }
});

motionTextElements.forEach((element) => element.classList.add("text-clarify"));

const setHeaderState = () => {
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
};

const clarifyHeroLogo = () => {
  if (!heroLogo || heroLogo.classList.contains("is-clarifying")) {
    return;
  }

  heroLogo.classList.remove("is-fading");
  void heroLogo.offsetWidth;
  heroLogo.classList.add("is-clarifying");
};

const fadeHeroLogo = () => {
  if (!heroLogo || heroLogo.classList.contains("is-fading")) {
    return;
  }

  heroLogo.classList.remove("is-clarifying");
  void heroLogo.offsetWidth;
  heroLogo.classList.add("is-fading");
};

const setHeroLogoState = () => {
  if (!heroLogo) {
    return;
  }

  const logoBox = heroLogo.getBoundingClientRect();
  const isLogoInView = logoBox.bottom > 0 && logoBox.top < window.innerHeight * 0.72;

  if (window.scrollY > window.innerHeight * 0.32) {
    fadeHeroLogo();
  } else if (isLogoInView) {
    clarifyHeroLogo();
  }
};

const clarifyText = (element) => {
  if (element.classList.contains("is-clarifying")) {
    return;
  }

  void element.offsetWidth;
  element.classList.add("is-clarifying");
};

const setMotionTextState = () => {
  motionTextElements.forEach((element) => {
    const box = element.getBoundingClientRect();
    const isVisible = box.bottom > window.innerHeight * 0.08 && box.top < window.innerHeight * 0.88;

    if (isVisible) {
      clarifyText(element);
    }
  });
};

const closeMenu = () => {
  if (navLinks && menuButton) {
    navLinks.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }
};

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

faqButtons.forEach((button) => {
  const answer = document.getElementById(button.getAttribute("aria-controls"));

  if (!answer) {
    return;
  }

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    answer.hidden = isOpen;
  });
});

document.querySelectorAll("[data-auto-carousel]").forEach((carousel) => {
  const slides = Array.from(carousel.querySelectorAll("[data-auto-slide]"));

  if (slides.length < 2) {
    return;
  }

  let currentSlide = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));

  if (!slides[currentSlide]) {
    currentSlide = 0;
    slides[0].classList.add("is-active");
  }

  const setCarouselState = () => {
    const previousSlide = (currentSlide - 1 + slides.length) % slides.length;
    const nextSlide = (currentSlide + 1) % slides.length;

    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === currentSlide);
      slide.classList.toggle("is-prev", index === previousSlide);
      slide.classList.toggle("is-next", index === nextSlide);
    });
  };

  setCarouselState();

  window.setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    setCarouselState();
  }, 5000);
});

window.addEventListener("scroll", () => {
  setHeaderState();
  setHeroLogoState();
  setMotionTextState();
}, { passive: true });
setHeaderState();
setHeroLogoState();
setMotionTextState();

if (contactForm) {
  const status = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const SERVICE_ID = "service_6ako0fv";
  const TEMPLATE_ID = "template_rqhujvf";
  const PUBLIC_KEY = "wY9izdJjB7ZjNDmE8";

  const setFormStatus = (message, state) => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.state = state;
  };

  contactForm.dataset.formReady = "true";

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      setFormStatus("Veuillez remplir les champs obligatoires avant d'envoyer la demande.", "error");
      contactForm.reportValidity();
      return;
    }

    setFormStatus("Envoi en cours\u2026", "pending");

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      if (!window.emailjs) {
        throw new Error("EmailJS n'est pas charge.");
      }

      const formData = new FormData(contactForm);
      const templateParams = {
        nom: String(formData.get("nom") || "").trim(),
        entreprise: String(formData.get("entreprise") || "").trim(),
        courriel: String(formData.get("courriel") || "").trim(),
        telephone: String(formData.get("telephone") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        temps: new Date().toLocaleString("fr-CA", {
          dateStyle: "long",
          timeStyle: "short"
        })
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

      contactForm.reset();
      setFormStatus("Votre demande a \u00e9t\u00e9 envoy\u00e9e avec succ\u00e8s.", "success");
    } catch (error) {
      setFormStatus("Une erreur est survenue. Veuillez r\u00e9essayer ou \u00e9crire directement \u00e0 info@visionaltitude.ca.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

document.querySelectorAll("[data-footer-paged]").forEach((footerColumn) => {
  const firstPage = footerColumn.querySelector('[data-footer-page="0"]');
  const secondPage = footerColumn.querySelector('[data-footer-page="1"]');
  const nextButton = footerColumn.querySelector("[data-footer-next]");
  const prevButton = footerColumn.querySelector("[data-footer-prev]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!firstPage || !secondPage || !nextButton || !prevButton) {
    return;
  }

  const showPage = (pageIndex, direction) => {
    const showSecondPage = pageIndex === 1;
    const activePage = showSecondPage ? secondPage : firstPage;
    const hiddenPage = showSecondPage ? firstPage : secondPage;

    hiddenPage.hidden = true;
    hiddenPage.classList.remove("is-active", "is-moving-down", "is-moving-up");

    activePage.hidden = false;
    activePage.classList.remove("is-moving-down", "is-moving-up");

    if (!prefersReducedMotion) {
      activePage.classList.add(direction === "down" ? "is-moving-down" : "is-moving-up");
    }

    firstPage.hidden = showSecondPage;
    secondPage.hidden = !showSecondPage;
    firstPage.classList.toggle("is-active", !showSecondPage);
    secondPage.classList.toggle("is-active", showSecondPage);
  };

  nextButton.addEventListener("click", () => showPage(1, "down"));
  prevButton.addEventListener("click", () => showPage(0, "up"));
});
