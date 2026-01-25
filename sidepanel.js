// Import API key bridge
import { env } from './config.js';

const MORPH_STYLE_ID = 'morph-ui-injected';
const OVERLAY_ID = 'morph-ui-overlay';
const ORIGINAL_STYLE_ID = 'morph-acc-original-style';
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
  // Strip Markdown ticks if present
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
function buildAccCss(isShadow = false) {
  let acc = '';
  
  // Font override (Dyslexia) - Now using a safe system font stack
  if (state.dyslexia) {
    const fontStack = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", "Arial", sans-serif';
    const target = isShadow ? ':host, :host *' : 'html, body, div, p, span, a, h1, h2, h3, h4, h5, h6, li, ul, ol, td, th, button, input, textarea, label, select, article, section, main, nav, header, footer, *';
    acc += `${target} { font-family: ${fontStack} !important; letter-spacing: 0.05em !important; word-spacing: 0.1em !important; line-height: 1.6 !important; }`;
  }
  
  // High Contrast
  if (state.highContrast) {
    if(isShadow) {
        acc += `:host * { border: 1px solid rgba(255,255,255,0.5) !important; background-color: black !important; color: white !important; } a { color: #FFFF00 !important; }`;
    } else {
        // High Contrast for Original Page
        acc += `
        html, body { background: #000 !important; color: #fff !important; }
        * { background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
        p, span, li, div { color: #fff !important; }
        a { color: #00ffff !important; text-decoration: underline !important; font-weight: bold !important; }
        button, [role="button"], input, select { background: #000 !important; color: #fff !important; border: 2px solid #fff !important; border-radius: 6px !important; }
        img, video { filter: brightness(0.85) contrast(1.2) !important; }
        :focus { outline: 3px solid yellow !important; outline-offset: 2px; }
        `;
    }
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

// --- Voice: parse transcript for navigation ---
function parseAsNavigation(transcript) {
  const t = transcript.trim().toLowerCase();
  let m = t.match(/^(?:search\s+for|google|search)\s+(.+)$/);
  if (m) return { navigate: true, url: 'https://www.google.com/search?q=' + encodeURIComponent(m[1].trim()) };
  m = t.match(/^(?:go\s+to|open|navigate\s+to)\s+(.+)$/);
  if (m) {
    const x = m[1].trim();
    if (/^https?:\/\//i.test(x)) return { navigate: true, url: x };
    if (/[a-z0-9][-a-z0-9]*\.[a-z]{2,}/i.test(x)) return { navigate: true, url: /^https?:\/\//i.test(x) ? x : 'https://' + x };
    return { navigate: true, url: 'https://www.google.com/search?q=' + encodeURIComponent(x) };
  }
  return { navigate: false };
}

// --- Get Page Text + URL (URL is vital for caching) ---
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
    // Return both text AND URL for the cache key
    return { ok: true, text, url: tab.url };
  } catch (e) {
    return { ok: false, error: 'Cannot access this page. Try refreshing.' };
  }
}

async function getPageImages(limit = 20) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: 'No active tab.' };
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (max) => {
        const imgs = Array.from(document.images || []);
        const urls = imgs
          .map(img => {
            const src = img.currentSrc || img.src || '';
            if (!src) return null;
            return {
              url: src,
              alt: (img.alt || '').trim(),
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
            };
          })
          .filter(Boolean)
          .filter(i => i.url && !i.url.startsWith('data:'))
          .filter(i => (i.width || 0) >= 32 && (i.height || 0) >= 32)
          .slice(0, max);
        return urls;
      },
      args: [limit],
    });
    const images = out?.[0]?.result ?? [];
    return { ok: true, images };
  } catch (e) {
    return { ok: false, error: 'Cannot read images from this page.' };
  }
}

