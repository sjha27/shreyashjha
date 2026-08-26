document.documentElement.classList.add("js");

var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Footer year -------------------------------------------------- */
var yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* Hero word rotator -------------------------------------------- */
var rotator = document.getElementById("rotator");

if (rotator && !reduceMotion) {
  var words = ["loyalty", "personalization", "experimentation", "growth", "AI"];
  var i = 0;

  setInterval(function () {
    i = (i + 1) % words.length;
    var span = document.createElement("span");
    span.className = "rotator-word";
    span.textContent = words[i];
    rotator.replaceChildren(span);
  }, 2200);
}

/* Reveal on scroll --------------------------------------------- */
var revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduceMotion) {
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -80px 0px" }
  );

  revealEls.forEach(function (el) { revealObserver.observe(el); });
} else {
  revealEls.forEach(function (el) { el.classList.add("is-visible"); });
}

/* Mobile menu --------------------------------------------------- */
var header = document.querySelector(".site-header");
var navToggle = document.querySelector(".nav-toggle");
var siteMenu = document.getElementById("site-menu");

function setMenu(open) {
  header.classList.toggle("nav-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
}

if (navToggle && siteMenu) {
  navToggle.addEventListener("click", function () {
    setMenu(navToggle.getAttribute("aria-expanded") !== "true");
  });

  // Close after choosing a destination
  siteMenu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("nav-open")) {
      setMenu(false);
      navToggle.focus();
    }
  });

  // Reset state when the menu stops being a panel
  window.matchMedia("(min-width: 861px)").addEventListener("change", function (e) {
    if (e.matches) setMenu(false);
  });
}

/* Active nav link ---------------------------------------------- */
var navLinks = Array.prototype.slice.call(
  document.querySelectorAll('.site-nav a[href^="#"]')
);
var sections = navLinks
  .map(function (link) { return document.querySelector(link.getAttribute("href")); })
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  var navObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var link = navLinks.find(function (l) {
          return l.getAttribute("href") === "#" + entry.target.id;
        });
        if (!link) return;
        navLinks.forEach(function (l) {
          l.classList.remove("is-active");
          l.removeAttribute("aria-current");
        });
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach(function (section) { navObserver.observe(section); });
}
