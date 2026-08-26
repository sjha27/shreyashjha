/* App Store Product Insights — app picker
   Renders the app-selection grid from the small DEMO_APPS list below,
   pulling each card's display info (name/developer/category/icon)
   straight from that app's own published data file -- so there's a
   single source of truth per app, never a separately-maintained copy.
   Adding a new demo app later means adding one slug to this list. */

(function () {
  "use strict";

  // The only thing that needs to change to add a new demo app to the picker.
  var DEMO_APPS = [
    "spotify", "google-maps", "uber", "airbnb", "instagram",
    "tiktok", "amazon-shopping", "microsoft-teams", "chatgpt", "gemini",
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cardHTML(slug, app) {
    return (
      '<a class="headline-card app-select-card" href="report.html?app=' + encodeURIComponent(slug) + '">' +
        '<div class="headline-icon-row">' +
          (app.artworkUrl
            ? '<img src="' + esc(app.artworkUrl) + '" alt="" width="60" height="60" style="width:2.4rem;height:2.4rem;border-radius:var(--r-md)">'
            : '<span class="headline-icon"></span>') +
        "</div>" +
        '<span class="headline-eyebrow">' + esc(app.developer) + " &middot; " + esc(app.category) + "</span>" +
        '<span class="headline-theme">' + esc(app.name) + "</span>" +
        '<span class="headline-excerpt">View the product brief</span>' +
      "</a>"
    );
  }

  function init() {
    var grid = document.getElementById("app-grid");
    if (!grid) return;

    Promise.all(
      DEMO_APPS.map(function (slug) {
        return fetch("data/" + slug + ".json")
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then(function (data) {
            return { slug: slug, app: data.app };
          })
          .catch(function (err) {
            console.warn("Could not load demo app \"" + slug + "\":", err.message);
            return null;
          });
      })
    ).then(function (results) {
      var loaded = results.filter(Boolean);
      grid.innerHTML = loaded.map(function (r) { return cardHTML(r.slug, r.app); }).join("");
      var countEl = document.getElementById("app-count");
      if (countEl) countEl.textContent = loaded.length;
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
