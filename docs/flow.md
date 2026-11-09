# System Workflows and Sequence Flows

This document details the sequence diagrams, state transitions, and user flow architectures implemented for Company A's FMCG Distributor Retailer Ordering App with AI Order Capture.

---

## 1. System Overview Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients (Shopkeepers on 3G Phones & Desk Staff)"]
        R_UI["Retailer Mobile App (PWA 360px)"]
        D_UI["Desk Office Portal (Desktop/Tablet)"]
    end

    subgraph Edge["Edge / App Router (Next.js 14)"]
        MW["Middleware (Auth & Role Guard)"]
        RSC["React Server Components"]
        API["Route Handlers & Server Actions"]
    end

    subgraph PureLogic["Deterministic Pure Business Logic (Zero DB)"]
        SE["Scheme Engine (lib/schemes/engine.ts)"]
        MH["Money & Paisa Helpers (lib/money/paise.ts)"]
        SM["Order State Machine (lib/orders/state-machine.ts)"]
        TG["Tally XML/CSV Generator (lib/tally/export.ts)"]
    end

    subgraph AICapture["AI Order Capture Pipeline"]
        SAN["Input Sanitizer & Guard (lib/capture/sanitizer.ts)"]
        G_AI["Gemini Flash Provider (8s Timeout)"]
        R_AI["Hinglish Rule-Based Matcher (Fallback)"]
        CAL["Confidence Calibration & Hallucination Guard"]
    end

    subgraph DataStore["Data Layer (PostgreSQL / Neon & Prisma)"]
        PRISMA["Prisma Client (Global Singleton)"]
        NEON["Neon Serverless Pooled DB / Local Docker"]
    end

    R_UI --> MW
    D_UI --> MW
    MW --> RSC
    MW --> API

    API --> SE
    API --> SM
    API --> AICapture
    API --> TG

    AICapture --> G_AI
    G_AI -.->|Fail/Timeout/No Key| R_AI
    AICapture --> CAL

    API --> PRISMA
    PRISMA --> NEON
```

---

## 2. Retailer Login (Mock OTP) Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Retailer as Shopkeeper (Mobile)
    participant UI as Login Screen (/login)
    participant AuthAPI as /api/auth/*
    participant DB as Postgres (otp_challenges)
    participant Session as Jose JWT Cookie

    Retailer->>UI: Enters 10-digit mobile number (e.g. 90000 00001)
    UI->>AuthAPI: POST /api/auth/send-otp { phone }
    AuthAPI->>DB: Check user exists & create hashed OTP challenge (SHA-256)
    AuthAPI-->>UI: 200 OK { demoOtp: "123456", expiresAt: 5 mins }
    Note over UI: Banner indicates demo mode active (Fixed OTP: 123456)

    Retailer->>UI: Submits 6-digit OTP
    UI->>AuthAPI: POST /api/auth/verify-otp { phone, code }
    AuthAPI->>DB: Verify hash, expiry & attempt count (< 5)
    AuthAPI->>DB: Mark challenge as consumed (consumedAt)
    AuthAPI->>Session: Sign 7-day session JWT (HS256)
    AuthAPI-->>UI: 200 OK + Set-Cookie fmcg_session (httpOnly, SameSite=Lax)
    UI->>Retailer: Redirect to /catalogue
```

---

## 3. Catalogue -> Cart -> Order Placement (Server Re-Pricing)

```mermaid
sequenceDiagram
    autonumber
    actor Retailer
    participant Catalogue as Catalogue (/catalogue)
    participant Cart as Cart Screen (/cart)
    participant CartAPI as POST /api/cart/price
    participant OrderAPI as POST /api/orders
    participant Engine as Pure Scheme Engine
    participant DB as Postgres (orders, order_lines)

    Retailer->>Catalogue: Selects items & quantities (e.g. 10 biscuit cases)
    Retailer->>Cart: Opens Cart
    Cart->>CartAPI: Sends raw { skuId, qtyCases }
    CartAPI->>Engine: priceCart(lines, priceOverrides)
    Engine-->>CartAPI: Live scheme math (1 free case, discount, GST, total)
    CartAPI-->>Cart: Display line results, hints & credit preview

    Retailer->>Cart: Taps "Place Order" & confirms modal
    Note over Cart: Client generates UUID idempotencyKey
    Cart->>OrderAPI: POST /api/orders { idempotencyKey, lines }
    OrderAPI->>DB: Check idempotencyKey (replay existing if duplicate)
    OrderAPI->>Engine: RE-PRICES authoritatively (ignores client totals)
    OrderAPI->>DB: Check credit limit (outstanding + total > limit?)
    alt Exceeds Credit Limit
        OrderAPI->>DB: Create order status = CREDIT_HOLD + hold_reason
    else Within Credit Limit
        OrderAPI->>DB: Create order status = PENDING_REVIEW
    end
    OrderAPI->>DB: Atomic sequence ORD-YYYYMMDD-XXXX + Line snapshots
    OrderAPI-->>Cart: 200 OK { orderNo, status, totalPaise }
    Cart->>Retailer: Redirect to /orders?placed=ORD-...
```

