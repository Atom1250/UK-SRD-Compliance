// Educational PDF Generator
// Generates comprehensive PDF resources for ESG education modules

import { createHash } from "node:crypto";
import { EDUCATION_MODULES } from '../state/educationModules.js';

const escapePdfText = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, "\\n");

const buildEducationalPdfBuffer = (moduleTitle, content) => {
  const lines = [
    `ESG Education Pack: ${moduleTitle}`,
    "",
    "Prepared by ESG Client Interview Bot",
    "Compliant with FCA Consumer Duty and SDR Requirements",
    "",
    "=" * 60,
    "",
    ...content.split('\n')
  ];

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

export const generateEducationalPdf = (moduleTitle) => {
  const module = EDUCATION_MODULES.find(m => m.title === moduleTitle);
  if (!module) {
    throw new Error(`Educational module "${moduleTitle}" not found`);
  }

  const content = `
SUMMARY
${module.summary}

DETAILED EXPLANATION
${module.detailed_explanation || 'Detailed explanation not available for this module.'}

KEY CONCEPTS
${module.category ? `Category: ${module.category.replace(/_/g, ' ').toUpperCase()}` : ''}

REGULATORY CONTEXT
This information is provided in compliance with:
- FCA Consumer Duty requirements for clear, fair treatment
- FCA Sustainability Disclosure Requirements (SDR)
- Anti-Greenwashing Rule requirements for evidence-based claims

COMPREHENSION CHECK
${module.comprehension_check || 'No comprehension check available for this module.'}

NEXT STEPS
- Review this information carefully
- Discuss any questions with your advisor
- Consider how this relates to your investment objectives
- Ask for additional resources if needed

DISCLAIMER
This educational material is for informational purposes only and does not constitute investment advice. 
All investment decisions should be made in consultation with a qualified financial advisor after 
considering your individual circumstances, objectives, and risk tolerance.

Generated: ${new Date().toISOString()}
Module Version: 1.0
Compliance Reference: ESG-EDU-${moduleTitle.replace(/\s+/g, '-').toUpperCase()}
`;

  const pdfBuffer = buildEducationalPdfBuffer(moduleTitle, content);
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");

  return {
    pdfBuffer,
    hash,
    filename: `esg-education-${moduleTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`,
    title: `ESG Education: ${moduleTitle}`,
    generated_at: new Date().toISOString()
  };
};

export const generateComprehensiveEducationPack = () => {
  const packContent = `
ESG INVESTMENT EDUCATION PACK
Comprehensive Guide to Sustainable Investing

TABLE OF CONTENTS
1. Fundamentals
   - ESG Basics
   - Governance Factors

2. Regulatory Framework
   - FCA SDR Labels
   - Anti-Greenwashing Rules
   - Product Governance

3. Investment Approaches
   - Impact Investing
   - Focus vs Improvers
   - Exclusions and Screening
   - Stewardship and Engagement

4. Key Themes
   - Climate Change Investing
   - Social Impact Themes
   - Biodiversity and Nature
   - Sustainable Development Goals

5. Risk Considerations
   - Risks and Trade-offs
   - Switching Considerations

6. Practical Guidance
   - How to Choose Sustainable Investments
   - Working with Your Advisor
   - Ongoing Monitoring and Review

DETAILED CONTENT

${EDUCATION_MODULES.map(module => `
${module.title.toUpperCase()}
${'='.repeat(module.title.length)}

Summary: ${module.summary}

${module.detailed_explanation ? `Detailed Explanation: ${module.detailed_explanation}` : ''}

${module.comprehension_check ? `Key Question: ${module.comprehension_check}` : ''}

${'─'.repeat(60)}
`).join('\n')}

REGULATORY COMPLIANCE
This education pack is provided in compliance with:
- FCA Consumer Duty requirements
- FCA Sustainability Disclosure Requirements (SDR)
- Anti-Greenwashing Rule
- Product governance (PROD 3) requirements

IMPORTANT DISCLAIMERS
- This is educational material only, not investment advice
- All investments carry risk and may lose value
- Past performance does not guarantee future results
- Seek professional advice before making investment decisions
- Sustainable investing may involve additional risks and trade-offs

Generated: ${new Date().toISOString()}
Version: 1.0
Compliance Reference: ESG-EDU-COMPREHENSIVE-PACK
`;

  const pdfBuffer = buildEducationalPdfBuffer("Comprehensive ESG Education Pack", packContent);
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");

  return {
    pdfBuffer,
    hash,
    filename: "esg-comprehensive-education-pack.pdf",
    title: "Comprehensive ESG Education Pack",
    generated_at: new Date().toISOString()
  };
};

// Store educational PDFs (similar to report storage)
export const storeEducationalPdf = (sessionId, moduleTitle, pdfBuffer) => {
  // In a production system, this would store to a secure file system or cloud storage
  // For now, we'll just return a URL pattern
  const filename = `esg-education-${moduleTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  return `/api/sessions/${sessionId}/education/${filename}`;
};