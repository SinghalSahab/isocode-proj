import { describe, it, expect } from "vitest";
import {
  generateTallyXml,
  generateTallyCsv,
  escapeXml,
  escapeCsvField,
  formatTallyDate,
  TallyExportOrder,
} from "@/lib/tally/export";

describe("Tally Export Generator (Assumption A11 & A4)", () => {
  const sampleOrder: TallyExportOrder = {
    orderNo: "ORD-20261109-0001",
    placedAt: new Date("2026-11-09T10:30:00Z"),
    retailerShopName: "Gupta & Sons Kirana <Store> \"Jabalpur\"",
    retailerOwnerName: "Ramesh Gupta",
    retailerPhone: "9000000001",
    subtotalPaise: 777600 + 1015000,
    discountPaise: 30450,
    gstPaise: 139968 + 177219,
    totalPaise: 917568 + 1161769,
    lines: [
      {
        skuCode: "SKU-BS-075",
        skuName: "Glucose biscuit 75 g, case of 96",
        orderedQty: 10,
        freeQty: 1, // 1 free good
        casePricePaise: 77760,
        grossPaise: 777600,
        discountPaise: 0,
        netPaise: 777600,
        gstPaise: 139968,
      },
      {
        skuCode: "SKU-DT-1KG",
        skuName: "Detergent powder 1 kg, case of 20",
        orderedQty: 5,
        freeQty: 0,
        casePricePaise: 203000,
        grossPaise: 1015000,
        discountPaise: 30450, // 3% slab discount
        netPaise: 984550,
        gstPaise: 177219,
      },
    ],
  };

  it("escapes reserved XML characters correctly", () => {
    expect(escapeXml("Gupta & Sons <Kirana> 'Super' \"Store\"")).toBe(
      "Gupta &amp; Sons &lt;Kirana&gt; &apos;Super&apos; &quot;Store&quot;"
    );
  });

  it("formats dates adhering to Tally YYYYMMDD convention", () => {
    const d = new Date("2026-11-09T00:00:00Z");
    expect(formatTallyDate(d)).toBe("20261109");
  });

  it("generates well-formed Tally Sales Order XML", () => {
    const xml = generateTallyXml([sampleOrder]);

    // Check envelope headers
    expect(xml).toContain("<TALLYREQUEST>Import Data</TALLYREQUEST>");
    expect(xml).toContain('<VOUCHER VCHTYPE="Sales Order" ACTION="Create">');
    expect(xml).toContain("<VOUCHERNUMBER>ORD-20261109-0001</VOUCHERNUMBER>");

    // Check escaped party name
    expect(xml).toContain("<PARTYLEDGERNAME>Gupta &amp; Sons Kirana &lt;Store&gt; &quot;Jabalpur&quot;</PARTYLEDGERNAME>");

    // Check inventory lines
    expect(xml).toContain("<STOCKITEMNAME>SKU-BS-075 - Glucose biscuit 75 g, case of 96</STOCKITEMNAME>");
    expect(xml).toContain("<ACTUALQTY>11 cases</ACTUALQTY>"); // ordered 10 + 1 free
    expect(xml).toContain("<BILLEDQTY>10 cases</BILLEDQTY>");
    expect(xml).toContain("<FREEQTY>1 cases</FREEQTY>");

    // Check discount line
    expect(xml).toContain("<DISCOUNT>304.50</DISCOUNT>");

    // Verify all open tags have matching close tags
    const openEnvelope = (xml.match(/<ENVELOPE>/g) || []).length;
    const closeEnvelope = (xml.match(/<\/ENVELOPE>/g) || []).length;
    expect(openEnvelope).toBe(closeEnvelope);

    const openVoucher = (xml.match(/<VOUCHER /g) || []).length;
    const closeVoucher = (xml.match(/<\/VOUCHER>/g) || []).length;
    expect(openVoucher).toBe(closeVoucher);
  });

  it("generates RFC 4180 compliant CSV export", () => {
    const csv = generateTallyCsv([sampleOrder]);
    const lines = csv.split("\n");

    // Header row + 2 line item rows = 3 rows
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Order No,Order Date,Shop Name");

    // Line 1: Glucose biscuit with 1 free case
    expect(lines[1]).toContain("ORD-20261109-0001");
    expect(lines[1]).toContain("SKU-BS-075");
    expect(lines[1]).toContain(",10,1,11,"); // ordered 10, free 1, dispatch 11

    // Line 2: Detergent with discount
    expect(lines[2]).toContain("SKU-DT-1KG");
    expect(lines[2]).toContain(",5,0,5,");
    expect(lines[2]).toContain("304.50"); // discount ₹304.50

    // Test escaping of commas and quotes in CSV fields
    expect(escapeCsvField('Gupta, "Kirana"')).toBe('"Gupta, ""Kirana"""');
  });
});
