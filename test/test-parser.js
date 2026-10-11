const fs = require('fs');
const path = require('path');
const { parseMarkdown } = require('../src/content/parser');

const samplePath = path.join(__dirname, 'sample.md');
const sampleMarkdown = fs.readFileSync(samplePath, 'utf-8');

console.log('Testing markdown parsing...');
const result = parseMarkdown(sampleMarkdown);

console.log('Parsed successfully!');
console.log(`Total headings found: ${result.headings.length}`);
result.headings.forEach(h => console.log(`  - [H${h.level}] #${h.id}: ${h.text}`));

// Assertions
const html = result.html;
const checks = [
  { name: 'Headings exist', pass: result.headings.length > 5 },
  { name: 'Note Alert exists', pass: html.includes('markdown-alert-note') },
  { name: 'Tip Alert exists', pass: html.includes('markdown-alert-tip') },
  { name: 'Important Alert exists', pass: html.includes('markdown-alert-important') },
  { name: 'Warning Alert exists', pass: html.includes('markdown-alert-warning') },
  { name: 'Caution Alert exists', pass: html.includes('markdown-alert-caution') },
  { name: 'Code Block Copy button', pass: html.includes('code-copy-btn') },
  { name: 'Mermaid Container', pass: html.includes('mermaid-container') },
  { name: 'KaTeX Math rendered', pass: html.includes('katex') },
  { name: 'Task list checkboxes', pass: html.includes('task-list-item-checkbox') },
  { name: 'Table container', pass: html.includes('table-container') },
  { name: 'Heading anchor links', pass: html.includes('heading-anchor') },
];

console.log('\nValidation checks:');
let allPass = true;
for (const check of checks) {
  console.log(`  [${check.pass ? 'PASS' : 'FAIL'}] ${check.name}`);
  if (!check.pass) allPass = false;
}

if (!allPass) {
  console.error('\nSome validation checks failed!');
  process.exit(1);
} else {
  console.log('\nAll checks PASSED!');
}
