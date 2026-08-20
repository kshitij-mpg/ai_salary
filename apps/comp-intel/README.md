# PayRisk Desk

Business tool for the question:

> If I pay my Data Scientist **₹X**, by how much are they under/over-paid?  
> Do I risk losing them — and **to whom**?

Built on `data/AI_Salary_Benchmark_ALL.csv` (published **Compensation_Observation** rows — not a people database).

## Run

Node 18+. From this folder:

```bash
npm install
npm run dev
```

Opens [http://localhost:5173](http://localhost:5173). Offline after install.

```bash
npm run build
npm run preview
```

## Product map

| View | Answers |
|------|---------|
| **Desk** | Enter incumbent (country, family, experience, pay). Instant gap vs P50, verdict, risk badge |
| **Gap Lab** | P10–P90 ladder, histogram, under/over by source |
| **Flight Risk** | 0–100 score + reasons + hottest sources paying more |
| **Who Pulls** | Cities, countries, industries, source league above your pay |
| **Scenarios** | Cost to P25/P50/P75 or custom raise %; new risk tier |
| **Portfolio** | Multi-person risk board, Σ remediation to P50, CSV export |
| **Evidence** | Virtualized observation ledger for the matched slice |
| **Method** | Grain, matching, FX/PPP, caveats |

## How the math works

1. **Match** like-for-like observations (progressive relax if thin sample).
2. **Band** = quantiles of `Salary_INR` (or PPP-corrected) in the slice.
3. **Gap** = your pay − P50 (₹ and %).
4. **Verdict** = underpaid / at market / overpaid (±8% band).
5. **Risk** blends gap %, percentile rank, and % of observations above you.
6. **Pull map** = destinations/sources where published pay &gt; yours.

Toggle **FX ₹** vs **PPP ₹** in the top bar for cash vs purchasing-power views.

Study FX: **1 USD = ₹95.43** (2026-08-12).

## Stack

React 18 · Vite · TypeScript · Tailwind · Recharts · TanStack Virtual.
