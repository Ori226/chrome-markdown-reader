# GitHub Markdown Reader (Chrome Extension)

A Manifest V3 Chrome extension that renders Markdown files and raw URLs with GitHub-faithful styling, alerts, syntax highlighting, LaTeX math formulas, Mermaid diagrams, and a hierarchical document outline.

![GitHub Markdown Reader](dist/assets/icon128.png)

---

## Features

- **GitHub Look & Feel**: Built on `github-markdown-css` with authentic GitHub typography, tables, and borders.
- **GitHub Alert Callouts**: Authentic rendering for all five GitHub callouts with official Octicons and border accents:
  - `> [!NOTE]`
  - `> [!TIP]`
  - `> [!IMPORTANT]`
  - `> [!WARNING]`
  - `> [!CAUTION]`
- **Code Block Syntax Highlighting**:
  - Highlights code blocks using GitHub Light & Dark themes.
  - Header bar with language badge and GitHub-style **"Copy code"** button with visual feedback.
- **Document Outline (Table of Contents)**:
  - Collapsible outline drawer displaying hierarchical headers (`h1` through `h6`).
  - Active section scrollspy tracking as you scroll through long documents.
  - Smooth jumping to sections with permalink hash updates.
- **Mathematical Formulas**:
  - KaTeX support for inline math (`$E=mc^2$`) and display block math (`$$\int e^{-x^2} dx$$`).
  - Self-contained offline fonts embedded via data URIs.
- **Mermaid Diagrams**:
  - Renders ````mermaid` code blocks into responsive SVG diagrams (flowcharts, sequence diagrams, git graphs, etc.).
- **Dual View Modes**:
  - Instantly switch between **Preview** (rendered HTML) and **Raw** (source markdown) via the sticky toolbar.
- **Theme Support**:
  - **Auto (System Default)**, **GitHub Light**, and **GitHub Dark**.
- **Layout Controls**:
  - Toggle between **Standard GitHub width (1012px)** and **Full width (100%)**.
  - Document statistics (word count and estimated reading time).
  - Print/PDF export optimized layout.
- **Auto-Detection**:
  - Automatically activates on local `.md` files (`file:///path/to/file.md`), remote `.md` URLs, and raw git repositories (`raw.githubusercontent.com`, GitLab, Bitbucket).
  - Manual toggle via extension popup, keyboard shortcut (`Alt + M`), or right-click context menu.

---

## Installation in Chrome

1. **Build the extension** (or use the pre-built `dist/` directory):
   ```bash
   npm install
   npm run build
   ```

2. **Load into Google Chrome**:
   1. Open Google Chrome and navigate to:
      ```
      chrome://extensions
      ```
   2. Turn ON **"Developer mode"** in the top-right corner.
   3. Click the **"Load unpacked"** button in the top-left corner.
   4. Select the `dist/` directory (or the root directory) of this project.

3. **Enable Local File Access (Important for `file:///` URLs)**:
   - On the `chrome://extensions` page, find **GitHub Markdown Reader**.
   - Click **"Details"**.
   - Scroll down and toggle ON **"Allow access to file URLs"**.
   - Now, opening any `.md` file in Chrome (e.g. dragging a `.md` file into the browser or pressing `Ctrl+O`) will render in GitHub markdown style!

---

## Testing

A sample markdown file demonstrating all features is included at [`test/sample.md`](file:///home/ori/code/chorme-markdown-reader/test/sample.md) (and in `dist/sample.md`).

To view it:
1. Open Chrome.
2. Press `Ctrl + O` (or `Cmd + O` on macOS).
3. Select `test/sample.md` or `dist/sample.md`.
4. It will automatically render with GitHub styles, alerts, math, outline, and diagrams!

---

## Development & Scripts

- `npm run build`: Bundles TypeScript, inlines fonts, and produces the complete standalone extension in `dist/`.
- `npm run typecheck`: Runs strict TypeScript type-checking (`tsc --noEmit`).
- `npm run generate-icons`: Generates crisp PNG extension icons (16, 32, 48, 128px).

---

## License

MIT License.
