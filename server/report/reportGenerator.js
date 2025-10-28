import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Enhanced PDF styling constants
const PDF_STYLES = {
  page: {
    width: 612,
    height: 792,
    marginLeft: 72,
    marginRight: 72,
    marginTop: 72,
    marginBottom: 72
  },
  fonts: {
    title: { size: 18, leading: 22 },
    heading: { size: 14, leading: 18 },
    body: { size: 11, leading: 14 },
    small: { size: 9, leading: 12 }
  },
  colors: {
    primary: "0.2 0.4 0.6",
    secondary: "0.4 0.4 0.4",
    text: "0 0 0",
    accent: "0.1 0.6 0.3"
  }
};

const escapePdfText = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");

// Enhanced PDF builder with professional styling and multi-page support
const buildEnhancedPdfBuffer = (content) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  // Parse content into structured sections
  const sections = parseContentSections(content);
  const pages = layoutPages(sections);
  
  // Create PDF catalog
  const pageRefs = pages.map((_, index) => `${3 + index} 0 R`);
  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject(`<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`);

  // Create page objects and content streams
  pages.forEach((pageContent, pageIndex) => {
    const contentStreamId = addObject("placeholder"); // Will be replaced
    const pageObj = `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${3 + pages.length} 0 R /F2 ${4 + pages.length} 0 R /F3 ${5 + pages.length} 0 R >> >> /MediaBox [0 0 ${PDF_STYLES.page.width} ${PDF_STYLES.page.height}] /Contents ${contentStreamId} 0 R >>`;
    addObject(pageObj);
    
    // Generate content stream for this page
    const contentStream = generatePageContent(pageContent, pageIndex + 1, pages.length);
    const contentLength = Buffer.byteLength(contentStream, "utf8");
    objects[contentStreamId - 1] = `<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`;
  });

  // Add font resources
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");

  // Add digital signature preparation placeholder
  const sigFieldId = addObject(`<< /Type /Annot /Subtype /Widget /FT /Sig /T (Signature1) /Rect [400 50 550 100] /P ${pageRefs[pageRefs.length - 1]} >>`);
  
  // Build PDF structure
  const xref = [0];
  let body = "%PDF-1.7\n";

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

// Parse markdown-like content into structured sections
const parseContentSections = (content) => {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let currentSection = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: 'title',
        content: trimmed.substring(2),
        items: []
      };
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) {
        currentSection.items.push({
          type: 'heading',
          content: trimmed.substring(3)
        });
      }
    } else if (trimmed.length > 0) {
      if (currentSection) {
        currentSection.items.push({
          type: 'body',
          content: trimmed
        });
      }
    }
  });
  
  if (currentSection) sections.push(currentSection);
  return sections;
};

// Layout content across multiple pages
const layoutPages = (sections) => {
  const pages = [];
  let currentPage = [];
  let currentPageHeight = PDF_STYLES.page.marginTop;
  const maxPageHeight = PDF_STYLES.page.height - PDF_STYLES.page.marginBottom;

  sections.forEach(section => {
    const sectionHeight = calculateSectionHeight(section);
    
    if (currentPageHeight + sectionHeight > maxPageHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentPageHeight = PDF_STYLES.page.marginTop;
    }
    
    currentPage.push(section);
    currentPageHeight += sectionHeight;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

// Calculate estimated height for a section
const calculateSectionHeight = (section) => {
  let height = PDF_STYLES.fonts.title.leading + 10; // Title + spacing
  section.items.forEach(item => {
    if (item.type === 'heading') {
      height += PDF_STYLES.fonts.heading.leading + 8;
    } else {
      height += PDF_STYLES.fonts.body.leading + 2;
    }
  });
  return height + 20; // Extra spacing
};

// Generate PDF content stream for a page
const generatePageContent = (sections, pageNum, totalPages) => {
  const lines = [];
  let yPosition = PDF_STYLES.page.height - PDF_STYLES.page.marginTop;

  // Add header with branding
  lines.push("BT");
  lines.push(`/${PDF_STYLES.colors.primary} rg`);
  lines.push("/F2 10 Tf");
  lines.push(`${PDF_STYLES.page.marginLeft} ${PDF_STYLES.page.height - 50} Td`);
  lines.push(`(ESG Investment Suitability Report) Tj`);
  lines.push("ET");

  // Add page content
  lines.push("BT");
  lines.push(`${PDF_STYLES.colors.text} rg`);
  
  sections.forEach(section => {
    // Section title
    lines.push("/F2 18 Tf");
    lines.push(`${PDF_STYLES.page.marginLeft} ${yPosition} Td`);
    lines.push(`(${escapePdfText(section.content)}) Tj`);
    yPosition -= PDF_STYLES.fonts.title.leading + 10;

    // Section items
    section.items.forEach(item => {
      if (item.type === 'heading') {
        lines.push("/F2 14 Tf");
        lines.push(`${PDF_STYLES.colors.primary} rg`);
        lines.push(`${PDF_STYLES.page.marginLeft} ${yPosition} Td`);
        lines.push(`(${escapePdfText(item.content)}) Tj`);
        lines.push(`${PDF_STYLES.colors.text} rg`);
        yPosition -= PDF_STYLES.fonts.heading.leading + 8;
      } else {
        lines.push("/F1 11 Tf");
        lines.push(`${PDF_STYLES.page.marginLeft} ${yPosition} Td`);
        lines.push(`(${escapePdfText(item.content)}) Tj`);
        yPosition -= PDF_STYLES.fonts.body.leading + 2;
      }
    });
    yPosition -= 20; // Section spacing
  });

  lines.push("ET");

  // Add footer with page numbers and signature area
  lines.push("BT");
  lines.push(`${PDF_STYLES.colors.secondary} rg`);
  lines.push("/F1 9 Tf");
  lines.push(`${PDF_STYLES.page.width - 100} 30 Td`);
  lines.push(`(Page ${pageNum} of ${totalPages}) Tj`);
  lines.push("ET");

  // Add signature field on last page
  if (pageNum === totalPages) {
    lines.push("BT");
    lines.push(`${PDF_STYLES.colors.text} rg`);
    lines.push("/F1 10 Tf");
    lines.push("400 70 Td");
    lines.push("(Digital Signature:) Tj");
    lines.push("ET");
    
    // Signature box
    lines.push("0.8 0.8 0.8 RG");
    lines.push("1 w");
    lines.push("400 50 150 50 re");
    lines.push("S");
  }

  return lines.join("\n");
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

// Enhanced report generation with metadata and digital signature preparation
export const generateReportArtifacts = (session) => {
  const template = loadTemplate();
  const context = buildTemplateContext(session);
  const rendered = renderTemplate(template, context);
  
  // Generate enhanced PDF with professional styling
  const pdfBuffer = buildEnhancedPdfBuffer(rendered);
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");
  
  // Add metadata for digital signature preparation
  const metadata = {
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    clientProfile: {
      type: session.data.client_profile?.client_type,
      objectives: session.data.client_profile?.objectives
    },
    signatureRequired: true,
    signatureFields: [
      {
        name: "ClientSignature",
        page: 1,
        coordinates: { x: 400, y: 50, width: 150, height: 50 }
      }
    ],
    version: "2.0"
  };

  return {
    preview: rendered,
    pdfBuffer,
    hash,
    metadata,
    signatureReady: true
  };
};
