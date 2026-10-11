import { ICONS } from './icons';

export interface ToolbarOptions {
  fileName: string;
  wordCount: number;
  readingTimeMinutes: number;
  currentView: 'preview' | 'raw';
  theme: 'auto' | 'light' | 'dark';
  isFullWidth: boolean;
  onViewChange: (view: 'preview' | 'raw') => void;
  onToggleOutline: () => void;
  onThemeChange: (theme: 'auto' | 'light' | 'dark') => void;
  onToggleWidth: () => void;
  onPrint: () => void;
}

export class Toolbar {
  private element: HTMLElement;
  private options: ToolbarOptions;

  constructor(options: ToolbarOptions) {
    this.options = options;
    this.element = document.createElement('header');
    this.element.className = 'gmr-toolbar';
    this.render();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public updateStats(wordCount: number, readingTimeMinutes: number) {
    this.options.wordCount = wordCount;
    this.options.readingTimeMinutes = readingTimeMinutes;
    const statsEl = this.element.querySelector('.gmr-toolbar-stats');
    if (statsEl) {
      statsEl.textContent = `${wordCount.toLocaleString()} words · ${readingTimeMinutes} min read`;
    }
  }

  public updateView(view: 'preview' | 'raw') {
    this.options.currentView = view;
    const previewTab = this.element.querySelector('[data-view="preview"]');
    const rawTab = this.element.querySelector('[data-view="raw"]');

    if (view === 'preview') {
      previewTab?.classList.add('is-active');
      rawTab?.classList.remove('is-active');
    } else {
      previewTab?.classList.remove('is-active');
      rawTab?.classList.add('is-active');
    }
  }

  public updateTheme(theme: 'auto' | 'light' | 'dark') {
    this.options.theme = theme;
    const themeBtn = this.element.querySelector('.gmr-toolbar-theme-btn');
    if (themeBtn) {
      let icon = ICONS.sun;
      let label = 'Theme: Light';
      if (theme === 'dark') {
        icon = ICONS.moon;
        label = 'Theme: Dark';
      } else if (theme === 'auto') {
        icon = ICONS.sun;
        label = 'Theme: System';
      }
      themeBtn.innerHTML = `${icon} <span class="gmr-btn-label">${theme.charAt(0).toUpperCase() + theme.slice(1)}</span>`;
      themeBtn.setAttribute('title', `Theme: ${theme} (Click to toggle)`);
    }
  }

  public updateWidth(isFullWidth: boolean) {
    this.options.isFullWidth = isFullWidth;
    const widthBtn = this.element.querySelector('.gmr-toolbar-width-btn');
    if (widthBtn) {
      widthBtn.innerHTML = isFullWidth ? ICONS.compress : ICONS.expand;
      widthBtn.setAttribute('title', isFullWidth ? 'Standard width (1012px)' : 'Full width');
    }
  }

  private render() {
    const { fileName, wordCount, readingTimeMinutes, currentView, theme, isFullWidth } = this.options;

    const themeIcon = theme === 'dark' ? ICONS.moon : ICONS.sun;
    const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);

    this.element.innerHTML = `
      <div class="gmr-toolbar-inner">
        <div class="gmr-toolbar-left">
          <div class="gmr-toolbar-file">
            <span class="gmr-file-icon">${ICONS.file}</span>
            <span class="gmr-file-name" title="${fileName}">${fileName}</span>
          </div>
          <span class="gmr-toolbar-divider"></span>
          <span class="gmr-toolbar-stats">${wordCount.toLocaleString()} words · ${readingTimeMinutes} min read</span>
        </div>

        <div class="gmr-toolbar-center">
          <div class="gmr-view-tabs" role="tablist">
            <button type="button" class="gmr-tab-btn ${currentView === 'preview' ? 'is-active' : ''}" data-view="preview" role="tab" aria-selected="${currentView === 'preview'}">
              ${ICONS.preview}
              <span>Preview</span>
            </button>
            <button type="button" class="gmr-tab-btn ${currentView === 'raw' ? 'is-active' : ''}" data-view="raw" role="tab" aria-selected="${currentView === 'raw'}">
              ${ICONS.code}
              <span>Raw</span>
            </button>
          </div>
        </div>

        <div class="gmr-toolbar-right">
          <button type="button" class="gmr-btn-icon gmr-toolbar-outline-btn" title="Toggle Document Outline" aria-label="Toggle Document Outline">
            ${ICONS.outline}
            <span class="gmr-btn-text">Outline</span>
          </button>

          <button type="button" class="gmr-btn-icon gmr-toolbar-width-btn" title="${isFullWidth ? 'Standard width' : 'Full width'}" aria-label="Toggle content width">
            ${isFullWidth ? ICONS.compress : ICONS.expand}
          </button>

          <button type="button" class="gmr-btn-icon gmr-toolbar-theme-btn" title="Theme: ${theme} (Click to toggle)" aria-label="Toggle theme">
            ${themeIcon}
            <span class="gmr-btn-label">${themeLabel}</span>
          </button>

          <button type="button" class="gmr-btn-icon gmr-toolbar-print-btn" title="Print document" aria-label="Print document">
            ${ICONS.print}
          </button>
        </div>
      </div>
    `;

    // Event listeners
    const previewTab = this.element.querySelector('[data-view="preview"]');
    const rawTab = this.element.querySelector('[data-view="raw"]');

    previewTab?.addEventListener('click', () => {
      this.updateView('preview');
      this.options.onViewChange('preview');
    });

    rawTab?.addEventListener('click', () => {
      this.updateView('raw');
      this.options.onViewChange('raw');
    });

    const outlineBtn = this.element.querySelector('.gmr-toolbar-outline-btn');
    outlineBtn?.addEventListener('click', () => {
      this.options.onToggleOutline();
    });

    const widthBtn = this.element.querySelector('.gmr-toolbar-width-btn');
    widthBtn?.addEventListener('click', () => {
      this.options.onToggleWidth();
    });

    const themeBtn = this.element.querySelector('.gmr-toolbar-theme-btn');
    themeBtn?.addEventListener('click', () => {
      // Cycle: auto -> dark -> light -> auto
      const nextTheme = this.options.theme === 'auto' ? 'dark' : this.options.theme === 'dark' ? 'light' : 'auto';
      this.updateTheme(nextTheme);
      this.options.onThemeChange(nextTheme);
    });

    const printBtn = this.element.querySelector('.gmr-toolbar-print-btn');
    printBtn?.addEventListener('click', () => {
      this.options.onPrint();
    });
  }
}
