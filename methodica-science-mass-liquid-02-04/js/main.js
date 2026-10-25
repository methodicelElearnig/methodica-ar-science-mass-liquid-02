/* methodica-science-mass-liquid-02-04 — js/main.js
   Engine + per-screen logic. Part 04 = component 04 of the script
   (slides 67-69): the transition into the in-class volume task (slide 68),
   then the out-of-computer task instructions (slide 69).
   Built: S0 transition screen, S1 task instructions. S1 hands off to part 05. */
'use strict';

const TOTAL_SCREENS = 2;   // S0 = slide 68 (transition), S1 = slide 69 (TextWithCallout)
let currentScreen = 0;

/* ===================== Companion character (carried over from part 01) =====================
   Part 01's selection screen writes the logical ID to localStorage under this
   lomda's namespaced key (720-templates _global-components "Cross-part
   persistence"). This part never shows the selection screen: it reads the key
   back, validates it against its own character IDs, and falls back to the
   primary character only for asset resolution. */
const LOMDA_ID = 'methodica-science-mass-liquid-02';
const CHARACTER_STORAGE_KEY = LOMDA_ID + '_selectedCharacter';
const CHARACTER_IDS = ['character-1', 'character-2'];
const DEFAULT_CHARACTER = 'character-1';

function getCharacter() {
  let stored = null;
  /* Through the shared layer when it is loaded (unit-js/40-resume.js getUnitCharacter: the part's state
     document once resume is on, else the localStorage cache under the same key); the raw read is the
     fallback for a page served without the platform scripts. */
  try { stored = (typeof getUnitCharacter === 'function') ? getUnitCharacter() : localStorage.getItem(CHARACTER_STORAGE_KEY); } catch (err) {}
  return CHARACTER_IDS.includes(stored) ? stored : DEFAULT_CHARACTER;
}
window.lomdaState = window.lomdaState || {};
window.lomdaState.selectedCharacter = getCharacter();

/* ===================== Cross-part Back (session-scoped route stack) =====================
   720-templates _global-components "Back navigation in a branched journey":
   every forward hop between parts pushes the part being left onto a
   sessionStorage stack; S0's חזרה pops it. With no recorded crossing (part
   opened directly, fresh tab) there is nowhere to go back to and S0's Back
   stays hidden. */
const NAV_STACK_KEY = LOMDA_ID + '_navStack';

function navStackRead() {
  try {
    const arr = JSON.parse(sessionStorage.getItem(NAV_STACK_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (err) { return []; }
}
function navStackWrite(arr) {
  try { sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(arr)); } catch (err) {}
}
function hasPrevPart() { return navStackRead().length > 0; }
/* Back to the LAST screen of the part the learner actually came from. */
function goToPrevPart() {
  if (typeof DEV_NAV === 'undefined' || !DEV_NAV) return;   // the platform owns routing (guide §8.12); dev walkthrough only
  const stack = navStackRead();
  const prev = stack.pop();
  if (!prev) return;
  navStackWrite(stack);
  window.location.href = '../' + prev + '/index.html' + window.location.search + '#last';
}
/* Forward to the next part (part 05), recording this part on the route stack so part 05's
   Back returns here (its last screen, via #last). */
const PART_ID = 'methodica-science-mass-liquid-02-04';
const NEXT_PART_ID = 'methodica-science-mass-liquid-02-05';
/* The end of the part: the component 'completed' is the learner's LAST click (guide §6.5) — reported
   by partFinish() below, which also disables the button; the platform (Kata) then removes the
   component and routes by the catalogue. The hop to the next part survives only under DEV_NAV
   (local walkthrough: ?dev=1, no ?registration), carrying the query string along. */
function goToNextPart() {
  partFinish(document.getElementById(XAPI_END_BTN));
  if (typeof DEV_NAV !== 'undefined' && DEV_NAV) {
    const stack = navStackRead();
    stack.push(PART_ID);
    navStackWrite(stack);
    window.location.href = '../' + NEXT_PART_ID + '/index.html' + window.location.search;
  }
}
function syncS0Back() {
  const btn = document.getElementById('s0-back');
  if (btn) btn.hidden = !((typeof DEV_NAV !== 'undefined' && DEV_NAV) && hasPrevPart());   // production: never shown (90-boot.js hides it too)
}

/* ===================== Canvas scaling ===================== */
/* Viewport-filling canvas (same model as parts 01-03): scale so the 1280x710
   design fits, then grow #app along the spare axis (in design px) so it
   covers the whole window. Content stays centred; edge-anchored chrome
   (flag, nav bar) reaches the real edges. */
function scaleApp() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 710);
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px';
  app.style.top = '0px';
}
window.addEventListener('resize', scaleApp);
/* Re-measure when the page has fully loaded and when it is shown again from the back-forward cache: some environments size the
   viewport late or restore a page without a resize event (responsiveness pattern 9; QA 2026-10-07, as part 05). */
