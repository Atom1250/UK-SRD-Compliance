import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "../spec/suitability_report_template.md");

const loadTemplate = () => readFileSync(TEMPLATE_PATH, "utf8");

const getValue = (obj, pathExpression) =>
  pathExpression.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

const renderTemplate = (template, context) =>
  template.replace(/{{\s*([^}]+)\s*}}/g, (_, expression) => {
    const value = getValue(context, expression.trim());
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });

const formatExclusions = (exclusions = []) =>
  exclusions.length === 0
    ? "None specified"
    : exclusions
        .map((item) =>
          item.threshold != null
            ? `${item.sector} (<${item.threshold}%)`
            : item.sector
        )
        .join(", ");

const buildTemplateContext = (session) => {
  const profile = session.data.client_profile ?? {};
  const prefs = session.data.sustainability_preferences ?? {};
  const outcome = session.data.advice_outcome ?? {};

  return {
    client_profile: {
      ...profile,
      knowledge_experience: {
        summary: profile.knowledge_experience?.summary ?? ""
      }
    },
    sustainability_preferences: {
      ...prefs,
      labels_interest:
        (prefs.labels_interest ?? []).length > 0
          ? prefs.labels_interest.join(", ")
          : "None specified",
      themes:
        (prefs.themes ?? []).length > 0
          ? prefs.themes.join(", ")
          : "None specified",
      exclusions: formatExclusions(prefs.exclusions ?? []),
      impact_goals:
        (prefs.impact_goals ?? []).length > 0
          ? prefs.impact_goals.join(", ")
          : "None specified",
      engagement_importance: prefs.engagement_importance || "Not specified",
      reporting_frequency_pref: prefs.reporting_frequency_pref || "none",
      tradeoff_tolerance: prefs.tradeoff_tolerance || "Not specified"
    },
    advice_outcome: {
      recommendation: outcome.recommendation ?? "",
      rationale: outcome.rationale ?? "",
      sust_fit: outcome.sust_fit ?? "",
      costs_summary: outcome.costs_summary ?? ""
    }
  };
};

export const generateReportArtifacts = (session) => {
  const template = loadTemplate();
  const context = buildTemplateContext(session);
  const rendered = renderTemplate(template, context);
  const pdfBuffer = buildPdfBuffer(rendered.split(/\r?\n/));
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");

  return {
    preview: rendered,
    pdfBuffer,
    hash
  };
};
