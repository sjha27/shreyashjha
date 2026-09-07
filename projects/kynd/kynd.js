/* Kynd project page — one behaviour only.
   Elements marked .k-reveal fade up once as they enter the viewport,
   matching the root site's reveal. The thesis graphic's node stagger
   and the old-model dim are pure CSS hanging off the same
   .is-visible class, so there is no second animation system here. */

document.documentElement.classList.add("js");

var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var revealEls = document.querySelectorAll(".k-reveal");

if ("IntersectionObserver" in window && !reduceMotion) {
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -80px 0px" }
  );

  revealEls.forEach(function (el) { observer.observe(el); });
} else {
  revealEls.forEach(function (el) { el.classList.add("is-visible"); });
}
