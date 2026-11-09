# FMCG Distributor Retailer Ordering App with AI Order Capture

A production-grade, full-stack ordering platform engineered for **Company A**, an FMCG distributor in Jabalpur serving 1,800 kirana shops with ₹85–100 Cr annual revenue.

Replaces error-prone manual notebook orders and unverified WhatsApp messages with real-time stock-aware ordering, deterministic promotional scheme calculations, resilient AI message capture, automated credit holds, and Tally ERP voucher exports.

## Core Capabilities
- **Fast Mobile Web App (PWA)**: Designed for low-end phones on slow 3G (< 113 KB first load JS, min 48px touch targets, full English/Hindi toggle).
- **Pure Scheme Engine**: Deterministic line-level calculations for Buy 10 Get 1 Free, tiered slab discounts, and real-time stock cap bounds in integer paise.
- **AI Order Capture**: Converts unstructured Hinglish WhatsApp messages into structured orders via Google Gemini Flash with automatic rule-based fallback and per-retailer alias learning.
- **Order Desk Portal**: Order review queue, credit hold approvals, atomic stock deductions, and Tally-compatible XML/CSV export batches.

## Documentation Index
- 📘 [Technical Design Document (TDD)](docs/TDD.md) · [Exported TDD (DOCX)](docs/TDD.docx)
- 🚀 [Deployment & Operations Guide](deployment.md) · [docs/deployment.md](docs/deployment.md)
- 🔄 [System Architecture & Visual Flows](docs/flow.md)
- ⚖️ [Assumptions & Architecture Decisions Log](docs/decision.md)

## Quick Start
```bash
cp .env.example .env
npm install
npm run db:up     # Starts local PostgreSQL 16 container (or configure Neon in .env)
npm run db:reset  # Applies migrations and seeds idempotent demo data
npm run dev       # Starts dev server on http://localhost:3000
npm test          # Runs 65 pure unit tests (zero DB required)
```

### Reviewer Demo Logins (OTP is `123456` for all accounts)
- **Retailer Persona 1 (Standard):** `90000 00001` (Ramesh Gupta - Gupta Kirana)
- **Retailer Persona 2 (Credit Hold):** `90000 00002` (Suresh Sharma - Only ₹2,500 credit left)
- **Order Desk Officer:** `90000 00010` (Amit Deshmukh - Order Desk Team)
*(Note: The demo OTP `123456` is hidden on the login screen for realistic authentication).*

