# Privacy Policy for GitHub Markdown Reader

**Last updated**: October 2026

## 1. Overview
GitHub Markdown Reader is an open-source, client-side browser extension designed to format and render plain text and markdown documents directly in your browser.

## 2. Data Collection & Privacy
- **Zero Data Collection**: GitHub Markdown Reader does NOT collect, store, transmit, or share any personal information, browsing history, keystrokes, or document content.
- **Local Execution**: All markdown parsing, code syntax highlighting, math formula processing, and diagram rendering happen entirely inside your local browser tab.
- **No External Servers or Telemetry**: The extension does not connect to any analytics services, external tracking endpoints, or remote servers.
- **Local Settings**: User interface preferences (such as light/dark theme preference, outline visibility, and layout width) are stored exclusively in Chrome's local storage (`chrome.storage.local`) on your machine.

## 3. Permissions Justification
- `storage`: Required only to persist UI preferences (theme, outline open state, width).
- `contextMenus`: Adds the optional right-click "Render as GitHub Markdown" shortcut.
- `activeTab` / `scripting`: Required to inject the markdown viewer on demand when you click the extension action.
- Host permissions (`<all_urls>`): Required to detect `.md` URLs and raw markdown documents on pages you choose to open.

## 4. Contact
For questions or issues regarding this extension, please open an issue in the project's repository.
