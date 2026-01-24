// Import API key bridge
import { env } from './config.js';

const MORPH_STYLE_ID = 'morph-ui-injected';
const OVERLAY_ID = 'morph-ui-overlay';
const ORIGINAL_STYLE_ID = 'morph-acc-original-style'; // NEW: ID for original page styles
const MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

// --- PROMPTS FOR AI MODES ---
const MODE_PROMPTS = {
  'kids': "Rewrite this webpage content for a 7-year-old. Use a playful, colorful design with large 'Comic Sans' text, emojis, and simple language. Return HTML with inline CSS.",
  'easy-read': "Rewrite this for maximum readability (WCAG AAA). Use black text on cream background, large sans-serif font, short paragraphs, and no clutter. Return HTML with inline CSS.",
  'focus': "Summarize this page into the essential core content only. Remove all fluff, ads, and sidebars. Use a dark mode terminal style (green text on black). Return HTML with inline CSS.",
  'power': "Condense this page into a high-density technical briefing. Use bullet points, data tables, and a professional monochrome look. Return HTML with inline CSS."
};

// --- Gemini API ---
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
          maxOutputTokens: 8192,
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
  const cand = data?.candidates?.[0];
  if (!cand) return { ok: false, error: 'No response from model.' };
  
  const text = cand?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, error: 'Empty response.' };
  
  return { ok: true, text: String(text).trim() };
}

// --- Run code on the active tab ---
async function runOnActiveTab(fn, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn, args });
}

// --- INJECTOR 1: Full HTML Overlay (Shadow DOM) ---
function injectMorphOverlay(htmlContent, overlayId, accCss) {
  // 1. Remove old overlay
  const old = document.getElementById(overlayId);
  if (old) old.remove();

  // 2. Create Host
  const host = document.createElement('div');
  host.id = overlayId;
  Object.assign(host.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    zIndex: '2147483647', background: 'white', display: 'block'
  });

  // 3. Create Shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  // 4. Inject Accessibility Styles
  const style = document.createElement('style');
  style.id = 'morph-acc-style'; 
  style.textContent = accCss || '';
  shadow.appendChild(style);

  // 5. Inject AI Content
  const wrapper = document.createElement('div');
  wrapper.id = 'morph-content';
  wrapper.style.height = '100%';
  wrapper.style.overflowY = 'auto';
  const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '');
  wrapper.innerHTML = cleanHtml;
  shadow.appendChild(wrapper);

  // 6. Close Button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = "Exit Mode";
  Object.assign(closeBtn.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '10000',
    padding: '10px 20px', background: '#ef4444', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
  });
  closeBtn.onclick = () => host.remove();
  shadow.appendChild(closeBtn);

  document.body.appendChild(host);
}

// --- INJECTOR 2: Update Overlay Styles (Live) ---
function updateOverlayStyles(overlayId, newCss) {
  const host = document.getElementById(overlayId);
  if (!host || !host.shadowRoot) return;
  const style = host.shadowRoot.getElementById('morph-acc-style');
  if (style) style.textContent = newCss;
}

// --- INJECTOR 3: Update Original Page Styles (Live) ---
function injectOriginalPageStyles(styleId, newCss) {
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = newCss;
}

// --- Helper: Build Accessibility CSS ---
// UPDATED: Simply swaps the font to Comic Sans (Dyslexia friendly) and adjusts spacing
function buildAccCss(isShadow = false) {
  let acc = '';
  
  // Font override (Dyslexia)
  if (state.dyslexia) {
    // 1. Define the font stack (System fonts only for reliability)
    const fontStack = 'body,p,span,li,div{font-family:\'Comic Sans MS\',sans-serif!important;letter-spacing:0.12em!important;word-spacing:0.2em!important}';
    // 2. Selectors
    if (isShadow) {
      // For AI Overlay
      acc += `:host, :host * { font-family: ${fontStack} !important; letter-spacing: 0.05em !important; word-spacing: 0.1em !important; line-height: 1.6 !important; }`;
    } else {
      // For Original Page - "Nuclear" selector to override everything
      acc += `html, body, div, p, span, a, h1, h2, h3, h4, h5, h6, li, ul, ol, td, th, button, input, textarea, label, select, article, section, main, nav, header, footer, * { font-family: ${fontStack} !important; letter-spacing: 0.05em !important; word-spacing: 0.1em !important; line-height: 1.6 !important; }`;
    }
  }
  
  // High Contrast
  if (state.highContrast) {
    const target = isShadow ? ':host *' : '*';
    acc += `${target} { border: 1px solid rgba(255,255,255,0.5) !important; background-color: black !important; color: white !important; } a { color: #FFFF00 !important; }`;
  }
  
  // Color Blindness Filters
  const cb = state.colorBlindness;
  const selector = isShadow ? ':host' : 'html';
  
  if (cb === 'protanopia') acc += `${selector} { filter: sepia(0.4) saturate(2) hue-rotate(-50deg) !important; }`;
  if (cb === 'deuteranopia') acc += `${selector} { filter: sepia(0.5) saturate(1.8) hue-rotate(70deg) !important; }`;
  if (cb === 'tritanopia') acc += `${selector} { filter: sepia(0.2) saturate(2) hue-rotate(160deg) !important; }`;
  
  return acc;
}

