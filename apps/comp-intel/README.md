# PayRisk Desk

Business tool for the question:

> If I pay my Data Scientist **$X** (or **₹X**), by how much are they under/over-paid?  
> Do I risk losing them — and **to whom**?

Built on US LCA analytics-ready deliverables:

- `deliverables/analytics_ready/AI_Talent_Benchmark_CLEANED.csv` — LCA filing microdata (~66k rows)
- `deliverables/analytics_ready/AI_Talent_Benchmark_MARKET_BANDS.csv` — pre-aggregated market bands (~3k rows)

**Not** a people database. Base wage only — not total compensation.

## Run

Node 18+. From this folder:

```bash
npm install
npm run dev
```

Opens [http://localhost:5173](http://localhost:5173). Ingest runs automatically before dev/build.

```bash
npm run build
npm run preview
npm run test:scenarios
```

## Product map

| View | Answers |
|------|---------|
| **Desk** | Enter incumbent (country, family, experience, pay). Instant gap vs P50, verdict, risk badge |
| **Gap Lab** | P10–P90 ladder from matched market band, filing histogram, under/over by employer |
| **Flight Risk** | 0–100 score + reasons + top employer pull signals |
| **Who Pulls** | Named employers (Employer_Group), cities, metros paying more |
| **Scenarios** | Cost to P25/P50/P75 or custom raise %; new risk tier |
| **Portfolio** | Multi-person risk board, Σ remediation to P50, CSV export |
| **Evidence** | Virtualized LCA filing ledger for the matched slice |
| **Method** | Data sources, grains, geography fallback, LCA limitations |

## How the math works

1. **Market band lookup** — role family × experience × geography (City → Metro → State → National with n thresholds).
2. **Filing match** — progressive relax for evidence and employer pull (66k LCA rows).
3. **Band** = P10–P90 from pre-aggregated `Market_Band` when available, else filing quantiles.
4. **Gap** = your pay − P50 (₹ and %).
5. **Verdict** = underpaid / at market / overpaid (±8% band).
6. **Risk** blends gap %, percentile among filings, share above you, band n, competitiveness index.
7. **Employer pull** = LCA filings grouped by `Employer_Group` where pay > yours (n≥2).

Toggle **FX ₹** vs **PPP ₹** in the top bar for cash vs purchasing-power views.

- Cash FX: **1 USD = ₹95.43** (2026-08-12)
- PPP: **USD × 23** (World Bank India GDP PPP factor)

## Data rebuild

Ingest reads from repo-root `deliverables/analytics_ready/` at build time — no CSV copy in `apps/comp-intel/data/`.

Legacy `AI_Salary_Benchmark_ALL.csv` archived under `data/archive/`.

Rebuild analytics model:

```bash
python deliverables/build_analytics_ready_model.py
```

Then `npm run ingest` (or `npm run build`).
