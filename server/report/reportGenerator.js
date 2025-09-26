const escapePdfText = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, "\\n");

const buildPdfBuffer = (lines) => {
  const contentLines = [
    "BT",
    "/F1 12 Tf",
    "14 TL",
    "72 750 Td"
  ];

  lines.forEach((line, index) => {
    if (index > 0) {
      contentLines.push("T*");
    }
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });

  contentLines.push("ET");

  const contentStream = contentLines.join("\n");
  const contentLength = Buffer.byteLength(contentStream, "utf8");

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>"
  );
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject(`<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`);

  const xref = [0];
  let body = "%PDF-1.4\n";

  objects.forEach((object, index) => {
    const position = Buffer.byteLength(body, "utf8");
    xref.push(position);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(body, "utf8");
  body += "xref\n";
  body += `0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";

  for (let i = 1; i < xref.length; i += 1) {
    body += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  }

  body += "trailer\n";
  body += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += "startxref\n";
  body += `${xrefStart}\n`;
  body += "%%EOF";

  return Buffer.from(body, "utf8");
};

const buildPreview = (session) => {
  const previewLines = [];
  const client = session.data.client ?? {};
  const preferences = session.data.preferences ?? {};

  previewLines.push(`Client: ${client.name ?? "Unknown"}`);
  previewLines.push(
    `ATR: ${client.risk?.atr ?? "—"} | CfL: ${client.risk?.cfl ?? "—"} | Horizon: ${client.risk?.horizon_years ?? "—"} years`
  );
  previewLines.push("");
  previewLines.push("Acknowledged informed choice: " +
    (session.data.acknowledgements?.read_informed_choice ? "Yes" : "No"));
  previewLines.push("");
  previewLines.push("Pathway allocations:");

  (preferences.pathways ?? []).forEach((pathway) => {
    const details = [];
    if (pathway.themes?.length) {
      details.push(`Themes: ${pathway.themes.join(", ")}`);
    }
    if (pathway.impact_goals?.length) {
      details.push(`Impact goals: ${pathway.impact_goals.join(", ")}`);
    }
    previewLines.push(
      `- ${pathway.name} — ${pathway.allocation_pct}%${
        details.length ? ` (${details.join("; ")})` : ""
      }`
    );
  });

  if (preferences.ethical?.enabled) {
    previewLines.push(
      `Ethical screens: ${preferences.ethical.exclusions.join(", ") || "None specified"}`
    );
  }

  previewLines.push(
    `Stewardship discretion: ${preferences.stewardship?.discretion ?? "fund_manager"}`
  );
  previewLines.push("");
  previewLines.push(
    `Products: ${(session.data.products ?? [])
      .map((item) => item.wrapper)
      .join(", ") || "Not specified"}`
  );
  previewLines.push("");
  previewLines.push("Adviser notes:");
  previewLines.push(session.data.adviser_notes || "To be confirmed");

  return previewLines.join("\n");
};

export const generateReportArtifacts = (session) => {
  const preview = buildPreview(session);
  const pdfBuffer = buildPdfBuffer(preview.split("\n"));

  return {
    preview,
    pdfBuffer
  };
};
