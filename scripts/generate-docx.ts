import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  convertInchesToTwip,
} from "docx";

function parseInlineFormatting(text: string, forceBold = false): TextRun[] {
  const runs: TextRun[] = [];
  // Tokenize bold (**text**), italic (*text*), inline code (`code`), or plain text
  // Regex to match markdown inline formats
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\)|[^*`[]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const chunk = match[0];
    if (chunk.startsWith("**") && chunk.endsWith("**") && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          bold: true,
          font: "Calibri",
        })
      );
    } else if (chunk.startsWith("*") && chunk.endsWith("*") && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          italics: true,
          bold: forceBold,
          font: "Calibri",
        })
      );
    } else if (chunk.startsWith("`") && chunk.endsWith("`") && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          font: "Consolas",
          size: 19, // ~9.5pt
          bold: forceBold,
          shading: {
            type: ShadingType.CLEAR,
            fill: "F1F5F9",
          },
        })
      );
    } else if (chunk.startsWith("[") && chunk.includes("](")) {
      const linkMatch = chunk.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        runs.push(
          new TextRun({
            text: linkMatch[1],
            color: "0F52BA",
            underline: {},
            bold: forceBold,
            font: "Calibri",
          })
        );
      } else {
        runs.push(new TextRun({ text: chunk, bold: forceBold, font: "Calibri" }));
      }
    } else {
      runs.push(new TextRun({ text: chunk, bold: forceBold, font: "Calibri" }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, bold: forceBold, font: "Calibri" })];
}

function createTableFromMarkdown(tableLines: string[]): Table {
  // Parse rows
  const cleanRows = tableLines.map((line) => {
    // split by pipe, trim outer
    const parts = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
    return parts.map((p) => p.trim());
  });

  // Filter out divider row (---)
  const dataRows = cleanRows.filter(
    (row) => !row.every((cell) => /^[:\s-]+$/.test(cell))
  );

  const numCols = Math.max(...dataRows.map((r) => r.length));
  const colWidthPct = Math.floor(100 / (numCols || 1));

  const tableRows: TableRow[] = dataRows.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const cells: TableCell[] = [];

    for (let c = 0; c < numCols; c++) {
      const cellText = row[c] || "";
      const inlineRuns = parseInlineFormatting(cellText, isHeader);

      cells.push(
        new TableCell({
          width: {
            size: colWidthPct,
            type: WidthType.PERCENTAGE,
          },
          shading: isHeader
            ? {
                type: ShadingType.CLEAR,
                fill: "E2E8F0",
              }
            : rowIndex % 2 === 1
            ? {
                type: ShadingType.CLEAR,
                fill: "F8FAFC",
              }
            : undefined,
          margins: {
            top: 100,
            bottom: 100,
            left: 150,
            right: 150,
          },
          children: [
            new Paragraph({
              children: inlineRuns,
              spacing: { after: 40, before: 40 },
            }),
          ],
        })
      );
    }

    return new TableRow({
      children: cells,
      tableHeader: isHeader,
    });
  });

  return new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    },
  });
}

function cleanMathFormula(rawMath: string): string {
  return rawMath
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\quad/g, "  ")
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\le/g, "≤")
    .replace(/\\ge/g, "≥")
    .replace(/\\to/g, "→")
    .replace(/\\left\lfloor\s*/g, "floor(")
    .replace(/\\right\rfloor/g, ")")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
    .replace(/\\hline/g, "--------------------------------------------------------")
    .replace(/\\\\/g, "\n")
    .replace(/&/g, "")
    .replace(/\\begin\{aligned\}/g, "")
    .replace(/\\end\{aligned\}/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "");
}

async function generateDocx() {
  const tddPath = path.join(process.cwd(), "docs", "TDD.md");
  const outPath = path.join(process.cwd(), "docs", "TDD.docx");

  console.log(`Reading TDD markdown from: ${tddPath}`);
  const content = fs.readFileSync(tddPath, "utf-8");
  const lines = content.split("\n");

  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^---$/.test(line.trim())) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: {
              color: "CBD5E1",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );
      i++;
      continue;
    }

    // Code Block or Mermaid block
    if (line.trim().startsWith("```")) {
      const codeType = line.trim().slice(3).trim();
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip ending ```

      const codeHeader = codeType ? `[${codeType.toUpperCase()} DEFINITION / CODE]` : "[CODE BLOCK]";
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeHeader,
              bold: true,
              size: 18,
              font: "Consolas",
              color: "475569",
            }),
          ],
          spacing: { before: 160, after: 60 },
        })
      );

      const codeParas = codeLines.map(
        (cl) =>
          new Paragraph({
            children: [
              new TextRun({
                text: cl.length === 0 ? " " : cl,
                font: "Consolas",
                size: 18, // 9pt
                color: "1E293B",
              }),
            ],
            spacing: { before: 20, after: 20 },
            shading: {
              type: ShadingType.CLEAR,
              fill: "F8FAFC",
            },
            indent: { left: convertInchesToTwip(0.2) },
          })
      );
      children.push(...codeParas);
      continue;
    }

    // Math block ($$ ... $$)
    if (line.trim().startsWith("$$")) {
      const mathLines: string[] = [line];
      if (!line.trim().endsWith("$$") || line.trim() === "$$") {
        i++;
        while (i < lines.length && !lines[i].trim().endsWith("$$")) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i]);
          i++;
        }
      } else {
        i++;
      }

      const formulaText = cleanMathFormula(mathLines.join("\n"));
      const formulaLines = formulaText.split("\n").filter((l) => l.trim().length > 0);

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "[MATHEMATICAL FORMULATION]",
              bold: true,
              size: 18,
              font: "Consolas",
              color: "1F6F4A",
            }),
          ],
          spacing: { before: 160, after: 60 },
        })
      );

      formulaLines.forEach((fl) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: fl.trim(),
                font: "Consolas",
                size: 20, // 10pt
                bold: true,
                color: "0F172A",
              }),
            ],
            spacing: { before: 40, after: 40 },
            shading: {
              type: ShadingType.CLEAR,
              fill: "F0FDF4",
            },
            indent: { left: convertInchesToTwip(0.25) },
          })
        );
      });
      continue;
    }

    // Markdown Table
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      children.push(createTableFromMarkdown(tableLines));
      children.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#\s+/, ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 320, after: 120 },
        })
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^##\s+/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 260, after: 100 },
        })
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^###\s+/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      );
      i++;
      continue;
    }
    if (line.startsWith("#### ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^####\s+/, ""),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 160, after: 60 },
        })
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line.trim())) {
      const itemText = line.trim().replace(/^[-*]\s+/, "");
      children.push(
        new Paragraph({
          children: parseInlineFormatting(itemText),
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const itemText = line.trim().replace(/^\d+\.\s+/, "");
      const numMatch = line.trim().match(/^(\d+)\.\s+/);
      const prefix = numMatch ? `${numMatch[1]}. ` : "• ";
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: prefix, bold: true, font: "Calibri" }),
            ...parseInlineFormatting(itemText),
          ],
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { before: 40, after: 40 },
        })
      );
      i++;
      continue;
    }

    // Normal paragraph
    children.push(
      new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { before: 60, after: 60 },
      })
    );
    i++;
  }

  const doc = new Document({
    title: "Technical Design Document (TDD) - FMCG Retailer Ordering App with AI Order Capture",
    description: "Detailed system architecture and specifications for Company A, Jabalpur",
    creator: "Senior Full-Stack Engineer",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  const stats = fs.statSync(outPath);
  console.log(`Successfully generated ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

generateDocx().catch((err) => {
  console.error("Error generating docx:", err);
  process.exit(1);
});