// --- State Management ---
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

// --- Get Page Text ---
async function getPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: 'No active tab.' };
  if (tab.url && /^(chrome|edge|about|opera|vivaldi):\/\//i.test(tab.url)) {
    return { ok: false, error: 'Cannot read internal browser pages.' };
  }
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body && document.body.innerText ? String(document.body.innerText).slice(0, 15000) : ''),
    });
    const text = (out?.[0]?.result ?? '').trim();
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: 'Cannot access this page. Try refreshing.' };
  }
}

// --- MAIN MORPH FUNCTION (AI Powered) ---
async function runMorph(customPrompt = null) {
  let promptInstruction = customPrompt;
  if (!promptInstruction) {
    promptInstruction = MODE_PROMPTS[state.mode] || MODE_PROMPTS['easy-read'];
  }

  const page = await getPageText();
  if (!page.ok) { alert(page.error); return; }
  if (!page.text) { alert("Page is empty or unreadable."); return; }

  const fullPrompt = `
    Act as an Expert Accessibility Frontend Developer.
    TASK: ${promptInstruction}
    RULES:
    1. Return ONLY valid HTML code inside a <div> wrapper.
    2. Include inline CSS for all styling.
    3. Make it beautiful, responsive, and fully accessible.
    4. Do not return markdown ticks (\`\`\`).
    PAGE CONTENT TO REDESIGN:
    ${page.text}
  `;

  const res = await callGemini(fullPrompt);
  
  if (!res.ok) {
    console.error(res.error);
    alert("AI Error: " + res.error);
    return;
  }

  // Inject Overlay with Shadow DOM-specific styles
  const accCss = buildAccCss(true); 
  await runOnActiveTab(injectMorphOverlay, [res.text, OVERLAY_ID, accCss]);
}

// --- NEW HELPER: Refresh Global Styles (Both Overlay AND Original Page) ---
async function refreshGlobalStyles() {
  // 1. Update Overlay (if it exists)
  const shadowCss = buildAccCss(true); // true = Shadow DOM mode
  await runOnActiveTab(updateOverlayStyles, [OVERLAY_ID, shadowCss]);

  // 2. Update Original Page (always)
  const originalCss = buildAccCss(false); // false = Standard DOM mode
  await runOnActiveTab(injectOriginalPageStyles, [ORIGINAL_STYLE_ID, originalCss]);
}

// --- UI EVENT LISTENERS ---

// Morph Button
document.getElementById('morph-btn').addEventListener('click', async () => {
  const btn = document.getElementById('morph-btn');
  btn.disabled = true;
  const originalText = btn.querySelector('span').textContent;
  btn.querySelector('span').textContent = 'Generating UI...';
  try { await runMorph(); } catch (e) { console.error(e); alert("Unexpected error."); }
  btn.disabled = false;
  btn.querySelector('span').textContent = originalText;
});

// Mode Cards
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    state.mode = card.dataset.mode;
    saveState();
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

// Custom Morph
const customInput = document.getElementById('custom-morph-input');
const customBtn = document.getElementById('custom-morph-btn');
if (customInput && customBtn) {
  customBtn.addEventListener('click', async () => {
    const val = customInput.value.trim();
    if (!val) return;
    customBtn.disabled = true; customBtn.textContent = '...';
    await runMorph(val);
    customBtn.disabled = false; customBtn.textContent = 'Go';
  });
}

