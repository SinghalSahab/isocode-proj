/**
 * Tally Export Generator (XML & CSV).
 *
 * Implements Assumption A11 (A-TALLY-SCHEMA) and A4 (A-GST-FREE-GOODS):
 * Generates Tally-importable XML Sales Order vouchers and standard CSV exports.
 * Bonus free goods are generated with 0 rate and 0 taxable amount.
 * All amounts match to the integer paisa.
 */

import { paiseToRupees } from "../money/paise";

export interface TallyExportLine {
  skuCode: string;
  skuName: string;
  orderedQty: number;
  freeQty: number;
  casePricePaise: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPaise: number;
}

export interface TallyExportOrder {
  orderNo: string;
  placedAt: Date;
  retailerShopName: string;
  retailerOwnerName: string;
  retailerPhone: string;
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  totalPaise: number;
  lines: TallyExportLine[];
}

/**
 * Escapes reserved XML characters.
 */
export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a Date to Tally's standard YYYYMMDD string format.
 */
export function formatTallyDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Generates standard Tally Sales Order XML vouchers.
 */
export function generateTallyXml(orders: TallyExportOrder[]): string {
  const vouchersXml = orders
    .map((order) => {
      const tallyDate = formatTallyDate(new Date(order.placedAt));
      const ledgerName = escapeXml(order.retailerShopName);
      const voucherNo = escapeXml(order.orderNo);
      const orderTotalRupees = paiseToRupees(order.totalPaise).toFixed(2);

      const itemsXml = order.lines
        .map((line) => {
          const itemCode = escapeXml(line.skuCode);
          const itemName = escapeXml(line.skuName);
          const rateRupees = paiseToRupees(line.casePricePaise).toFixed(2);
          const billedQty = line.orderedQty;
          const actualQty = line.orderedQty + line.freeQty;
          const lineNetRupees = paiseToRupees(line.netPaise).toFixed(2);

          let lineXml = `        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${itemCode} - ${itemName}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <RATE>${rateRupees}/case</RATE>
          <ACTUALQTY>${actualQty} cases</ACTUALQTY>
          <BILLEDQTY>${billedQty} cases</BILLEDQTY>
          <AMOUNT>${lineNetRupees}</AMOUNT>`;

          // Include discount ledger entry if scheme discount applied
          if (line.discountPaise > 0) {
            const discRupees = paiseToRupees(line.discountPaise).toFixed(2);
            lineXml += `
          <DISCOUNT>${discRupees}</DISCOUNT>`;
          }

          // Document free goods explicitly if present
          if (line.freeQty > 0) {
            lineXml += `
          <BATCHALLOCATIONS.LIST>
            <FREEQTY>${line.freeQty} cases</FREEQTY>
            <BILLEDQTY>${line.orderedQty} cases</BILLEDQTY>
          </BATCHALLOCATIONS.LIST>`;
          }

          lineXml += `
        </ALLINVENTORYENTRIES.LIST>`;
          return lineXml;
        })
        .join("\n");

      return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Sales Order" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>Sales Order</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${ledgerName}</PARTYLEDGERNAME>
        <PARTYNAME>${ledgerName}</PARTYNAME>
        <NARRATION>Order placed via Distributor Retailer Portal. Total: Rs ${orderTotalRupees}</NARRATION>
${itemsXml}
      </VOUCHER>
    </TALLYMESSAGE>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <DATA>
${vouchersXml}
    </DATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Escapes CSV field value adhering to RFC 4180.
 */
export function escapeCsvField(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 CSV export of orders and line items.
 */
export function generateTallyCsv(orders: TallyExportOrder[]): string {
  const headers = [
    "Order No",
    "Order Date",
    "Shop Name",
    "Owner Name",
    "Phone",
    "SKU Code",
    "SKU Name",
    "Ordered Qty (Cases)",
    "Free Qty (Cases)",
    "Dispatch Qty (Cases)",
    "Case Price (INR)",
    "Gross (INR)",
    "Scheme Discount (INR)",
    "Net (INR)",
    "GST (INR)",
    "Line Total (INR)",
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(",")];

  for (const order of orders) {
    const dateStr = new Date(order.placedAt).toISOString().split("T")[0];

    for (const line of order.lines) {
      const lineTotal = line.netPaise + line.gstPaise;
      const row = [
        order.orderNo,
        dateStr,
        order.retailerShopName,
        order.retailerOwnerName,
        order.retailerPhone,
        line.skuCode,
        line.skuName,
        line.orderedQty,
        line.freeQty,
        line.orderedQty + line.freeQty,
        paiseToRupees(line.casePricePaise).toFixed(2),
        paiseToRupees(line.grossPaise).toFixed(2),
        paiseToRupees(line.discountPaise).toFixed(2),
        paiseToRupees(line.netPaise).toFixed(2),
        paiseToRupees(line.gstPaise).toFixed(2),
        paiseToRupees(lineTotal).toFixed(2),
      ];
      rows.push(row.map(escapeCsvField).join(","));
    }
  }

  return rows.join("\n");
}

