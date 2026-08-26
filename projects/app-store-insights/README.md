# App Store Product Insights (public project — not yet built)

This folder is reserved for the public, static demo of the App Store
Product Insights project. It will be reachable at:

```
shreyashjha.com/projects/app-store-insights/
```

**Nothing here is built yet.** This is Phase 1 scaffolding only. A future
phase will add:

```
projects/app-store-insights/
  index.html      demo app picker + report UI
  app.js
  style.css       (or shared root styles.css, reused where sensible)
  data/
    spotify.json  final AppAnalysis JSON per demo app (matches
                  _tools/app-store-analyzer/schema/app-analysis.schema.json)
    uber.json
    ... (10 demo apps total)
```

This folder never contains raw review text or the analysis tooling itself
— those live in `_tools/app-store-analyzer/`, which is excluded from the
published site. Only finished, structured analysis results (and the UI
that renders them) belong here.

## Presentation decisions for the future UI phase (decided 2026-08-26)

These are locked for whenever the report UI actually gets built (not yet):

- The executive Product Brief must stay **brief** — roughly 2-4 concise
  sentences. It's a synthesis, not a section summary.
- The four above-the-fold headline cards use **no emojis** and these exact
  labels: **Strongest Product Strength**, **Most Important User Pain**,
  **Strongest Unmet Need**, **Highest-Priority Action**. (The underlying
  schema fields stay `headlineSignals.topStrengthId` etc. — only the
  display labels/framing change.)
- Which item fills each of those four headline slots is a **PM judgment
  call** made when the analysis is produced (weighing severity, strategic
  relevance, and confidence together) — never picked mechanically by
  whichever theme has the highest raw review count.
