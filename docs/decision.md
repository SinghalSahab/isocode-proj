# Architecture Decisions and Assumptions Log

This document records all explicit assumptions (Part A: A1–A19) and architectural decisions (Part B: D1–D20) made for Company A's FMCG Distributor Retailer Ordering App with AI Order Capture.

---

## Part A: Labelled Assumptions

### A1 (A-PRICE-UNIT): Dealer Price is Interpreted as Per-Piece, Not Per-Case
- **Statement:** The "Dealer Price ₹" in the brief (e.g. ₹8.10 for Glucose biscuit, ₹101.50 for Detergent, ₹118.00 for Tea leaf) represents the price per individual piece. Case price equals piece price multiplied by pieces per case.
- **Why Needed:** The brief provides SKU names like "Glucose biscuit 75 g, case of 96" with Dealer Price "8.10". If ₹8.10 were the price per 96-piece case, an entire case of 96 biscuits would cost ₹8.10 (< 9 paise/pack), which is commercially impossible and contradicts the ₹5,000 average order value across 600 daily orders.
- **Alternatives Considered:** Interpreting ₹8.10 as case price (rejected: nonsensical unit economics).
- **Impact if Wrong:** If the supplier provides case prices directly, line gross amounts would be 20x–96x too high.
- **How to Change:** Update the calculation in `lib/money/units.ts` to treat dealer price as direct case price or introduce a configurable `pricing_unit` field on `skus`.

### A2 (A-GST-EXCL): Catalogue and Wholesale Prices Exclude GST
- **Statement:** Stated dealer prices are strictly exclusive of Goods and Services Tax (GST).
- **Why Needed:** In Indian FMCG wholesale distribution, B2B catalogue dealer prices are traditionally quoted net of GST; statutory GST is computed at invoicing.
- **Alternatives Considered:** Treat dealer prices as inclusive of GST (rejected: hampers GST slab breakdown and Tally export compliance).
- **Impact if Wrong:** Net retailer invoicing would vary by 5% to 18%.
- **How to Change:** Adjust price breakdown logic to back out GST from gross instead of adding on top.

### A3 (A-GST-RATES): Illustrative GST Rates in Basis Points
- **Statement:** Standard statutory GST rates are assumed as: Biscuits: 18% (1800 bp), Detergent powder: 18% (1800 bp), Tea leaf: 5% (500 bp).
- **Why Needed:** The client brief does not specify statutory HSN codes or GST rates.
- **Alternatives Considered:** Flat 18% across all goods (rejected: tea leaf is historically taxed at 5% concessional FMCG rate).
- **Impact if Wrong:** Minor rate differences for invoice preview; Tally exports map to actual ledger tax rates.
- **How to Change:** Update `gst_rate_bp` in `skus` table via migration or admin update.

### A4 (A-GST-FREE-GOODS): Free Goods Attract Zero Statutory GST on Dealer Invoice
- **Statement:** Bonus goods delivered under promotional schemes (e.g., Buy 10 Get 1 Free) are invoiced with zero rate and zero taxable amount for the free quantity.
- **Why Needed:** FMCG quantity discount conventions in India treat bonus packs on the same tax invoice as non-taxable trade discounts.
- **Alternatives Considered:** Apportion invoice value across total dispatch units (rejected: complicates Tally Sales Order voucher generation).
- **Impact if Wrong:** GST payable would need to be computed on deemed value of bonus goods.
- **How to Change:** In `lib/schemes/engine.ts`, charge GST on `(ordered_qty + free_qty) * case_price` minus discount.

### A5 (A-ROUNDING): Half-Up Paisa Rounding at the Line Level
- **Statement:** Line discounts and GST computations are rounded to the nearest integer paisa using deterministic half-up rounding (`Math.floor(x + 0.5)`).
- **Why Needed:** Integer paise avoid floating point drift across cart, database, and Tally export vouchers.
- **Alternatives Considered:** Bankers rounding (round-to-even) or floor truncation (rejected: standard Indian commercial accounting follows half-up to nearest rupee/paisa).
- **Impact if Wrong:** Potential 1 paisa discrepancy between line items and voucher total.
- **How to Change:** Adjust `roundHalfUp` helper in `lib/money/paise.ts`.

