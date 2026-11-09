import fs from "fs";
import path from "path";

const products = [
  { key: "biscuit-75g", bg: "#F59E0B", brand: "Sunfeast Fictional", name: "GLUCOSE", weight: "75g", shape: "pack" },
  { key: "detergent-1kg", bg: "#0284C7", brand: "CleanPro Fictional", name: "DETERGENT", weight: "1kg", shape: "box" },
  { key: "tea-250g", bg: "#059669", brand: "GreenValley", name: "TEA LEAF", weight: "250g", shape: "pack" },
  { key: "biscuit-150g", bg: "#D97706", brand: "Sunfeast Fictional", name: "GLUCOSE XL", weight: "150g", shape: "pack" },
  { key: "detergent-500g", bg: "#0EA5E9", brand: "CleanPro Fictional", name: "DETERGENT", weight: "500g", shape: "box" },
  { key: "tea-500g", bg: "#047857", brand: "GreenValley", name: "TEA LEAF", weight: "500g", shape: "pack" },
  { key: "noodles-70g", bg: "#DC2626", brand: "QuickBite", name: "NOODLES", weight: "70g", shape: "pack" },
  { key: "soap-125g", bg: "#E11D48", brand: "PureCare", name: "BATH SOAP", weight: "125g", shape: "bar" },
  { key: "dishwash-500ml", bg: "#84CC16", brand: "CleanPro Fictional", name: "DISHWASH GEL", weight: "500ml", shape: "bottle" },
  { key: "oil-1l", bg: "#CA8A04", brand: "GoldenHarvest", name: "MUSTARD OIL", weight: "1L", shape: "bottle" },
];

const dir = path.join(process.cwd(), "public/products");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (const p of products) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <rect width="200" height="200" rx="16" fill="#F8F9FA"/>
  <rect x="35" y="30" width="130" height="140" rx="12" fill="${p.bg}" stroke="#E5E7EB" stroke-width="2"/>
  <rect x="45" y="45" width="110" height="110" rx="8" fill="#FFFFFF" fill-opacity="0.2"/>
  <text x="100" y="75" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${p.brand.toUpperCase()}</text>
  <text x="100" y="105" font-family="system-ui, sans-serif" font-size="16" font-weight="800" fill="#FFFFFF" text-anchor="middle">${p.name}</text>
  <rect x="65" y="125" width="70" height="24" rx="12" fill="#FFFFFF"/>
  <text x="100" y="141" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#1F2937" text-anchor="middle">${p.weight}</text>
</svg>`;
  fs.writeFileSync(path.join(dir, `${p.key}.svg`), svg);
}

console.log("Generated product SVGs successfully.");

