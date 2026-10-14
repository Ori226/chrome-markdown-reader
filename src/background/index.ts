// Background service worker for GitHub Markdown Reader

chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu item
  chrome.contextMenus.create({
    id: 'gmr-render-page',
    title: 'Render as GitHub Markdown',
    contexts: ['page', 'selection']
  });

  // Set default settings
  chrome.storage.local.get(['gmr_settings'], (result) => {
    if (!result.gmr_settings) {
      chrome.storage.local.set({
        gmr_settings: {
          theme: 'auto',
          outlineOpen: false,
          fullWidth: false,
        }
      });
    }
  });

  // Check if file URL access is already granted; if not, open onboarding page
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    if (chrome.extension && chrome.extension.isAllowedFileSchemeAccess) {
      chrome.extension.isAllowedFileSchemeAccess((isAllowed) => {
        if (!isAllowed) {
          chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
        }
      });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    }
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const tabId = tab?.id;
  if (info.menuItemId === 'gmr-render-page' && tabId !== undefined) {
    chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_RENDER' }, (_res) => {
      if (chrome.runtime.lastError) {
        // Content script might not be injected yet
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['dist/content.js']
        });
        chrome.scripting.insertCSS({
          target: { tabId },
          files: ['dist/content.css']
        });
      }
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_markdown') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0]?.id;
      if (activeTabId !== undefined) {
        chrome.tabs.sendMessage(activeTabId, { type: 'TOGGLE_RENDER' });
      }
    });
  }
});
