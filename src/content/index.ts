import { parseMarkdown } from './parser';
import { DocumentOutline } from './outline';
import { Toolbar } from './toolbar';
import { renderMermaidDiagrams } from './mermaid-renderer';
import { ICONS } from './icons';

interface UserSettings {
  theme: 'auto' | 'light' | 'dark';
  outlineOpen: boolean;
  fullWidth: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  outlineOpen: false,
  fullWidth: false,
};

class MarkdownViewerApp {
  private rawMarkdown: string = '';
  private originalHtml: string = '';
  private isRendered: boolean = false;
  private settings: UserSettings = { ...DEFAULT_SETTINGS };
  private toolbar: Toolbar | null = null;
  private outline: DocumentOutline | null = null;
  private currentView: 'preview' | 'raw' = 'preview';
  private appWrapper: HTMLElement | null = null;
  private markdownBody: HTMLElement | null = null;
  private rawContainer: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Load stored settings
    await this.loadSettings();

    // Check if current page is markdown
    if (this.shouldAutoRender()) {
      this.render();
    }

    // Listen for extension messages
    this.setupMessageListeners();
  }

  private async loadSettings() {
    return new Promise<void>((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['gmr_settings'], (result) => {
          if (result && result.gmr_settings) {
            this.settings = { ...DEFAULT_SETTINGS, ...result.gmr_settings };
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private saveSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ gmr_settings: this.settings });
    }
  }

  private shouldAutoRender(): boolean {
    const url = window.location.href;
    const pathname = window.location.pathname.toLowerCase();

    const markdownExtensions = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.text'];
    const hasMdExt = markdownExtensions.some(ext => pathname.endsWith(ext) || pathname.includes(`${ext}#`) || pathname.includes(`${ext}?`));

    // Raw GitHub, GitLab, Bitbucket URLs
    const isRawRepo = window.location.hostname === 'raw.githubusercontent.com' ||
      window.location.hostname === 'gist.githubusercontent.com' ||
      pathname.includes('/raw/');

    // Check if content-type is markdown
    const isMarkdownContentType = document.contentType === 'text/markdown' || document.contentType === 'text/x-markdown';

    // Chrome renders plain text files inside a single <pre> element
    const isPlainTextPre = document.body &&
      document.body.children.length === 1 &&
      document.body.firstElementChild?.tagName === 'PRE';

    // Local file:/// with md extension
    const isLocalMd = url.startsWith('file:///') && hasMdExt;

    return hasMdExt || (isRawRepo && isPlainTextPre) || isMarkdownContentType || (isLocalMd && isPlainTextPre);
  }

  private extractMarkdownContent(): string {
    const pre = document.body.querySelector('pre');
    if (pre && (document.body.children.length === 1 || pre.innerText.length > 50)) {
      return pre.innerText;
    }
    return document.body.innerText || '';
  }

  private getFileName(): string {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      return decodeURIComponent(parts[parts.length - 1]);
    }
    return 'document.md';
  }

  private calculateReadingStats(text: string): { wordCount: number; minutes: number } {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const count = words.length;
    const minutes = Math.max(1, Math.ceil(count / 200));
    return { wordCount: count, minutes };
  }

  public render() {
    if (this.isRendered) return;

    this.rawMarkdown = this.extractMarkdownContent();
    if (!this.rawMarkdown.trim()) return;

    this.originalHtml = document.body.innerHTML;

    const fileName = this.getFileName();
    const stats = this.calculateReadingStats(this.rawMarkdown);

    // Parse markdown
    const parseResult = parseMarkdown(this.rawMarkdown);

    // Build DOM structure
    this.appWrapper = document.createElement('div');
    this.appWrapper.className = `gmr-app-wrapper ${this.settings.fullWidth ? 'is-full-width' : ''}`;
    this.updateThemeAttributes(this.settings.theme);

    // Toolbar
    this.toolbar = new Toolbar({
      fileName,
      wordCount: stats.wordCount,
      readingTimeMinutes: stats.minutes,
      currentView: this.currentView,
      theme: this.settings.theme,
      isFullWidth: this.settings.fullWidth,
      onViewChange: (view) => this.switchView(view),
      onToggleOutline: () => this.toggleOutline(),
      onThemeChange: (theme) => this.setTheme(theme),
      onToggleWidth: () => this.toggleWidth(),
      onPrint: () => window.print(),
    });

    // Outline
    this.outline = new DocumentOutline(parseResult.headings, (isOpen) => {
      this.settings.outlineOpen = isOpen;
      this.saveSettings();
    });

    // Main layout
    const mainLayout = document.createElement('div');
    mainLayout.className = 'gmr-main-layout';

    const contentContainer = document.createElement('main');
    contentContainer.className = 'gmr-content-container';

    const contentInner = document.createElement('div');
    contentInner.className = 'gmr-content-inner';

    // Show local file notice if file:/// without permissions reminder
    if (window.location.protocol === 'file:') {
      // Local file is successfully rendering!
    }

    // Markdown rendered element
    this.markdownBody = document.createElement('article');
    this.markdownBody.className = 'markdown-body';
    this.markdownBody.innerHTML = parseResult.html;

    // Raw container
    this.rawContainer = document.createElement('pre');
    this.rawContainer.className = 'gmr-raw-container';
    this.rawContainer.textContent = this.rawMarkdown;

    contentInner.appendChild(this.markdownBody);
    contentInner.appendChild(this.rawContainer);
    contentContainer.appendChild(contentInner);

    mainLayout.appendChild(contentContainer);
    mainLayout.appendChild(this.outline.getElement());

    this.appWrapper.appendChild(this.toolbar.getElement());
    this.appWrapper.appendChild(mainLayout);

    // Replace body
    document.body.innerHTML = '';
    document.body.appendChild(this.appWrapper);

    // Setup interactive code block copy buttons
    this.setupCopyButtons();

    // Setup Mermaid diagrams
    const isDark = this.getIsDarkEffective();
    renderMermaidDiagrams(this.markdownBody, isDark);

    // Restore outline open state if previously opened
    if (this.settings.outlineOpen) {
      this.outline.toggle(true);
    }

    // Handle hash scroll
    if (window.location.hash) {
      const hashId = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(hashId);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }

    this.isRendered = true;
  }

  public unrender() {
    if (!this.isRendered) return;
    document.body.innerHTML = this.originalHtml;
    this.isRendered = false;
  }

  private setupCopyButtons() {
    if (!this.markdownBody) return;

    const copyButtons = this.markdownBody.querySelectorAll<HTMLButtonElement>('.code-copy-btn');
    copyButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-code') || '';
        try {
          await navigator.clipboard.writeText(code);
          const originalContent = btn.innerHTML;
          btn.innerHTML = `${ICONS.check} <span class="copy-text">Copied!</span>`;
          btn.classList.add('is-copied');

          setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('is-copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
      });
    });
  }

  private switchView(view: 'preview' | 'raw') {
    this.currentView = view;
    if (view === 'preview') {
      this.markdownBody?.classList.remove('is-hidden');
      this.rawContainer?.classList.remove('is-active');
    } else {
      this.markdownBody?.classList.add('is-hidden');
      this.rawContainer?.classList.add('is-active');
    }
    this.toolbar?.updateView(view);
  }

  private toggleOutline() {
    if (this.outline) {
      this.outline.toggle();
    }
  }

  private toggleWidth() {
    this.settings.fullWidth = !this.settings.fullWidth;
    if (this.appWrapper) {
      if (this.settings.fullWidth) {
        this.appWrapper.classList.add('is-full-width');
      } else {
        this.appWrapper.classList.remove('is-full-width');
      }
    }
    this.toolbar?.updateWidth(this.settings.fullWidth);
    this.saveSettings();
  }

  private setTheme(theme: 'auto' | 'light' | 'dark') {
    this.settings.theme = theme;
    this.updateThemeAttributes(theme);
    this.toolbar?.updateTheme(theme);
    this.saveSettings();

    // Re-render mermaid diagrams with new theme
    if (this.markdownBody) {
      const isDark = this.getIsDarkEffective();
      renderMermaidDiagrams(this.markdownBody, isDark);
    }
  }

  private updateThemeAttributes(theme: 'auto' | 'light' | 'dark') {
    if (!this.appWrapper) return;
    this.appWrapper.setAttribute('data-gmr-theme', theme);
    const colorMode = theme === 'auto' ? 'auto' : theme;
    this.appWrapper.setAttribute('data-color-mode', colorMode);

    if (theme === 'dark') {
      this.appWrapper.setAttribute('data-dark-theme', 'dark');
      document.documentElement.setAttribute('data-color-mode', 'dark');
    } else if (theme === 'light') {
      this.appWrapper.setAttribute('data-light-theme', 'light');
      document.documentElement.setAttribute('data-color-mode', 'light');
    } else {
      document.documentElement.removeAttribute('data-color-mode');
    }
  }

  private getIsDarkEffective(): boolean {
    if (this.settings.theme === 'dark') return true;
    if (this.settings.theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private setupMessageListeners() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;

    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      switch (request.type) {
        case 'TOGGLE_RENDER':
          if (this.isRendered) {
            this.unrender();
          } else {
            this.render();
          }
          sendResponse({ isRendered: this.isRendered });
          break;

        case 'GET_STATUS':
          sendResponse({
            isRendered: this.isRendered,
            theme: this.settings.theme,
            fullWidth: this.settings.fullWidth,
            outlineOpen: this.settings.outlineOpen,
            currentView: this.currentView,
          });
          break;

        case 'SET_THEME':
          this.setTheme(request.theme);
          sendResponse({ success: true });
          break;

        case 'TOGGLE_OUTLINE':
          this.toggleOutline();
          sendResponse({ success: true });
          break;

        case 'TOGGLE_WIDTH':
          this.toggleWidth();
          sendResponse({ success: true });
          break;

        case 'SWITCH_VIEW':
          this.switchView(request.view);
          sendResponse({ success: true });
          break;
      }
    });
  }
}

// Instantiate on document load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new MarkdownViewerApp());
} else {
  new MarkdownViewerApp();
}
