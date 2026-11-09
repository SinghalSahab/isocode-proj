# Deployment and Operations Guide

This guide provides step-by-step instructions for running the application locally with Docker, running without Docker using a free cloud Neon database, deploying to Vercel + Neon serverless, verifying test suites, and performing the 5-minute hiring assessment reviewer walkthrough.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended, tested on Node v22.20.0)
- **npm**: `v10.x` or `v11.x`
- **Docker & Docker Compose**: For local PostgreSQL 16 container (optional if using Neon dev branch)
- **Git**: For version control

---

## 2. Local Setup and Running (Step-by-Step)

### Option A: Local Run with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <<GITHUB_URL>>
   cd company-a-distributor-ordering
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(Note: `prisma generate` runs automatically via the `postinstall` script).*

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(The default `.env.example` points to the local Docker Postgres container).*

4. **Start local PostgreSQL container:**
   ```bash
   npm run db:up
   ```
   *Starts Postgres 16 on port 5432 with credentials defined in `docker-compose.yml`.*

5. **Apply database migrations and populate seed data:**
   ```bash
   npm run db:reset
   ```
   *Runs `prisma migrate reset --force`, applying all migrations in `prisma/migrations` and executing `prisma/seed.ts` idempotently.*

6. **Start local development server:**
   ```bash
   npm run dev
   ```
   *Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

### Option B: Local Run without Docker (Using Free Neon Dev Branch)