---

## 4. AI Order Capture Sequence with All Branches

```mermaid
flowchart TD
    Start["Retailer pastes message into /capture (max 1000 chars)"] --> Sanitizer["Sanitize input (lib/capture/sanitizer.ts)<br/>Trim, strip control chars, normalize stray '2'"]
    Sanitizer --> Context["Build context (SKU catalog, retailer aliases, past 5 order SKUs)"]
    Context --> TryGemini{"Has GEMINI_API_KEY?"}

    TryGemini -- Yes --> CallGemini["Call Google Gemini (8s timeout) with structured JSON schema"]
    CallGemini --> GeminiResult{"Gemini call succeeds & validates schema?"}
    GeminiResult -- Yes --> Calibrate["Calibrate confidence & filter hallucinations"]
    GeminiResult -- No (Timeout/Error/Schema Fail) --> Fallback["Transparent fallback to RuleBasedProvider"]

    TryGemini -- No --> Fallback
    Fallback --> Calibrate

    Calibrate --> LineCheck{"For each candidate line:"}
    LineCheck --> UnitCheck{"Unit detected?"}
    UnitCheck -- "piece or unknown" --> UnitClarification["Status: NEEDS_UNIT<br/>UI shows large Case vs Piece prompt"]
    UnitCheck -- "case (peti/carton)" --> StockCheck{"Stock available?"}

    StockCheck -- "Stock > 0" --> ReadyLine["Status: READY<br/>Apply scheme engine price preview"]
    StockCheck -- "Stock == 0 (Tea Leaf)" --> OOSLine["Status: OUT_OF_STOCK<br/>Show out of stock banner & alternative chips"]

    LineCheck -- "No SKU match" --> Unmatched["Status: UNMATCHED<br/>Show catalog picker"]

    UnitClarification --> ReviewScreen["Review Screen (/capture review step)"]
    ReadyLine --> ReviewScreen
    OOSLine --> ReviewScreen
    Unmatched --> ReviewScreen

    ReviewScreen --> CanConfirm{"All lines READY and in stock?"}
    CanConfirm -- No --> BlockConfirm["Confirm button disabled with explicit reason"]
    CanConfirm -- Yes --> AllowConfirm["Confirm button active · Shows live summary"]
    AllowConfirm --> PlaceAIOrder["Order placed with source = 'ai_text' & captureId link"]
```

---

## 5. Order State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: In-memory Cart / AI Capture Review
    DRAFT --> PENDING_REVIEW: Order Placed (Within Credit Limit)
    DRAFT --> CREDIT_HOLD: Order Placed (Exceeds Credit Limit)

    CREDIT_HOLD --> PENDING_REVIEW: Desk releases hold with mandatory note
    CREDIT_HOLD --> CONFIRMED: Desk directly approves with mandatory note
    CREDIT_HOLD --> REJECTED: Desk rejects with mandatory reason

    PENDING_REVIEW --> CONFIRMED: Desk approves (Atomic stock deduction)
    PENDING_REVIEW --> REJECTED: Desk rejects with mandatory reason
    PENDING_REVIEW --> CREDIT_HOLD: Secondary credit re-evaluation

    CONFIRMED --> EXPORTED: Included in Tally XML/CSV export batch
    CONFIRMED --> REJECTED: Desk exception cancellation

    REJECTED --> [*]: Terminal
    EXPORTED --> [*]: Terminal
```

---

## 6. Desk Review, Credit Release & Atomic Stock Deduction

```mermaid
sequenceDiagram
    autonumber
    actor Desk as Desk Officer
    participant DeskUI as Order Review (/desk/[id])
    participant DeskAPI as /api/desk/orders/[id]
    participant DB as Postgres prisma.$transaction
    participant Stock as skus (stock_cases)
    participant Orders as orders & order_events

    Desk->>DeskUI: Opens order detail
    alt Order on Credit Hold
        Desk->>DeskUI: Submits supervisory release note
        DeskUI->>DeskAPI: POST { action: "release_hold", note }
        DeskAPI->>DB: Set status = PENDING_REVIEW + record audit event
    end

    Desk->>DeskUI: Taps "Approve & Decrement Stock"
    DeskUI->>DeskAPI: POST { action: "confirm" }
    DeskAPI->>DB: BEGIN TRANSACTION
    Note over DB: Sort SKU IDs to prevent deadlocks across concurrent requests
    loop For each line item
        DeskAPI->>Stock: UPDATE skus SET stock_cases = stock_cases - dispatchQty WHERE id = skuId AND stock_cases >= dispatchQty
        alt Update count == 1 (Stock Sufficient)
            Stock-->>DB: 1 row affected
        else Update count == 0 (Concurrent Depletion)
            DB-->>DeskAPI: ROLLBACK TRANSACTION (INSUFFICIENT_STOCK)
            DeskAPI-->>DeskUI: 400 Bad Request ("Insufficient stock for dispatch")
        end
    end
    DeskAPI->>Orders: UPDATE orders SET status = 'CONFIRMED', confirmedAt = now
    DeskAPI->>Orders: INSERT order_events (STATUS_CHANGE -> CONFIRMED)
    DB-->>DeskAPI: COMMIT TRANSACTION
    DeskAPI-->>DeskUI: 200 OK (Confirmed & Stock Decremented)