window.addEventListener('load', scaleApp);
window.addEventListener('pageshow', scaleApp);

/* ===================== Navigation ===================== */
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  const prev = document.querySelector('.screen.active');
  if (prev) { Motion.cancel(prev); prev.querySelectorAll('video').forEach(v => v.pause()); }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.querySelector('.screen[data-screen="' + n + '"]');
  if (next) { next.classList.add('active'); Motion.reveal(next); }
  currentScreen = n;
  resetScreenState(n);
  /* 720 platform layer (unit-js/): repaint an answered screen from its restored state on every navigation
     (40-resume.js repaintScreen → restoreScreenUI, guide §8.4a), then the item initialized/completed pairs
     (20-xapi.js xapiOnScreen), then arm the debounced state save (scheduleResumeSave). Order is load-bearing. */
  try { if (typeof repaintScreen === 'function') repaintScreen(n); } catch (e) {}
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(n); } catch (e) {}
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}}

function goBack() {
  if (currentScreen === 0) { goToPrevPart(); return; }
  goTo(currentScreen - 1);
}

/* Both screens are ungated (S0 transition; S1's "חזרתי, אפשר להמשיך" is the learner's return from the
   off-computer task). S1 is the last screen of the part: Continue hands off to part 05. */
function advanceScreen() {
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }
  goTo(currentScreen + 1);
}

/* ← / → move between screens (RTL: ← = next, → = back). */
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ===================== Companion character video (TransitionScreen) =====================
   720-templates TransitionScreen.md JS contract. Each TransitionScreen keeps
   its own map. Re-entry: a correct clip is never restarted; an interrupted
   clip resumes; an ended clip stays on its last frame. */
function applyCompanionCharacter(characterMap, videoId) {
  const char = window.lomdaState.selectedCharacter || DEFAULT_CHARACTER;
  const assets = characterMap[char] || characterMap[DEFAULT_CHARACTER];
  const vid = document.getElementById(videoId);
  if (!vid || !assets) return;
  vid.setAttribute('aria-hidden', 'true');
  const fit = assets.fit || {};
  vid.style.setProperty('--char-scale', fit.scale || 1);
  vid.style.setProperty('--char-shift-y', (fit.shiftY || 0) + 'px');
  if (!vid.getAttribute('src') || !vid.getAttribute('src').endsWith(assets.video)) {
    vid.setAttribute('autoplay', '');
    vid.src = assets.video;
    vid.load();
    vid.play().catch(() => {});
    vid.addEventListener('ended', () => vid.removeAttribute('autoplay'), { once: true });
  } else if (vid.paused && !vid.ended) {
    vid.play().catch(() => {});
  }
}
/* Slide 68: presenter note "הגיף הנבחר קורא ספר על כסא נוח" — the selected character reads a book
   in a rocking chair (producer's clips, re-exported 2026-10-06 14:10 with a true white plate).
   character-1 = the grey companion, character-2 = the turquoise one. Measured on the files:
   1280x720, 4.00s, border pixels 255 (character-2: 0.09% of the border band is the hair/shadow
   touching it); the chair rocks gently and the clip ends on a full resting pose, so no freezeAt.
   No scale fit: frame-0 ink heights 669 / 681px (1.8%, within the ~3% band). shiftY seats the
   chairs on the bar line: the rockers' lowest ink over the whole clip is y 695 / 703 of 720
   (box 347.5 / 351.5 of 360), so shiftY 12 / 8 puts the lowest rocking extreme at 359.5 — never
   clipped by the box — and the final resting pose on the same line for both (353 / 352.5). */
const S0_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-rocking-in-chair.mp4', fit: { scale: 1, shiftY: 12 } },
  'character-2': { video: 'assets/video/character-2-rocking-in-chair.mp4', fit: { scale: 1, shiftY: 8 } }
};
function s0Enter() {
  applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  syncS0Back();
}