If Docker is unavailable on your machine:
1. Create a free account at [https://neon.tech](https://neon.tech).
2. Create a project named `fmcg-distributor` and create a dedicated dev branch (e.g. `dev-local`).
3. Copy the **Pooled connection string** (host contains `-pooler`) into `DATABASE_URL` in `.env`.
4. Copy the **Direct connection string** (non-pooled) into `DIRECT_URL` in `.env`.
5. Run migrations and seed against your Neon branch:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
6. Start dev server: `npm run dev`.

---

## 3. Running Verification, Tests, and Builds

### Run Pure-Logic Unit Tests (No Database, No API Key Required)
Executes scheme engine, integer paise math, Tally generator, state machine, and Hinglish capture parser tests:
```bash
npm run test:unit
```
*Expected: 65 passed tests across 9 test files in under 2 seconds.*

### Run Database Integration Tests (Requires Local Postgres, NEVER Neon)
Executes concurrency, atomic stock decrement, and safety guard tests:
```bash
npm run test:db
```
*Expected: 2 passed tests across 1 file. Includes a guard that immediately aborts if `TEST_DATABASE_URL` contains `neon.tech`.*

### Run All Tests (Hermetic Unit + DB Safety Guard)
```bash
npm run test:all
```
*Expected: 67 passed tests across 10 test files.* (`npm test` runs all 65 unit tests).

### Run TypeScript Strict Typecheck
```bash
npm run typecheck
```
*Expected: 0 errors.*

### Run Production Build
```bash
npm run build
```
*Expected: Generates optimized static assets with retailer first load JS of 113 KB.*

---

## 4. Production Deployment: Vercel + Neon Serverless

### Architecture Summary
- **Hosting**: Vercel (Next.js 14 App Router, Edge/Serverless Functions)
- **Database**: Neon Serverless PostgreSQL with pgBouncer pooling
- **AI Integration**: Google Gemini 2.0 Flash (server-side only, with rule-based fallback)

### Step-by-Step Production Deployment

1. **Provision Neon Database:**
   - In Neon console, create a production project.
   - Neon provides two connection strings:
     - **Pooled connection string** (contains `-pooler.neon.tech`): Copy to `DATABASE_URL`.
     - **Direct connection string** (direct compute endpoint): Copy to `DIRECT_URL`.

2. **Deploy Database Schema & Seed to Neon:**
   From your local development machine (or deployment CI pipeline):
   ```bash
   DIRECT_URL="postgresql://user:pass@ep-direct.neon.tech/neondb" DATABASE_URL="postgresql://user:pass@ep-pooler.neon.tech/neondb" npx prisma migrate deploy
   DIRECT_URL="postgresql://user:pass@ep-direct.neon.tech/neondb" DATABASE_URL="postgresql://user:pass@ep-pooler.neon.tech/neondb" npm run db:seed
   ```
   > **CAUTION:** NEVER run `npm run db:reset` against a production database! `prisma migrate reset` drops tables. Use `prisma migrate deploy` only.

3. **Deploy to Vercel:**
   - Connect the GitHub repository to Vercel.
   - Configure Build Command: `npm run build` (runs `prisma generate && next build`).
   - Configure Environment Variables in Vercel Project Settings:
     - `DATABASE_URL`: Your Neon Pooled connection string.
     - `DIRECT_URL`: Your Neon Direct connection string.
     - `SESSION_SECRET`: A 32+ character random secret string for JWT signing.
     - `DEMO_OTP`: `123456`
     - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key.
     - `GEMINI_MODEL`: `gemini-2.0-flash`

4. **Verify Live Deployment:**
   - Open the production Vercel URL.
   - Walk through the reviewer script below.

---

## 5. Environment Variables Reference

| Variable Name | Required | Purpose | Example Format |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Primary runtime database connection string. On Neon, must use the POOLED connection string (host contains `-pooler`). On local Docker, points to port 5432. | `postgresql://user:pass@ep-pooler.region.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | **Yes** | Direct (non-pooled) database connection string required by Prisma Migrate for schema migrations. | `postgresql://user:pass@ep-direct.region.aws.neon.tech/neondb?sslmode=require` |
| `TEST_DATABASE_URL` | **Optional** | Can be omitted/skipped entirely. Only needed if running `npm run test:db` against a separate local test container. Protected by safety guard against `neon.tech`. | `postgresql://postgres:postgres@localhost:5432/fmcg_distributor_test?schema=public` |
| `SESSION_SECRET` | **Yes** | Secret cryptographic key used by `jose` to sign and verify session JWTs. Must be min 32 chars in production. | `random-32-char-cryptographic-salt-key-here` |
| `DEMO_OTP` | **Yes** | Fixed demo OTP accepted for all seeded demo accounts (`123456`). Hidden from the on-screen UI for realistic review experience. | `123456` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI order capture. If omitted or offline, pipeline falls back to rule matcher transparently. | `AIzaSy...` |
| `GEMINI_MODEL` | Optional | Gemini model name. Defaults to `gemini-2.0-flash`. | `gemini-2.0-flash` |

---

## 6. Reviewer Demo Accounts & 5-Minute Walkthrough Script

> [!IMPORTANT]
> ### Demo Credentials Summary
> - **Demo OTP for all accounts:** `123456` (Hidden from the UI banner for realistic authentication flow; enter `123456` when prompted).
> - **Test Database:** Can be skipped entirely (`npm run test` runs all 65 unit tests hermetically with zero database).

### Demo Accounts Table

| Role | Shop / User Name | Phone Number | OTP Code | What this Account Demonstrates |
|---|---|---|---|---|
| **Retailer (Standard)** | Gupta Kirana Store | `90000 00001` | `123456` | Standard retailer ordering with active schemes and historical repeat orders. |
| **Retailer (Hold Demo)** | Sharma Provision Store | `90000 00002` | `123456` | **Near Credit Limit Demo**: Available credit is only ₹2,500. Placing any normal order triggers **CREDIT_HOLD**! |
| **Retailer (Override Demo)** | Mahalaxmi Super Mart | `90000 00003` | `123456` | **Per-Retailer Price Override**: Glucose biscuit 75g shows ₹7.80/piece instead of ₹8.10. |
| **Retailer (Dormant Demo)** | Verma Daily Needs | `90000 00004` | `123456` | **14-Day Inactivity**: Last ordered 22 days ago; appears on desk inactive dashboard. |
| **Desk Staff** | Amit Deshmukh | `90000 00010` | `123456` | Full desk portal: Order Queue, Credit Release, Approvals, Tally Export. |
| **Desk Staff** | Neha Jain | `90000 00011` | `123456` | Secondary desk staff account. |

---

### 5-Minute Hiring Assessment Reviewer Walkthrough Script

Follow these 7 steps to evaluate the end-to-end functionality in ~5 minutes:

#### Step 1: Log In as Retailer & Inspect Catalogue Schemes
1. Go to `/login`.
2. Notice the demo mode banner: *"Demo Mode: Verification active for registered test accounts"*. (The OTP is deliberately hidden on screen).
3. Click the quick demo button for **Gupta Kirana** (`90000 00001`), enter OTP `123456`, and tap **Verify & Login**.
4. You arrive at `/catalogue`. Notice the clean layout, Hindi/English toggle in header, credit strip (Available: ₹85,000 / Limit: ₹1,00,000), search bar, and brand chips.

#### Step 2: Verify Scheme Engine Free Goods Tier
1. Find **Glucose biscuit 75 g, case of 96** (Dealer Price: ₹8.10/piece, ₹777.60/case excl. GST).
2. Set quantity to **10 cases** using the stepper and tap **Add**.
3. Tap **View Cart** on the bottom floating bar.
4. In Cart, verify the scheme engine result:
   - Green badge: *"1 free case added! (Total dispatch: 11 cases)"*.
   - Gross is billed for 10 cases only (`₹7,776.00`). No GST is charged on the free case (Assumption A4).

#### Step 3: Verify Slab Discount & Scheme Nudge Hint
1. In Cart or Catalogue, add **Detergent powder 1 kg, case of 20** (`₹2,030.00/case`).
2. Set quantity to **4 cases**: Notice the amber nudge hint: *"Add 1 more case to get 3% off!"*.
3. Increment stepper to **5 cases**:
   - The 3% slab discount applies to the entire line gross (`5 × ₹2,030.00 = ₹10,150.00`).
   - Discount: `₹304.50`. Net: `₹9,845.50`.
   - Total updates live with exact GST and Indian digit grouping.

#### Step 4: Verify Out-of-Stock Item Guard
1. Return to `/catalogue` and locate **Tea leaf 250 g, case of 40**.
2. Notice the red badge: **Out of Stock** (0 cases).
3. The Add button is disabled with an explanatory tooltip. Out of stock items cannot be ordered, directly preventing post-order line cuts.

#### Step 5: Test AI Order Capture from Raw WhatsApp Message
1. Tap **Order by Message** (`/capture`) in the bottom navigation.
2. Click **Paste Sample WhatsApp Message**:
   `"bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti"`
3. Tap **Convert to Order** (loading spinner: *"Reading your message..."*).
4. Review screen opens:
   - Line 1: Matched to `SKU-BS-075` (5 cases Glucose biscuit) with High confidence.
   - Line 2: Matched to `SKU-DT-1KG` (2 cases Detergent 1kg) with High confidence.
   - Line 3: Matched to `SKU-TE-250` (1 case Tea leaf), flagged as **Out of stock**.
5. Remove the out of stock tea line or tap an alternative. Tap **Confirm Order**.
6. The order is placed through server-side `placeOrder` with `source = 'ai_text'`. Redirects to `/orders` with success banner!

#### Step 6: Log In as Order Desk & Approve / Release Hold
1. Tap Logout in the header and log in as **Amit Deshmukh (Desk Team)** (`90000 00010`, OTP `123456`).
2. Desk lands on `/desk`. Inspect the KPI cards (Today's orders, Credit Holds, AI accuracy %, App/AI share %).
3. In the queue, tap **Review** on the AI order or any pending order.
4. On `/desk/[id]`:
   - Inspect the captured original words chip and credit gauge.
   - Tap **Approve & Decrement Stock**: The atomic Prisma transaction executes, verifies warehouse stock, decrements inventory, and updates status to `CONFIRMED`.

#### Step 7: Export Confirmed Orders to Tally XML
1. Navigate to **Tally Export** (`/desk/export`).
2. The confirmed orders appear in the export queue. Select orders using the checkboxes.
3. Choose **XML (Tally)** or **CSV** and click **Export Orders**.
4. The file `TALLY_EXPORT_YYYYMMDD.xml` downloads immediately to your machine. Open it to inspect well-formed Sales Order vouchers with exact paisa totals and zero-rated bonus goods!

---

## 7. Troubleshooting & Common Operational Issues

### 1. `Error: Could not find Prisma Schema` or `Prisma Client not generated`
- **Cause**: Prisma Client needs to be generated after fresh clone.
- **Fix**: Run `npx prisma generate` or `npm run build`.

### 2. `CRITICAL_SAFETY_VIOLATION: TEST_DATABASE_URL points to a neon.tech host`
- **Cause**: Automated database tests attempted to connect to a cloud Neon database.
- **Fix**: Tests are strictly prohibited from touching production. Set `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fmcg_distributor_test?schema=public"` and run `npm run db:up`.

### 3. Neon Free-Tier Cold Starts
- **Cause**: Neon free compute branches suspend after 5 minutes of inactivity. The first query after wake-up can incur a 1–2 second delay.
- **Fix**: The application uses connection pooling via pgBouncer (`-pooler`). Ensure `DATABASE_URL` uses the pooled endpoint (contains `-pooler.neon.tech`). Once the compute branch resumes, subsequent queries execute in single-digit milliseconds.

### 4. Docker Port 5432 Already in Use
- **Cause**: A local PostgreSQL service is already bound to port 5432.
- **Fix**: Stop the local postgres service (`brew services stop postgresql` or `sudo service postgresql stop`) or change the host port mapping in `docker-compose.yml` to `"5433:5432"` and update `.env`.

### 5. AI Capture Shows "AI service unavailable, matched using rules"
- **Cause**: `GEMINI_API_KEY` is not set or Google Gemini is offline/timing out.
- **Behavior**: This is the intended graceful fallback! The deterministic rule matcher parsed the message cleanly. No action required unless testing live LLM tokens.