```

---

## 7. Per-Retailer Alias Learning Loop

```mermaid
flowchart LR
    A["Customer message:<br/>'chhota biscuit'"] --> B["AI Capture Review or Desk Edit Screen"]
    B --> C{"User / Desk changes or confirms SKU"}
    C --> D["Upsert into retailer_aliases:<br/>retailer_id, phrase_normalised, sku_id"]
    D --> E["Future orders by this retailer"]
    E --> F["Immediate 0.95 confidence match for that shopkeeper!"]
```

---

## 8. Tally ERP Export Flow

```mermaid
flowchart TD
    Desk["Desk Officer opens /desk/export"] --> Fetch["Fetch orders WHERE status = 'CONFIRMED' AND exportedAt IS NULL"]
    Fetch --> SelectOrders["Officer selects orders (checkboxes) & format (XML or CSV)"]
    SelectOrders --> Generate["POST /api/desk/export { orderIds, format }"]
    Generate --> Generator["lib/tally/export.ts generates RFC 4180 CSV or Tally XML"]
    Generator --> Transaction["Prisma Transaction:<br/>1. Create export_batches row<br/>2. Mark orders status = 'EXPORTED'<br/>3. Write order_events (ORDER_EXPORTED)"]
    Transaction --> Download["Browser triggers immediate file download"]
    Download --> BatchHistory["Batch added to Export History table with re-download"]
```

---

## 9. Scheme Engine Decision Flow

```mermaid
flowchart TD
    Input["Input: qtyCases, casePricePaise, gstRateBp, scheme, availableStock"] --> Kind{"Scheme Kind"}

    Kind -- "FREE_GOODS (Buy X Get Y)" --> FreeGoods["freeQty = floor(qty / buyQty) * freeQty<br/>dispatchQty = qty + freeQty<br/>discountPaise = 0"]
    Kind -- "SLAB_DISCOUNT" --> Slab["Find highest slab with minQty <= qty<br/>discountPaise = roundHalfUp(gross * percentBp / 10000)<br/>dispatchQty = qty<br/>freeQty = 0"]
    Kind -- "NONE" --> None["discountPaise = 0, freeQty = 0, dispatchQty = qty"]

    FreeGoods --> StockCheck["Stock Cap: Binary search largest q where q + free(q) <= availableStock"]
    Slab --> StockCheck
    None --> StockCheck

    StockCheck --> Net["grossPaise = qty * casePricePaise<br/>netPaise = grossPaise - discountPaise"]
    Net --> GST["gstPaise = roundHalfUp(netPaise * gstRateBp / 10000) (A4: no GST on free goods)"]
    GST --> Total["totalPaise = netPaise + gstPaise"]
    Total --> Nudge["Compute nextSlabHint ('Add N more cases to get...')"]
```

---

## 10. Screen-to-Screen Navigation Map

```mermaid
graph TD
    Login["/login (Phone -> OTP -> JWT)"]

    subgraph RetailerViews["Retailer Experience (Mobile First 360px)"]
        Catalogue["/catalogue (Products, Schemes, Search, Credit Strip)"]
        CartView["/cart (Live Schemes, Totals, Credit Preview, Confirm)"]
        CaptureView["/capture (Input message -> Review Draft -> Confirm)"]
        OrdersView["/orders (My Orders, Status Badges, Repeat Order)"]
    end

    subgraph DeskViews["Order Desk Experience (Desktop / Tablet)"]
        DeskQueue["/desk (KPIs, Order Queue, Status Tabs, Search)"]
        OrderDetail["/desk/[id] (Line Edit, Credit Usage, Approve, Reject, Release)"]
        ExportView["/desk/export (Select Orders, XML/CSV, History)"]
        InactiveView["/desk/inactive (14-Day Inactive Retailers Dashboard)"]
        LoadingView["/desk/van-loading (Date Picker, SKU Totals, Print Sheet)"]
        AliasView["/desk/aliases (Manage Learned Retailer Aliases)"]
    end

    Login -->|Retailer Role| Catalogue
    Login -->|Desk Role| DeskQueue

    Catalogue <--> CartView
    Catalogue <--> CaptureView
    Catalogue <--> OrdersView
    CaptureView --> OrdersView
    CartView --> OrdersView

    DeskQueue <--> OrderDetail
    DeskQueue <--> ExportView
    DeskQueue <--> InactiveView
    DeskQueue <--> LoadingView
    DeskQueue <--> AliasView
```

