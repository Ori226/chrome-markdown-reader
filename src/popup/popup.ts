// Extension popup logic

interface StoredSettings {
  theme?: 'auto' | 'light' | 'dark';
  outlineOpen?: boolean;
  fullWidth?: boolean;
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggleRenderBtn = document.getElementById('toggleRenderBtn') as HTMLButtonElement;
  const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
  const widthSelect = document.getElementById('widthSelect') as HTMLSelectElement;
  const toggleOutlineBtn = document.getElementById('toggleOutlineBtn') as HTMLButtonElement;

  // Query active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;

  // Load current settings from storage
  chrome.storage.local.get(['gmr_settings'], (result: { gmr_settings?: StoredSettings }) => {
    if (result.gmr_settings) {
      if (result.gmr_settings.theme) {
        themeSelect.value = result.gmr_settings.theme;
      }
      if (result.gmr_settings.fullWidth !== undefined) {
        widthSelect.value = result.gmr_settings.fullWidth ? 'full' : 'standard';
      }
    }
  });

  // Query active tab status
  if (tabId !== undefined) {
    chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        // Content script might not be loaded on this page
        return;
      }
      if (res.isRendered) {
        toggleRenderBtn.textContent = 'Restore Raw View';
      } else {
        toggleRenderBtn.textContent = 'Render as Markdown';
      }
      if (res.theme) {
        themeSelect.value = res.theme;
      }
      if (res.fullWidth !== undefined) {
        widthSelect.value = res.fullWidth ? 'full' : 'standard';
      }
    });
  }

  // Handle Toggle Render button
  toggleRenderBtn?.addEventListener('click', () => {
    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_RENDER' }, (res) => {
        if (chrome.runtime.lastError) {
          // If script is not yet in the tab, try injecting
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['dist/content.js']
          });
          chrome.scripting.insertCSS({
            target: { tabId },
            files: ['dist/content.css']
          });
          toggleRenderBtn.textContent = 'Restore Raw View';
        } else if (res) {
          toggleRenderBtn.textContent = res.isRendered ? 'Restore Raw View' : 'Render as Markdown';
        }
      });
    }
  });

  // Handle Theme change
  themeSelect?.addEventListener('change', () => {
    const theme = themeSelect.value as 'auto' | 'light' | 'dark';
    chrome.storage.local.get(['gmr_settings'], (result: { gmr_settings?: StoredSettings }) => {
      const settings = result.gmr_settings || {};
      settings.theme = theme;
      chrome.storage.local.set({ gmr_settings: settings });
    });

    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, { type: 'SET_THEME', theme });
    }
  });

  // Handle Width change
  widthSelect?.addEventListener('change', () => {
    const isFull = widthSelect.value === 'full';
    chrome.storage.local.get(['gmr_settings'], (result: { gmr_settings?: StoredSettings }) => {
      const settings = result.gmr_settings || {};
      settings.fullWidth = isFull;
      chrome.storage.local.set({ gmr_settings: settings });
    });

    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_WIDTH' });
    }
  });

  // Handle Outline toggle
  toggleOutlineBtn?.addEventListener('click', () => {
    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_OUTLINE' });
    }
  });
});
