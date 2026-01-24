// Import API key bridge
import { env } from './config.js';

const MORPH_STYLE_ID = 'morph-ui-injected';
const MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

// --- Gemini API: single place for fetch, error handling, response parsing ---
async function callGemini(prompt) {
  const key = env.GEMINI_API_KEY;
  const base = (env.BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  if (!key || !base) {
    return { ok: false, error: 'Missing GEMINI_API_KEY or BASE_URL in config.js' };
  }
  const url = `${base}/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          topP: 0.95,
        },
      }),
    });
  } catch (e) {
    return { ok: false, error: 'Network error: ' + (e.message || 'Could not reach Gemini API.') };
  }
  let data;
  try {
    data = await res.json();
  } catch (_) {
    return { ok: false, error: 'Invalid JSON in API response.' };
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error?.status || res.statusText || 'Request failed';
    return { ok: false, error: `API error (${res.status}): ${msg}` };
  }
  if (data?.error) {
    return { ok: false, error: data.error.message || JSON.stringify(data.error) };
  }
  const block = data?.promptFeedback?.blockReason;
  if (block) {
    return { ok: false, error: 'Content was blocked: ' + block };
  }
  const cand = data?.candidates?.[0];
  if (!cand) {
    return { ok: false, error: 'No response from the model. Try a different prompt or model.' };
  }
  const part = cand?.content?.parts?.[0];
  const text = part?.text;
  if (text == null || text === '') {
    const reason = cand?.finishReason || 'Unknown';
    return { ok: false, error: 'Empty response (finishReason: ' + reason + ').' };
  }
  return { ok: true, text: String(text).trim() };
}

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

// --- Injected function: Removes styles and resets inline changes ---
function removeMorphInPage(styleId) {
  const old = document.getElementById(styleId);
  if (old) old.remove();
  document.querySelectorAll('a, button, [role="button"]').forEach(function (el) {
    el.style.removeProperty('background');
    el.style.removeProperty('color');
    el.style.removeProperty('border');
  });
}

// --- State ---
let state = {
  scope: 'site',
  safeMode: true,
  mode: 'kids',
  dyslexia: false,
  highContrast: false,
  colorBlindness: 'none',
  pageState: 'morphed',
};

function setPageState(newState) {
  state.pageState = newState;
  saveState();

  // Highlight buttons
  const morphedBtn = document.getElementById('morphed-btn');
  const originalBtn = document.getElementById('original-btn');
  
  if (morphedBtn) morphedBtn.classList.toggle('selected', newState === 'morphed');
  if (originalBtn) originalBtn.classList.toggle('selected', newState === 'original');

  if (newState === 'morphed') {
    // Highlight the active mode card
    document.querySelectorAll('.mode-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.mode === state.mode);
    });
    runMorph();
  } else {
    // Original: Deselect mode cards and remove styles
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    runOnActiveTab(removeMorphInPage, [MORPH_STYLE_ID]);
  }
}

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
  return runOnActiveTab(applyMorphInPage, [MORPH_STYLE_ID, modeCss, accCss, runKidsDom]);
}

// --- UI: Close ---
document.getElementById('close-btn').addEventListener('click', () => {
  try { window.close(); } catch (_) {}
});

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
    setPageState('morphed');
  });
});

// --- UI: Morph This Page ---
document.getElementById('morph-btn').addEventListener('click', async () => {
  const btn = document.getElementById('morph-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Morphing...';
  try {
    await runMorph();
  } catch (e) {
    console.error('Morph error:', e);
    alert('Morph failed: cannot modify this page (e.g. chrome:// or restricted). Try a normal website.');
  }
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Morph This Page';
});

// --- Get page text from active tab; returns { ok, text?, error? } ---
async function getPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: 'No active tab.' };
  if (tab.url && /^(chrome|edge|about|opera|vivaldi):\/\//i.test(tab.url)) {
    return { ok: false, error: 'Cannot read browser internal pages (e.g. chrome://). Open a normal website.' };
  }
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body && document.body.innerText ? String(document.body.innerText).slice(0, 8000) : ''),
    });
    const err = out?.[0]?.error;
    if (err) return { ok: false, error: 'Cannot read this page (e.g. restricted or PDF).' };
    const text = (out?.[0]?.result ?? '').trim();
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: 'Cannot access this page. Try refreshing or use a normal webpage.' };
  }
}

// --- UI: AI Summarize ---
document.getElementById('ai-summarize').addEventListener('click', async () => {
  const page = await getPageText();
  if (!page.ok) {
    alert('Summarize: ' + page.error);
    return;
  }
  if (!page.text) {
    alert('No text could be extracted from this page. Try a different page.');
    return;
  }
  const sys = 'You are a helpful assistant. Summarize the following webpage in 3–5 short bullet points in simple language. Output only the bullets, no extra intro.';
  const prompt = sys + '\n\n---\n\n' + page.text;
  const r = await callGemini(prompt);
  if (r.ok) alert('Summary:\n\n' + r.text);
  else alert('Summarize failed: ' + r.error);
});

// --- UI: Chat / Q&A ---
document.getElementById('ai-chat').addEventListener('click', async () => {
  const q = window.prompt('Ask a question about this page:');
  if (q == null || String(q).trim() === '') return;
  const page = await getPageText();
  if (!page.ok) {
    alert('Q&A: ' + page.error);
    return;
  }
  const context = page.text || '(No page text available.)';
  const prompt = `Based only on the following webpage content, answer this question briefly and clearly: "${q}"\n\nWebpage:\n${context}`;
  const r = await callGemini(prompt);
  if (r.ok) alert('Answer:\n\n' + r.text);
  else alert('Q&A failed: ' + r.error);
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

// --- UI: Morphed / Original toggle ---
document.getElementById('morphed-btn').addEventListener('click', () => setPageState('morphed'));
document.getElementById('original-btn').addEventListener('click', () => setPageState('original'));

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
  setPageState(state.pageState);
  document.getElementById('dyslexia-toggle').classList.toggle('on', state.dyslexia);
  document.getElementById('dyslexia-toggle').setAttribute('aria-checked', state.dyslexia);
  document.getElementById('high-contrast-toggle').classList.toggle('on', state.highContrast);
  document.getElementById('high-contrast-toggle').setAttribute('aria-checked', state.highContrast);
  document.getElementById('color-blindness').value = state.colorBlindness;
});
