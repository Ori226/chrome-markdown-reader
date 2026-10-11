import { HeadingItem } from './parser';
import { ICONS } from './icons';

export class DocumentOutline {
  private container: HTMLElement;
  private listEl: HTMLElement;
  private headings: HeadingItem[];
  private activeId: string | null = null;
  private observer: IntersectionObserver | null = null;
  private isOpen: boolean = false;
  private onToggleCallback?: (isOpen: boolean) => void;

  constructor(headings: HeadingItem[], onToggle?: (isOpen: boolean) => void) {
    this.headings = headings;
    this.onToggleCallback = onToggle;

    this.container = document.createElement('aside');
    this.container.className = 'gmr-outline-drawer';
    this.container.setAttribute('aria-label', 'Document Outline');

    this.listEl = document.createElement('nav');
    this.listEl.className = 'gmr-outline-nav';

    this.render();
    this.setupScrollSpy();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public toggle(open?: boolean): boolean {
    this.isOpen = open !== undefined ? open : !this.isOpen;
    if (this.isOpen) {
      this.container.classList.add('is-open');
    } else {
      this.container.classList.remove('is-open');
    }
    if (this.onToggleCallback) {
      this.onToggleCallback(this.isOpen);
    }
    return this.isOpen;
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public updateHeadings(headings: HeadingItem[]) {
    this.headings = headings;
    this.render();
    this.setupScrollSpy();
  }

  private render() {
    this.container.innerHTML = `
      <div class="gmr-outline-header">
        <div class="gmr-outline-title">
          ${ICONS.outline}
          <span>Outline</span>
        </div>
        <button type="button" class="gmr-btn-icon gmr-outline-close-btn" title="Close outline" aria-label="Close outline">
          ${ICONS.close}
        </button>
      </div>
    `;

    this.listEl.innerHTML = '';

    if (this.headings.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'gmr-outline-empty';
      emptyNotice.textContent = 'No headings found in document.';
      this.listEl.appendChild(emptyNotice);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'gmr-outline-list';

      for (const h of this.headings) {
        const li = document.createElement('li');
        li.className = `gmr-outline-item gmr-level-${h.level}`;
        li.setAttribute('data-target-id', h.id);

        const a = document.createElement('a');
        a.href = `#${h.id}`;
        a.className = 'gmr-outline-link';
        a.textContent = h.text || '(Untitled section)';

        a.addEventListener('click', (e) => {
          e.preventDefault();
          const targetEl = document.getElementById(h.id);
          if (targetEl) {
            history.pushState(null, '', `#${h.id}`);
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this.setActiveHeading(h.id);
          }
        });

        li.appendChild(a);
        ul.appendChild(li);
      }
      this.listEl.appendChild(ul);
    }

    this.container.appendChild(this.listEl);

    const closeBtn = this.container.querySelector('.gmr-outline-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.toggle(false);
    });
  }

  private setupScrollSpy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.headings.length === 0) return;

    // Use IntersectionObserver and scroll tracking to detect current heading in view
    const headingElements = this.headings
      .map(h => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      let currentId = this.headings[0]?.id || null;

      for (const h of this.headings) {
        const el = document.getElementById(h.id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (top <= scrollPosition) {
            currentId = h.id;
          } else {
            break;
          }
        }
      }

      if (currentId && currentId !== this.activeId) {
        this.setActiveHeading(currentId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once initially
    setTimeout(handleScroll, 100);
  }

  private setActiveHeading(id: string) {
    this.activeId = id;
    const items = this.container.querySelectorAll('.gmr-outline-item');
    items.forEach(item => {
      if (item.getAttribute('data-target-id') === id) {
        item.classList.add('is-active');
        // Keep active item in view inside outline
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('is-active');
      }
    });
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
