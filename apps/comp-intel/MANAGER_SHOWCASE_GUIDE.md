# PayRisk Desk — Manager Showcase Guide  
### Har page ka What / Why / How (English + Hindi mix)

**Tool ka naam:** PayRisk Desk  
**Tagline:** *Know if you are underpaying — and who could poach them.*  
**Business question jo ye tool solve karta hai:**

> Agar main apne Data Scientist ko **₹X** de raha hoon, to wo market se kitna **underpaid / overpaid** hai?  
> Kya unke jaane ka risk hai? Agar haan, to **kis taraf / kis company-type** se pull ho sakta hai?

**Data kya hai:** Published compensation **observations** (benchmark / LCA / guides) — ye people database ya HRIS payroll nahi hai.  
**Study FX:** 1 USD = ₹95.43 (2026-08-12)  
**Kaise chalaye:** `apps/comp-intel` folder se `npm install` → `npm run dev` → browser `http://localhost:5173`

---

## 0. Manager ke liye 60-second pitch

| English | Hindi / Hinglish |
|--------|-------------------|
| This is a **compensation risk desk**, not just a salary chart. | Ye sirf salary chart nahi — **comp risk desk** hai. |
| Enter what you pay someone → instantly see gap vs market, flight risk, and who pays more. | Aap unka package daalo → turant market gap, leave risk, aur “kaun zyada deta hai” dikhega. |
| Built on **published market observations**, with clear caveats. | Basis published market data hai, aur limitations clearly likhi hain. |
| Use it in talent reviews, offer calibration, and retention conversations. | Talent review, offer fix, aur retention baat ke liye use karo. |

**Demo flow (recommended):**  
**Desk** → **Gap Lab** → **Flight Risk** → **Who Pulls** → **Scenarios** → (optional) **Portfolio / Evidence / Method**

---

## 1. Top Bar (har page pe common)

Har screen ke upar sticky bar milti hai — navigation + pay shortcut + FX/PPP toggle.

### What (kya hai?)
- Product name: **PayRisk Desk**
- 8 navigation tabs: Desk, Gap Lab, Flight Risk, Who Pulls, Scenarios, Portfolio, Evidence, Method
- Right side pe current **Paying** amount (compact ₹)
- **FX ₹** vs **PPP ₹** toggle

### Why (kyun important?)
- Manager ko har page pe same context milta hai — pay change ke baad dubara login / filter nahi.
- Cross-country compare karte time **cash (FX)** aur **purchasing power (PPP)** alag-alag dekh sakte ho.
- Navigation se story flow clear rehta hai: gap → risk → who → fix.

### How (kaise dikhao / use karo?)
1. Tabs pe click karke pages badlo.
2. **Paying** chip pe click → Desk pe jaake package edit.
3. **FX ₹** = nominal INR (cash view).  
   **PPP ₹** = World Bank PPP factors se India-terms purchasing power view.
4. Manager ko bolo: *“Pehle FX mein dekho (actual money), cross-border fairness ke liye PPP on karo.”*

---

## 2. Page: Desk (Home / Incumbent Verdict)

**Nav label:** Desk · *Incumbent verdict*  
**Ye pehla aur sabse important page hai.**

### What
Left side **Incumbent form**, right side **instant market answer**.

**Left — Incumbent inputs**
| Field | Meaning (Hinglish) |
|-------|--------------------|
| **Your offered pay** | Jo package aap de rahe ho / de rahe ho — hero control |
| Currency | INR / USD / Local FX |
| Unit (INR) | Lakh mode ya full amount |
| Presets | Quick chips: 12L, 15L, 18L… ya $80k, $100k… |
| ± steppers | Pay jaldi up-down |
| Incumbent label | Free text — e.g. “Priya – DS Mid – Bengaluru” |
| Country | India, US, UK, etc. (count dikhta hai) |
| Role family | Data Scientist, MLE, AI Engineer… |
| Experience | Entry / Mid / Senior / Lead / All Levels |
| City (optional) | City-level slice; blank = national |
| Role title (optional) | Specific title; blank = family-wide |
| Pay type | Base salary / Total compensation / Mixed |

**Right — Output cards**
1. **Your pay** — analyzed annual INR  
2. **Market P50** — median of matching observations (+ n & source count)  
3. **Gap vs P50** — ₹ aur % difference  
4. **Verdict + Risk badge** — underpaid / at market / overpaid + flight-risk tier  

