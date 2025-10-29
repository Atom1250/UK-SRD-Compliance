// Educational PDF Generator aligned with ESG & SDR Educational Pack v2.0
// Produces single-module explainers and a comprehensive pack using the
// metadata and content defined in educationModules.js

import { createHash } from "node:crypto";
import {
  EDUCATION_MODULES,
  EDUCATION_PACK_METADATA,
  MICRO_MODULES,
  EDUCATION_INTENTS
} from "../state/educationModules.js";

const escapePdfText = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, "\\n");

const buildEducationalPdfBuffer = (title, contentLines) => {
  const lines = Array.isArray(contentLines) ? contentLines : contentLines.split("\n");

  const contentStreamParts = [
    "BT",
    "/F1 12 Tf",
    "14 TL",
    "72 750 Td"
  ];

  lines.forEach((line, index) => {
    if (index > 0) {
      contentStreamParts.push("T*");
    }
    contentStreamParts.push(`(${escapePdfText(line)}) Tj`);
  });

  contentStreamParts.push("ET");

  const contentStream = contentStreamParts.join("\n");
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

  let body = "%PDF-1.4\n";
  const xref = [0];

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

const buildDisclaimers = () => [
  "DISCLAIMERS",
  ...EDUCATION_PACK_METADATA.disclaimers,
  "Anti-greenwashing: claims must be correct, clear, complete and fair; visuals must not over-imply sustainability.",
  "Trade-offs: thematic or exclusionary strategies can impact diversification, risk/return and liquidity.",
  "Suitability & target market: apply COBS 9A and PROD 3 duties before acting on this information.",
  "Updates: sustainability data, labels and disclosures may change over time."
];

const formatModuleForPdf = (module) => [
  `${EDUCATION_PACK_METADATA.name}`,
  `Module: ${module.title}`,
  `Pack version: ${EDUCATION_PACK_METADATA.version} (${EDUCATION_PACK_METADATA.published_at})`,
  "Prepared for: ESG Client Interview Bot",
  "",
  "SUMMARY",
  module.summary,
  "",
  "DETAILED EXPLANATION",
  module.detailed_explanation || "Detailed explanation not available for this module.",
  "",
  "KEY INSIGHTS",
  module.deep_link ? `Deep link: ${module.deep_link}` : "Deep link: n/a",
  module.category ? `Category: ${module.category}` : "",
  module.comprehension_check ? `Comprehension check: ${module.comprehension_check}` : "",
  "",
  "REGULATORY CONTEXT",
  "- FCA Consumer Duty: fair, clear and not misleading customer information.",
  "- FCA SDR labels and anti-greenwashing guidance (FG24/3).",
  "- Suitability (COBS 9A) and Product Governance (PROD 3) obligations for advisers.",
  "",
  "NEXT STEPS",
  "- Discuss how this topic affects your objectives and preferences with your adviser.",
  "- Request supporting disclosures or PDF appendices if you need more depth.",
  "- Confirm any exclusions, trade-offs or monitoring preferences for your record.",
  "",
  ...buildDisclaimers(),
  "",
  `Generated: ${new Date().toISOString()}`,
  `Compliance reference: ${module.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${EDUCATION_PACK_METADATA.version}`
];

export const generateEducationalPdf = (moduleTitle) => {
  const module = EDUCATION_MODULES.find((m) => m.title === moduleTitle);
  if (!module) {
    throw new Error(`Educational module "${moduleTitle}" not found`);
  }

  const pdfBuffer = buildEducationalPdfBuffer(moduleTitle, formatModuleForPdf(module));
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");

  return {
    pdfBuffer,
    hash,
    filename: `esg-education-${module.slug}.pdf`,
    title: `${EDUCATION_PACK_METADATA.name} — ${module.title}`,
    generated_at: new Date().toISOString()
  };
};

const buildMicroModuleSummary = () => [
  "MICRO-MODULE QUICK REPLIES",
  ...MICRO_MODULES.map((micro) => `- ${micro.title}: ${micro.reply}`)
];

export const generateComprehensiveEducationPack = () => {
  const tableOfContents = [
    "ESG INVESTMENT EDUCATION PACK",
    `${EDUCATION_PACK_METADATA.name}`,
    `Version ${EDUCATION_PACK_METADATA.version} (${EDUCATION_PACK_METADATA.published_at})`,
    "",
    "TABLE OF CONTENTS",
    "1. Micro-modules (short replies)",
    "2. Intents & responses (Codex routing)",
    "3. Deep-dive educational content",
    "   3.1 What is ESG?",
    "   3.2 SDR Labels (UK FCA)",
    "   3.3 Anti-Greenwashing (FG24/3)",
    "   3.4 KBS Investment Choices (Preference Pathway)",
    "   3.5 How fund managers decide ‘sustainable’ investments",
    "   3.6 Suitability (COBS 9A)",
    "   3.7 Product Governance (PROD 3)",
    "   3.8 Disclosures & design for understanding",
    "   3.9 Glossary",
    "4. Appendix — PDF builder sections",
    "5. KBS records & templates mapping",
    "6. Disclaimers & compliance guardrails",
    "7. Sources"
  ];

  const moduleSections = EDUCATION_MODULES.map((module) => [
    "",
    module.title.toUpperCase(),
    "=".repeat(module.title.length),
    "",
    `Summary: ${module.summary}`,
    "",
    module.detailed_explanation ? module.detailed_explanation : "Detailed explanation not provided.",
    "",
    module.comprehension_check ? `Key question: ${module.comprehension_check}` : "",
    "─".repeat(60)
  ]).flat();

  const packContent = [
    ...tableOfContents,
    "",
    ...buildMicroModuleSummary(),
    "",
    "INTENTS & RESPONSES",
    ...EDUCATION_INTENTS.map((intent) => {
      const quickReplies = intent.quick_replies?.length ? `Quick replies: ${intent.quick_replies.join(', ')}` : "";
      return [
        `Intent: ${intent.intent}`,
        `Utterances: ${intent.utterances.join('; ')}`,
        `Reply: ${intent.reply_short}`,
        intent.deep_link ? `Deep link: ${intent.deep_link}` : "",
        quickReplies,
        ""
      ];
    }).flat(),
    "DEEP-DIVE CONTENT",
    ...moduleSections,
    "",
    "APPENDIX — PDF BUILDER SECTIONS",
    "1. What ESG is — and is not",
    "2. UK SDR labels (client-friendly overview)",
    "3. Anti-Greenwashing (FG24/3)",
    "4. Investment choices (KBS Preference Pathway)",
    "5. How fund managers decide",
    "6. Suitability (COBS 9A)",
    "7. Product governance (PROD 3)",
    "8. Designing disclosures",
    "9. Key client notices",
    "",
    "KBS RECORDS & TEMPLATES MAPPING",
    "- Informed Choice: Preference Pathway (client guide)",
    "- Preference Pathway Record (client & adviser)",
    "- Anti-Greenwashing Checklist (compliance)",
    "",
    ...buildDisclaimers(),
    "",
    "SOURCES (INTERNAL REFERENCE)",
    "- UK FCA: Sustainable investment labels & anti-greenwashing",
    "- UK FCA: FG24/3 Anti-Greenwashing Guidance",
    "- UK FCA: Occasional Paper 62 (behavioural disclosure design)",
    "- FCA Handbook: COBS 9A (suitability)",
    "- FCA Handbook: PROD 3 (product governance)",
    "- KBS Preference Pathway documentation",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Pack reference: ${EDUCATION_PACK_METADATA.id.toUpperCase()}-${EDUCATION_PACK_METADATA.version}`
  ];

  const pdfBuffer = buildEducationalPdfBuffer(
    "Comprehensive ESG & SDR Education Pack",
    packContent
  );
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");

  return {
    pdfBuffer,
    hash,
    filename: "esg-sdr-education-pack-v2.pdf",
    title: `${EDUCATION_PACK_METADATA.name} — Comprehensive Pack`,
    generated_at: new Date().toISOString()
  };
};

export const storeEducationalPdf = (sessionId, moduleTitle, pdfBuffer) => {
  const moduleSlug = moduleTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `/api/sessions/${sessionId}/education/esg-education-${moduleSlug}.pdf`;
};
