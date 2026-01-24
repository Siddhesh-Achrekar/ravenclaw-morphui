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
  const base = (env.BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
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

function removeMorphOverlay(overlayId) {
  const host = document.getElementById(overlayId);
  if (host) host.remove();
}

function removeOriginalPageStyles(styleId) {
  const style = document.getElementById(styleId);
  if (style) style.remove();
}

// --- Helper: Build Accessibility CSS ---
// UPDATED: Simply swaps the font to Comic Sans (Dyslexia friendly) and adjusts spacing
function buildAccCss(isShadow = false) {
  let acc = '';
  
  // Font override (Dyslexia)
  if (state.dyslexia) {
    // 1. Define the font stack (System fonts only for reliability)
    const fontStack = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", "Arial", sans-serif';
    
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
  if (state.highContrast) acc += `
    html, body {
      background: #000 !important;
      color: #fff !important;
    }

    * {
      background: transparent !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    p, span, li, div {
      color: #fff !important;
    }

    a {
      color: #00ffff !important;
      text-decoration: underline !important;
      font-weight: bold !important;
    }

    button, [role="button"], input, select {
      background: #000 !important;
      color: #fff !important;
      border: 2px solid #fff !important;
      border-radius: 6px !important;
    }

    img, video {
      filter: brightness(0.85) contrast(1.2) !important;
    }

    :focus {
      outline: 3px solid yellow !important;
      outline-offset: 2px;
    }
  `;

  
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
  view: 'original',
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
  if (tab.url && /^(chrome|edge|about|opera|vivaldi):\/\/$/i.test(tab.url)) {
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
  setView('morphed', { apply: false });
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
    throw new Error(res.error);
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

  // 2. Update Original Page (only if not in original mode)
  if (state.view === 'original') {
    await runOnActiveTab(removeOriginalPageStyles, [ORIGINAL_STYLE_ID]);
    return;
  }
  const originalCss = buildAccCss(false); // false = Standard DOM mode
  await runOnActiveTab(injectOriginalPageStyles, [ORIGINAL_STYLE_ID, originalCss]);
}

async function setView(view, { apply = true } = {}) {
  state.view = view;
  saveState();
  const morphedBtn = document.getElementById('view-morphed');
  const originalBtn = document.getElementById('view-original');
  if (morphedBtn) morphedBtn.classList.toggle('active-morphed', view === 'morphed');
  if (originalBtn) originalBtn.classList.toggle('active-original', view === 'original');

  if (!apply) return;

  if (view === 'original') {
    await runOnActiveTab(removeMorphOverlay, [OVERLAY_ID]);
    await runOnActiveTab(removeOriginalPageStyles, [ORIGINAL_STYLE_ID]);
  } else {
    await refreshGlobalStyles();
  }
}

// --- Wait for DOM to load before attaching listeners ---
document.addEventListener('DOMContentLoaded', () => {
  // --- Element Cache ---
  const customInput = document.getElementById('custom-prompt');
  const customBtn = document.getElementById('custom-apply-btn');
  const resultBox = document.getElementById('ai-result-box');
  const chatInputGroup = document.getElementById('ai-chat-input-group');
  const chatInput = document.getElementById('ai-chat-input');
  const chatSend = document.getElementById('ai-chat-send');
  const dyslexiaToggle = document.getElementById('dyslexia-toggle');
  const highContrastToggle = document.getElementById('high-contrast-toggle');
  const colorBlindnessSelect = document.getElementById('color-blindness');


  // --- Logic for Custom Morph ---
  const handleCustomMorph = async () => {
    const val = customInput.value.trim();
    if (!val) return;

    const originalText = customBtn.textContent;
    customBtn.disabled = true;
    customBtn.textContent = 'Processing...';

    try {
      await runMorph(val);
    } catch (err) {
      console.error("Custom morph failed:", err);
      alert("Failed to apply custom design. Please try again.");
    } finally {
      customBtn.disabled = false;
      customBtn.textContent = originalText;
    }
  };
  
  if (customInput && customBtn) {
    customBtn.addEventListener('click', handleCustomMorph);
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCustomMorph();
      }
    });
  }

  // View Toggle: Morphed | Original
  document.getElementById('view-morphed').addEventListener('click', () => {
    setView('morphed');
  });
  document.getElementById('view-original').addEventListener('click', () => {
    setView('original');
  });

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
      setView('morphed', { apply: false });
    });
  });

  // --- UI: Chat & Summarize ---
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
  dyslexiaToggle.addEventListener('click', () => {
    state.dyslexia = !state.dyslexia;
    saveState();
    dyslexiaToggle.classList.toggle('on', state.dyslexia);
    refreshGlobalStyles();
  });

  highContrastToggle.addEventListener('click', () => {
    state.highContrast = !state.highContrast;
    saveState();
    highContrastToggle.classList.toggle('on', state.highContrast);
    refreshGlobalStyles();
  });

  colorBlindnessSelect.addEventListener('change', (e) => {
    state.colorBlindness = e.target.value;
    saveState();
    refreshGlobalStyles();
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
    dyslexiaToggle.classList.toggle('on', state.dyslexia);
    highContrastToggle.classList.toggle('on', state.highContrast);
    document.getElementById('safe-mode-toggle').classList.toggle('on', state.safeMode);
    colorBlindnessSelect.value = state.colorBlindness;
    setView(state.view || 'original');
    
    // Apply saved styles immediately on load
    refreshGlobalStyles();
  });
});