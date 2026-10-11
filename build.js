const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function build() {
  console.log('Starting GitHub Markdown Reader build...');
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Generate icons
  console.log('1. Generating icons...');
  require('./scripts/generate-icons.js');

  // 2. Build JavaScript bundles
  console.log('2. Bundling JavaScript...');

  // Content script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/content/index.ts')],
    outfile: path.join(distDir, 'content.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
    sourcemap: false,
  });

  // Background service worker
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/background/index.ts')],
    outfile: path.join(distDir, 'background.js'),
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome100'],
    sourcemap: false,
  });

  // Popup script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/popup/popup.ts')],
    outfile: path.join(distDir, 'popup.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
    sourcemap: false,
  });

  // 3. Process CSS
  console.log('3. Processing CSS bundles...');

  // A. GitHub Markdown CSS
  const githubMarkdownCss = fs.readFileSync(
    path.join(__dirname, 'node_modules/github-markdown-css/github-markdown.css'),
    'utf-8'
  );

  // B. Highlight.js Light CSS
  const hljsLightCss = fs.readFileSync(
    path.join(__dirname, 'node_modules/highlight.js/styles/github.css'),
    'utf-8'
  );

  // C. Highlight.js Dark CSS (scoped for dark mode)
  const hljsDarkRaw = fs.readFileSync(
    path.join(__dirname, 'node_modules/highlight.js/styles/github-dark.css'),
    'utf-8'
  );

  // Scope hljs dark rules under dark mode selectors
  const hljsDarkCss = `
[data-gmr-theme="dark"],
[data-color-mode="dark"] {
${hljsDarkRaw}
}
@media (prefers-color-scheme: dark) {
  [data-gmr-theme="auto"] {
${hljsDarkRaw}
  }
}
`;

  // D. KaTeX CSS with inlined woff2 fonts
  let katexCss = fs.readFileSync(
    path.join(__dirname, 'node_modules/katex/dist/katex.min.css'),
    'utf-8'
  );

  // Inline woff2 fonts as data URIs and strip fallback woff/ttf
  const fontsDir = path.join(__dirname, 'node_modules/katex/dist/fonts');
  katexCss = katexCss.replace(/url\(fonts\/(KaTeX_[^)]+\.woff2)\)/g, (match, filename) => {
    const fontPath = path.join(fontsDir, filename);
    if (fs.existsSync(fontPath)) {
      const b64 = fs.readFileSync(fontPath).toString('base64');
      return `url('data:font/woff2;base64,${b64}')`;
    }
    return match;
  });

  // Remove fallback woff / ttf clauses from src list in @font-face
  katexCss = katexCss.replace(/,\s*url\(fonts\/[^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '');
  katexCss = katexCss.replace(/,\s*url\(fonts\/[^)]+\.ttf\)\s*format\(['"]truetype['"]\)/g, '');

  // E. Custom extension content styles
  const customContentCss = fs.readFileSync(
    path.join(__dirname, 'src/content/styles/content.css'),
    'utf-8'
  );

  // Combine all content styles
  const combinedContentCss = [
    '/* GitHub Markdown Core Styles */',
    githubMarkdownCss,
    '/* Highlight.js Light Theme */',
    hljsLightCss,
    '/* Highlight.js Dark Theme */',
    hljsDarkCss,
    '/* KaTeX Mathematics Styles */',
    katexCss,
    '/* GitHub Markdown Reader Custom Styles */',
    customContentCss
  ].join('\n\n');

  fs.writeFileSync(path.join(distDir, 'content.css'), combinedContentCss);

  // 4. Copy static popup files
  console.log('4. Copying popup files...');
  fs.copyFileSync(path.join(__dirname, 'src/popup/popup.html'), path.join(distDir, 'popup.html'));
  fs.copyFileSync(path.join(__dirname, 'src/popup/popup.css'), path.join(distDir, 'popup.css'));

  // 5. Generate dist manifest with relative paths
  console.log('5. Generating dist manifest...');
  const distManifest = {
    "manifest_version": 3,
    "name": "GitHub Markdown Reader",
    "version": "1.0.0",
    "description": "Render Markdown files and raw text with authentic GitHub styling, alerts, syntax highlighting, math, and outline.",
    "icons": {
      "16": "assets/icon16.png",
      "32": "assets/icon32.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    },
    "action": {
      "default_title": "GitHub Markdown Reader",
      "default_popup": "popup.html",
      "default_icon": {
        "16": "assets/icon16.png",
        "32": "assets/icon32.png",
        "48": "assets/icon48.png",
        "128": "assets/icon128.png"
      }
    },
    "background": {
      "service_worker": "background.js",
      "type": "module"
    },
    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "js": ["content.js"],
        "css": ["content.css"],
        "run_at": "document_end"
      }
    ],
    "permissions": [
      "storage",
      "contextMenus",
      "scripting",
      "activeTab"
    ],
    "commands": {
      "toggle_markdown": {
        "suggested_key": {
          "default": "Alt+M",
          "mac": "Alt+M"
        },
        "description": "Toggle GitHub Markdown rendering"
      }
    }
  };

  fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(distManifest, null, 2));

  // 6. Copy sample markdown and LICENSE
  const sampleSrc = path.join(__dirname, 'test/sample.md');
  if (fs.existsSync(sampleSrc)) {
    fs.copyFileSync(sampleSrc, path.join(distDir, 'sample.md'));
  }
  const licenseSrc = path.join(__dirname, 'LICENSE');
  if (fs.existsSync(licenseSrc)) {
    fs.copyFileSync(licenseSrc, path.join(distDir, 'LICENSE'));
  }

  console.log('Build completed successfully!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