Phir:
- **Match notes** (agar city/title relax hua)
- **Market position ladder** (P10–P90 pe “You” marker)
- **Flight risk meter** (score + reasons)
- Actions: **Open flight risk** · **Who could pull them** · **Copy brief**

Disclaimer: observations = published marks, not people headcount.

### Why
Manager ki primary question yahin answer hoti hai:

> “Is person ko jo de rahe hain, market se kitna kam/zyada hai — aur risk kitna hai?”

Ek screen pe **input + verdict + next step** — meeting mein 2 minute mein story clear.

### How (live demo script)
1. Country = **India**, Role family = **Data Scientist**, Experience = **Mid (3–5)**.  
2. Pay = **18 Lakh** (preset chip).  
3. Right side pe dikhao: P50, Gap %, Verdict, Risk badge.  
4. Agar “Directional only – n &lt; 30” dikhe → honestly bolo: *“Sample thin hai, directional aid hai, hard forecast nahi.”*  
5. **Copy brief** dabao → clipboard pe short English brief (HRBP / email ke liye).  
6. **Open flight risk** / **Who could pull** se next story.

**Math (simple words)**
- Match: country + family + experience + pay type (+ city/title if set)  
- Thin sample ho to auto-relax: city → title → All Levels → family×country  
- Gap = Your pay − Market P50  
- Verdict: ±8% band ke andar = **at market**; −8% se neeche = **underpaid**; +8% se upar = **overpaid**

---

## 3. Page: Gap Lab (Where you sit)

**Nav:** Gap Lab · *Where you sit*

### What
Desk ke baad **deep dive** — distribution aur source-by-source gap.

Sections:
1. **P10 / P25 / P50 / P75 / P90** cards  
2. **Ladder** — visual position on market band  
3. **Observation distribution** — histogram; copper bar = aapka pay jis bin mein padta hai  
4. **Under / over by source** — har source ki median vs aapka pay (% )  
5. **Gap math** — vs P25, P50, P75, aur “obs paying more” count  

### Why
Manager ko ye prove karna hota hai ke number ek “black box median” nahi hai.

> “P50 kahan se aaya? Distribution kaisi hai? Kaunse sources upar/neeche hain?”

Finance / Comp committee ke liye ye page **transparency** deta hai.

### How
1. Desk pe profile set rakho.  
2. Gap Lab kholo → pehle P10–P90 dikhao.  
3. Ladder pe “You” marker dikhao — under / at / over visually.  
4. Histogram se bolo: *“Market kitna concentrated / spread hai.”*  
5. Source list mein dikhao: kuch guides aapke upar, kuch neeche.  
6. FX ↔ PPP toggle se same page pe metric change dikhao.

**Manager line:**  
*“Yahan hum sirf average nahi — full ladder aur source breakdown dekh rahe hain.”*

---

## 4. Page: Flight Risk (Leave pressure aid)

**Nav:** Flight Risk · *Leave probability aid*

### What
Directional **0–100 flight risk score** + narrative + hottest sources paying more.

Blocks:
1. **Risk badge** (Critical / High / Watch / Stable / Premium) + score  
2. **Narrative paragraph** — elevated leave pressure / watch / premium language  
3. **Risk meter** — bar + reasons list  
4. Stats:  
   - Observations above your pay (count + %)  
   - Cash to reach P50 (annual remediation)  
5. Buttons: **Model a raise** · **See pullers**  
6. Table: **Hottest sources paying more**  
   - Source, Type, n, Median, Premium vs you  

**Important disclaimer on page:** ye resignation predictor nahi — decision aid hai.

### Why
Comp gap akela kaafi nahi — manager poochta hai:

> “Kya risk hai ke ye banda market mein better offer pe chala jaye?”

Score gap %, percentile, aur “kitne observations aapse zyada pay karte hain” ko blend karta hai.

### How
1. Desk se underpaid example lo (e.g. India Mid ₹12L ya US Mid $90k).  
2. Flight Risk pe score / tier dikhao.  
3. Reasons bullets padho — manager ko logic samajh aaye.  
4. “Cash to reach P50” se remediation size dikhao.  
5. Hottest sources table = pehla hint of “kahan zyada mil raha hai.”  
6. Clearly bolo: *“Ye HR attrition model nahi — pay-pressure signal hai.”*

