// Welcome page logic

function checkFileAccess() {
  if (typeof chrome !== 'undefined' && chrome.extension && chrome.extension.isAllowedFileSchemeAccess) {
    chrome.extension.isAllowedFileSchemeAccess((isAllowed) => {
      const banner = document.getElementById('statusBanner');
      const title = document.getElementById('statusTitle');
      const desc = document.getElementById('statusDesc');

      if (isAllowed) {
        if (banner) {
          banner.className = 'status-banner success';
          if (title) title.textContent = 'All Set! Local File Access is Enabled';
          if (desc) desc.textContent = 'You can now drag and drop any markdown file into Chrome or press Ctrl+O to view it.';
        }
      } else {
        if (banner) {
          banner.className = 'status-banner warning';
          if (title) title.textContent = 'Action Required: Enable Local File Access';
          if (desc) desc.textContent = 'Chrome requires one manual permission toggle before extensions can read local file:/// files.';
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkFileAccess();

  // Re-check when window regains focus (after user toggles in settings tab)
  window.addEventListener('focus', checkFileAccess);

  const openSettingsBtn = document.getElementById('openSettingsBtn');
  openSettingsBtn?.addEventListener('click', () => {
    const extId = chrome.runtime.id;
    chrome.tabs.create({ url: `chrome://extensions/?id=${extId}` });
  });
});