### A6 (A-SCHEME-SCOPE): Schemes Apply Independently Per SKU Line Without Cross-SKU Bundles
- **Statement:** Promotional schemes apply strictly on an individual SKU line. Free goods repeat proportionately (`floor(qty / buyQty) * freeQty`), and slab discounts apply to the entire line gross once the minimum threshold is met.
- **Why Needed:** The brief defines "Buy 10 get 1" and "3% off 5 or more cases" on specific SKU lines; no combo or multi-brand basket rules were specified.
- **Alternatives Considered:** Slabs applying only to marginal units beyond threshold (rejected: Indian FMCG distributors apply slab trade discounts to the full invoice line).
- **Impact if Wrong:** Over-discounting or under-discounting on complex bundled promotions.
- **How to Change:** Extend `lib/schemes/engine.ts` with cross-line basket evaluators.

### A7 (A-STRAY-TWO): Truncation of Stray "2" in Sample Order Message
- **Statement:** The sample message `"bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti 2"` has a stray trailing "2" which belongs to the next section heading in the prompt. The message is parsed as ending at "1 peti".
- **Why Needed:** Explicitly noted in the client brief: "Treat the message as ending at '1 peti'. Record this as an assumption."
- **Alternatives Considered:** Treating the trailing "2" as 2 unassociated units (rejected: brief instruction).
- **Impact if Wrong:** Would create an unwanted unmatched line or invalid quantity.
- **How to Change:** Not required; follows explicit client instruction.

### A8 (A-MOCK-SMS): Mocked SMS Gateway with Fixed Demo OTP
- **Statement:** Mobile OTP verification uses a mocked SMS delivery pipeline. Fixed demo OTP `123456` is accepted across all seeded reviewer accounts while the on-screen banner indicates active demo mode without revealing the OTP. Internal verification enforces SHA-256 code hashing, 5-minute expiry, and a maximum of 5 attempts.
- **Why Needed:** Cloud SMS gateways (e.g. MSG91, Twilio, Fast2SMS) require DLT registration and external carrier credentials not suitable for offline evaluation.
- **Alternatives Considered:** External SMS API integration (rejected: requires active API secrets and live SIM numbers).
- **Impact if Wrong:** None for assessment; ready to swap in real SMS transport.
- **How to Change:** Replace mock transport in `lib/auth/sms.ts` with HTTP call to DLT-approved SMS provider.

### A9 (A-OUTSTANDING-CREDIT): Static Seeded Outstanding Balance with New Order Check
- **Statement:** `retailers.outstanding_paise` is initialized with realistic seeded values. When a new order is submitted, the system checks whether `outstanding_paise + order_total_paise > credit_limit_paise`. If exceeded, the order is placed on `CREDIT_HOLD`. Outstanding balance is updated upon order dispatch/delivery.
- **Why Needed:** The brief specifies credit limit checking and credit holds but omits external accounts-receivable ledger sync.
- **Alternatives Considered:** Incrementing outstanding immediately on order placement (rejected: cancelled/rejected orders would improperly consume credit).
- **Impact if Wrong:** Credit utilization could drift from ERP ledger.
- **How to Change:** Hook order confirmation/payment receipts into `outstanding_paise` mutator.

### A10 (A-INVENTED-SEED): Invented Fictional Sample Catalog, Brands, and Retailers
- **Statement:** Fictional SKUs, brands, and Jabalpur kirana shops are added to complement the 3 required sample items to provide realistic ambiguity for search, scheme tiers, and AI capture. All phone numbers use obviously fake patterns (e.g., `90000 00001`–`90000 00008`).
- **Why Needed:** Testing search ambiguity, low stock warnings, and retailer isolation requires a multi-brand catalog and multiple retailer profiles.
- **Alternatives Considered:** Using only the 3 sample items (rejected: fails to test realistic candidate disambiguation and 14-day inactivity).
- **Impact if Wrong:** None; seeded data is strictly fictional.
- **How to Change:** Update `prisma/seed.ts`.

### A11 (A-TALLY-SCHEMA): Tally XML Standard Sales Order Voucher Structure
- **Statement:** Tally export produces standard Tally.ERP9 / Tally Prime compatible XML (`<ENVELOPE><BODY><DATA><TALLYMESSAGE><VOUCHER VCHTYPE="Sales Order">...`) alongside a clean RFC 4180 CSV export.
- **Why Needed:** The exact XML DTD for Company A's specific Tally ledger names was not provided.
- **Alternatives Considered:** Proprietary intermediate JSON format (rejected: Tally requires XML or CSV).
- **Impact if Wrong:** Accountant might need custom TDL ledger mapping.
- **How to Change:** Edit XML template builder in `lib/tally/export.ts`.