**Score tiers (approx)**
| Score | Tier | Manager language |
|------:|------|------------------|
| ≥ 75 | Critical | Jaldi remediation / retention talk |
| ≥ 58 | High | Elevated leave pressure |
| ≥ 42 | Watch | Near market, insulated nahi |
| ≥ 28 | Stable | Broadly competitive |
| &lt; 28 | Premium | Pay alone se flight risk low |

---

## 5. Page: Who Pulls (Poach destinations)

**Nav:** Who Pulls · *Poach destinations*

### What
Answer to: **“To whom / kis taraf?”**

Summary cards:
- % of matched observations that pay more  
- Distinct pull sources count  
- Geo / industry pulls count  

Then:
1. **Cities paying more** — city list with median + premium %  
2. **Countries paying more** — (mostly useful when multi-country / PPP view)  
3. **Industry / employer-context signals** — Industry field clusters (Big Tech, GCC, LCA context, company-specific Levels, etc.)  
4. **Source league** — ranked sources above your pay (median, premium, roles seen)

Caveat on page: company-specific / LCA rows = **signals**, confirmed open offers nahi.

### Why
Manager ki emotional + business question:

> “Market mein kaun unhe khinch sakta hai — city, industry, ya kaunse published sources zyada dikha rahe hain?”

Retention strategy (location, counter-offer, equity) yahin se conversation start hoti hai.

### How
1. Flight Risk ke baad naturally Who Pulls kholo.  
2. Pehle density % dikhao (“X% observations aapse zyada”).  
3. Cities list — e.g. US Bay Area cities premium.  
4. Industry / source league — Levels.fyi company rows (jab TC) ya guides.  
5. Manager ko honest framing do:  
   *“Ye ‘poach list of open offers’ nahi — published pay signals hain jahan market aapse upar baithta hai.”*

**US tip:** US Mid slices often LCA-heavy — cities strong signal; named employer may be limited.  
**India TC tip:** Levels.fyi company rows (Amazon / Uber etc.) “to whom” story strong karte hain.

---

## 6. Page: Scenarios (Fix the gap)

**Nav:** Scenarios · *Fix the gap*

### What
Remediation modeling — **kitna badhana padega** aur risk kaise move hota hai.

1. **Custom raise slider** (0–40%)  
   - New package, incremental ₹/yr, new risk score + badge  
2. Ready scenarios (sirf jab target aapke current pay se upar ho):  
   - Raise to market **P25**  
   - Raise to market **P50**  
   - Raise to market **P75**  
   - Raise **+10%**  
   - Raise **+20%**  
3. Har card pe: Target · Incremental cost · Raise % · New percentile · New risk · “Closes P50 gap” badge  
4. Reminder: equity/bonus/benefits out of scope unless TC observations mein captured

### Why
Manager / finance next question:

> “Theek hai underpaid hai — ab kitna cost lagega risk kam karne ke liye?”

Yahan conversation **problem → budgeted action** ban jati hai.

### How
1. Underpaid profile pe Scenarios kholo.  
2. P50 card dikhao: “Market median tak kitna annual cost.”  
3. Slider se +12% / +15% try karke risk badge change dikhao.  
4. Agar already above P75 ho → page bolta hai scenarios underpay-closing pe focus karte hain.  
5. Line: *“Ye annual cash/TC increment estimate hai selected metric mein.”*

---

## 7. Page: Portfolio (Team risk board)

**Nav:** Portfolio · *Team risk board*

### What
Multiple people ka **risk board** (browser localStorage pe save).

Controls:
- **Add current Desk profile** — Desk wala person portfolio mein  
- **Export CSV** — HRBP / finance handoff  

Summary tiles:
- People count  
- High / critical count  
- Underpaid count  
- Σ remediation to P50 (total annual gap money)

Table columns:
Label · Slice · Pay · P50 · Gap/verdict · Risk · Open / Remove

**Open** → us person ko Desk pe load karta hai.

### Why
Ek bande se aage — manager team / critical talent cohort dekhna chahta hai:

> “Kitne log high risk pe hain? P50 tak total kitna budget chahiye?”

CSV se Comp / Finance meeting ready sheet milti hai.

### How
1. Desk pe Person A set → Add to Portfolio.  
2. Person B (alag pay / level) → Add.  
3. Summary tiles dikhao (critical + Σ to P50).  
4. Export CSV download.  
5. Bolo: *“Data is browser pe local — abhi server HRIS sync nahi hai.”*

---

## 8. Page: Evidence (Source rows ledger)

**Nav:** Evidence · *Source rows*

### What
Matched market ka **row-level ledger** (audit / trust).

