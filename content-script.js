(() => {
  if (document.getElementById('morphui-floating-button')) return;

  const host = document.createElement('div');
  host.id = 'morphui-floating-button';
  host.style.position = 'fixed';
  host.style.right = '16px';
  host.style.bottom = '16px';
  host.style.zIndex = '2147483647';
  host.style.width = '48px';
  host.style.height = '48px';

  const shadow = host.attachShadow({ mode: 'open' });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open MorphUI');
  btn.style.width = '48px';
  btn.style.height = '48px';
  btn.style.borderRadius = '999px';
  btn.style.border = '1px solid rgba(0,0,0,0.2)';
  btn.style.background = 'white';
  btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
  btn.style.cursor = 'pointer';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.padding = '0';

  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('images/icon48.png');
  img.alt = 'MorphUI';
  img.style.width = '28px';
  img.style.height = '28px';
  btn.appendChild(img);

  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_MORPHUI_SIDE_PANEL' });
  });

  shadow.appendChild(btn);
  document.documentElement.appendChild(host);
})();