// --- UI: Chat & Summarize ---
const resultBox = document.getElementById('ai-result-box');
const chatInputGroup = document.getElementById('ai-chat-input-group');
const chatInput = document.getElementById('ai-chat-input');
const chatSend = document.getElementById('ai-chat-send');

function showAiResult(content, isError = false) {
  resultBox.classList.remove('hidden', 'error');
  if (isError) {
    resultBox.classList.add('error'); resultBox.textContent = content;
  } else {
    if (content.includes('* ') || content.includes('- ')) {
      const listItems = content.split(/[\*\-]\s+/).filter(s => s.trim()).map(item => `<li>${item.trim()}</li>`).join('');
      resultBox.innerHTML = `<ul>${listItems}</ul>`;
    } else {
      resultBox.textContent = content;
    }
  }
}

function showAiLoader() {
  chatInputGroup.classList.add('hidden');
  resultBox.classList.remove('hidden', 'error');
  resultBox.textContent = 'Thinking...';
}

document.getElementById('ai-summarize').addEventListener('click', async () => {
  showAiLoader();
  const page = await getPageText();
  if (!page.ok) { showAiResult('Error: ' + page.error, true); return; }
  const r = await callGemini('Summarize this webpage in 3–5 short bullet points.\n\n' + page.text);
  if (r.ok) showAiResult(r.text); else showAiResult('Failed: ' + r.error, true);
});

async function runChat() {
    const q = chatInput.value.trim();
    if (q === '') return;
    showAiLoader();
    chatInput.value = '';
    const page = await getPageText();
    if (!page.ok) { showAiResult('Error: ' + page.error, true); return; }
    const r = await callGemini(`Answer based on page: "${q}"\n\n${page.text}`);
    chatInputGroup.classList.remove('hidden');
    if (r.ok) showAiResult(r.text); else showAiResult('Failed: ' + r.error, true);
}

document.getElementById('ai-chat').addEventListener('click', () => {
  resultBox.classList.add('hidden');
  const isHidden = chatInputGroup.classList.toggle('hidden');
  if (!isHidden) chatInput.focus();
});

chatSend.addEventListener('click', runChat);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); runChat(); }
});

// --- ACCESSIBILITY TOGGLES ---
document.getElementById('dyslexia-toggle').addEventListener('click', () => {
  state.dyslexia = !state.dyslexia;
  saveState();
  document.getElementById('dyslexia-toggle').classList.toggle('on', state.dyslexia);
<<<<<<< HEAD
  refreshGlobalStyles();
=======
  document.getElementById('dyslexia-toggle').setAttribute('aria-checked', state.dyslexia);
  runMorph();
  setPageState('morphed');
>>>>>>> 868d70a10700ee52d6747e8a0aacba9044d27e55
});

document.getElementById('high-contrast-toggle').addEventListener('click', () => {
  state.highContrast = !state.highContrast;
  saveState();
  document.getElementById('high-contrast-toggle').classList.toggle('on', state.highContrast);
<<<<<<< HEAD
  refreshGlobalStyles();
=======
  document.getElementById('high-contrast-toggle').setAttribute('aria-checked', state.highContrast);
  runMorph();
  setPageState('morphed');
>>>>>>> 868d70a10700ee52d6747e8a0aacba9044d27e55
});

document.getElementById('color-blindness').addEventListener('change', (e) => {
  state.colorBlindness = e.target.value;
  saveState();
<<<<<<< HEAD
  refreshGlobalStyles();
=======
  runMorph();
  setPageState('morphed');
>>>>>>> 868d70a10700ee52d6747e8a0aacba9044d27e55
});

// --- Close & Misc ---
document.getElementById('close-btn').addEventListener('click', () => {
  try { window.close(); } catch (_) {}
});

document.getElementById('safe-mode-toggle').addEventListener('click', () => {
  state.safeMode = !state.safeMode;
  saveState();
  document.getElementById('safe-mode-toggle').classList.toggle('on', state.safeMode);
});

// --- Initialization ---
loadState().then(() => {
  document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('selected', c.dataset.mode === state.mode));
  document.getElementById('dyslexia-toggle').classList.toggle('on', state.dyslexia);
  document.getElementById('high-contrast-toggle').classList.toggle('on', state.highContrast);
  document.getElementById('safe-mode-toggle').classList.toggle('on', state.safeMode);
  document.getElementById('color-blindness').value = state.colorBlindness;
  
  // Apply saved styles immediately on load
  refreshGlobalStyles();
});