// --- MAIN MORPH FUNCTION (With Smart Caching) ---
async function runMorph(customPrompt = null) {
  setView('morphed', { apply: false });
  let promptInstruction = customPrompt;
  let modeKey = state.mode; // Default to current mode

  if (!promptInstruction) {
    promptInstruction = MODE_PROMPTS[state.mode] || MODE_PROMPTS['easy-read'];
  } else {
    modeKey = 'custom'; // Differentiate custom prompts in the cache
  }

  const page = await getPageText();
  if (!page.ok) { alert(page.error); return; }
  if (!page.text) { alert("Page is empty or unreadable."); return; }

  const imgs = await getPageImages(20);
  const imageList = (imgs.ok && imgs.images.length)
    ? imgs.images.map(i => `${i.url}${i.alt ? ` (alt: ${i.alt})` : ''}`).join('\n')
    : '';

  // --- 1. CACHE CHECK ---
  // Create a unique key: URL + Mode + (CustomPromptHash if exists)
  // We sanitize the URL to remove query params if they cause noise, or keep strict if needed.
  // Using simple btoa might be too long, so we'll use a simple clean string logic.
  const urlKey = page.url.replace(/[^a-zA-Z0-9]/g, "").slice(0, 50); 
  const promptKey = customPrompt ? btoa(customPrompt) : 'preset';
  const cacheKey = `MORPH_CACHE_V3_${urlKey}_${modeKey}_${promptKey}`;

  // Check storage first
  try {
    const cachedData = await chrome.storage.local.get(cacheKey);
    if (cachedData[cacheKey]) {
      console.log("Loading from cache:", cacheKey);
      const accCss = buildAccCss(true); 
      await runOnActiveTab(injectMorphOverlay, [cachedData[cacheKey], OVERLAY_ID, accCss]);
      return; // Exit early! No API call needed.
    }
  } catch (e) {
    console.warn("Cache read failed", e);
  }

  // --- 2. API CALL (Only if not in cache) ---
  const fullPrompt = `
    Act as an Expert Accessibility Frontend Developer.
    TASK: ${promptInstruction}
    RULES:
    1. Return ONLY valid HTML code inside a <div> wrapper.
    2. Include inline CSS for all styling.
    3. Make it beautiful, responsive, and fully accessible.
    4. Preserve and include relevant images from the original page using the provided URLs.
    5. Use the images in context with proper alt text; do not invent new image URLs.
    6. Do not return markdown ticks (\`\`\`).
    PAGE CONTENT TO REDESIGN:
    ${page.text}
    IMAGE URLS FROM THE PAGE (use these when appropriate):
    ${imageList || 'No images found.'}
  `;

  const res = await callGemini(fullPrompt);
  
  if (!res.ok) {
    console.error(res.error);
    alert("AI Error: " + res.error);
    throw new Error(res.error); // Make sure errors are thrown to be caught by handlers
  }

  // --- 3. SAVE TO CACHE ---
  try {
    // Use the same key to save the new result
    await chrome.storage.local.set({ [cacheKey]: res.text });
  } catch (e) {
    console.warn("Cache save failed (likely quota)", e);
  }

  // Inject Result
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

// --- DOMContentLoaded Wrapper (Essential for Event Listeners) ---
document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Custom Morph Logic (Independent Handler) ---
  const customInput = document.getElementById('custom-prompt');
  const customBtn = document.getElementById('custom-apply-btn');

  if (customInput && customBtn) {
    const handleCustomTrigger = async () => {
      const val = customInput.value.trim();
      if (!val) return;

      // UX Feedback
      customBtn.disabled = true;
      const prevText = customBtn.textContent;
      customBtn.textContent = '...';
      
      // Visually deselect preset cards
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));

      try {
        // Run logic independently
        await runMorph(val);
      } catch (e) {
        console.error(e);
        alert('Custom morph failed.');
      } finally {
        customBtn.disabled = false;
        customBtn.textContent = prevText;
      }
    };

    // Button Click
    customBtn.addEventListener('click', handleCustomTrigger);

    // Enter Key (Prevents New Line)
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        handleCustomTrigger();
      }
    });
  }

  // --- 2. View Toggles ---
  document.getElementById('view-morphed')?.addEventListener('click', () => setView('morphed'));
  document.getElementById('view-original')?.addEventListener('click', () => setView('original'));

  // --- 3. Main Morph Button ---
  document.getElementById('morph-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('morph-btn');
    btn.disabled = true;
    const originalText = btn.querySelector('span').textContent;
    btn.querySelector('span').textContent = 'Generating UI...';
    try { 
      await runMorph();
    } catch (e) { 
      console.error(e);
      alert("Morph failed to generate. Please try again.");
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = originalText;
    }
  });

  // --- 4. Mode Cards ---
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      state.mode = card.dataset.mode;
      saveState();
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setView('morphed');
    });
  });

  // --- 5. Chat & Summarize ---
  const resultBox = document.getElementById('ai-result-box');
  const chatInputGroup = document.getElementById('ai-chat-input-group');
  const chatInput = document.getElementById('ai-chat-input');
  const chatSend = document.getElementById('ai-chat-send');

  function showAiResult(content, isError = false) {
    if(!resultBox) return;
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
    chatInputGroup?.classList.add('hidden');
    if(resultBox) {
      resultBox.classList.remove('hidden', 'error');
      resultBox.textContent = 'Thinking...';
    }
  }

  document.getElementById('ai-summarize')?.addEventListener('click', async () => {
    showAiLoader();
    const page = await getPageText();
    if (!page.ok) { showAiResult('Error: ' + page.error, true); chatInputGroup?.classList.remove('hidden'); return; }
    if (!page.text) { showAiResult('Error: Page is empty or unreadable.', true); chatInputGroup?.classList.remove('hidden'); return; }
    
    const r = await callGemini('Summarize this webpage in 3–5 short bullet points.\n\n' + page.text);
    if (r.ok) showAiResult(r.text); else showAiResult('Failed: ' + r.error, true);
    chatInputGroup?.classList.remove('hidden');
  });

  async function runChat() {
      if(!chatInput) return;
      const q = chatInput.value.trim();
      if (q === '') return;
      showAiLoader();
      chatInput.value = '';
      const page = await getPageText();
      if (!page.ok) { showAiResult('Error: ' + page.error, true); chatInputGroup?.classList.remove('hidden'); return; }
      if (!page.text) { showAiResult('Error: Cannot read page to answer question.', true); chatInputGroup?.classList.remove('hidden'); return; }

      const r = await callGemini(`Based *only* on the text below, answer the user's question. If the answer is not in the text, say you cannot answer. Question: "${q}"\n\nPage Text: ${page.text}`);
      
      if (r.ok) showAiResult(r.text); else showAiResult('Failed: ' + r.error, true);
      chatInputGroup?.classList.remove('hidden');
  }

  document.getElementById('ai-chat')?.addEventListener('click', () => {
    resultBox?.classList.add('hidden');
    const isHidden = chatInputGroup?.classList.toggle('hidden');
    if (!isHidden) chatInput?.focus();
  });

  chatSend?.addEventListener('click', runChat);
  chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runChat(); }
  });

  // --- 6. Voice (Mic) Logic ---
  const micBtn = document.getElementById('mic-btn');
  let isListening = false;
  let recognitionInstance = null;

  function voiceCleanup() {
    isListening = false;
    if (recognitionInstance) {
      try { recognitionInstance.stop(); } catch (_) {}
      recognitionInstance = null;
    }
    if (micBtn) { 
      micBtn.classList.remove('listening');
      micBtn.innerHTML = '<svg class="icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v4"/><path d="M8 23h8"/></svg>';
    }
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        alert('Voice input is not supported. Try Chrome.');
        return;
      }
      if (isListening && recognitionInstance) {
        voiceCleanup();
        return;
      }
      isListening = true;
      micBtn.classList.add('listening');
      micBtn.innerHTML = '<svg class="icon-md" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>';


      function startRecognition() {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = navigator.language || 'en-US';
        recognitionInstance = recognition;

        recognition.onresult = (event) => {
          const last = event.results[event.results.length - 1];
          const transcript = (last && last[0] && last[0].transcript) ? String(last[0].transcript).trim() : '';
          if (!transcript) return;

          const nav = parseAsNavigation(transcript);
          if (nav.navigate && nav.url) {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab && tab.id) {
                chrome.tabs.update(tab.id, { url: nav.url }).catch(() => {
                  if (chatInput) { chatInput.value = transcript; chatInput.focus(); chatInputGroup?.classList.remove('hidden'); }
                });
              }
            });
          } else {
            if (chatInput) { chatInput.value = transcript; chatInput.focus(); chatInputGroup?.classList.remove('hidden'); }
            else { alert(transcript); }
          }
        };

        recognition.onerror = (event) => {
          voiceCleanup();
          const msg = { 'not-allowed': 'Microphone access denied.', 'no-speech': 'No speech detected.', 'network': 'Check internet connection.' }[event.error];
          if (msg) alert(msg);
        };
        recognition.onend = () => { voiceCleanup(); };
        try { recognition.start(); } catch (e) { voiceCleanup(); alert('Mic Error: ' + e.message); }
      }

      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
        mediaDevices.getUserMedia({ audio: true })
          .then((stream) => { stream.getTracks().forEach((t) => t.stop()); startRecognition(); })
          .catch(() => { voiceCleanup(); alert('Please allow microphone access.'); });
      } else {
        startRecognition();
      }
    });
  }

  // --- 7. Accessibility Toggles ---
  document.getElementById('acc-header')?.addEventListener('click', (e) => {
      const header = e.currentTarget;
      const body = document.getElementById('acc-body');
      const isOpen = header.classList.toggle('open');
      header.setAttribute('aria-expanded', isOpen);
      if(body) body.classList.toggle('open');
  });

  document.getElementById('dyslexia-toggle')?.addEventListener('click', () => {
    state.dyslexia = !state.dyslexia;
    saveState();
    document.getElementById('dyslexia-toggle').classList.toggle('on', state.dyslexia);
    setView('morphed');
  });

  document.getElementById('high-contrast-toggle')?.addEventListener('click', () => {
    state.highContrast = !state.highContrast;
    saveState();
    document.getElementById('high-contrast-toggle').classList.toggle('on', state.highContrast);
    setView('morphed');
  });

  document.getElementById('color-blindness')?.addEventListener('change', (e) => {
    state.colorBlindness = e.target.value;
    saveState();
    setView('morphed');
  });

  // --- 8. Init ---
  document.getElementById('close-btn')?.addEventListener('click', () => { try { window.close(); } catch (_) {} });
  
  document.getElementById('safe-mode-toggle')?.addEventListener('click', (e) => {
    state.safeMode = !state.safeMode;
    saveState();
    e.currentTarget.classList.toggle('on', state.safeMode);
    e.currentTarget.setAttribute('aria-checked', state.safeMode);
  });

  loadState().then(() => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('selected', c.dataset.mode === state.mode));
    document.getElementById('dyslexia-toggle')?.classList.toggle('on', state.dyslexia);
    document.getElementById('high-contrast-toggle')?.classList.toggle('on', state.highContrast);
    const safeToggle = document.getElementById('safe-mode-toggle');
    if(safeToggle) {
        safeToggle.classList.toggle('on', state.safeMode);
        safeToggle.setAttribute('aria-checked', state.safeMode);
    }
    const colorSelect = document.getElementById('color-blindness');
    if(colorSelect) colorSelect.value = state.colorBlindness;
    
    // Set initial view without applying styles yet, as refreshGlobalStyles will do it once.
    setView(state.view || 'original', { apply: false });
    
    // Apply initial styles based on loaded state.
    refreshGlobalStyles();
  });

}); // End DOMContentLoaded
