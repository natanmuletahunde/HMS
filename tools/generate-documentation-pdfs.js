const fs = require('node:fs');
const path = require('node:path');

const docsDir = path.resolve(__dirname, '..', 'docs');
const outputDir = path.join(docsDir, 'pdf');
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const NAVY = [0.08, 0.16, 0.27];
const BLUE = [0.12, 0.39, 0.65];
const SLATE = [0.28, 0.33, 0.39];

const documents = [
  ['FUNCTIONAL_REQUIREMENTS', 'Nexus HMS Functional Requirements', 'Functional requirements specification'],
  ['NON_FUNCTIONAL_REQUIREMENTS', 'Nexus HMS Non-Functional Requirements', 'Quality, security, and operational requirements'],
  ['HANDS_ON_USER_MANUAL', 'Nexus HMS Hands-On User Manual', 'Practical operating guide for hotel teams'],
  ['DEPLOYMENT_STRATEGY', 'Nexus HMS Deployment Strategy', 'Environment, release, and operations guide'],
  ['TECHNOLOGIES_USED', 'Nexus HMS Technologies Used', 'Technology and architecture guide'],
  ['USER_MANAGEMENT_AND_SECURITY', 'Nexus HMS User Management and Security Guide', 'Administrator and security operations guide'],
];

function escapePdf(value) {
  return value
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(text, maxChars) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function parseMarkdown(markdown) {
  const blocks = [];
  let paragraph = [];
  let code = false;
  let codeLines = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushCode = () => {
    if (codeLines.length) blocks.push({ type: 'code', text: codeLines.join('\n') });
    codeLines = [];
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      flushParagraph();
      if (code) flushCode();
      code = !code;
      continue;
    }
    if (code) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      blocks.push({ type: 'title', text: line.slice(2).trim() });
    } else if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('- ')) {
      flushParagraph();
      blocks.push({ type: 'bullet', text: line.slice(2).trim() });
    } else if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'number', text: line.trim() });
    } else if (line.startsWith('> ')) {
      flushParagraph();
      blocks.push({ type: 'quote', text: line.slice(2).trim() });
    } else if (line.startsWith('|')) {
      flushParagraph();
      const cells = line.replace(/^\||\|$/g, '').split('|').map(value => value.trim());
      const isDivider = cells.every(cell => /^:?-{3,}:?$/.test(cell));
      if (!isDivider) {
        blocks.push({ type: 'table', text: cells.join('   |   ') });
      }
    } else {
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  if (code) flushCode();
  return blocks;
}

class PdfDocument {
  constructor(title, subtitle) {
    this.title = title;
    this.subtitle = subtitle;
    this.pages = [];
    this.newPage();
  }

  newPage() {
    this.page = { commands: [], y: PAGE_HEIGHT - 66 };
    this.pages.push(this.page);
    this.text(this.title.toUpperCase(), MARGIN, PAGE_HEIGHT - 34, 7.4, 'bold', SLATE);
    this.line(MARGIN, PAGE_HEIGHT - 43, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 43, BLUE, 1);
  }

