function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function createSimplePdf(title: string, lines: string[]) {
  const contentLines = [
    "BT",
    "/F1 18 Tf",
    "50 800 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 12 Tf",
    "0 -28 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["0 -18 Td", `(${escapePdfText(line)}) Tj`],
    ),
    "ET",
  ];

  const stream = contentLines.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  const header = "%PDF-1.4\n";
  let body = "";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(header + body, "utf8"));
    body += object;
  }

  const xrefStart = Buffer.byteLength(header + body, "utf8");
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`),
  ].join("");

  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(header + body + xref + trailer, "utf8");
}
