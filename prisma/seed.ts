import { PrismaClient, Role, OrderStatus, OrderSource, SchemeKind } from "@prisma/client";
import { rupeesToPaise } from "../lib/money/paise";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding FMCG Distributor database (idempotent)...");

  // 1. Users: Salesman & Desk Users
  const salesman = await prisma.user.upsert({
    where: { phone: "9000000020" },
    update: {},
    create: {
      phone: "9000000020",
      name: "Vikram Singh (Field Sales)",
      role: Role.salesman,
      preferredLang: "hi",
    },
  });

  const desk1 = await prisma.user.upsert({
    where: { phone: "9000000010" },
    update: {},
    create: {
      phone: "9000000010",
      name: "Amit Deshmukh (Order Desk)",
      role: Role.desk,
      preferredLang: "en",
    },
  });

  const desk2 = await prisma.user.upsert({
    where: { phone: "9000000011" },
    update: {},
    create: {
      phone: "9000000011",
      name: "Neha Jain (Order Desk)",
      role: Role.desk,
      preferredLang: "hi",
    },
  });

  // 2. Retailers & Retailer Users
  const retailersData = [
    {
      phone: "9000000001",
      shopName: "Gupta Kirana Store",
      ownerName: "Ramesh Gupta",
      addressLine: "Shop 12, Gorakhpur Main Market",
      city: "Jabalpur",
      creditLimitPaise: rupeesToPaise(100000), // ₹1,00,000
      outstandingPaise: rupeesToPaise(15000), // ₹15,000
      preferredLang: "hi",
    },
    {
      phone: "9000000002",
      shopName: "Sharma Provision Store",
      ownerName: "Suresh Sharma",
      addressLine: "Plot 4, Wright Town",
      city: "Jabalpur",
      creditLimitPaise: rupeesToPaise(50000), // ₹50,000 limit
      outstandingPaise: rupeesToPaise(47500), // ₹47,500 used (Only ₹2,500 available -> DEMO CREDIT HOLD!)
      preferredLang: "hi",
    },
    {
      phone: "9000000003",
      shopName: "Mahalaxmi Super Mart",
      ownerName: "Priya Patel",
      addressLine: "Shop 8, Napier Town",
      city: "Jabalpur",
      creditLimitPaise: rupeesToPaise(150000), // ₹1,50,000
      outstandingPaise: rupeesToPaise(30000), // ₹30,000
      preferredLang: "en",
    },
    {
      phone: "9000000004",
      shopName: "Verma Daily Needs",
      ownerName: "Rajesh Verma",
      addressLine: "Ghamapur Chowk",
      city: "Jabalpur",
      creditLimitPaise: rupeesToPaise(40000), // ₹40,000
      outstandingPaise: rupeesToPaise(10000), // ₹10,000
      preferredLang: "hi",
    },
    {
      phone: "9000000005",
      shopName: "Jabalpur Traders & Grocers",
      ownerName: "Manoj Tiwari",
      addressLine: "Civic Centre Complex",
      city: "Jabalpur",
      creditLimitPaise: rupeesToPaise(80000),
      outstandingPaise: rupeesToPaise(20000),
      preferredLang: "en",
    },
    {
      phone: "9000000006",
      shopName: "Kisan Kirana Bhandar",
      ownerName: "Sunita Yadav",
      addressLine: "Adhartal By-pass",
      city: "Jabalpur",
      creditLimitPaise: rupeesToPaise(60000),
      outstandingPaise: rupeesToPaise(5000),
      preferredLang: "hi",
    },
  ];

  const seededRetailers: Record<string, string> = {};

  for (const r of retailersData) {
    const retailer = await prisma.retailer.upsert({
      where: { phone: r.phone },
      update: {
        shopName: r.shopName,
        ownerName: r.ownerName,
        creditLimitPaise: r.creditLimitPaise,
        outstandingPaise: r.outstandingPaise,
      },
      create: {
        phone: r.phone,
        shopName: r.shopName,
        ownerName: r.ownerName,
        addressLine: r.addressLine,
        city: r.city,
        creditLimitPaise: r.creditLimitPaise,
        outstandingPaise: r.outstandingPaise,
        salesmanUserId: salesman.id,
      },
    });

    seededRetailers[r.phone] = retailer.id;

    await prisma.user.upsert({
      where: { phone: r.phone },
      update: {
        name: r.ownerName,
        retailerId: retailer.id,
        preferredLang: r.preferredLang,
      },
      create: {
        phone: r.phone,
        name: r.ownerName,
        role: Role.retailer,
        retailerId: retailer.id,
        preferredLang: r.preferredLang,
      },
    });
  }

  // 3. SKUs: The 3 core brief items + 7 fictional realistic items
  const skusData = [
    // --- EXACT 3 BRIEF ITEMS ---
    {
      code: "SKU-BS-075",
      nameEn: "Glucose biscuit 75 g, case of 96",
      nameHi: "ग्लूकोज बिस्कुट 75 ग्राम, 96 का कार्टन",
      brand: "Sunfeast Fictional",
      piecesPerCase: 96,
      dealerPricePerPiecePaise: rupeesToPaise(8.1), // ₹8.10 -> ₹777.60/case
      gstRateBp: 1800, // 18%
      stockCases: 340,
      imageKey: "biscuit-75g",
      keywords: ["biscuit chhota", "chhota biscuit", "glucose 75", "parle g type", "glucose biscuit", "biskit"],
      scheme: {
        kind: SchemeKind.FREE_GOODS,
        configJson: { buyQty: 10, freeQty: 1, repeating: true },
        labelEn: "Buy 10 cases get 1 free",
        labelHi: "10 पेटी पर 1 पेटी फ्री",
      },
    },
    {
      code: "SKU-DT-1KG",
      nameEn: "Detergent powder 1 kg, case of 20",
      nameHi: "डिटर्जेंट पाउडर 1 किलो, 20 का कार्टन",
      brand: "CleanPro Fictional",
      piecesPerCase: 20,
      dealerPricePerPiecePaise: rupeesToPaise(101.5), // ₹101.50 -> ₹2,030.00/case
      gstRateBp: 1800, // 18%
      stockCases: 85,
      imageKey: "detergent-1kg",
      keywords: ["washing powder 1 kilo", "detergent 1kg", "surf 1kg", "safed powder", "washing powder", "surf"],
      scheme: {
        kind: SchemeKind.SLAB_DISCOUNT,
        configJson: {
          slabs: [{ minQty: 5, percentBp: 300 }],
        },
        labelEn: "3% off 5 or more cases",
        labelHi: "5 या अधिक पेटी पर 3% छूट",
      },
    },
    {
      code: "SKU-TE-250",
      nameEn: "Tea leaf 250 g, case of 40",
      nameHi: "चाय पत्ती 250 ग्राम, 40 का कार्टन",
      brand: "GreenValley",
      piecesPerCase: 40,
      dealerPricePerPiecePaise: rupeesToPaise(118.0), // ₹118.00 -> ₹4,720.00/case
      gstRateBp: 500, // 5%
      stockCases: 0, // OUT OF STOCK
      imageKey: "tea-250g",
      keywords: ["chai patti 250 wala", "chai patti 250", "tea 250g", "chay patti", "chai 250"],
      scheme: {
        kind: SchemeKind.NONE,
        configJson: {},
        labelEn: "No current scheme",
        labelHi: "कोई स्कीम नहीं",
      },
    },

    // --- EXTRA 7 FICTIONAL AMBIGUITY & TESTING ITEMS ---
    {
      code: "SKU-BS-150",
      nameEn: "Glucose biscuit 150 g, case of 48",
      nameHi: "ग्लूकोज बिस्कुट 150 ग्राम, 48 का कार्टन",
      brand: "Sunfeast Fictional",
      piecesPerCase: 48,
      dealerPricePerPiecePaise: rupeesToPaise(15.5),
      gstRateBp: 1800,
      stockCases: 120,
      imageKey: "biscuit-150g",
      keywords: ["biscuit bada", "bada biscuit", "glucose 150", "glucose bada"],
      scheme: {
        kind: SchemeKind.FREE_GOODS,
        configJson: { buyQty: 10, freeQty: 1, repeating: true },
        labelEn: "Buy 10 cases get 1 free",
        labelHi: "10 पेटी पर 1 पेटी फ्री",
      },
    },
    {
      code: "SKU-DT-500",
      nameEn: "Detergent powder 500 g, case of 40",
      nameHi: "डिटर्जेंट पाउडर 500 ग्राम, 40 का कार्टन",
      brand: "CleanPro Fictional",
      piecesPerCase: 40,
      dealerPricePerPiecePaise: rupeesToPaise(54.0),
      gstRateBp: 1800,
      stockCases: 45,
      imageKey: "detergent-500g",
      keywords: ["washing powder aadha kilo", "detergent 500g", "chhota surf", "surf aadha kilo"],
      scheme: {
        kind: SchemeKind.SLAB_DISCOUNT,
        configJson: {
          slabs: [
            { minQty: 5, percentBp: 200 }, // 2% off 5+
            { minQty: 10, percentBp: 500 }, // 5% off 10+
          ],
        },
        labelEn: "2% off 5+ cases, 5% off 10+ cases",
        labelHi: "5 पेटी पर 2%, 10 पेटी पर 5% छूट",
      },
    },
    {
      code: "SKU-TE-500",
      nameEn: "Tea leaf 500 g, case of 20",
      nameHi: "चाय पत्ती 500 ग्राम, 20 का कार्टन",
      brand: "GreenValley",
      piecesPerCase: 20,
      dealerPricePerPiecePaise: rupeesToPaise(225.0),
      gstRateBp: 500,
      stockCases: 60,
      imageKey: "tea-500g",
      keywords: ["chai patti aadha kilo", "chai patti 500", "tea 500g", "badi chai"],
      scheme: {
        kind: SchemeKind.NONE,
        configJson: {},
        labelEn: "No current scheme",
        labelHi: "कोई स्कीम नहीं",
      },
    },
    {
      code: "SKU-ND-070",
      nameEn: "Instant Noodles 70 g, case of 96",
      nameHi: "इंस्टेंट नूडल्स 70 ग्राम, 96 का कार्टन",
      brand: "QuickBite",
      piecesPerCase: 96,
      dealerPricePerPiecePaise: rupeesToPaise(12.0),
      gstRateBp: 1800,
      stockCases: 6, // Low stock!
      imageKey: "noodles-70g",
      keywords: ["maggi type noodles", "noodles", "quick noodles 70g", "noodle"],
      scheme: {
        kind: SchemeKind.FREE_GOODS,
        configJson: { buyQty: 12, freeQty: 1, repeating: true },
        labelEn: "Buy 12 cases get 1 free",
        labelHi: "12 पेटी पर 1 पेटी फ्री",
      },
    },
    {
      code: "SKU-SP-125",
      nameEn: "Bath Soap 125 g, case of 72",
      nameHi: "नहाने का साबुन 125 ग्राम, 72 का कार्टन",
      brand: "PureCare",
      piecesPerCase: 72,
      dealerPricePerPiecePaise: rupeesToPaise(32.0),
      gstRateBp: 1800,
      stockCases: 11, // Low stock!
      imageKey: "soap-125g",
      keywords: ["nahane ka sabun", "soap", "beauty soap 125g", "sabun"],
      scheme: {
        kind: SchemeKind.SLAB_DISCOUNT,
        configJson: {
          slabs: [{ minQty: 6, percentBp: 400 }],
        },
        labelEn: "4% off 6 or more cases",
        labelHi: "6 या अधिक पेटी पर 4% छूट",
      },
    },
    {
      code: "SKU-DW-500",
      nameEn: "Dishwash Gel 500 ml, case of 24",
      nameHi: "बर्तन धोने का जेल 500 मिली, 24 का कार्टन",
      brand: "CleanPro Fictional",
      piecesPerCase: 24,
      dealerPricePerPiecePaise: rupeesToPaise(85.0),
      gstRateBp: 1800,
      stockCases: 90,
      imageKey: "dishwash-500ml",
      keywords: ["bartan dhone ka gel", "dishwash 500ml", "bartan bar", "dishwash gel"],
      scheme: {
        kind: SchemeKind.NONE,
        configJson: {},
        labelEn: "No current scheme",
        labelHi: "कोई स्कीम नहीं",
      },
    },
    {
      code: "SKU-OL-1L",
      nameEn: "Mustard Cooking Oil 1 L, case of 16",
      nameHi: "सरसों का तेल 1 लीटर, 16 का कार्टन",
      brand: "GoldenHarvest",
      piecesPerCase: 16,
      dealerPricePerPiecePaise: rupeesToPaise(135.0),
      gstRateBp: 500, // 5%
      stockCases: 35,
      imageKey: "oil-1l",
      keywords: ["sarson tel", "mustard oil 1l", "cooking oil", "sarson ka tel 1 litre"],
      scheme: {
        kind: SchemeKind.FREE_GOODS,
        configJson: { buyQty: 15, freeQty: 1, repeating: true },
        labelEn: "Buy 15 cases get 1 free",
        labelHi: "15 पेटी पर 1 पेटी फ्री",
      },
    },
  ];

  const seededSkus: Record<string, string> = {};

  for (const s of skusData) {
    const sku = await prisma.sku.upsert({
      where: { code: s.code },
      update: {
        nameEn: s.nameEn,
        nameHi: s.nameHi,
        brand: s.brand,
        piecesPerCase: s.piecesPerCase,
        dealerPricePerPiecePaise: s.dealerPricePerPiecePaise,
        gstRateBp: s.gstRateBp,
        stockCases: s.stockCases,
        imageKey: s.imageKey,
      },
      create: {
        code: s.code,
        nameEn: s.nameEn,
        nameHi: s.nameHi,
        brand: s.brand,
        piecesPerCase: s.piecesPerCase,
        dealerPricePerPiecePaise: s.dealerPricePerPiecePaise,
        gstRateBp: s.gstRateBp,
        stockCases: s.stockCases,
        imageKey: s.imageKey,
      },
    });

    seededSkus[s.code] = sku.id;

    // Sku keywords
    for (const kw of s.keywords) {
      const existingKw = await prisma.skuKeyword.findFirst({
        where: { skuId: sku.id, keywordNormalised: kw.toLowerCase().trim() },
      });
      if (!existingKw) {
        await prisma.skuKeyword.create({
          data: {
            skuId: sku.id,
            keywordNormalised: kw.toLowerCase().trim(),
            language: "hi",
          },
        });
      }
    }

    // Sku scheme
    const existingScheme = await prisma.scheme.findFirst({
      where: { skuId: sku.id },
    });
    if (existingScheme) {
      await prisma.scheme.update({
        where: { id: existingScheme.id },
        data: {
          kind: s.scheme.kind,
          configJson: s.scheme.configJson,
          labelEn: s.scheme.labelEn,
          labelHi: s.scheme.labelHi,
        },
      });
    } else {
      await prisma.scheme.create({
        data: {
          skuId: sku.id,
          kind: s.scheme.kind,
          configJson: s.scheme.configJson,
          labelEn: s.scheme.labelEn,
          labelHi: s.scheme.labelHi,
        },
      });
    }
  }

  // 4. Retailer Price Override (Mahalaxmi Super Mart gets Glucose 75g at ₹7.80 instead of ₹8.10)
  const r3Id = seededRetailers["9000000003"];
  const biscuitSkuId = seededSkus["SKU-BS-075"];
  if (r3Id && biscuitSkuId) {
    await prisma.retailerPrice.upsert({
      where: {
        retailerId_skuId: {
          retailerId: r3Id,
          skuId: biscuitSkuId,
        },
      },
      update: {
        pricePerPiecePaise: rupeesToPaise(7.8),
      },
      create: {
        retailerId: r3Id,
        skuId: biscuitSkuId,
        pricePerPiecePaise: rupeesToPaise(7.8), // ₹7.80
      },
    });
  }

  // 5. Retailer Aliases (e.g. for Gupta Kirana: "chhota biscuit" -> SKU-BS-075)
  const r1Id = seededRetailers["9000000001"];
  if (r1Id && biscuitSkuId) {
    await prisma.retailerAlias.upsert({
      where: {
        retailerId_phraseNormalised: {
          retailerId: r1Id,
          phraseNormalised: "chhota biscuit",
        },
      },
      update: {},
      create: {
        retailerId: r1Id,
        phraseNormalised: "chhota biscuit",
        skuId: biscuitSkuId,
        timesConfirmed: 3,
      },
    });
  }

  // 6. Historical Orders (to support repeat order, past context, and order queue demo)
  const existingOrdersCount = await prisma.order.count();
  if (existingOrdersCount === 0) {
    console.log("Seeding initial historical orders for realistic queue & analytics...");

    // Order 1: Confirmed order from Gupta Kirana (placed 2 days ago)
    const order1 = await prisma.order.create({
      data: {
        orderNo: "ORD-20261107-0001",
        retailerId: r1Id,
        status: OrderStatus.CONFIRMED,
        source: OrderSource.app,
        idempotencyKey: "seed-order-1-key",
        subtotalPaise: 77760 * 10, // 10 cases biscuit = ₹7,776.00
        discountPaise: 0,
        gstPaise: Math.round(77760 * 10 * 0.18),
        totalPaise: Math.round(77760 * 10 * 1.18),
        placedAt: new Date(Date.now() - 2 * 86400 * 1000),
        confirmedAt: new Date(Date.now() - 2 * 86400 * 1000 + 3600 * 1000),
        confirmedBy: desk1.id,
        lines: {
          create: [
            {
              skuId: biscuitSkuId,
              orderedQty: 10,
              freeQty: 1, // Buy 10 get 1 free
              casePricePaiseSnapshot: 77760,
              grossPaise: 777600,
              discountPaise: 0,
              gstPaise: Math.round(777600 * 0.18),
              netPaise: 777600,
              schemeSnapshotJson: { kind: "FREE_GOODS", buyQty: 10, freeQty: 1 },
            },
          ],
        },
        events: {
          create: [
            {
              actorUserId: null,
              type: "ORDER_PLACED",
              payloadJson: { source: "app", lines: 1 },
              at: new Date(Date.now() - 2 * 86400 * 1000),
            },
            {
              actorUserId: desk1.id,
              type: "STATUS_CHANGE",
              payloadJson: { from: "PENDING_REVIEW", to: "CONFIRMED" },
              at: new Date(Date.now() - 2 * 86400 * 1000 + 3600 * 1000),
            },
          ],
        },
      },
    });

    // Order 2: PENDING_REVIEW order in queue for Desk demo
    await prisma.order.create({
      data: {
        orderNo: "ORD-20261109-0002",
        retailerId: r1Id,
        status: OrderStatus.PENDING_REVIEW,
        source: OrderSource.ai_text,
        idempotencyKey: "seed-order-2-key",
        subtotalPaise: 203000 * 5, // 5 cases detergent = ₹10,150.00
        discountPaise: 30450, // 3% off = ₹304.50
        gstPaise: Math.round((1015000 - 30450) * 0.18), // 18% of 9845.50 = 1772.19
        totalPaise: 984550 + Math.round((1015000 - 30450) * 0.18),
        placedAt: new Date(Date.now() - 3600 * 1000),
        lines: {
          create: [
            {
              skuId: seededSkus["SKU-DT-1KG"],
              orderedQty: 5,
              freeQty: 0,
              casePricePaiseSnapshot: 203000,
              grossPaise: 1015000,
              discountPaise: 30450,
              gstPaise: Math.round((1015000 - 30450) * 0.18),
              netPaise: 984550,
              schemeSnapshotJson: { kind: "SLAB_DISCOUNT", percentBp: 300 },
              originalText: "2 peti washing powder 1 kilo",
              aiConfidence: "High",
            },
          ],
        },
        events: {
          create: [
            {
              actorUserId: null,
              type: "ORDER_PLACED",
              payloadJson: { source: "ai_text" },
              at: new Date(Date.now() - 3600 * 1000),
            },
          ],
        },
      },
    });

    // Order 3: CREDIT_HOLD order for Desk demo
    const r2Id = seededRetailers["9000000002"]; // Sharma Provision Store
    await prisma.order.create({
      data: {
        orderNo: "ORD-20261109-0003",
        retailerId: r2Id,
        status: OrderStatus.CREDIT_HOLD,
        source: OrderSource.app,
        idempotencyKey: "seed-order-3-key",
        subtotalPaise: 203000 * 2,
        discountPaise: 0,
        gstPaise: Math.round(406000 * 0.18),
        totalPaise: Math.round(406000 * 1.18),
        holdReason: "Order total exceeds available credit limit (Limit: ₹50,000, Outstanding: ₹47,500, Order: ₹4,790.80)",
        placedAt: new Date(Date.now() - 1800 * 1000),
        lines: {
          create: [
            {
              skuId: seededSkus["SKU-DT-1KG"],
              orderedQty: 2,
              freeQty: 0,
              casePricePaiseSnapshot: 203000,
              grossPaise: 406000,
              discountPaise: 0,
              gstPaise: Math.round(406000 * 0.18),
              netPaise: 406000,
              schemeSnapshotJson: { kind: "NONE" },
            },
          ],
        },
        events: {
          create: [
            {
              actorUserId: null,
              type: "ORDER_PLACED_CREDIT_HOLD",
              payloadJson: { reason: "Credit limit exceeded" },
              at: new Date(Date.now() - 1800 * 1000),
            },
          ],
        },
      },
    });

    // Order 4: REJECTED order with reason for Retailer & Desk demo
    await prisma.order.create({
      data: {
        orderNo: "ORD-20261106-0004",
        retailerId: r1Id,
        status: OrderStatus.REJECTED,
        source: OrderSource.app,
        idempotencyKey: "seed-order-4-key",
        subtotalPaise: 77760 * 2,
        discountPaise: 0,
        gstPaise: Math.round(155520 * 0.18),
        totalPaise: Math.round(155520 * 1.18),
        rejectReason: "Delivery route closed for this sector due to local road maintenance.",
        placedAt: new Date(Date.now() - 3 * 86400 * 1000),
        lines: {
          create: [
            {
              skuId: biscuitSkuId,
              orderedQty: 2,
              freeQty: 0,
              casePricePaiseSnapshot: 77760,
              grossPaise: 155520,
              discountPaise: 0,
              gstPaise: Math.round(155520 * 0.18),
              netPaise: 155520,
              schemeSnapshotJson: { kind: "NONE" },
            },
          ],
        },
        events: {
          create: [
            {
              actorUserId: desk1.id,
              type: "STATUS_CHANGE",
              payloadJson: {
                from: "PENDING_REVIEW",
                to: "REJECTED",
                reason: "Delivery route closed for this sector due to local road maintenance.",
              },
              at: new Date(Date.now() - 3 * 86400 * 1000 + 7200 * 1000),
            },
          ],
        },
      },
    });

    // Retailer 4 (Verma Daily Needs) placed order 22 days ago -> for 14-day inactivity test!
    const r4Id = seededRetailers["9000000004"];
    await prisma.order.create({
      data: {
        orderNo: "ORD-20261018-0005",
        retailerId: r4Id,
        status: OrderStatus.EXPORTED,
        source: OrderSource.app,
        idempotencyKey: "seed-order-5-key",
        subtotalPaise: 77760 * 5,
        discountPaise: 0,
        gstPaise: Math.round(388800 * 0.18),
        totalPaise: Math.round(388800 * 1.18),
        placedAt: new Date(Date.now() - 22 * 86400 * 1000),
        confirmedAt: new Date(Date.now() - 22 * 86400 * 1000 + 3600 * 1000),
        exportedAt: new Date(Date.now() - 22 * 86400 * 1000 + 7200 * 1000),
        lines: {
          create: [
            {
              skuId: biscuitSkuId,
              orderedQty: 5,
              freeQty: 0,
              casePricePaiseSnapshot: 77760,
              grossPaise: 388800,
              discountPaise: 0,
              gstPaise: Math.round(388800 * 0.18),
              netPaise: 388800,
              schemeSnapshotJson: { kind: "NONE" },
            },
          ],
        },
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error in seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

