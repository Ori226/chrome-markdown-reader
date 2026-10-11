import mermaid from 'mermaid';

let isInitialized = false;

export async function renderMermaidDiagrams(container: HTMLElement, isDarkMode: boolean) {
  const elements = container.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid-code]');
  if (elements.length === 0) return;

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      suppressErrorRendering: true,
    });
    isInitialized = true;
  } catch (err) {
    console.warn('Mermaid initialization warning:', err);
  }

  let counter = 0;
  for (const el of Array.from(elements)) {
    const code = el.getAttribute('data-mermaid-code');
    if (!code) continue;

    const id = `mermaid-svg-${Date.now()}-${counter++}`;
    try {
      const { svg } = await mermaid.render(id, code.trim());
      el.innerHTML = svg;
      el.classList.add('mermaid-rendered');
    } catch (err: any) {
      console.warn('Mermaid render error for block:', err);
      el.innerHTML = `<div class="mermaid-error"><span class="mermaid-error-label">Mermaid diagram syntax error:</span><pre>${code}</pre></div>`;
    }
  }
}
