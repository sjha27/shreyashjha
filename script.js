document.documentElement.classList.add("js");

var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Lock screen ----------------------------------------------------
   Client-side only: the passcode below ships to every visitor and
   is readable via "View Source". This keeps casual visitors and
   crawlers out before launch — it is not real access control. */
(function () {
  var PASSCODE = "4404";
  var SESSION_KEY = "site-unlocked";

  var htmlEl = document.documentElement;
  var lockScreen = document.getElementById("lock-screen");
  var siteContent = document.getElementById("site-content");
  var dotsWrap = document.querySelector(".lock-dots");
  var dots = document.querySelectorAll(".lock-dot");
  var input = document.getElementById("passcode-input");
  var errorEl = document.getElementById("lock-error");
  var keypad = document.querySelector(".lock-keypad");

  if (!lockScreen || !siteContent || !input) return;

  function unlock(skipAnimation) {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}

    htmlEl.classList.remove("is-locked");
    siteContent.removeAttribute("inert");

    if (skipAnimation) {
      lockScreen.setAttribute("hidden", "");
      return;
    }

    lockScreen.classList.add("is-unlocking");
    var skipLink = document.querySelector(".skip-link");
    if (skipLink) skipLink.focus();

    window.setTimeout(function () {
      lockScreen.setAttribute("hidden", "");
    }, 500);
  }

  var alreadyUnlocked = false;
  try { alreadyUnlocked = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) {}

  if (alreadyUnlocked) {
    unlock(true);
    return;
  }

  function updateDots(count) {
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-filled", i < count);
    });
  }

  function showError(message) {
    errorEl.textContent = message;
    dotsWrap.classList.add("has-error");
  }

  function clearError() {
    errorEl.textContent = "";
    dotsWrap.classList.remove("has-error");
  }

  function handleValue() {
    var digits = input.value.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits !== input.value) input.value = digits;

    clearError();
    updateDots(digits.length);

    if (digits.length < 4) return;

    if (digits === PASSCODE) {
      unlock(false);
      return;
    }

    showError("Incorrect passcode. Try again.");
    window.setTimeout(
      function () {
        input.value = "";
        updateDots(0);
      },
      reduceMotion ? 0 : 380
    );
  }

  input.addEventListener("input", handleValue);

  if (keypad) {
    keypad.addEventListener("click", function (e) {
      var key = e.target.closest(".lock-key");
      if (!key || key.classList.contains("lock-key-spacer")) return;

      if (key.dataset.action === "delete") {
        input.value = input.value.slice(0, -1);
      } else if (key.dataset.digit !== undefined && input.value.length < 4) {
        input.value += key.dataset.digit;
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    });
  }

  window.setTimeout(function () { input.focus(); }, 50);
})();

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