Features:
- Search (source, role, city, industry)  
- Checkbox: **Only observations above my pay**  
- Virtualized long list (fast even with thousands of US LCA rows)  
- Click row → detail panel: source, type, industry, experience, pay type, confidence, Salary INR, PPP INR, source URL, notes  
- **Export slice CSV**

### Why
Skeptical manager / auditor poochta hai:

> “Ye P50 kis rows se bana? Source URL / notes dikhao.”

Yahan tool **black box** nahi rehta — evidence open hai.

### How
1. Desk match ke baad Evidence.  
2. “Above my pay” on karke pull candidates dikhao.  
3. Ek row select → source URL / notes.  
4. CSV export for offline review.  
5. Line: *“Har row ek published observation hai — employee headcount nahi.”*

---

## 9. Page: Method (Trust & caveats)

**Nav:** Method · *How to trust it*

### What
Product education + trust page (no live calc).

Covers:
1. Business questions answered (under/over, flight risk, to whom, what to do)  
2. Matching rules (progressive relax + directional n &lt; 30)  
3. FX & PPP explanation  
4. What this is **not**:  
   - Not people DB / HRIS  
   - Not guarantee of a specific company offer  
   - Not legal equal-pay advice  
   - US LCA = employer-location filings, not headcount  

Observation disclaimer repeated.

### Why
Manager / compliance / stakeholders ko **boundaries** clear karni hoti hain pehle hi — over-claim avoid.

### How
Demo ke end mein 1 minute Method dikhao:

> “Tool powerful hai, lekin hum clearly bolte hain — directional aid, published market, resignation prediction nahi.”

Isse trust badhta hai, hype kam.

---

## 10. Cross-cutting concepts (sab pages pe apply)

### A. Matching engine (kaise “like-for-like” banta hai?)
**Order of preference:**
1. Exact: country + role family + experience + pay type (+ city + title if set)  
2. Agar n thin → **city relax**  
3. → **role title relax**  
4. → include **All Levels (unspecified)**  
5. → last: family × country × pay type only  

Desk pe **Match notes** isliye dikhte hain — transparency.

### B. Gap & verdict
- Band = quantiles of matched `Salary_INR` (ya PPP-corrected)  
- Headline gap = vs **P50**  
- Verdict band = **±8%** of P50  

### C. Flight risk score (high level)
Inputs blend:
- Gap vs P50 %  
- Percentile rank among observations  
- % of observations paying more than you  
- Thin sample penalty (directional)

Output: 0–100 + tier label + human-readable reasons.

### D. FX ₹ vs PPP ₹
| Mode | Simple meaning |
|------|----------------|
| FX ₹ | Cash / nominal INR (study FX) |
| PPP ₹ | Purchasing-power view (cross-border fairness) |

### E. Pay types
| Type | Use when |
|------|----------|
| Base salary | Fixed cash compare |
| Total compensation | Base + bonus + equity style packages (e.g. Levels.fyi) |
| Mixed | Only jab deliberately mix allowed |

**Manager tip:** Base vs TC mix mat karo bina bataye — apples-to-oranges ho jata hai.

### F. Data grain reminder
- Grain = **LCA_Filing** (microdata) + **Market_Band** (pre-aggregated benchmarks)
- Source: `deliverables/analytics_ready/AI_Talent_Benchmark_CLEANED.csv` + `AI_Talent_Benchmark_MARKET_BANDS.csv`
- US base wage only (`Pay_Type=Base`, `LCA_Offered_Base_Wage`) — not total compensation  
- Not employee roster  
- Risk = decision aid, not resignation probability model  

---

## 11. Suggested 8–10 minute manager demo script (Hinglish)

1. **Opening (30s)**  
   *“Boss, ye PayRisk Desk hai — jo hum kisi AI/DS talent ko de rahe hain, uska market gap aur poach pressure turant dikhata hai.”*

2. **Desk (2 min)**  
   India DS Mid, ₹18L → Your pay, P50, Gap, Verdict, Risk.  
   Agar directional flag aaye → transparently mention.

3. **Gap Lab (1.5 min)**  
   Ladder + histogram + source-wise under/over.  
   *“Median akela nahi — full band dikh raha hai.”*

4. **Flight Risk (1.5 min)**  
   Score, reasons, cash to P50, hottest sources.

5. **Who Pulls (1.5 min)**  
   Cities / industries / source league.  
   *“Confirmed offer list nahi — published pull signals.”*

