import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const outDir = path.join(process.cwd(), "docs", "images");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Architecture Flowchart SVG
const architectureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 540" width="920" height="540">
  <defs>
    <style>
      .bg { fill: #FAFAF7; }
      .box { fill: #FFFFFF; stroke: #CBD5E1; stroke-width: 1.5; rx: 8; }
      .box-accent { fill: #F0FDF4; stroke: #1F6F4A; stroke-width: 2; rx: 8; }
      .box-highlight { fill: #EFF6FF; stroke: #2563EB; stroke-width: 1.5; rx: 8; }
      .box-amber { fill: #FFFBEB; stroke: #D97706; stroke-width: 1.5; rx: 8; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: bold; font-size: 14px; fill: #0F172A; }
      .text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; fill: #334155; }
      .header-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: bold; font-size: 12px; fill: #1F6F4A; text-transform: uppercase; letter-spacing: 0.5px; }
      .arrow { stroke: #64748B; stroke-width: 1.5; fill: none; marker-end: url(#arrowhead); }
    </style>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#64748B" />
    </marker>
  </defs>

  <rect width="920" height="540" class="bg" />

  <!-- Diagram Title -->
  <text x="30" y="35" class="title" font-size="18">System Architecture: End-to-End Component Flow</text>
  <text x="30" y="55" class="text">Company A FMCG Distributor Platform · Next.js 14 App Router · Pure Deterministic Engines</text>

  <!-- Layer 1: Client Tier -->
  <rect x="30" y="75" width="860" height="70" fill="#F8FAFC" stroke="#E2E8F0" rx="8" />
  <text x="45" y="95" class="header-text">1. Client Layer (Responsive Mobile 360px &amp; Desktop Terminal)</text>
  <rect x="50" y="105" width="370" height="30" class="box" />
  <text x="65" y="125" class="text">📱 Retailer PWA: 360px Mobile Web App (Catalogue, Live Cart, AI Paste)</text>
  <rect x="470" y="105" width="400" height="30" class="box" />
  <text x="485" y="125" class="text">💻 Order Desk Terminal: Order Queue, Approvals, Tally ERP Exports</text>

  <!-- Layer 2: Next.js Runtime Tier -->
  <rect x="30" y="165" width="860" height="75" fill="#F8FAFC" stroke="#E2E8F0" rx="8" />
  <text x="45" y="185" class="header-text">2. Next.js 14 Server Runtime (Edge Middleware &amp; Scoped DAL)</text>
  <rect x="50" y="195" width="250" height="32" class="box-highlight" />
  <text x="65" y="215" class="text">Middleware: JWT &amp; Role RBAC Guard</text>
  <rect x="320" y="195" width="260" height="32" class="box" />
  <text x="335" y="215" class="text">Server Route Handlers &amp; Placement API</text>
  <rect x="600" y="195" width="270" height="32" class="box-highlight" />
  <text x="615" y="215" class="text">Scoped Data Access Layer (IDOR Guard)</text>

  <!-- Layer 3: Pure Engines & AI Pipeline -->
  <rect x="30" y="260" width="860" height="150" fill="#F8FAFC" stroke="#E2E8F0" rx="8" />
  <text x="45" y="280" class="header-text">3. Deterministic Pure Modules (Zero DB) &amp; AI Capture Engine</text>
  
  <!-- Left: Pure Engines -->
  <rect x="50" y="295" width="390" height="100" class="box-accent" />
  <text x="65" y="318" class="title" fill="#1F6F4A">Deterministic Pure Engines (paise precision)</text>
  <text x="65" y="340" class="text">• Scheme Engine: Free Goods (10+1) &amp; Slabs (3% off 5+)</text>
  <text x="65" y="360" class="text">• Analytical Stock Cap: O(log S) binary search bounds</text>
  <text x="65" y="380" class="text">• Tally ERP Engine: Validated XML &amp; RFC 4180 CSV</text>

  <!-- Right: AI Module -->
  <rect x="470" y="295" width="400" height="100" class="box-amber" />
  <text x="485" y="318" class="title" fill="#D97706">AI Capture Pipeline with Fallback Chain</text>
  <text x="485" y="340" class="text">• Sanitizer: 1,000 char cap &amp; injection boundary isolation</text>
  <text x="485" y="360" class="text">• Primary: Google Gemini 2.0 Flash (REST, 8s timeout)</text>
  <text x="485" y="380" class="text">• Resilient Fallback: Hinglish Rule Matcher &amp; Calibration</text>

  <!-- Layer 4: Data Tier -->
  <rect x="30" y="430" width="860" height="75" fill="#F8FAFC" stroke="#E2E8F0" rx="8" />
  <text x="45" y="450" class="header-text">4. Database Tier (PostgreSQL via Prisma ORM)</text>
  <rect x="50" y="460" width="260" height="32" class="box" />
  <text x="65" y="480" class="text">Prisma Client Global Singleton</text>
  <rect x="330" y="460" width="260" height="32" class="box-accent" />
  <text x="345" y="480" class="text">Neon Pooled Endpoint (Host: -pooler)</text>
  <rect x="610" y="460" width="260" height="32" class="box" />
  <text x="625" y="480" class="text">Direct Endpoint / Local Docker (Port 5432)</text>

  <!-- Connecting Arrows -->
  <line x1="230" y1="145" x2="230" y2="165" class="arrow" />
  <line x1="680" y1="145" x2="680" y2="165" class="arrow" />
  <line x1="240" y1="240" x2="240" y2="295" class="arrow" />
  <line x1="670" y1="240" x2="670" y2="295" class="arrow" />
  <line x1="245" y1="395" x2="245" y2="430" class="arrow" />
  <line x1="670" y1="395" x2="670" y2="430" class="arrow" />
</svg>`;

// 2. ER Data Model SVG
const erSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 500" width="920" height="500">
  <defs>
    <style>
      .bg { fill: #FAFAF7; }
      .table-box { fill: #FFFFFF; stroke: #CBD5E1; stroke-width: 1.5; rx: 6; }
      .th { fill: #1E293B; }
      .th-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: bold; font-size: 12px; fill: #FFFFFF; }
      .field { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; fill: #334155; }
      .pk { font-weight: bold; fill: #0F172A; }
      .fk { fill: #2563EB; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: bold; font-size: 16px; fill: #0F172A; }
      .rel-line { stroke: #94A3B8; stroke-width: 1.5; stroke-dasharray: 4,4; fill: none; }
    </style>
  </defs>

  <rect width="920" height="500" class="bg" />
  <text x="30" y="35" class="title">Entity-Relationship Data Model (Key Tables &amp; Integrity Rationale)</text>

  <!-- Table: users -->
  <g transform="translate(30, 60)">
    <rect width="180" height="130" class="table-box" />
    <rect width="180" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">users</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field">phone (UK, String)</text>
    <text x="12" y="80" class="field">role (retailer|desk)</text>
    <text x="12" y="98" class="field fk">retailer_id (FK)</text>
    <text x="12" y="116" class="field">preferred_lang</text>
  </g>

  <!-- Table: retailers -->
  <g transform="translate(240, 60)">
    <rect width="200" height="150" class="table-box" />
    <rect width="200" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">retailers</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field">shop_name (String)</text>
    <text x="12" y="80" class="field">credit_limit_paise (Int)</text>
    <text x="12" y="98" class="field">outstanding_paise (Int)</text>
    <text x="12" y="116" class="field fk">salesman_user_id (FK)</text>
    <text x="12" y="134" class="field">created_at (DateTime)</text>
  </g>

  <!-- Table: skus -->
  <g transform="translate(470, 60)">
    <rect width="200" height="150" class="table-box" />
    <rect width="200" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">skus</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field">code (UK, SKU-BS-075)</text>
    <text x="12" y="80" class="field">pieces_per_case (Int)</text>
    <text x="12" y="98" class="field">dealer_price_per_piece (Int)</text>
    <text x="12" y="116" class="field">gst_rate_bp (1800=18%)</text>
    <text x="12" y="134" class="field">stock_cases (Int)</text>
  </g>

  <!-- Table: schemes -->
  <g transform="translate(700, 60)">
    <rect width="190" height="130" class="table-box" />
    <rect width="190" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">schemes</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field fk">sku_id (FK)</text>
    <text x="12" y="80" class="field">kind (FREE_GOODS|SLAB)</text>
    <text x="12" y="98" class="field">config_json (Json)</text>
    <text x="12" y="116" class="field">active_from / active_to</text>
  </g>

  <!-- Table: orders -->
  <g transform="translate(130, 260)">
    <rect width="220" height="170" class="table-box" />
    <rect width="220" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">orders</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field">order_no (UK, ORD-YYYYMMDD)</text>
    <text x="12" y="80" class="field fk">retailer_id (FK)</text>
    <text x="12" y="98" class="field">status (PENDING|CONFIRMED)</text>
    <text x="12" y="116" class="field">subtotal / discount / gst (Int)</text>
    <text x="12" y="134" class="field">total_paise (Int)</text>
    <text x="12" y="152" class="field fk">export_batch_id (FK)</text>
  </g>

  <!-- Table: order_lines -->
  <g transform="translate(400, 260)">
    <rect width="240" height="170" class="table-box" />
    <rect width="240" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">order_lines (Immutable Snapshots)</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field fk">order_id (FK) &amp; sku_id (FK)</text>
    <text x="12" y="80" class="field">ordered_qty &amp; free_qty (Int)</text>
    <text x="12" y="98" class="field">case_price_paise_snapshot (Int)</text>
    <text x="12" y="116" class="field">gross / discount / gst / net (Int)</text>
    <text x="12" y="134" class="field">scheme_snapshot_json (Json)</text>
    <text x="12" y="152" class="field">ai_confidence &amp; original_text</text>
  </g>

  <!-- Table: retailer_aliases -->
  <g transform="translate(680, 260)">
    <rect width="210" height="130" class="table-box" />
    <rect width="210" height="26" class="th" rx="6" />
    <text x="12" y="18" class="th-text">retailer_aliases</text>
    <text x="12" y="44" class="field pk">id (PK, String)</text>
    <text x="12" y="62" class="field fk">retailer_id (FK)</text>
    <text x="12" y="80" class="field">phrase_normalised (String)</text>
    <text x="12" y="98" class="field fk">sku_id (FK)</text>
    <text x="12" y="116" class="field">times_confirmed (Int)</text>
  </g>
</svg>`;

// 3. Screen Mockup 1: Mobile Catalogue
const screenCatalogueSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 620" width="360" height="620">
  <defs>
    <style>
      .app-bg { fill: #FAFAF7; }
      .card { fill: #FFFFFF; stroke: #E2E8F0; rx: 8; }
      .accent-btn { fill: #1F6F4A; rx: 6; }
      .badge-green { fill: #DCFCE7; stroke: #86EFAC; rx: 4; }
      .badge-amber { fill: #FEF3C7; stroke: #FDE68A; rx: 4; }
      .badge-red { fill: #FEE2E2; stroke: #FECACA; rx: 4; }
      .txt-bold { font-family: -apple-system, sans-serif; font-weight: bold; }
      .txt { font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <rect width="360" height="620" class="app-bg" />

  <!-- App Header -->
  <rect x="0" y="0" width="360" height="54" fill="#FFFFFF" stroke="#E2E8F0" />
  <rect x="16" y="12" width="28" height="28" fill="#1F6F4A" rx="6" />
  <text x="25" y="31" class="txt-bold" fill="#FFFFFF" font-size="14">A</text>
  <text x="52" y="31" class="txt-bold" fill="#0F172A" font-size="15">Company A</text>
  <rect x="290" y="14" width="54" height="26" fill="#F8FAFC" stroke="#CBD5E1" rx="4" />
  <text x="302" y="31" class="txt-bold" fill="#0F172A" font-size="11">हिन्दी</text>

  <!-- Credit Strip -->
  <rect x="16" y="66" width="328" height="42" fill="#F0FDF4" stroke="#BBF7D0" rx="6" />
  <text x="28" y="84" class="txt" fill="#166534" font-size="11">Gupta Kirana Store · Credit Status</text>
  <text x="28" y="100" class="txt-bold" fill="#14532D" font-size="12">Available: ₹85,000 / Limit: ₹1,00,000</text>

  <!-- Search Bar -->
  <rect x="16" y="118" width="328" height="36" fill="#FFFFFF" stroke="#CBD5E1" rx="6" />
  <text x="32" y="140" class="txt" fill="#94A3B8" font-size="12">🔍 Search biscuits, soap, tea...</text>

  <!-- Product 1: Glucose Biscuit -->
  <rect x="16" y="164" width="328" height="125" class="card" />
  <rect x="26" y="174" width="70" height="70" fill="#F1F5F9" rx="6" />
  <text x="45" y="214" font-size="28">🍪</text>
  <text x="106" y="188" class="txt-bold" fill="#0F172A" font-size="13">Glucose biscuit 75 g (case of 96)</text>
  <text x="106" y="204" class="txt-bold" fill="#1F6F4A" font-size="14">₹777.60 <tspan fill="#64748B" font-size="11">/ case (₹8.10/pc)</tspan></text>
  
  <rect x="106" y="212" width="130" height="18" class="badge-green" />
  <text x="112" y="225" class="txt-bold" fill="#166534" font-size="10">🎁 Buy 10 get 1 free</text>

  <rect x="260" y="248" width="74" height="30" class="accent-btn" />
  <text x="274" y="268" class="txt-bold" fill="#FFFFFF" font-size="12">Add 10</text>
  <text x="26" y="270" class="txt" fill="#16A34A" font-size="10">● In Stock (340 cases)</text>

  <!-- Product 2: Detergent Powder -->
  <rect x="16" y="300" width="328" height="125" class="card" />
  <rect x="26" y="310" width="70" height="70" fill="#F1F5F9" rx="6" />
  <text x="45" y="350" font-size="28">🧼</text>
  <text x="106" y="324" class="txt-bold" fill="#0F172A" font-size="13">Detergent powder 1 kg (case of 20)</text>
  <text x="106" y="340" class="txt-bold" fill="#1F6F4A" font-size="14">₹2,030.00 <tspan fill="#64748B" font-size="11">/ case</tspan></text>
  
  <rect x="106" y="348" width="135" height="18" class="badge-amber" />
  <text x="112" y="361" class="txt-bold" fill="#B45309" font-size="10">⚡ 3% off 5 or more cases</text>

  <rect x="260" y="384" width="74" height="30" class="accent-btn" />
  <text x="278" y="404" class="txt-bold" fill="#FFFFFF" font-size="12">Add 5</text>
  <text x="26" y="406" class="txt" fill="#16A34A" font-size="10">● In Stock (85 cases)</text>

  <!-- Product 3: Tea Leaf (Out of stock) -->
  <rect x="16" y="436" width="328" height="90" class="card" />
  <text x="106" y="460" class="txt-bold" fill="#64748B" font-size="13">Tea leaf 250 g (case of 40)</text>
  <text x="106" y="478" class="txt-bold" fill="#64748B" font-size="13">₹4,720.00 / case</text>
  <rect x="106" y="486" width="85" height="18" class="badge-red" />
  <text x="112" y="499" class="txt-bold" fill="#DC2626" font-size="10">Out of Stock</text>
  <rect x="260" y="480" width="74" height="30" fill="#E2E8F0" rx="6" />
  <text x="274" y="500" class="txt" fill="#94A3B8" font-size="11">Disabled</text>

  <!-- Bottom Floating Cart Bar -->
  <rect x="16" y="546" width="328" height="50" fill="#1F6F4A" rx="8" />
  <text x="32" y="575" class="txt-bold" fill="#FFFFFF" font-size="14">15 Cases · ₹17,926.00</text>
  <text x="250" y="575" class="txt-bold" fill="#FFFFFF" font-size="13">View Cart →</text>
</svg>`;

// 4. Screen Mockup 2: Cart with Schemes
const screenCartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 560" width="360" height="560">
  <defs>
    <style>
      .app-bg { fill: #FAFAF7; }
      .card { fill: #FFFFFF; stroke: #E2E8F0; rx: 8; }
      .accent-btn { fill: #1F6F4A; rx: 6; }
      .badge-green { fill: #DCFCE7; stroke: #86EFAC; rx: 4; }
      .txt-bold { font-family: -apple-system, sans-serif; font-weight: bold; }
      .txt { font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <rect width="360" height="560" class="app-bg" />
  <!-- Header -->
  <rect x="0" y="0" width="360" height="50" fill="#FFFFFF" stroke="#E2E8F0" />
  <text x="16" y="32" class="txt-bold" fill="#0F172A" font-size="16">Your Cart (2 Items)</text>

  <!-- Cart Line 1 -->
  <rect x="16" y="66" width="328" height="100" class="card" />
  <text x="28" y="90" class="txt-bold" fill="#0F172A" font-size="13">Glucose biscuit 75 g · 10 cases</text>
  <text x="28" y="108" class="txt" fill="#64748B" font-size="12">10 × ₹777.60 = ₹7,776.00</text>
  <rect x="28" y="118" width="180" height="20" class="badge-green" />
  <text x="36" y="132" class="txt-bold" fill="#166534" font-size="10">🎁 +1 Free Case (11 Dispatch Cases)</text>
  <text x="260" y="108" class="txt-bold" fill="#0F172A" font-size="14">₹7,776.00</text>

  <!-- Cart Line 2 -->
  <rect x="16" y="178" width="328" height="100" class="card" />
  <text x="28" y="202" class="txt-bold" fill="#0F172A" font-size="13">Detergent powder 1 kg · 5 cases</text>
  <text x="28" y="220" class="txt" fill="#64748B" font-size="12">5 × ₹2,030.00 = ₹10,150.00</text>
  <rect x="28" y="230" width="180" height="20" class="badge-green" />
  <text x="36" y="244" class="txt-bold" fill="#166534" font-size="10">⚡ 3% Slab Discount Applied (-₹304.50)</text>
  <text x="260" y="220" class="txt-bold" fill="#0F172A" font-size="14">₹9,845.50</text>

  <!-- Financial Summary Card -->
  <rect x="16" y="290" width="328" height="160" class="card" />
  <text x="28" y="315" class="txt-bold" fill="#0F172A" font-size="13">Order Summary</text>
  <text x="28" y="340" class="txt" fill="#64748B" font-size="12">Gross Subtotal (15 cases):</text>
  <text x="260" y="340" class="txt" fill="#0F172A" font-size="12">₹17,926.00</text>

  <text x="28" y="365" class="txt" fill="#16A34A" font-size="12">Scheme Discounts:</text>
  <text x="260" y="365" class="txt-bold" fill="#16A34A" font-size="12">-₹304.50</text>

  <text x="28" y="390" class="txt" fill="#64748B" font-size="12">Estimated GST (18%):</text>
  <text x="260" y="390" class="txt" fill="#0F172A" font-size="12">₹3,171.87</text>

  <line x1="28" y1="405" x2="332" y2="405" stroke="#E2E8F0" />
  <text x="28" y="430" class="txt-bold" fill="#0F172A" font-size="15">Total Payable:</text>
  <text x="235" y="430" class="txt-bold" fill="#1F6F4A" font-size="16">₹20,793.37</text>

  <!-- Checkout Button -->
  <rect x="16" y="470" width="328" height="50" class="accent-btn" />
  <text x="80" y="501" class="txt-bold" fill="#FFFFFF" font-size="14">Confirm &amp; Place Order (16 Cases) →</text>
</svg>`;

// 5. Screen Mockup 3: AI Capture Review
const screenCaptureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 560" width="360" height="560">
  <defs>
    <style>
      .app-bg { fill: #FAFAF7; }
      .card { fill: #FFFFFF; stroke: #CBD5E1; rx: 8; }
      .tag-high { fill: #DCFCE7; stroke: #86EFAC; rx: 4; }
      .tag-warn { fill: #FEE2E2; stroke: #FECACA; rx: 4; }
      .txt-bold { font-family: -apple-system, sans-serif; font-weight: bold; }
      .txt { font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <rect width="360" height="560" class="app-bg" />
  <rect x="0" y="0" width="360" height="50" fill="#FFFFFF" stroke="#E2E8F0" />
  <text x="16" y="32" class="txt-bold" fill="#0F172A" font-size="16">AI Order Capture · Review Lines</text>

  <!-- Raw Input Message Banner -->
  <rect x="16" y="64" width="328" height="60" fill="#F8FAFC" stroke="#CBD5E1" rx="6" />
  <text x="26" y="82" class="txt-bold" fill="#475569" font-size="10">Pasted Customer Message:</text>
  <text x="26" y="100" class="txt" fill="#0F172A" font-size="11">"bhaiya 5 peti biscuit chhota, 2 peti washing</text>
  <text x="26" y="115" class="txt" fill="#0F172A" font-size="11">powder 1 kilo, chai patti 250 wala 1 peti"</text>

  <!-- Parsed Line 1 -->
  <rect x="16" y="136" width="328" height="90" class="card" />
  <text x="28" y="158" class="txt" fill="#64748B" font-size="11">"5 peti biscuit chhota"</text>
  <text x="28" y="178" class="txt-bold" fill="#0F172A" font-size="13">Glucose biscuit 75 g (SKU-BS-075)</text>
  <rect x="28" y="190" width="70" height="18" class="tag-high" />
  <text x="35" y="203" class="txt-bold" fill="#166534" font-size="10">High 95%</text>
  <text x="110" y="203" class="txt-bold" fill="#1F6F4A" font-size="12">Qty: 5 cases</text>

  <!-- Parsed Line 2 -->
  <rect x="16" y="238" width="328" height="90" class="card" />
  <text x="28" y="260" class="txt" fill="#64748B" font-size="11">"2 peti washing powder 1 kilo"</text>
  <text x="28" y="280" class="txt-bold" fill="#0F172A" font-size="13">Detergent powder 1 kg (SKU-DT-1KG)</text>
  <rect x="28" y="292" width="70" height="18" class="tag-high" />
  <text x="35" y="305" class="txt-bold" fill="#166534" font-size="10">High 92%</text>
  <text x="110" y="305" class="txt-bold" fill="#1F6F4A" font-size="12">Qty: 2 cases</text>

  <!-- Parsed Line 3 (Out of stock) -->
  <rect x="16" y="340" width="328" height="90" class="card" stroke="#FCA5A5" />
  <text x="28" y="362" class="txt" fill="#64748B" font-size="11">"chai patti 250 wala 1 peti"</text>
  <text x="28" y="382" class="txt-bold" fill="#0F172A" font-size="13">Tea leaf 250 g (SKU-TE-250)</text>
  <rect x="28" y="394" width="80" height="18" class="tag-warn" />
  <text x="34" y="407" class="txt-bold" fill="#DC2626" font-size="10">Out of Stock</text>
  <text x="280" y="382" class="txt-bold" fill="#DC2626" font-size="12">Remove ✕</text>

  <!-- Actions -->
  <rect x="16" y="450" width="328" height="46" fill="#1F6F4A" rx="8" />
  <text x="85" y="478" class="txt-bold" fill="#FFFFFF" font-size="14">Confirm Order (7 Cases) →</text>
</svg>`;

// 6. Screen Mockup 4: Order Desk Review
const screenDeskReviewSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 400" width="700" height="400">
  <defs>
    <style>
      .bg { fill: #FAFAF7; }
      .card { fill: #FFFFFF; stroke: #CBD5E1; rx: 6; }
      .btn-green { fill: #1F6F4A; rx: 4; }
      .btn-amber { fill: #D97706; rx: 4; }
      .btn-red { fill: #DC2626; rx: 4; }
      .badge-hold { fill: #FEF3C7; stroke: #FDE68A; rx: 4; }
      .txt-bold { font-family: -apple-system, sans-serif; font-weight: bold; }
      .txt { font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <rect width="700" height="400" class="bg" />
  <!-- Header bar -->
  <rect x="0" y="0" width="700" height="50" fill="#FFFFFF" stroke="#E2E8F0" />
  <text x="24" y="32" class="txt-bold" fill="#0F172A" font-size="16">Order Desk · Reviewing Order ORD-20261109-0001</text>
  <rect x="560" y="14" width="115" height="24" class="badge-hold" />
  <text x="572" y="30" class="txt-bold" fill="#B45309" font-size="11">PENDING_REVIEW</text>

  <!-- Retailer Meta Card -->
  <rect x="24" y="65" width="652" height="60" class="card" />
  <text x="40" y="90" class="txt-bold" fill="#0F172A" font-size="13">Shop: Gupta Kirana Store (Ramesh Gupta · 90000 00001)</text>
  <text x="40" y="110" class="txt" fill="#64748B" font-size="12">Credit Limit: ₹1,00,000 | Outstanding: ₹15,000 | Available: ₹85,000 (Passes credit check)</text>

  <!-- Items Table -->
  <rect x="24" y="135" width="652" height="180" class="card" />
  <rect x="24" y="135" width="652" height="30" fill="#F1F5F9" rx="6" />
  <text x="40" y="155" class="txt-bold" fill="#475569" font-size="11">SKU ITEM</text>
  <text x="240" y="155" class="txt-bold" fill="#475569" font-size="11">QTY</text>
  <text x="320" y="155" class="txt-bold" fill="#475569" font-size="11">FREE</text>
  <text x="400" y="155" class="txt-bold" fill="#475569" font-size="11">RATE</text>
  <text x="490" y="155" class="txt-bold" fill="#475569" font-size="11">SCHEME</text>
  <text x="590" y="155" class="txt-bold" fill="#475569" font-size="11">TOTAL</text>

  <!-- Row 1 -->
  <text x="40" y="185" class="txt" fill="#0F172A" font-size="12">Glucose biscuit 75 g (SKU-BS-075)</text>
  <text x="240" y="185" class="txt-bold" fill="#0F172A" font-size="12">10</text>
  <text x="320" y="185" class="txt-bold" fill="#16A34A" font-size="12">+1</text>
  <text x="400" y="185" class="txt" fill="#0F172A" font-size="12">₹777.60</text>
  <text x="490" y="185" class="txt" fill="#16A34A" font-size="11">Buy 10 Get 1</text>
  <text x="590" y="185" class="txt-bold" fill="#0F172A" font-size="12">₹9,175.68</text>

  <!-- Row 2 -->
  <text x="40" y="215" class="txt" fill="#0F172A" font-size="12">Detergent powder 1 kg (SKU-DT-1KG)</text>
  <text x="240" y="215" class="txt-bold" fill="#0F172A" font-size="12">5</text>
  <text x="320" y="215" class="txt" fill="#64748B" font-size="12">0</text>
  <text x="400" y="215" class="txt" fill="#0F172A" font-size="12">₹2,030.00</text>
  <text x="490" y="215" class="txt" fill="#16A34A" font-size="11">3% slab disc</text>
  <text x="590" y="215" class="txt-bold" fill="#0F172A" font-size="12">₹11,617.69</text>

  <line x1="40" y1="240" x2="660" y2="240" stroke="#E2E8F0" />
  <text x="40" y="270" class="txt-bold" fill="#0F172A" font-size="14">Order Total: 15 cases (+1 free = 16 dispatch cases) · ₹20,793.37</text>

  <!-- Action Buttons -->
  <rect x="24" y="335" width="220" height="42" class="btn-green" />
  <text x="42" y="361" class="txt-bold" fill="#FFFFFF" font-size="13">✓ Approve &amp; Decrement Stock</text>

  <rect x="260" y="335" width="160" height="42" class="btn-amber" />
  <text x="282" y="361" class="txt-bold" fill="#FFFFFF" font-size="13">⏸ Credit Hold</text>

  <rect x="435" y="335" width="140" height="42" class="btn-red" />
  <text x="465" y="361" class="txt-bold" fill="#FFFFFF" font-size="13">✕ Reject</text>
</svg>`;

// 7. Screen Mockup 5: Tally Export Screen
const screenTallyExportSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
  <defs>
    <style>
      .bg { fill: #FAFAF7; }
      .card { fill: #FFFFFF; stroke: #CBD5E1; rx: 6; }
      .btn-green { fill: #1F6F4A; rx: 4; }
      .txt-bold { font-family: -apple-system, sans-serif; font-weight: bold; }
      .txt { font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <rect width="700" height="360" class="bg" />
  <!-- Header -->
  <rect x="0" y="0" width="700" height="50" fill="#FFFFFF" stroke="#E2E8F0" />
  <text x="24" y="32" class="txt-bold" fill="#0F172A" font-size="16">Tally.ERP9 &amp; Prime Sales Order Voucher Export</text>

  <!-- Controls bar -->
  <rect x="24" y="65" width="652" height="50" class="card" />
  <text x="40" y="95" class="txt-bold" fill="#0F172A" font-size="13">Select Format:</text>
  <rect x="145" y="77" width="100" height="26" fill="#1F6F4A" rx="4" />
  <text x="162" y="94" class="txt-bold" fill="#FFFFFF" font-size="11">XML (Tally)</text>
  <rect x="255" y="77" width="90" height="26" fill="#F1F5F9" stroke="#CBD5E1" rx="4" />
  <text x="282" y="94" class="txt" fill="#475569" font-size="11">CSV</text>

  <rect x="480" y="75" width="180" height="30" class="btn-green" />
  <text x="498" y="95" class="txt-bold" fill="#FFFFFF" font-size="12">⬇ Export Selected (3 Orders)</text>

  <!-- Table of Confirmed Orders -->
  <rect x="24" y="130" width="652" height="190" class="card" />
  <rect x="24" y="130" width="652" height="30" fill="#F1F5F9" rx="6" />
  <text x="40" y="150" class="txt-bold" fill="#475569" font-size="11">☑ ORDER NO</text>
  <text x="180" y="150" class="txt-bold" fill="#475569" font-size="11">SHOP NAME</text>
  <text x="360" y="150" class="txt-bold" fill="#475569" font-size="11">DATE</text>
  <text x="460" y="150" class="txt-bold" fill="#475569" font-size="11">CASES (DISPATCH)</text>
  <text x="590" y="150" class="txt-bold" fill="#475569" font-size="11">AMOUNT (₹)</text>

  <text x="40" y="180" class="txt" fill="#0F172A" font-size="12">☑ ORD-20261109-0001</text>
  <text x="180" y="180" class="txt-bold" fill="#0F172A" font-size="12">Gupta Kirana Store</text>
  <text x="360" y="180" class="txt" fill="#64748B" font-size="12">09 Nov 2026</text>
  <text x="460" y="180" class="txt" fill="#0F172A" font-size="12">15 (16)</text>
  <text x="590" y="180" class="txt-bold" fill="#0F172A" font-size="12">₹20,793.37</text>

  <text x="40" y="210" class="txt" fill="#0F172A" font-size="12">☑ ORD-20261109-0002</text>
  <text x="180" y="210" class="txt-bold" fill="#0F172A" font-size="12">Sharma Provision Store</text>
  <text x="360" y="210" class="txt" fill="#64748B" font-size="12">09 Nov 2026</text>
  <text x="460" y="210" class="txt" fill="#0F172A" font-size="12">8 (8)</text>
  <text x="590" y="210" class="txt-bold" fill="#0F172A" font-size="12">₹12,480.00</text>

  <text x="40" y="240" class="txt" fill="#0F172A" font-size="12">☑ ORD-20261109-0003</text>
  <text x="180" y="210" class="txt-bold" fill="#0F172A" font-size="12">Mahalaxmi Super Mart</text>
  <text x="360" y="240" class="txt" fill="#64748B" font-size="12">09 Nov 2026</text>
  <text x="460" y="240" class="txt" fill="#0F172A" font-size="12">10 (11)</text>
  <text x="590" y="240" class="txt-bold" fill="#0F172A" font-size="12">₹14,950.00</text>
</svg>`;

const files = [
  { name: "architecture-flowchart", svg: architectureSvg },
  { name: "er-diagram", svg: erSvg },
  { name: "screen-catalogue", svg: screenCatalogueSvg },
  { name: "screen-cart", svg: screenCartSvg },
  { name: "screen-capture", svg: screenCaptureSvg },
  { name: "screen-desk-review", svg: screenDeskReviewSvg },
  { name: "screen-tally-export", svg: screenTallyExportSvg },
];

for (const f of files) {
  const svgPath = path.join(outDir, `${f.name}.svg`);
  const pngPath = path.join(outDir, `${f.name}.png`);
  fs.writeFileSync(svgPath, f.svg, "utf-8");
  try {
    execSync(`sips -s format png "${svgPath}" --out "${pngPath}" 2>/dev/null`);
    console.log(`Generated ${f.name}.png`);
  } catch (err: any) {
    console.warn(`Could not convert ${f.name} to PNG via sips:`, err.message);
  }
}
