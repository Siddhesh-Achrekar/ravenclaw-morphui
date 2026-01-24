// Import API key bridge
import { env } from './config.js';

const MORPH_STYLE_ID = 'morph-ui-injected';

// --- Run code on the active tab (func runs in PAGE context; only args are passed) ---
async function runOnActiveTab(fn, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn, args });
}

// --- Injected function: runs IN THE PAGE. Receives pre-built CSS and flags. ---
function applyMorphInPage(styleId, modeCss, accCss, runKidsDom) {
  const old = document.getElementById(styleId);
  if (old) old.remove();
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = (modeCss || '') + '\n' + (accCss || '');
  document.head.appendChild(style);
  if (runKidsDom) {
    document.querySelectorAll('a, button, [role="button"]').forEach(function (el) {
      el.style.setProperty('background', 'linear-gradient(135deg, #fbbf24 0%, #f472b6 100%)', 'important');
      el.style.setProperty('color', '#1f2937', 'important');
      el.style.setProperty('border', 'none', 'important');
    });
  }
}

// --- State ---
let state = {
  scope: 'site',
  safeMode: true,
  mode: 'kids',
  dyslexia: false,
  highContrast: false,
  colorBlindness: 'none',
};

async function loadState() {
  try {
    const r = await chrome.storage.local.get(['morphState']);
    if (r.morphState) state = { ...state, ...r.morphState };
  } catch (_) {}
}

function saveState() {
  chrome.storage.local.set({ morphState: state }).catch(() => {});
}

// --- Build mode CSS (extension context) ---
function buildModeCss() {
  const m = state.mode;
  if (m === 'easy-read') {
    return `body{font-size:1.15rem!important;line-height:1.7!important;font-family:Georgia,'Times New Roman',serif!important}p,li,span{max-width:65ch!important}
      aside,[class*="sidebar"]:not([role="navigation"]),[id*="ad-"],.ad,[class*="advertisement"]{display:none!important}`;
  }
  if (m === 'focus') {
    return `aside,[class*="sidebar"],[class*="ad-"],.ad,iframe[src*="ad"]{display:none!important}
      main,[role="main"],article,.content,#content{max-width:720px!important;margin-left:auto!important;margin-right:auto!important}
      body{background:#1a1a2e!important;color:#eaeaea!important}`;
  }
  if (m === 'power') {
    return `body{font-size:0.9rem!important;line-height:1.4!important;font-family:'SF Mono',Consolas,monospace!important}*{letter-spacing:0.02em!important}table,pre,code{font-size:0.85rem!important}`;
  }
  if (m === 'kids') {
    return `body{font-size:1.2rem!important;line-height:1.8!important;font-family:'Comic Sans MS',Chalkboard,fantasy,sans-serif!important}
      a,button,[role="button"]{border-radius:12px!important;padding:8px 14px!important;font-weight:bold!important}
      h1,h2,h3{color:#6366f1!important}`;
  }
  return '';
}

function buildAccCss() {
  let acc = '';
  if (state.dyslexia) acc += 'body,p,span,li,div{font-family:\'Comic Sans MS\',sans-serif!important;letter-spacing:0.12em!important;word-spacing:0.2em!important}';
  if (state.highContrast) acc += '*{border:1px solid rgba(255,255,255,0.25)!important}body{background:#000!important;color:#fff!important}a{color:#60a5fa!important}';
  const cb = state.colorBlindness;
  if (cb === 'protanopia') acc += 'html{filter:sepia(0.4) saturate(2) hue-rotate(-50deg)!important}';
  if (cb === 'deuteranopia') acc += 'html{filter:sepia(0.5) saturate(1.8) hue-rotate(70deg)!important}';
  if (cb === 'tritanopia') acc += 'html{filter:sepia(0.2) saturate(2) hue-rotate(160deg)!important}';
  return acc;
}

function runMorph() {
  const modeCss = buildModeCss();
  const accCss = buildAccCss();
  const runKidsDom = state.mode === 'kids' && !state.safeMode;
  runOnActiveTab(applyMorphInPage, [MORPH_STYLE_ID, modeCss, accCss, runKidsDom]);
}

// --- UI: Close ---
document.getElementById('close-btn').addEventListener('click', () => {
  try { window.close(); } catch (_) {}
});

// --- UI: Scope toggles ---
function setScope(s) {
  state.scope = s;
  saveState();
  document.getElementById('scope-site').className = 'scope-btn ' + (s === 'site' ? 'active-site' : '');
  document.getElementById('scope-global').className = 'scope-btn ' + (s === 'global' ? 'active-global' : '');
}
document.getElementById('scope-site').addEventListener('click', () => setScope('site'));
document.getElementById('scope-global').addEventListener('click', () => setScope('global'));