### A12 (A-OOS-POLICY): Out-of-Stock Policy Rejects Ordering with Clear Reason
- **Statement:** If an item has 0 stock cases (e.g., Tea leaf 250 g), it cannot be added to cart. If present in an AI capture draft, it is flagged as "Out of stock. Can't be added" and must be removed or swapped before order confirmation. Backorders are not accepted.
- **Why Needed:** The brief explicitly states that post-order stockouts lose ₹5.4 lakh/year and salesmen cut lines later. Real-time prevention is the core value proposition.
- **Alternatives Considered:** Allowing backorders (rejected: directly causes the post-order line cut problem).
- **Impact if Wrong:** Retailers cannot place forward orders for arriving shipments.
- **How to Change:** Add an `ALLOW_BACKORDERS` flag in retailer settings.

### A13 (A-CASE-ONLY): Wholesale Ordering is Whole-Cases Only
- **Statement:** Retailers order whole cases only. If AI detects piece mentions (e.g. "nag", "packet"), the user is asked whether they meant cases or pieces. Pieces are only accepted if divisible into whole cases; loose piece sales are rejected.
- **Why Needed:** Distributor operations pack and ship full cartons/cases to kirana stores.
- **Alternatives Considered:** Splitting cases into loose pieces (rejected: distributor warehouse does not pick loose units in core flow).
- **Impact if Wrong:** Small retailers who buy loose pieces cannot order directly.
- **How to Change:** Add broken-case surcharge and broken-case inventory tracking.

### A14 (A-HINDI-UNREVIEWED): Hindi Devanagari Copy Requires Native Speaker Review Before Production
- **Statement:** User-facing Hindi copy uses natural Devanagari phrasing for shopkeepers, but is flagged as developer-authored and subject to formal commercial review before deployment.
- **Why Needed:** High quality software engineering requires honest disclaimers regarding unverified localized marketing copy.
- **Alternatives Considered:** English only (rejected: brief specifies Hindi and English toggle).
- **Impact if Wrong:** Minor phrasing awkwardness for specific regional Jabalpur dialects.
- **How to Change:** Update `lib/i18n/hi.json` after distributor field testing.

### A15 (A-INACTIVE-14D): 14-Day Inactivity Measured from Current Date Against Last Confirmed Order
- **Statement:** Retailers with no confirmed or pending order placed within the trailing 14 calendar days are classified as inactive on the desk dashboard.
- **Why Needed:** The brief specifies a "Dashboard of retailers with no order in 14 days".
- **Alternatives Considered:** Measuring from registration date (rejected: newly registered stores would immediately flag as dormant).
- **Impact if Wrong:** Inactive store list count could shift.
- **How to Change:** Adjust threshold in `lib/orders/desk.ts`.

### A16 (A-CONFIDENCE-THRESHOLDS): Calibrated AI Match Confidence Thresholds
- **Statement:** Match confidence is assigned deterministically by the server: High (>= 0.85), Medium (0.60–0.84), Low (< 0.60). A 0.15 boost is applied for exact retailer aliases, and a 0.10 penalty is applied when the top two candidates are within 0.10 score margin.
- **Why Needed:** LLMs exhibit inconsistent self-reported confidence; deterministic server calibration prevents false positives.
- **Alternatives Considered:** Relying entirely on raw LLM self-assessment (rejected: prone to overconfidence).
- **Impact if Wrong:** Lines might be misclassified between High and Medium review states.
- **How to Change:** Adjust threshold constants in `lib/capture/confidence.ts`.

### A17 (A-SINGLE-DESK-ROLE): Unified Order Desk Role for Review, Holds, and Exports
- **Statement:** The office team of order desk staff operates under the `desk` role, granting permissions to review, hold, approve, edit, and export orders.
- **Why Needed:** The brief describes an "office team of 6" managing incoming orders; separate sub-roles are not specified.
- **Alternatives Considered:** Granular roles for credit manager vs order entry (rejected: unnecessary complexity for a 6-person office team).
- **Impact if Wrong:** No separation of duties between credit release and export.
- **How to Change:** Introduce RBAC permissions in session claims.