/* ===================== S1 (index 1) — term tooltip (slide 69) =====================
   The bubble is pure CSS (hover / focus — _global-components "Inline tooltip icons"). The only script:
   Escape dismisses an open bubble until the pointer or focus leaves the term (WCAG 1.4.13). */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.tooltip-word').forEach(w => {
    if (w.matches(':hover') || w.contains(document.activeElement)) w.classList.add('is-dismissed');
  });
});
document.querySelectorAll('.tooltip-word').forEach(w => {
  const clear = () => w.classList.remove('is-dismissed');
  w.addEventListener('mouseleave', clear);
  w.addEventListener('focusout', clear);
});

function resetScreenState(n) {
  if (n === 0) s0Enter();
}

/* A page loaded in a hidden tab/window gets its first play() aborted by
   Chrome ("video-only background media was paused to save power") and the
   clip would stay on frame 0 once shown. Returning to the page re-runs only
   the companion-clip entry (continues a paused, unfinished clip, leaves an
   ended one on its final frame). */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (currentScreen === 0) applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
});

/* ===================== Nav labels ===================== */
function initNavLabels() {
  document.querySelectorAll('.nav-label').forEach(l => {
    const span = l.querySelector('span');
    if (span) l.dataset.label = span.textContent;
  });
}

/* ===================== Boot ===================== */
window.addEventListener('DOMContentLoaded', () => {
  scaleApp();
  initNavLabels();
  resetScreenState(0);
  Motion.reveal(document.querySelector('.screen.active'));   // animation-system initial-load hook
  /* Back from the next part lands on this part's last screen (route-stack #last link);
     deferred so every screen's top-level state exists first. */
  if (window.location.hash === '#last') queueMicrotask(() => goTo(TOTAL_SCREENS - 1));
});
scaleApp();

/* ─── Dev mode: postMessage bridge ───────────────────────
   Gated on DEV_NAV (unit-js/10-identity.js: ?dev=1 and no ?registration). In production the part
   runs inside the platform's iframe; it must neither accept a foreign DEV_GOTO nor announce itself. */
if (typeof DEV_NAV !== 'undefined' && DEV_NAV) {
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'DEV_GOTO') return;
    const n = parseInt(e.data.screen, 10);
    if (!isNaN(n)) goTo(n);
  });
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'DEV_READY', total: TOTAL_SCREENS }, '*');
  }
}

/* ═══════════════════ xAPI (720) — this component's configuration ═══════════════════
   Data only, read at CALL time by the shared layer in ../unit-js/ (guide §6.1). Item suffixes come
   from metadata/methodica-science-mass-liquid-02-04.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],               // "זמן טוב ללמוד גם בצורה אחרת" (folded into the item, per the catalogue)
  1: ['001', 2]                // the off-computer task + "חזרתי, אפשר להמשיך"
};

var XAPI_COMP_SLUG = 'methodica-science-mass-liquid-02-04';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = {}   /* no graded question: the item reports initialized/completed only */;
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-liquid-02-04.json';
var XAPI_END_BTN = 's1-continue';   /* the part's last button (D-8, restoreEndedButton) */

/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* Off-computer class task (guide §6.4): reporting a score would invent a number nobody measured. */
  return { success: true };
}

/* The last click of the part: report, disable, navigate nowhere (xapiEndComponent). Called on the
   pass AND fail paths (a failing learner's attempt must be recorded; Kata routes on
   recommendedAfterFail). partEnded keeps the button disabled through the screen's own re-renders;
   after a reload the LEDGER decides (restoreEndedButton, Phase 4). */
let partEnded = false;
function partFinish(btn) {
  partEnded = true;

  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
}

/* ═══ RESUME — the four per-part hooks (unit-js/40-resume.js; guide §8.7) ═══
   Two ungated screens and no question: the payload is the position and the results map (empty here — the item has
   no graded question — but carried for the shared layer's seeding). Nothing answer-bearing lives in the DOM: the
   transition clip and the S0 Back button are s0Enter's (resetScreenState, run by goTo), so applyResumeDom and
   restoreScreenUI are declared no-ops — the shared layer calls all four unconditionally. partEnded is never
   captured: after a reload the LEDGER decides (restoreEndedButton, D-8). */

/* ── 1. capture ── */
function capturePartPayload() {
  return { currentScreen: currentScreen, qResults: Object.assign({}, XAPI_Q_RESULTS) };
}

/* ── 2. variables (never the DOM). Safe with a partial payload. ── */
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults && typeof st.qResults === 'object') Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
}

/* ── 3. what lives only in the DOM — nothing in this part ── */
function applyResumeDom(st) {}

/* ── 4. painter dispatch — no answered state to paint; both screens are ungated ── */
function restoreScreenUI(n) {}
