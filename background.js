// This script tells Chrome to open the Side Panel when the icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("Morph AI background service started.");
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'OPEN_MORPHUI_SIDE_PANEL') {
    const tabId = sender?.tab?.id;
    if (tabId != null) {
      chrome.sidePanel.open({ tabId }).catch(() => {});
    }
  }
});