### A18 (A-SALESMAN-MODEL-ONLY): Salesman Role Preserved in Schema but Excluded from UI Scope
- **Statement:** `salesman` exists as a user role enum and `retailers.salesman_user_id` foreign key in the database, but salesman-specific offline UI is out of scope (P2 cut).
- **Why Needed:** The brief specifies offline salesman mode is cut from core build, but data integrity requires storing the relationship.
- **Impact if Wrong:** None.
- **How to Change:** Build dedicated `/salesman` PWA views in future releases.

### A19 (A-TIMEZONE): Asia/Kolkata (IST, UTC+05:30) Standard Time for Sequences and Daily Cutoffs
- **Statement:** Sequential daily order numbers (e.g. `ORD-20261109-0001`) and order timestamps use Asia/Kolkata date boundaries.
- **Why Needed:** Company A operates in Jabalpur, Madhya Pradesh. UTC midnight roll-overs would split afternoon orders across different date numbers.
- **Impact if Wrong:** Sequence counters would roll over at 05:30 AM local time instead of midnight.
- **How to Change:** Modify timezone offset in `lib/orders/counter.ts`.

---

## Part B: Architectural and Design Decisions

- **D1 (Stack):** Next.js 14 App Router, TypeScript (strict), Tailwind CSS. React Server Components minimize clientside bundle on slow 3G networks.
- **D2 (Database Architecture):** PostgreSQL (Neon Serverless for production, Docker for local/tests). Connection pooling via Neon Pooled URL (`DATABASE_URL`), direct URL for migrations (`DIRECT_URL`).
- **D3 (Prisma ORM):** Prisma Client with global singleton pattern to prevent serverless connection exhaustion. Strict snake_case mapping for tables/columns and PascalCase models.
- **D4 (Local Postgres & Docker):** `docker-compose.yml` runs Postgres 16 on port 5432 with isolated test database `fmcg_distributor_test` for hermetic testing.
- **D5 (Pure Scheme Engine):** `lib/schemes/engine.ts` is completely pure, framework-free, and has zero database dependencies. All values in integer paise.
- **D6 (Server Re-Pricing):** Client cart state is strictly an advisory request. The server recalculates all prices, schemes, GST, and totals upon order placement.
- **D7 (AI Provider Abstraction):** `CaptureProvider` interface with Google Gemini implementation and a high-performance deterministic Hinglish `RuleBasedProvider` fallback.
- **D8 (Deterministic Money):** AI models NEVER calculate prices, discounts, taxes, or credit limits. AI only maps messy text to SKU candidates and whole-case quantities.
- **D9 (Server-Assigned Confidence):** Confidence levels (High, Medium, Low) are assigned by server logic using alias history, token similarity, and ambiguity penalties.
- **D10 (Unit Ambiguity Guard):** Unclear units (e.g. piece vs case) trigger an explicit interactive prompt. The system never guesses units.
- **D11 (Per-Retailer Alias Learning):** Desk corrections and review-time SKU swaps automatically upsert `retailer_aliases` for that specific retailer.
- **D12 (Immutable Line Snapshots):** Order lines store full snapshots of price, scheme, and GST at order confirmation time to insulate historical records from future catalog changes.
- **D13 (Client Idempotency Keys):** Order submission requires a client-generated UUID idempotency key to prevent double-tap submissions on flaky 3G connections.
- **D14 (Atomic Stock Decrement):** Stock decrement on order confirmation runs in a Prisma interactive transaction using atomic conditional updates to prevent overselling.
- **D15 (Atomic Daily Order Counter):** Sequential order numbers are generated via an atomic upsert on the `order_counters` table.
- **D16 (Order State Machine):** Strict unidirectional state transitions: `DRAFT` -> `PENDING_REVIEW` | `CREDIT_HOLD` -> `CONFIRMED` | `REJECTED` -> `EXPORTED`.
- **D17 (Zero-Network SVG Pack Imagery):** Clean, lightweight inline SVG product pack illustrations (< 3 KB) eliminate external image CDN latency on 3G.
- **D18 (Lightweight In-House i18n):** Zero-dependency JSON dictionary supporting real-time toggling between English and Hindi.
- **D19 (Scope Boundary):** Voice capture, camera vision, and salesman offline sync are cleanly documented as cut (P2) without dead buttons or fake mock endpoints.
- **D20 (Test-First Build Flow):** Pure logic (schemes, money, capture, Tally) is verified via offline unit tests before building database or UI layers.

