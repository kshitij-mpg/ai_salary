# Comp Intel · AI Compensation Atlas

Client-ready dashboard for the bundled evaluation extract
`data/AI_Salary_Benchmark_ALL.csv` (self-contained under this app folder).

This product treats every row as a **Compensation_Observation**: one published salary
range from one source, for one country / city, role, experience band, and pay type.
It is **not** a people database, payroll file, or ready-made percentile table.

## Run (offline, from the CSV)

Requires Node 18+. From this folder:

```bash
npm install
npm run dev
```

That single `npm run dev` command:

1. Parses the CSV at `data/AI_Salary_Benchmark_ALL.csv`
2. Writes derived JSON to `public/data/`
3. Serves the app at [http://localhost:5173](http://localhost:5173)

Production build:

```bash
npm run build
npm run preview
```

Verify the India PPP correction:

```bash
npm run ingest
npm run verify:ppp
```

No network is required after `npm install`. Display type uses Palatino / Georgia (editorial serif) and Segoe UI.

If `npm install` fails with `ENOSPC` on a OneDrive path, point the npm cache at a local drive and retry:

```powershell
$env:npm_config_cache = "$env:TEMP\npm-cache"
npm install --no-audit --no-fund
```

## How to present this to a client (30 seconds)

1. Open **Brief**. Say: “Each number is a published source observation, not a person.”
2. Point at the KPI strip: 7 countries, 6,317 observations, US ≈ 96% of rows.
3. Show **US vs India mid-level AI/ML, base vs base**, sources listed separately.
4. Toggle **PPP ₹**. Explain: FX is cash converted at 1 USD = ₹95.43 (12 Aug 2026).
   PPP is purchasing-power in India using World Bank factors, **by job country**.
5. If they ask “what’s the global average?” — there isn’t one. US would dominate.
   Country tiles are equal-weighted with **n** on every card. n &lt; 30 is directional.

Then move to **Explorer** for the live slice, **Comparator** for FX vs PPP dumbbells,
**Studio** for the ledger, **Method** for the formula.

## Grain

| Is | Is not |
|----|--------|
| One source’s published observation | One person |
| Min / median / max on the **same** row | A blended market rate |
| US LCA = employer-location filing | Employee headcount |
| Blank money = unpublished | Zero |

Default filters force like-for-like: **Base_Salary** first; country + role family +
experience (+ city when used). Sources are never auto-averaged. The toggle
**“Observation median (not employee median)”** is optional and labelled as such.

## FX

- Nominal metric: `Salary_INR` (already converted).
- Study FX: **1 USD = 95.43 INR** as of **2026-08-12**. Do not change it in the UI.
- Source `FX_Rate` is 1 original-currency unit = X INR.

## PPP (bundled CSV + derived safety net)

`data/AI_Salary_Benchmark_ALL.csv` has `Salary_PPP_INR` rewritten with job-country
PPP (India USD / GCC Nexus rows previously stored USD-like values after ÷ 95.43).

Ingest still derives:

- `Salary_PPP_INR_Corrected` — same formula, used by all PPP charts
- `PPP_Suspect` = Country_Code `IN` **and** Currency_Original `USD` (published in USD)

Correct logic — PPP by **job country**, not source currency:

```
Country_FX_to_INR: IN=1, US=95.43, AE=25.9856, GB=128.9259, DE=110.1453, AU=67.364, NZ=55.9792
PPP (PA.NUS.PPP):  IN=20.0886288014602, US=1, AE=2.32695589646038, GB=0.677133,
                   DE=0.709983, AU=1.398943, NZ=1.472957

local_amount = Salary_INR / Country_FX_to_INR[Country_Code]
Salary_PPP_INR_Corrected = local_amount * (PPP_IN / PPP[Country_Code])
```

All India rows therefore have `Salary_PPP_INR_Corrected = Salary_INR`.

Worked example — GCC Nexus, AI Engineer, Entry, National:

| Field | Value |
|-------|------:|
| Salary_INR | ₹13,07,391 |
| Salary_PPP_INR (bundled, fixed) | ₹13,07,391 |
| Salary_PPP_INR_Corrected | ₹13,07,391 |

PPP visuals always use the corrected column. Nominal visuals always use `Salary_INR`.

## Query rules enforced in the UI

1. Pay type first (default Base_Salary). Mixing base and TC requires opt-in + banner.
2. Match country + role family + experience (+ city when used).
3. Sources stay separate unless the observation-median overlay is switched on.
4. No unweighted global average. Country comparison is equal-weighted; n is shown.
5. n &lt; 30 → “directional only”.
6. Tooltips: source observation, not a person.

## Pages

| View | Purpose |
|------|---------|
| Brief | Client landing, KPIs, how-to-read, US vs India cards, PPP example |
| Explorer | Filter rail, source range bands, country tiles (size = n, colour = obs. median) |
| Comparator | 2–3 countries or 2–3 roles; FX vs PPP dumbbells, source dots |
| Studio | Virtualized observation table, row drawer, CSV export of the slice |
| Method | Grain, FX, PPP formula, India USD history, confidence legend |
| Snapshot | Print/PDF client sheet |

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · Recharts · TanStack Virtual.

Salaries are not invented, not averaged across sources, and not treated as people.
