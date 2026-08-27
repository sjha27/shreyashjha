/* App Store Product Insights — report renderer
   Fetches one app's structured AppAnalysis JSON (data/<app>.json) and
   renders the full progressive-disclosure report from it. No build
   step, no framework — plain DOM rendering from a JSON contract. */

(function () {
  "use strict";

  /* ---------------------------------------------------------------
     Icons — small original line icons, not emoji. currentColor stroke.
  --------------------------------------------------------------- */
  var ICONS = {
    heart:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M12 20.5S3.5 15.4 3.5 9.4A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.5 3.2c0 6-8.5 11.1-8.5 11.1Z"/></svg>',
    alertTriangle:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3.5 21.5 20H2.5Z"/><line x1="12" y1="9.5" x2="12" y2="13.8"/><circle class="icon-filled" cx="12" cy="16.6" r="0.9" stroke="none"/></svg>',
    lightbulb:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M9 18.5h6M9.6 21h4.8M12 3a6.2 6.2 0 0 0-3.1 11.6c.6.35 1.1 1 1.1 1.7v.7h4v-.7c0-.7.5-1.35 1.1-1.7A6.2 6.2 0 0 0 12 3Z"/></svg>',
    flag:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M6 21V3"/><path d="M6 4.2h12l-2.4 3.6L18 11.4H6"/></svg>',
    star:
      '<svg class="icon icon-filled" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.6l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95Z"/></svg>',
    arrowUpRight:
      '<svg class="icon" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/></svg>',
    download:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v11.5"/><polyline points="7 10 12 15 17 10"/><path d="M4.5 19h15"/></svg>',
    chevronDown:
      '<svg class="icon chevron" viewBox="0 0 24 24"><polyline points="6 9 12 16 18 9"/></svg>',
    arrowLeft:
      '<svg class="icon" viewBox="0 0 24 24"><polyline points="15 6 9 12 15 18"/></svg>',
  };

  /* ---------------------------------------------------------------
     Small utilities
  --------------------------------------------------------------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Typographic cleanup for OUR OWN analysis prose only (never for quoted
  // review text — that must stay byte-exact to what was validated against
  // the source reviews). Turns a plain-ASCII " -- " into a real em dash.
  function prose(s) {
    return esc(s).replace(/ -- /g, " — ");
  }

  /* Count labels must agree in number. Hardcoded "supporting reviews" printed
     "1 supporting reviews" wherever a claim rested on a single review. */
  function plural(n, singular, pluralForm) {
    return n + " " + (n === 1 ? singular : (pluralForm || singular + "s"));
  }

  function reviewsLabel(n) { return plural(n, "supporting review"); }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function starRow(rating) {
    var out = "";
    for (var i = 0; i < 5; i++) {
      out += i < rating ? ICONS.star : '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.6l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95Z"/></svg>';
    }
    return '<span class="stars" aria-label="' + rating + ' out of 5 stars">' + out + "</span>";
  }

  function badgeForPriority(label) {
    var cls = label === "P0" ? "badge-p0" : label === "P1" ? "badge-p1" : "badge-p2";
    return '<span class="badge ' + cls + '">' + esc(label) + "</span>";
  }

  function badgeForImpact(level) {
    var cls = "badge-impact-" + level.toLowerCase();
    return '<span class="badge ' + cls + '">' + esc(level) + "</span>";
  }

  function plainRubric(label, value) {
    return '<span class="rubric-plain"><span class="dot">&#9679;</span>' + esc(label) + ": " + esc(value) + "</span>";
  }

  function qs(name, fallback) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || fallback;
  }

  /* ---------------------------------------------------------------
     App state
  --------------------------------------------------------------- */

  var DATA = null;
  var byId = { strengths: {}, painPoints: {}, requests: {}, priorities: {} };
  var evidenceState = { theme: "all", rating: "all" };

  function indexById(list, target) {
    (list || []).forEach(function (item) { target[item.id] = item; });
  }

  /* ---------------------------------------------------------------
     Render: App identity
  --------------------------------------------------------------- */

  function renderIdentity() {
    var app = DATA.app, snap = DATA.reviewSnapshot;
    var dateRangeText =
      snap.dateRange && snap.dateRange.earliest && snap.dateRange.latest
        ? fmtDate(snap.dateRange.earliest) === fmtDate(snap.dateRange.latest)
          ? fmtDate(snap.dateRange.earliest)
          : fmtDate(snap.dateRange.earliest) + " – " + fmtDate(snap.dateRange.latest)
        : "";

    document.getElementById("app-identity").innerHTML =
      '<div class="app-identity">' +
        (app.artworkUrl ? '<img class="app-icon" src="' + esc(app.artworkUrl) + '" alt="" width="72" height="72">' : "") +
        '<div class="app-identity-text">' +
          '<h1 class="app-name">' + esc(app.name) + "</h1>" +
          '<p class="app-meta">' + esc(app.developer) + " · " + esc(app.category) + "</p>" +
          '<p class="app-scope-line">' +
            "<strong>" + snap.reviewsAnalyzed + "</strong> recent reviews analyzed" +
            (dateRangeText ? " · " + esc(dateRangeText) : "") +
            '<span class="storefront-tag">' + esc((app.countryCode || "us").toUpperCase()) + " App Store</span>" +
          "</p>" +
        "</div>" +
      "</div>";

    document.title = app.name + " | App Store Product Insights";
  }

  /* ---------------------------------------------------------------
     Render: Review snapshot (metrics)
  --------------------------------------------------------------- */

  function renderSnapshot() {
    var m = DATA.metrics;
    var rows = [5, 4, 3, 2, 1].map(function (star) {
      var count = m.ratingDistribution[star] || 0;
      var pct = m.ratingDistributionPercent[star] || 0;
      return (
        '<div class="dist-row">' +
          '<span class="dist-star-label">' + star + "★</span>" +
          '<span class="dist-track"><span class="dist-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="dist-count">' + count + " (" + pct + "%)</span>" +
        "</div>"
      );
    }).join("");

    document.getElementById("snapshot").innerHTML =
      '<h2 class="report-section-title" id="snapshot-title">Review Snapshot</h2>' +
      '<div class="snapshot-grid">' +
        '<div class="rating-compare">' +
          '<div class="rating-block">' +
            '<div class="rating-num">' + (m.sampleAverageRating != null ? m.sampleAverageRating.toFixed(2) : "—") + "</div>" +
            '<div class="rating-label">Recent ' + DATA.reviewSnapshot.reviewsAnalyzed + '-review sample</div>' +
          "</div>" +
          '<div class="rating-block">' +
            '<div class="rating-num">' + (m.currentAppStoreRating.average != null ? m.currentAppStoreRating.average.toFixed(2) : "—") + "</div>" +
            '<div class="rating-label">Current App Store rating' +
              (m.currentAppStoreRating.count ? " (" + m.currentAppStoreRating.count.toLocaleString() + " ratings)" : "") +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="dist-rows">' + rows + "</div>" +
      "</div>" +
      '<p class="snapshot-note">These two ratings come from different populations. One is a recent ' +
        DATA.reviewSnapshot.reviewsAnalyzed + '-review sample, the other is Apple\'s much larger all-time count, so the gap between them is shown for context, not as a trend or decline.</p>';
  }

  /* ---------------------------------------------------------------
     Render: Product Brief + Transformation summary
  --------------------------------------------------------------- */

  function renderBrief() {
    document.getElementById("brief").innerHTML =
      '<h2 class="report-section-title">The Product Brief</h2>' +
      '<div class="brief-card"><p class="brief-text">' + prose(DATA.productBrief) + "</p></div>";
  }

  function renderTransformation() {
    var t = DATA.transformationSummary;
    document.getElementById("transformation").innerHTML =
      '<div class="transform-strip">' +
        '<div class="transform-stat"><div class="transform-num">' + t.reviewsAnalyzed + '</div><div class="transform-label">reviews analyzed</div></div>' +
        '<div class="transform-arrow">&rarr;</div>' +
        '<div class="transform-stat"><div class="transform-num">' + t.recurringSignalCount + '</div><div class="transform-label">recurring signals</div></div>' +
        '<div class="transform-arrow">&rarr;</div>' +
        '<div class="transform-stat"><div class="transform-num">' + t.priorityCount + '</div><div class="transform-label">recommended priorities</div></div>' +
      "</div>";
  }

  /* ---------------------------------------------------------------
     Render: Four headline signals
  --------------------------------------------------------------- */

  function headlineExcerpt(kind, item) {
    if (kind === "strength") return item.whatUsersValue;
    if (kind === "pain") return item.synthesis;
    if (kind === "request") return item.underlyingNeed;
    if (kind === "priority") return item.whyNow;
    return "";
  }

  function renderHeadlineSignals() {
    var hs = DATA.headlineSignals;
    var cards = [
      { icon: ICONS.heart, eyebrow: "Strongest Product Strength", item: byId.strengths[hs.topStrengthId], anchor: "love-" + hs.topStrengthId },
      { icon: ICONS.alertTriangle, eyebrow: "Most Important User Pain", item: byId.painPoints[hs.topPainPointId], anchor: "struggle-" + hs.topPainPointId },
      { icon: ICONS.lightbulb, eyebrow: "Strongest Unmet Need", item: byId.requests[hs.topRequestId], anchor: "want-" + hs.topRequestId },
      { icon: ICONS.flag, eyebrow: "Highest-Priority Action", item: byId.priorities[hs.topPriorityId], anchor: "act-" + hs.topPriorityId },
    ];

    var kinds = ["strength", "pain", "request", "priority"];

    document.getElementById("headline-signals").innerHTML =
      '<div class="headline-grid">' +
        cards.map(function (c, i) {
          // topStrengthId may legitimately be null — render the finding, not a broken card.
          if (!c.item) {
            return (
              '<div class="headline-card headline-card-null">' +
                '<div class="headline-icon-row"><span class="headline-icon">' + c.icon + "</span></div>" +
                '<span class="headline-eyebrow">' + c.eyebrow + "</span>" +
                '<span class="headline-theme">None identified</span>' +
                '<span class="headline-excerpt">No strong current positive theme emerged in this sample.</span>' +
              "</div>"
            );
          }
          var title = c.item.theme || c.item.title || c.item.requestedCapability;
          var priBadge = c.item.priorityLabel ? badgeForPriority(c.item.priorityLabel) : "";
          return (
            '<a class="headline-card" href="#' + c.anchor + '">' +
              '<div class="headline-icon-row"><span class="headline-icon">' + c.icon + "</span>" + priBadge + "</div>" +
              '<span class="headline-eyebrow">' + c.eyebrow + "</span>" +
              '<span class="headline-theme">' + esc(title) + "</span>" +
              '<span class="headline-excerpt">' + prose(headlineExcerpt(kinds[i], c.item)) + "</span>" +
            "</a>"
          );
        }).join("") +
      "</div>";
  }

  /* ---------------------------------------------------------------
     Render: Priority overview table
  --------------------------------------------------------------- */

  function renderPriorityOverview() {
    var rows = DATA.priorities.map(function (p) {
      var linked = byId.painPoints[p.linkedItemId] || byId.requests[p.linkedItemId];
      var evidenceText = linked ? linked.evidenceCount + (linked.evidencePercentOfSample != null ? " (" + linked.evidencePercentOfSample + "%)" : "") : "—";
      var impact = linked && linked.userImpact ? badgeForImpact(linked.userImpact.level) : "—";
      var relevance = linked && linked.strategicRelevance ? plainRubric("Relevance", linked.strategicRelevance.level) : "—";
      var confidence = linked && linked.evidenceConfidence ? plainRubric("Confidence", linked.evidenceConfidence.level) : "—";
      return (
        "<tr>" +
          "<td>" + badgeForPriority(p.priorityLabel) + "</td>" +
          '<td><a class="row-link" href="#act-' + p.id + '">' + esc(p.title) + "</a></td>" +
          "<td>" + evidenceText + "</td>" +
          "<td>" + impact + "</td>" +
          "<td>" + relevance + "</td>" +
          "<td>" + confidence + "</td>" +
        "</tr>"
      );
    }).join("");

    document.getElementById("priority-overview").innerHTML =
      '<h2 class="report-section-title">Priority Overview</h2>' +
      '<div class="table-scroll"><table class="priority-table">' +
        "<thead><tr><th>Priority</th><th>Signal</th><th>Evidence</th><th>User Impact</th><th>Strategic Relevance</th><th>Confidence</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  /* ---------------------------------------------------------------
     Render: What Users Love
  --------------------------------------------------------------- */

  function voiceQuotes(list) {
    return (list || []).map(function (v) {
      return (
        '<div class="quote-block">' +
          "“" + esc(v.quote) + "”" +
          '<div class="quote-meta">' + starRow(v.rating) + "<span>" + fmtDate(v.date) + "</span></div>" +
        "</div>"
      );
    }).join("");
  }

  /* Counterevidence: reviews that materially qualify a claim. Shown because
     surfacing what argues against a conclusion is what makes the conclusion
     credible -- never counted toward evidenceCount or prevalence. */
  function counterEvidence(item) {
    var ids = item.counterEvidenceReviewIds || [];
    if (!ids.length || !DATA.evidenceIndex) return "";
    var rows = ids.map(function (id) {
      var r = DATA.evidenceIndex[id];
      if (!r) return "";
      var body = r.body || "";
      return (
        '<div class="counter-quote">' +
          "“" + esc(body.length > 240 ? body.slice(0, 240).trim() + "…" : body) + "”" +
          '<div class="quote-meta">' + starRow(r.rating) + "<span>" + fmtDate(r.date) + "</span></div>" +
        "</div>"
      );
    }).join("");
    if (!rows) return "";
    return (
      '<div class="counter-block">' +
        '<span class="counter-label">Counterevidence: qualifies this finding, not counted in the ' +
          reviewsLabel(item.evidenceCount) + '</span>' + rows +
      "</div>"
    );
  }

  function viewEvidenceButton(theme, count) {
    return (
      '<button type="button" class="view-evidence-link" data-theme="' + esc(theme) + '">' +
        "View all " + reviewsLabel(count) + " " + ICONS.arrowUpRight +
      "</button>"
    );
  }

  function renderLove() {
    // A report is allowed to find no defensible current strength. That's a real
    // analytical result, not missing data, so it gets a deliberate rendered state
    // rather than a manufactured positive theme.
    if (!DATA.strengths || !DATA.strengths.length) {
      document.getElementById("love-section").innerHTML =
        '<h2 class="report-section-title">What Users Love</h2>' +
        '<div class="null-finding">' +
          '<p class="null-finding-head">No strong current positive theme emerged in this sample.</p>' +
          '<p class="null-finding-body">' + prose(DATA.noStrengthRationale ||
            "Reviews in this sample did not contain a recurring, current positive signal substantial " +
            "enough to report as a product strength. This is stated as a finding rather than filled " +
            "with a weaker theme for structural symmetry.") + "</p>" +
        "</div>";
      return;
    }

    var cards = DATA.strengths.map(function (s) {
      return (
        '<article class="content-card" id="love-' + s.id + '">' +
          '<div class="content-card-head"><h3 class="content-card-title">' + esc(s.theme) + "</h3></div>" +
          '<p class="evidence-count-line"><strong>' + s.evidenceCount + "</strong> " +
            (s.evidenceCount === 1 ? "supporting review" : "supporting reviews") + "</p>" +
          '<p class="card-prose">' + prose(s.whatUsersValue) + "</p>" +
          '<p class="card-prose">' + prose(s.whyThisMatters) + "</p>" +
          '<div class="protect-block"><span class="protect-label">Protect this</span><p class="card-prose">' + prose(s.protectThis) + "</p></div>" +
          voiceQuotes(s.voiceOfCustomer) +
          counterEvidence(s) +
          viewEvidenceButton(s.theme, s.evidenceCount) +
        "</article>"
      );
    }).join("");

    document.getElementById("love-section").innerHTML =
      '<h2 class="report-section-title">What Users Love</h2>' +
      '<p class="report-lede">What the product team should protect, not just what\'s going well.</p>' +
      '<div class="content-cards">' + cards + "</div>";
  }

  /* ---------------------------------------------------------------
     Render: Where Users Are Struggling
  --------------------------------------------------------------- */

  function deepDiveFields(p) {
    var blocks = [];
    if (p.affectedJourney) blocks.push(fieldBlock("Affected task / journey", p.affectedJourney));
    if (p.potentialImplication) blocks.push(fieldBlock("Potential implication", p.potentialImplication));
    if (p.recommendedNextStep) blocks.push(fieldBlock("Recommended next step", p.recommendedNextStep));
    if (p.likelyImplementationSurface) blocks.push(fieldBlock("Likely implementation surface", p.likelyImplementationSurface));
    if (p.implementationConsiderations) blocks.push(fieldBlock("Implementation considerations", p.implementationConsiderations));
    if (p.likelyCrossFunctionalPartners && p.likelyCrossFunctionalPartners.length) {
      blocks.push(
        '<div class="field-block"><span class="field-label">Likely cross-functional partners</span>' +
        '<div class="chip-list">' + p.likelyCrossFunctionalPartners.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div></div>"
      );
    }
    return blocks.join("");
  }

  function fieldBlock(label, value) {
    return '<div class="field-block"><span class="field-label">' + esc(label) + '</span><p class="field-value">' + prose(value) + "</p></div>";
  }

  function renderStruggle() {
    var cards = DATA.painPoints.map(function (p) {
      return (
        '<article class="content-card" id="struggle-' + p.id + '">' +
          '<div class="content-card-head"><h3 class="content-card-title">' + esc(p.theme) + "</h3></div>" +
          '<div class="tag-row"><span class="tag">' + esc(p.issueType) + '</span><span class="tag">' + esc(p.productSurface) + "</span></div>" +
          '<p class="evidence-count-line"><strong>' + p.evidenceCount + "</strong> " +
            (p.evidenceCount === 1 ? "supporting review" : "supporting reviews") +
            " (" + p.evidencePercentOfSample + "% of the " +
            ((DATA.reviewSnapshot && DATA.reviewSnapshot.reviewsAnalyzed) || 200) + "-review snapshot)</p>" +
          '<div class="rubric-row">' +
            "<span>" + badgeForImpact(p.userImpact.level) + " Impact</span>" +
            plainRubric("Relevance", p.strategicRelevance.level) +
            plainRubric("Confidence", p.evidenceConfidence.level) +
          "</div>" +
          '<p class="card-prose">' + prose(p.synthesis) + "</p>" +
          voiceQuotes(p.voiceOfCustomer) +
          counterEvidence(p) +
          '<details class="deep-dive"><summary>View Deep Dive ' + ICONS.chevronDown + "</summary>" +
            '<div class="deep-dive-body">' + deepDiveFields(p) + "</div>" +
          "</details>" +
          viewEvidenceButton(p.theme, p.evidenceCount) +
        "</article>"
      );
    }).join("");

    document.getElementById("struggle-section").innerHTML =
      '<h2 class="report-section-title">Where Users Are Struggling</h2>' +
      '<p class="report-lede">Ranked by how much each issue interferes with the user\'s goal, not by how loudly it\'s written.</p>' +
      '<div class="content-cards">' + cards + "</div>";
  }

  /* ---------------------------------------------------------------
     Render: What Users Want
  --------------------------------------------------------------- */

  function renderWant() {
    var cards = DATA.requests.map(function (r) {
      return (
        '<article class="content-card" id="want-' + r.id + '">' +
          '<div class="content-card-head"><h3 class="content-card-title">' + esc(r.requestedCapability) + "</h3></div>" +
          '<p class="evidence-count-line"><strong>' + r.evidenceCount + "</strong> " +
            (r.evidenceCount === 1 ? "supporting review" : "supporting reviews") + "</p>" +
          (r.context ? '<p class="card-prose">' + prose(r.context) + "</p>" : "") +
          '<div class="need-block"><span class="need-label">Underlying need</span><p class="card-prose">' + prose(r.underlyingNeed) + "</p></div>" +
          counterEvidence(r) +
          viewEvidenceButton(r.requestedCapability, r.evidenceCount) +
        "</article>"
      );
    }).join("");

    document.getElementById("want-section").innerHTML =
      '<h2 class="report-section-title">What Users Want</h2>' +
      '<p class="report-lede">What people asked for, and the need underneath the ask, which isn\'t always the same thing.</p>' +
      '<div class="content-cards">' + cards + "</div>";
  }

  /* ---------------------------------------------------------------
     Render: What Should The Team Prioritize
  --------------------------------------------------------------- */

  function renderPrioritize() {
    var cards = DATA.priorities.map(function (p) {
      return (
        '<article class="content-card" id="act-' + p.id + '">' +
          '<div class="content-card-head">' +
            badgeForPriority(p.priorityLabel) +
          "</div>" +
          '<h3 class="content-card-title">' + esc(p.title) + "</h3>" +
          '<div class="field-block" style="margin-top:0.8rem"><span class="field-label">Why now</span><p class="field-value">' + prose(p.whyNow) + "</p></div>" +
          '<div class="field-block" style="margin-top:0.8rem"><span class="field-label">Recommended next step</span><p class="field-value">' + prose(p.recommendedNextStep) + "</p></div>" +
          (p.likelyImplementationSurface ? fieldBlockSpaced("Likely implementation surface", p.likelyImplementationSurface) : "") +
          (p.implementationConsiderations ? fieldBlockSpaced("Implementation considerations", p.implementationConsiderations) : "") +
          (p.likelyCrossFunctionalPartners && p.likelyCrossFunctionalPartners.length
            ? '<div class="field-block" style="margin-top:0.8rem"><span class="field-label">Likely cross-functional partners</span><div class="chip-list">' +
                p.likelyCrossFunctionalPartners.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") +
              "</div></div>"
            : "") +
        "</article>"
      );
    }).join("");

    document.getElementById("prioritize-section").innerHTML =
      '<h2 class="report-section-title">What Should the Product Team Prioritize?</h2>' +
      '<p class="report-lede">A short, ranked set of recommended actions, not an autogenerated backlog.</p>' +
      '<div class="content-cards">' + cards + "</div>";
  }

  function fieldBlockSpaced(label, value) {
    return '<div class="field-block" style="margin-top:0.8rem"><span class="field-label">' + esc(label) + '</span><p class="field-value">' + prose(value) + "</p></div>";
  }

  /* ---------------------------------------------------------------
     Evidence Explorer
  --------------------------------------------------------------- */

  function buildEvidenceThemeMap() {
    // reviewId -> [{ themeLabel, kind }]
    var map = {};
    function add(reviewId, themeLabel) {
      if (!map[reviewId]) map[reviewId] = [];
      if (map[reviewId].indexOf(themeLabel) === -1) map[reviewId].push(themeLabel);
    }
    (DATA.strengths || []).forEach(function (s) { (s.supportingReviewIds || []).forEach(function (id) { add(id, s.theme); }); });
    (DATA.painPoints || []).forEach(function (p) { (p.supportingReviewIds || []).forEach(function (id) { add(id, p.theme); }); });
    (DATA.requests || []).forEach(function (r) { (r.supportingReviewIds || []).forEach(function (id) { add(id, r.requestedCapability); }); });
    return map;
  }

  var evidenceThemeMap = null;
  var allThemeLabels = [];

  function renderEvidenceExplorer() {
    evidenceThemeMap = buildEvidenceThemeMap();
    var seen = {};
    allThemeLabels = [];
    Object.keys(evidenceThemeMap).forEach(function (id) {
      evidenceThemeMap[id].forEach(function (t) { if (!seen[t]) { seen[t] = true; allThemeLabels.push(t); } });
    });
    allThemeLabels.sort();

    var options = '<option value="all">All themes</option>' +
      allThemeLabels.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("");

    document.getElementById("evidence-explorer").innerHTML =
      '<h2 class="report-section-title">Evidence Explorer</h2>' +
      '<p class="report-lede">Every conclusion above traces back to real reviews. Filter and browse them here.</p>' +
      (DATA.contentAdvisory
        ? '<div class="content-advisory" role="note"><span class="content-advisory-label">Content note</span>' +
            '<p>' + prose(DATA.contentAdvisory) + '</p></div>'
        : "") +
      '<div class="evidence-controls">' +
        '<select class="evidence-select" id="evidence-theme-select">' + options + "</select>" +
        '<div class="rating-filter" id="evidence-rating-filter">' +
          '<button type="button" class="is-active" data-rating="all">All ratings</button>' +
          '<button type="button" data-rating="1">1★</button>' +
          '<button type="button" data-rating="2">2★</button>' +
          '<button type="button" data-rating="3plus">3★+</button>' +
        "</div>" +
      "</div>" +
      '<p class="evidence-count-summary" id="evidence-count-summary"></p>' +
      '<div class="evidence-grid" id="evidence-grid"></div>';

    document.getElementById("evidence-theme-select").addEventListener("change", function (e) {
      evidenceState.theme = e.target.value;
      renderEvidenceGrid();
    });
    document.getElementById("evidence-rating-filter").addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      evidenceState.rating = btn.dataset.rating;
      Array.prototype.forEach.call(document.querySelectorAll("#evidence-rating-filter button"), function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      renderEvidenceGrid();
    });

    renderEvidenceGrid();
  }

  function renderEvidenceGrid() {
    var ids = Object.keys(DATA.evidenceIndex || {});
    var filtered = ids.filter(function (id) {
      var review = DATA.evidenceIndex[id];
      var themes = evidenceThemeMap[id] || [];
      if (evidenceState.theme !== "all" && themes.indexOf(evidenceState.theme) === -1) return false;
      if (evidenceState.rating === "1" && review.rating !== 1) return false;
      if (evidenceState.rating === "2" && review.rating !== 2) return false;
      if (evidenceState.rating === "3plus" && review.rating < 3) return false;
      return true;
    });

    filtered.sort(function (a, b) { return new Date(DATA.evidenceIndex[b].date) - new Date(DATA.evidenceIndex[a].date); });

    // Be explicit that this is the cited-evidence subset, not the full sample --
    // "60 reviews shown" invited the reading that 140 reviews went missing.
    var total = (DATA.reviewSnapshot && DATA.reviewSnapshot.reviewsAnalyzed) || 200;
    var isAll = evidenceState.theme === "all" && evidenceState.rating === "all";
    document.getElementById("evidence-count-summary").textContent = isAll
      ? filtered.length + " of " + total + " reviews cited as thematic evidence"
      : filtered.length + " cited review" + (filtered.length === 1 ? "" : "s") + " match this filter";

    var grid = document.getElementById("evidence-grid");
    if (filtered.length === 0) {
      grid.innerHTML = '<p class="evidence-empty">No reviews match this filter.</p>';
      return;
    }

    grid.innerHTML = filtered.map(function (id) {
      var r = DATA.evidenceIndex[id];
      var themes = evidenceThemeMap[id] || [];
      return (
        '<div class="evidence-card">' +
          '<div class="quote-meta">' + starRow(r.rating) + "<span>" + fmtDate(r.date) + "</span></div>" +
          (r.title ? '<div class="evidence-card-title">' + esc(r.title) + "</div>" : "") +
          (DATA.contentAdvisory
            ? '<details class="evidence-collapse"><summary>Show review text</summary>' +
                '<p class="evidence-card-body">' + esc(r.body) + "</p></details>"
            : '<p class="evidence-card-body">' + esc(r.body) + "</p>") +
          '<div class="chip-list">' + themes.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
        "</div>"
      );
    }).join("");
  }

  function openEvidenceForTheme(themeLabel) {
    evidenceState.theme = themeLabel;
    var select = document.getElementById("evidence-theme-select");
    if (select) select.value = themeLabel;
    renderEvidenceGrid();
    document.getElementById("evidence-explorer").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------------------------------------------------------
     Render: Methodology
  --------------------------------------------------------------- */

  /* The methodology describes the system, not the app, so it is authored
     once in methodology.js and rendered identically in every report. */

  function methodologyListItem(item) {
    return item && item.term
      ? "<li><strong>" + esc(item.term) + ":</strong> " + esc(item.text) + "</li>"
      : "<li>" + esc(item) + "</li>";
  }

  function methodologyBlock(block) {
    if (block.type === "ul") {
      return '<ul class="method-list">' + block.items.map(methodologyListItem).join("") + "</ul>";
    }
    return '<p class="field-value">' + esc(block.text) + "</p>";
  }

  function renderMethodology() {
    var m = window.APP_STORE_INSIGHTS_METHODOLOGY;
    if (!m) return;
    document.getElementById("methodology").innerHTML =
      '<h2 class="report-section-title">' + esc(m.title) + "</h2>" +
      '<div class="method-grid">' +
        m.sections.map(function (section) {
          return (
            '<div class="field-block method-block">' +
              '<span class="field-label">' + esc(section.heading) + "</span>" +
              section.blocks.map(methodologyBlock).join("") +
            "</div>"
          );
        }).join("") +
      "</div>";
  }

  /* ---------------------------------------------------------------
     Markdown export
  --------------------------------------------------------------- */

  function toMarkdown() {
    var d = DATA, lines = [];
    lines.push("# " + d.app.name + "\n");
    lines.push("App Store Product Insights");
    lines.push(d.app.developer + " · " + d.app.category + " · " + (d.app.countryCode || "us").toUpperCase() + " App Store");
    lines.push(d.reviewSnapshot.reviewsAnalyzed + " recent reviews analyzed\n");
    lines.push("## Review Snapshot\n");
    lines.push("- Recent sample average: " + d.metrics.sampleAverageRating + "★");
    lines.push("- Current App Store rating: " + d.metrics.currentAppStoreRating.average + "★ (" + d.metrics.currentAppStoreRating.count + " ratings)");
    [5, 4, 3, 2, 1].forEach(function (s) {
      lines.push("- " + s + "★: " + d.metrics.ratingDistribution[s] + " (" + d.metrics.ratingDistributionPercent[s] + "%)");
    });
    lines.push("\n## The Product Brief\n\n" + d.productBrief + "\n");
    lines.push("**" + d.transformationSummary.reviewsAnalyzed + " reviews → " + d.transformationSummary.recurringSignalCount + " recurring signals → " + d.transformationSummary.priorityCount + " recommended priorities**\n");

    lines.push("## What Users Love\n");
    d.strengths.forEach(function (s) {
      lines.push("### " + s.theme + " (" + reviewsLabel(s.evidenceCount) + ")\n");
      lines.push(s.whatUsersValue + "\n");
      lines.push("*Why this matters:* " + s.whyThisMatters + "\n");
      lines.push("*Protect this:* " + s.protectThis + "\n");
    });

    lines.push("## Where Users Are Struggling\n");
    d.painPoints.forEach(function (p) {
      lines.push("### " + p.theme + " (" + p.issueType + ")\n");
      lines.push(plural(p.evidenceCount, "review") + ", " + p.evidencePercentOfSample + "% of the " + d.reviewSnapshot.reviewsAnalyzed + "-review snapshot\n");
      lines.push("User Impact: " + p.userImpact.level + " · Strategic Relevance: " + p.strategicRelevance.level + " · Evidence Confidence: " + p.evidenceConfidence.level + "\n");
      lines.push(p.synthesis + "\n");
      lines.push("*Recommended next step:* " + p.recommendedNextStep + "\n");
    });

    lines.push("## What Users Want\n");
    d.requests.forEach(function (r) {
      lines.push("### " + r.requestedCapability + " (" + reviewsLabel(r.evidenceCount) + ")\n");
      lines.push("*Underlying need:* " + r.underlyingNeed + "\n");
    });

    lines.push("## What Should the Product Team Prioritize?\n");
    d.priorities.forEach(function (p) {
      lines.push("### " + p.priorityLabel + ": " + p.title + "\n");
      lines.push("*Why now:* " + p.whyNow + "\n");
      lines.push("*Recommended next step:* " + p.recommendedNextStep + "\n");
    });

    var m = window.APP_STORE_INSIGHTS_METHODOLOGY;
    if (m) {
      lines.push("## " + m.title + "\n");
      m.sections.forEach(function (section) {
        lines.push("### " + section.heading + "\n");
        section.blocks.forEach(function (block) {
          if (block.type === "ul") {
            block.items.forEach(function (item) {
              lines.push("- " + (item && item.term ? "**" + item.term + ":** " + item.text : item));
            });
            lines.push("");
          } else {
            lines.push(block.text + "\n");
          }
        });
      });
    }

    return lines.join("\n");
  }

  function exportMarkdown() {
    var md = toMarkdown();
    var blob = new Blob([md], { type: "text/markdown" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var slug = DATA.app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    var dateStr = (DATA.reviewSnapshot.fetchedAt || "").slice(0, 10) || "export";
    a.href = url;
    a.download = slug + "-product-insights-" + dateStr + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------------
     TOC active-section highlighting
  --------------------------------------------------------------- */

  function wireToc() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".report-toc a"));
    var sections = links.map(function (l) { return document.querySelector(l.getAttribute("href")); }).filter(Boolean);
    if (!("IntersectionObserver" in window) || !sections.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var link = links.find(function (l) { return l.getAttribute("href") === "#" + entry.target.id; });
        if (!link) return;
        links.forEach(function (l) { l.classList.remove("is-active"); });
        link.classList.add("is-active");
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    sections.forEach(function (s) { obs.observe(s); });
  }

  /* ---------------------------------------------------------------
     Pin the section-jump nav once the header scrolls out of view.
     (position:sticky doesn't work here -- see the comment in report.css
     on .report-toc for why -- so this does the equivalent by hand:
     switch to position:fixed past a threshold, and add back the space
     it used to occupy so nothing jumps or hides underneath it.)
  --------------------------------------------------------------- */

  function setupTocPin() {
    var toc = document.querySelector(".report-toc");
    var header = document.querySelector(".report-header");
    var main = document.getElementById("report-root");
    if (!toc || !header || !main) return;

    var ticking = false;

    function update() {
      var shouldPin = window.scrollY > header.offsetHeight - 1;
      if (shouldPin) {
        toc.classList.add("is-pinned");
        main.style.paddingTop = toc.offsetHeight + "px";
      } else {
        toc.classList.remove("is-pinned");
        main.style.paddingTop = "";
      }
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener("resize", update);
    update();
  }

  /* ---------------------------------------------------------------
     If the page was loaded with a #section-id (e.g. linked from the
     homepage's project card), jump there once the report has actually
     rendered. A plain browser anchor-jump can't do this on its own --
     the target elements don't exist in the DOM until after the fetch()
     above resolves and we build the page, which happens after the
     browser already tried and failed to find the fragment.
  --------------------------------------------------------------- */

  function jumpToInitialHash() {
    if (!window.location.hash) return;
    var target;
    try {
      target = document.querySelector(window.location.hash);
    } catch (e) {
      return; // malformed hash -- ignore rather than throw
    }
    if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
  }

  /* ---------------------------------------------------------------
     Wire up "View all evidence" buttons (event delegation)
  --------------------------------------------------------------- */

  function wireEvidenceButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".view-evidence-link");
      if (!btn) return;
      openEvidenceForTheme(btn.dataset.theme);
    });
  }

  /* ---------------------------------------------------------------
     Init
  --------------------------------------------------------------- */

  function showError(message) {
    document.getElementById("report-loading").hidden = true;
    var err = document.getElementById("report-error");
    err.hidden = false;
    err.textContent = message;
  }

  function init() {
    var app = qs("app", "spotify");
    fetch("data/" + app + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load data for \"" + app + "\" (HTTP " + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        DATA = data;
        indexById(DATA.strengths, byId.strengths);
        indexById(DATA.painPoints, byId.painPoints);
        indexById(DATA.requests, byId.requests);
        indexById(DATA.priorities, byId.priorities);

        renderIdentity();
        renderSnapshot();
        renderBrief();
        renderTransformation();
        renderHeadlineSignals();
        renderPriorityOverview();
        renderLove();
        renderStruggle();
        renderWant();
        renderPrioritize();
        renderEvidenceExplorer();
        renderMethodology();

        document.getElementById("report-loading").hidden = true;
        document.getElementById("report-root").hidden = false;
        document.getElementById("report-toc-wrap").hidden = false;

        wireToc();
        setupTocPin();
        jumpToInitialHash();

        var exportBtn = document.getElementById("export-markdown-btn");
        if (exportBtn) exportBtn.addEventListener("click", exportMarkdown);
      })
      .catch(function (err) {
        showError(err.message);
      });
  }

  wireEvidenceButtons();
  document.addEventListener("DOMContentLoaded", init);
})();
