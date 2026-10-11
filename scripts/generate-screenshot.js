const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseMarkdown } = require('../src/content/parser');

// 1. Read CSS
const contentCss = fs.readFileSync(path.join(__dirname, '../dist/content.css'), 'utf-8');

// 2. Read sample markdown
const sampleMd = fs.readFileSync(path.join(__dirname, '../test/sample.md'), 'utf-8');
const { html, headings } = parseMarkdown(sampleMd);

// 3. Build outline HTML
const outlineItems = headings.slice(0, 8).map((h, i) => `
  <li class="gmr-outline-item gmr-level-${h.level} ${i === 0 ? 'is-active' : ''}">
    <a href="#${h.id}" class="gmr-outline-link">${h.text}</a>
  </li>
`).join('');

// Octicons SVGs
const { ICONS } = require('../src/content/icons');

const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>README.md - GitHub Markdown Reader</title>
  <style>
    ${contentCss}
    body {
      overflow-y: hidden;
      margin: 0;
      padding: 0;
      width: 1280px;
      height: 800px;
      box-sizing: border-box;
      background: #ffffff;
    }
    .gmr-app-wrapper {
      width: 1280px;
      height: 800px;
      display: flex;
      flex-direction: column;
    }
    .gmr-main-layout {
      height: calc(800px - 49px);
      overflow: hidden;
    }
    .gmr-content-container {
      overflow-y: hidden;
      padding: 24px 32px;
    }
    .gmr-outline-drawer {
      display: flex !important;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="gmr-app-wrapper" data-gmr-theme="auto" data-color-mode="light">
    <!-- Toolbar -->
    <header class="gmr-toolbar">
      <div class="gmr-toolbar-inner">
        <div class="gmr-toolbar-left">
          <div class="gmr-toolbar-file">
            <span class="gmr-file-icon">${ICONS.file}</span>
            <span class="gmr-file-name">README.md</span>
          </div>
          <span class="gmr-toolbar-divider"></span>
          <span class="gmr-toolbar-stats">842 words · 4 min read</span>
        </div>

        <div class="gmr-toolbar-center">
          <div class="gmr-view-tabs" role="tablist">
            <button class="gmr-tab-btn is-active" role="tab">
              ${ICONS.preview}
              <span>Preview</span>
            </button>
            <button class="gmr-tab-btn" role="tab">
              ${ICONS.code}
              <span>Raw</span>
            </button>
          </div>
        </div>

        <div class="gmr-toolbar-right">
          <button class="gmr-btn-icon" style="background-color: var(--gmr-btn-hover); border-color: var(--gmr-accent);">
            ${ICONS.outline}
            <span class="gmr-btn-text">Outline</span>
          </button>
          <button class="gmr-btn-icon" title="Standard width">
            ${ICONS.compress}
          </button>
          <button class="gmr-btn-icon" title="Theme">
            ${ICONS.sun}
            <span class="gmr-btn-label">Light</span>
          </button>
          <button class="gmr-btn-icon" title="Print">
            ${ICONS.print}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="gmr-main-layout">
      <main class="gmr-content-container">
        <div class="gmr-content-inner">
          <article class="markdown-body">
            ${html}
          </article>
        </div>
      </main>

      <!-- Outline Drawer -->
      <aside class="gmr-outline-drawer is-open">
        <div class="gmr-outline-header">
          <div class="gmr-outline-title">
            ${ICONS.outline}
            <span>Outline</span>
          </div>
          <button class="gmr-btn-icon gmr-outline-close-btn">${ICONS.close}</button>
        </div>
        <nav class="gmr-outline-nav">
          <ul class="gmr-outline-list">
            ${outlineItems}
          </ul>
        </nav>
      </aside>
    </div>
  </div>
</body>
</html>`;

const previewFile = path.join(__dirname, '../dist/preview.html');
fs.writeFileSync(previewFile, pageHtml);

const outputPng = path.join(__dirname, '../dist/screenshot-1280x800.png');

console.log('Capturing 1280x800 screenshot using headless Chrome...');
try {
  execSync(`google-chrome --headless --disable-gpu --hide-scrollbars --window-size=1280,800 --screenshot="${outputPng}" "file://${previewFile}"`, {
    stdio: 'inherit'
  });
  console.log('Screenshot generated successfully at:', outputPng);
} catch (err) {
  console.error('Headless Chrome screenshot error:', err.message);
}