  line(x1, y1, x2, y2, color, width) {
    this.page.commands.push(`${color.join(' ')} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  rect(x, y, width, height, color) {
    this.page.commands.push(`${color.join(' ')} rg ${x} ${y} ${width} ${height} re f`);
  }

  text(value, x, y, size, font = 'regular', color = [0.12, 0.14, 0.17]) {
    const fontName = font === 'bold' ? '/F2' : font === 'mono' ? '/F3' : '/F1';
    this.page.commands.push(`BT ${color.join(' ')} rg ${fontName} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdf(value)}) Tj ET`);
  }

  footer() {
    const pageNumber = this.pages.indexOf(this.page) + 1;
    this.line(MARGIN, 38, PAGE_WIDTH - MARGIN, 38, [0.78, 0.81, 0.84], 0.5);
    this.text(`Nexus HMS  |  ${this.subtitle}`, MARGIN, 24, 7.2, 'regular', SLATE);
    this.text(`Page ${pageNumber}`, PAGE_WIDTH - MARGIN - 38, 24, 7.2, 'regular', SLATE);
  }

  ensure(height) {
    if (this.page.y - height < 58) {
      this.footer();
      this.newPage();
    }
  }

  addBlock(block, isFirstTitle) {
    if (block.type === 'title') {
      if (isFirstTitle) {
        const titleLines = wrap(block.text, 34);
        const coverHeight = titleLines.length > 1 ? 116 : 94;
        this.rect(MARGIN, this.page.y - coverHeight + 8, CONTENT_WIDTH, coverHeight, NAVY);
        titleLines.forEach((line, index) => {
          this.text(line, MARGIN + 18, this.page.y - 36 - (index * 22), 20, 'bold', [1, 1, 1]);
        });
        this.text('Nexus HMS Enterprise Edition', MARGIN + 18, this.page.y - 59 - ((titleLines.length - 1) * 22), 10, 'regular', [0.78, 0.88, 0.96]);
        this.page.y -= coverHeight + 18;
      }
      return;
    }
    if (block.type === 'h2') {
      this.ensure(42);
      this.page.y -= 14;
      this.text(block.text, MARGIN, this.page.y, 15, 'bold', NAVY);
      this.line(MARGIN, this.page.y - 6, MARGIN + 76, this.page.y - 6, BLUE, 1.3);
      this.page.y -= 26;
      return;
    }
    if (block.type === 'h3') {
      this.ensure(31);
      this.page.y -= 8;
      this.text(block.text, MARGIN, this.page.y, 11.5, 'bold', BLUE);
      this.page.y -= 19;
      return;
    }
    const size = block.type === 'code' ? 8.2 : 9.4;
    const maxChars = block.type === 'code' ? 82 : block.type === 'bullet' || block.type === 'number' ? 92 : 101;
    const prefix = block.type === 'bullet' ? '- ' : '';
    const lines = block.type === 'code'
      ? block.text.split('\n').flatMap(line => wrap(line, maxChars))
      : wrap(block.text, maxChars);
    const lineHeight = block.type === 'code' ? 11.5 : 14;
    this.ensure(Math.min(100, lines.length * lineHeight + 10));
    if (block.type === 'quote') {
      this.rect(MARGIN, this.page.y - lines.length * lineHeight - 5, 4, lines.length * lineHeight + 6, BLUE);
    }
    for (let index = 0; index < lines.length; index += 1) {
      const line = index === 0 ? prefix + lines[index] : (prefix ? '  ' : '') + lines[index];
      const x = block.type === 'quote' ? MARGIN + 12 : MARGIN + (block.type === 'table' ? 4 : 0);
      this.text(line, x, this.page.y, size, block.type === 'code' ? 'mono' : 'regular', block.type === 'quote' ? SLATE : [0.15, 0.17, 0.2]);
      this.page.y -= lineHeight;
    }
    this.page.y -= block.type === 'table' ? 5 : 7;
  }

  toPdf() {
    this.footer();
    const objects = [];
    const addObject = body => {
      objects.push(body);
      return objects.length;
    };
    const catalogId = addObject('');
    const pagesId = addObject('');
    const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const fontMonoId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
    const pageIds = [];
    for (const page of this.pages) {
      const stream = page.commands.join('\n');
      const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    }
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    for (let index = 0; index < objects.length; index += 1) {
      offsets[index + 1] = Buffer.byteLength(pdf, 'binary');
      pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf, 'binary');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'binary');
  }
}

function buildPdf(markdown, title, subtitle) {
  const pdf = new PdfDocument(title, subtitle);
  const blocks = parseMarkdown(markdown);
  let firstTitle = true;
  for (const block of blocks) {
    pdf.addBlock(block, firstTitle);
    if (block.type === 'title') firstTitle = false;
  }
  return pdf.toPdf();
}

fs.mkdirSync(outputDir, { recursive: true });
for (const [slug, title, subtitle] of documents) {
  const source = fs.readFileSync(path.join(docsDir, `${slug}.md`), 'utf8');
  const output = path.join(outputDir, `${slug}.pdf`);
  fs.writeFileSync(output, buildPdf(source, title, subtitle));
  console.log(`Generated ${path.relative(process.cwd(), output)}`);
}