6. **Scenarios (1 min)**  
   P50 raise cost + slider se risk drop.

7. **Portfolio (45s)**  
   2–3 people add → Σ remediation + CSV.

8. **Evidence + Method (45s)**  
   Row proof + “what this is not.”  
   *“Audit-ready aur honest boundaries.”*

9. **Close**  
   *“Use cases: offer calibration, retention risk scan, talent review pack, finance remediation estimate.”*

---

## 12. Page-wise one-liner cheat sheet (print / slide)

| Page | One-liner (EN) | One-liner (Hinglish) |
|------|----------------|----------------------|
| **Desk** | Enter pay → instant under/over + risk | Package daalo → turant gap + risk |
| **Gap Lab** | Full P10–P90 + source breakdown | Ladder + histogram + source-wise gap |
| **Flight Risk** | 0–100 leave-pressure score | Kitna leave pressure (directional) |
| **Who Pulls** | Cities / industries / sources paying more | Kis taraf zyada pay dikh raha hai |
| **Scenarios** | Cost to close gap; new risk | Kitna badhao, risk kaise girega |
| **Portfolio** | Multi-person risk + CSV | Team board + finance export |
| **Evidence** | Row-level source ledger | Proof / audit rows |
| **Method** | Trust, matching, caveats | Kaise trust karein / kya nahi hai |

---

## 13. FAQs managers usually ask

**Q1. Ye accurate attrition prediction hai?**  
**A:** Nahi. Pay-pressure **decision aid** hai. Tenure, performance, manager quality, offers history abhi model mein nahi.

**Q2. India numbers kabhi thin kyun?**  
**A:** Dataset US LCA-heavy hai; India published rows kam. Tool **directional** flag karta hai jab n &lt; 30.

**Q3. “Who Pulls” pe company name hamesha kyun nahi?**  
**A:** Kayi rows guides / LCA aggregates hain. Levels.fyi company-specific aur kuch industry fields pe naam milta hai; baaki city/source signals.

**Q4. Base vs TC?**  
**A:** Same pay type se compare karo. TC pe Big Tech Levels rows naturally high dikhengi.

**Q5. Data live HRIS se sync?**  
**A:** Abhi offline published benchmark JSON (ingest from CSV). Portfolio browser localStorage pe.

**Q6. Legal equal-pay guarantee?**  
**A:** Method page clearly kehta hai — legal advice nahi.

---

## 14. Known limitations (honest showcase — trust ke liye)

Manager ke saamne ye bolna **plus** hai, minus nahi:

1. India mid slices often **thin / directional**.  
2. Progressive match mein **All Levels** rows P50 shift kar sakti hain.  
3. Duplicate-style India benchmark rows data hygiene se clean kiye ja sakte hain (product improvement).  
4. US Mid often **LCA-dominated** — “to whom” cities strong, named employers limited.  
5. Risk score correlated inputs se kabhi **0 ya 100** pe saturate ho sakta hai.  
6. Bundle client-side — large observation set browser mein load hota hai.

**Improvement direction (agar poochein):**  
data dedupe · employer naming · confidence-aware verdict · more India city depth · unit tests on match/risk.

---

## 15. Quick value map vs business use case

| Business need | Tool answer location | Completeness |
|---------------|----------------------|--------------|
| Under / over by how much? | Desk + Gap Lab | Strong |
| Risk of losing them? | Flight Risk | Directional / strong framing |
| To whom? | Who Pulls (+ Evidence) | Partial → signals, not always named firms |
| What should we pay to fix? | Scenarios | Strong |
| Team view + export | Portfolio | Strong |
| Trust / audit | Evidence + Method | Strong |

---

## 16. Closing line for manager

**English:**  
“PayRisk Desk turns published AI compensation observations into a live under/over-pay, flight-risk, and pull-destination desk — so talent and finance can decide faster, with evidence and clear caveats.”

**Hinglish:**  
“PayRisk Desk published market data ko ek live desk bana deta hai — under/over kitna, leave pressure kitna, aur pull kis taraf — taaki talent aur finance jaldi, evidence ke saath, aur boundaries clear rakh ke decide kar saken.”

---

*Document version: aligned with PayRisk Desk v2.0 app pages (Desk, Gap Lab, Flight Risk, Who Pulls, Scenarios, Portfolio, Evidence, Method) + Top Bar controls.*  
*Location: `ai_salary/apps/comp-intel/MANAGER_SHOWCASE_GUIDE.md`*
