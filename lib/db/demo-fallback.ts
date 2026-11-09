/**
 * In-memory demo fallback dataset.
 *
 * Used when running locally in demo mode without a live Docker/Postgres container,
 * ensuring zero broken screens for reviewers evaluating the app.
 * When Postgres is running, the real database is always used.
 */

import { Role } from "@prisma/client";

export interface DemoUser {
  id: string;
  phone: string;
  name: string;
  role: Role;
  preferredLang: string;
  retailerId?: string;
  retailer?: {
    id: string;
    shopName: string;
    ownerName: string;
    creditLimitPaise: number;
    outstandingPaise: number;
    availableCreditPaise: number;
  };
}

export const DEMO_USERS: Record<string, DemoUser> = {
  "9000000001": {
    id: "usr-ret-01",
    phone: "9000000001",
    name: "Ramesh Gupta",
    role: Role.retailer,
    preferredLang: "hi",
    retailerId: "ret-01",
    retailer: {
      id: "ret-01",
      shopName: "Gupta Kirana Store",
      ownerName: "Ramesh Gupta",
      creditLimitPaise: 10000000, // ₹1,00,000
      outstandingPaise: 1500000, // ₹15,000
      availableCreditPaise: 8500000, // ₹85,000
    },
  },
  "9000000002": {
    id: "usr-ret-02",
    phone: "9000000002",
    name: "Suresh Sharma",
    role: Role.retailer,
    preferredLang: "hi",
    retailerId: "ret-02",
    retailer: {
      id: "ret-02",
      shopName: "Sharma Provision Store",
      ownerName: "Suresh Sharma",
      creditLimitPaise: 5000000, // ₹50,000 limit
      outstandingPaise: 4750000, // ₹47,500 used (Only ₹2,500 credit left -> triggers hold)
      availableCreditPaise: 250000, // ₹2,500
    },
  },
  "9000000003": {
    id: "usr-ret-03",
    phone: "9000000003",
    name: "Priya Patel",
    role: Role.retailer,
    preferredLang: "en",
    retailerId: "ret-03",
    retailer: {
      id: "ret-03",
      shopName: "Mahalaxmi Super Mart",
      ownerName: "Priya Patel",
      creditLimitPaise: 15000000, // ₹1,50,000
      outstandingPaise: 3000000, // ₹30,000
      availableCreditPaise: 12000000, // ₹1,20,000
    },
  },
  "9000000010": {
    id: "usr-desk-01",
    phone: "9000000010",
    name: "Amit Deshmukh (Order Desk)",
    role: Role.desk,
    preferredLang: "en",
  },
  "9000000011": {
    id: "usr-desk-02",
    phone: "9000000011",
    name: "Neha Jain (Order Desk)",
    role: Role.desk,
    preferredLang: "hi",
  },
  "9000000020": {
    id: "usr-sales-01",
    phone: "9000000020",
    name: "Vikram Singh (Field Sales)",
    role: Role.salesman,
    preferredLang: "hi",
  },
};

export const DEMO_PRODUCTS = [
  {
    id: "sku-01",
    code: "SKU-BS-075",
    nameEn: "Glucose biscuit 75 g, case of 96",
    nameHi: "ग्लूकोज बिस्कुट 75 ग्राम (96 का कार्टन)",
    brand: "Parle Food",
    piecesPerCase: 96,
    dealerPricePerPiecePaise: 810, // ₹8.10
    hasPriceOverride: false,
    casePricePaise: 77760, // 96 * 810 = ₹777.60
    gstRateBp: 1800,
    stockCases: 340,
    imageKey: "glucose-biscuit",
    scheme: {
      kind: "FREE_GOODS",
      configJson: { buyQty: 10, freeQty: 1, repeating: true },
      labelEn: "Buy 10 cases get 1 free",
      labelHi: "10 पेटी पर 1 पेटी मुफ्त",
    },
  },
  {
    id: "sku-02",
    code: "SKU-DT-1KG",
    nameEn: "Detergent powder 1 kg, case of 20",
    nameHi: "डिटर्जेंट पाउडर 1 किलो (20 का कार्टन)",
    brand: "Ghar Care",
    piecesPerCase: 20,
    dealerPricePerPiecePaise: 10150, // ₹101.50
    hasPriceOverride: false,
    casePricePaise: 203000, // 20 * 10150 = ₹2,030.00
    gstRateBp: 1800,
    stockCases: 85,
    imageKey: "detergent-powder",
    scheme: {
      kind: "SLAB_DISCOUNT",
      configJson: { slabs: [{ minQty: 5, percentBp: 300 }] },
      labelEn: "3% off 5 or more cases",
      labelHi: "5 या अधिक पेटी पर 3% छूट",
    },
  },
  {
    id: "sku-03",
    code: "SKU-TE-250",
    nameEn: "Tea leaf 250 g, case of 40",
    nameHi: "चाय पत्ती 250 ग्राम (40 का कार्टन)",
    brand: "Assam Gold",
    piecesPerCase: 40,
    dealerPricePerPiecePaise: 11800, // ₹118.00
    hasPriceOverride: false,
    casePricePaise: 472000, // 40 * 11800 = ₹4,720.00
    gstRateBp: 500,
    stockCases: 0, // OUT OF STOCK
    imageKey: "tea-leaf",
    scheme: null,
  },
  {
    id: "sku-04",
    code: "SKU-BS-150",
    nameEn: "Glucose biscuit 150 g, case of 48",
    nameHi: "ग्लूकोज बिस्कुट 150 ग्राम (48 का कार्टन)",
    brand: "Parle Food",
    piecesPerCase: 48,
    dealerPricePerPiecePaise: 1550,
    hasPriceOverride: false,
    casePricePaise: 74400,
    gstRateBp: 1800,
    stockCases: 120,
    imageKey: "glucose-biscuit",
    scheme: null,
  },
  {
    id: "sku-05",
    code: "SKU-TE-500",
    nameEn: "Tea leaf 500 g, case of 20",
    nameHi: "चाय पत्ती 500 ग्राम (20 का कार्टन)",
    brand: "Assam Gold",
    piecesPerCase: 20,
    dealerPricePerPiecePaise: 23000,
    hasPriceOverride: false,
    casePricePaise: 460000,
    gstRateBp: 500,
    stockCases: 45,
    imageKey: "tea-leaf",
    scheme: null,
  },
];