// --- UI: Safe Mode toggle ---
document.getElementById('safe-mode-toggle').addEventListener('click', () => {
  state.safeMode = !state.safeMode;
  saveState();
  document.getElementById('safe-mode-toggle').classList.toggle('on', state.safeMode);
  document.getElementById('safe-mode-toggle').setAttribute('aria-checked', state.safeMode);
});

// --- UI: Mode selection ---
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    state.mode = card.dataset.mode;
    saveState();
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

// --- UI: Morph This Page ---
document.getElementById('morph-btn').addEventListener('click', async () => {
  const btn = document.getElementById('morph-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Morphing...';
  try {
    runMorph();
  } catch (e) {
    console.error('Morph error:', e);
  }
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Morph This Page';
});

// --- UI: AI Summarize ---
document.getElementById('ai-summarize').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const out = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body && document.body.innerText ? document.body.innerText.slice(0, 4000) : ''),
    });
    const result = out?.[0]?.result ?? '';
    const prompt = `Summarize this webpage in 3–5 short bullet points in simple language:\n\n${result}`;
    const res = await fetch(`${env.BASE_URL}/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to get summary.';
    alert('Summary:\n\n' + text);
  } catch (e) {
    console.error('Summarize error:', e);
    alert('Summarize failed. Check API key and connection.');
  }
});

// --- UI: Chat / Q&A (simple: prompt for a question and answer from page content) ---
document.getElementById('ai-chat').addEventListener('click', async () => {
  const q = prompt('Ask a question about this page:');
  if (!q) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const out = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body && document.body.innerText ? document.body.innerText.slice(0, 4000) : ''),
    });
    const result = out?.[0]?.result ?? '';
    const prompt = `Based only on this page content, answer briefly: "${q}"\n\nPage:\n${result}`;
    const res = await fetch(`${env.BASE_URL}/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer.';
    alert('Answer:\n\n' + text);
  } catch (e) {
    console.error('Chat error:', e);
    alert('Q&A failed. Check API key and connection.');
  }
});

// --- UI: Accessibility collapsible ---
const accHeader = document.getElementById('acc-header');
const accBody = document.getElementById('acc-body');
accHeader.addEventListener('click', () => {
  const open = accBody.classList.toggle('open');
  accHeader.classList.toggle('open', open);
  accHeader.setAttribute('aria-expanded', open);
});

// --- UI: Dyslexia toggle ---
document.getElementById('dyslexia-toggle').addEventListener('click', async () => {
  state.dyslexia = !state.dyslexia;
  saveState();
  document.getElementById('dyslexia-toggle').classList.toggle('on', state.dyslexia);
  document.getElementById('dyslexia-toggle').setAttribute('aria-checked', state.dyslexia);
  runMorph();
});

// --- UI: High Contrast toggle ---
document.getElementById('high-contrast-toggle').addEventListener('click', async () => {
  state.highContrast = !state.highContrast;
  saveState();
  document.getElementById('high-contrast-toggle').classList.toggle('on', state.highContrast);
  document.getElementById('high-contrast-toggle').setAttribute('aria-checked', state.highContrast);
  runMorph();
});

// --- UI: Color Blindness ---
document.getElementById('color-blindness').addEventListener('change', async (e) => {
  state.colorBlindness = e.target.value;
  saveState();
  runMorph();
});

// --- UI: Mic (placeholder: could open voice UI or run voice-related logic) ---
document.getElementById('mic-btn').addEventListener('click', () => {
  // Placeholder: e.g. open a small voice-input UI or trigger Web Speech API in sidepanel
  console.log('Voice input placeholder');
});

// --- Progress bar: optional reading progress from active tab ---
function setProgress(pct) {
  const el = document.getElementById('progress-fill');
  if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%';
}
// Default: show a subtle “ready” state
setProgress(0);

// --- Init: load saved state and apply to UI ---
loadState().then(() => {
  setScope(state.scope);
  document.getElementById('safe-mode-toggle').classList.toggle('on', state.safeMode);
  document.getElementById('safe-mode-toggle').setAttribute('aria-checked', state.safeMode);
  document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('selected', c.dataset.mode === state.mode));
  document.getElementById('dyslexia-toggle').classList.toggle('on', state.dyslexia);
  document.getElementById('dyslexia-toggle').setAttribute('aria-checked', state.dyslexia);
  document.getElementById('high-contrast-toggle').classList.toggle('on', state.highContrast);
  document.getElementById('high-contrast-toggle').setAttribute('aria-checked', state.highContrast);
  document.getElementById('color-blindness').value = state.colorBlindness;
});
