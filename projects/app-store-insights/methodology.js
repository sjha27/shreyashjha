/* App Store Product Insights — shared methodology
   One app-agnostic description of how every report is produced.

   This used to live inside each app's data/<slug>.json, which meant ten
   near-identical copies drifting apart and carrying app-specific asides
   (store IDs, per-app exclusions, company caveats) into a section that
   describes the system, not the app. The renderer and the Markdown
   export both read this file, so the methodology is written once. */

window.APP_STORE_INSIGHTS_METHODOLOGY = {
  title: "Methodology",
  sections: [
    {
      heading: "1. Fixed Review Snapshot",
      blocks: [
        { type: "p", text: "Each report analyzes the 200 most recent public reviews available in the U.S. App Store at the time the snapshot is collected." },
        { type: "p", text: "The dataset is frozen before analysis so the results can be reproduced and audited. Because review volume differs by app, 200 reviews may represent anything from a few days to several weeks of feedback." },
      ],
    },
    {
      heading: "2. How Facts and AI Judgment Are Handled",
      blocks: [
        { type: "p", text: "Objective values are calculated directly from the frozen dataset:" },
        { type: "ul", items: [
          "review count",
          "date range",
          "star-rating distribution",
          "average rating",
          "evidence counts",
          "percentages",
        ] },
        { type: "p", text: "AI is used where interpretation is required:" },
        { type: "ul", items: [
          "identifying recurring themes",
          "distinguishing user requests from underlying needs",
          "assessing user impact",
          "assessing strategic relevance",
          "evaluating evidence confidence",
          "recommending what the product team should investigate next",
        ] },
        { type: "p", text: "This keeps the measurable parts of the analysis deterministic while using AI for the qualitative judgments the report requires." },
      ],
    },
    {
      heading: "3. Every Finding Must Trace to Evidence",
      blocks: [
        { type: "p", text: "Themes and recommendations are linked to the specific reviews that support them." },
        { type: "p", text: "A review counts as evidence only when it supports the precise claim being made, not merely because it discusses a related topic." },
        { type: "p", text: "Evidence that materially challenges a finding is shown separately as counterevidence and does not increase that finding’s prevalence." },
      ],
    },
    {
      heading: "4. Themes Must Represent One Product Problem",
      blocks: [
        { type: "p", text: "Reviews are grouped only when they describe a problem that a product team could reasonably investigate as one question." },
        { type: "p", text: "Related symptoms remain separate when they point to different mechanisms, causes, or potential solutions." },
        { type: "p", text: "This prevents broad themes from inflating prevalence or producing vague recommendations." },
      ],
    },
    {
      heading: "5. Priorities Use Four Dimensions",
      blocks: [
        { type: "p", text: "Findings are prioritized using four explicit dimensions:" },
        { type: "ul", items: [
          { term: "Frequency", text: "How often does the signal appear in this snapshot?" },
          { term: "User Impact", text: "How much does it interfere with the user’s goal?" },
          { term: "Strategic Relevance", text: "How closely does it relate to the product’s core experience?" },
          { term: "Evidence Confidence", text: "How coherent and well-supported is the finding?" },
        ] },
        { type: "p", text: "Frequency informs priority, but does not determine it. A lower-frequency issue can still matter when it severely affects a core product journey and the evidence is strong." },
      ],
    },
    {
      heading: "6. The Report Does Not Claim More Than the Data Supports",
      blocks: [
        { type: "p", text: "These reports describe signals within a recent review sample." },
        { type: "p", text: "They do not assume:" },
        { type: "ul", items: [
          "review prevalence equals prevalence across all users",
          "a single snapshot represents a trend",
          "reviewer-reported symptoms reveal the internal root cause",
          "public feedback reveals engineering effort or team ownership",
        ] },
        { type: "p", text: "When the evidence does not support a conclusion, the system is allowed to return no finding rather than manufacture one." },
      ],
    },
  ],
};
