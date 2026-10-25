/* methodica-science-mass-liquid-02-05 — js/main.js
   Engine + per-screen logic. Part 05 = component 05 of the script
   (slides 71-77): the advanced-practice intro (S0) and its 3 questions,
   then the enrichment fact screens.
   Built so far: S0 (advanced-practice intro), S1-S2 (questions 1-2), S3-S4 (question 3, parts א-ב), S5-S6 (knowledge item + interactive doughnut). */
'use strict';

const TOTAL_SCREENS = 7;   // S0 = slide 71, S1-S4 = slides 72-75, S5-S6 = slides 76-77; bump as screens are added
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
   Same contract as parts 02-03: S0's חזרה pops the stack; with no recorded crossing
   (part opened directly) there is nowhere to go back to and S0's Back stays hidden. */
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
/* Forward to the next part (06, the peak question), recording this part on the route stack so part 06's Back returns
   here (its last screen, via #last). */
const PART_ID = 'methodica-science-mass-liquid-02-05';
const NEXT_PART_ID = 'methodica-science-mass-liquid-02-06';
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
   viewport late or restore a page without a resize event (responsiveness pattern 9; producer 2026-10-06). */
window.addEventListener('load', scaleApp);
window.addEventListener('pageshow', scaleApp);

/* ===================== Navigation ===================== */
function closeAllOverlays() {
  document.querySelectorAll('.scq-popup, [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  closeImgZoom();
}

function goTo(n, viaBack) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  closeAllOverlays();
  const prev = document.querySelector('.screen.active');
  if (prev) { Motion.cancel(prev); prev.querySelectorAll('video').forEach(v => v.pause()); }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const next = document.querySelector('.screen[data-screen="' + n + '"]');
  if (next) { next.classList.add('active'); Motion.reveal(next); }
  currentScreen = n;
  resetScreenState(n);
  if (viaBack) reopenFeedbackIfResolved(n);
  /* 720 platform layer (unit-js/): repaint an answered screen from its restored state on every navigation
     (40-resume.js repaintScreen → restoreScreenUI, guide §8.4a), then the item initialized/completed pairs
     (20-xapi.js xapiOnScreen), then arm the debounced state save (scheduleResumeSave). Order is load-bearing. */
  try { if (typeof repaintScreen === 'function') repaintScreen(n); } catch (e) {}
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(n); } catch (e) {}
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}}

function goBack() {
  if (currentScreen === 0) { goToPrevPart(); return; }
  goTo(currentScreen - 1, true);
}

/* Per-screen "may we advance" gates (resolved state, never correctness).
   S0 is an ungated TransitionScreen. The gates live in advanceScreen() so the
   button and the ← key agree. */
const SCREEN_GATES = {
  6: () => s6Shown.size === S6_SLICES.length,
  1: () => s1Done,
  2: () => s2Done,
  3: () => s3Done,
  4: () => s4Done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part (slide 77 is its last)
  /* S4 closes the advanced practice, which has NO score gate: once S4 is resolved every learner
     continues, whatever the score (720: advanced practice has no threshold; producer 2026-10-06 —
     slide 79 then addresses learners who missed some questions). S5 (slide 76) is ungated; S6
     (slide 77) is gated on all six slices being opened. */
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong: on the
   solution view) — _global-components "Reopening feedback on return". */
function reopenFeedbackIfResolved(n) {
  if (n === 1 && s1Done) s1ShowPopup(s1Outcome);
  if (n === 2 && s2Done) s2ShowPopup(s2Outcome);
  if (n === 4 && s4Done) s4ShowPopup(s4Outcome);
  if (n === 3 && s3Done) { if (s3Answer !== null) s3ApplyView(); else s3ShowPopup(s3Outcome); }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ===================== Practice set (advanced practice, slide 71) =====================
   Initialised here for the questions that follow; the shape is part 03's
   practiceProgress (720-templates _global-components "Progress Question"): one item
   per question; `screens` lists the data-screen indices a question spans (empty =
   not built yet, never clickable). Slide 71 states "3 שאלות מתקדמות" and no pass mark; the
   notes call it "תרגול מתקדם". No pass threshold and no score gate — 720: advanced practice is
   completed by every learner, who then continues (producer 2026-10-06; replaces an earlier 2-of-3
   gate derived from ceil(2N/3), which applies only where the script states a "K of N" condition).
   Question 3 (slides 74-75) has lettered parts א, ב. */
const advancedProgress = {
  questions: [
    { number: 1, screens: [1] },  // slide 72
    { number: 2, screens: [2] },  // slide 73
    { number: 3, screens: [3, 4] } // slides 74-75 (א = S3, ב = S4): the item resolves only when both are resolved
  ]
};
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'. */
const SCREEN_RESULT = {
  1: () => s1Done ? (s1Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => s3Done ? (s3Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  4: () => s4Done ? (s4Outcome === 'correct' ? 'correct' : 'incorrect') : null
};
function progressItemResult(q) {
  if (!q.screens.length) return null;
  const results = q.screens.map(n => (SCREEN_RESULT[n] ? SCREEN_RESULT[n]() : null));
  if (results.some(r => r === null)) return null;                 // never resolve early
  return results.every(r => r === 'correct') ? 'correct' : 'incorrect';
}
function progressItemState(q) {
  const result = progressItemResult(q);
  if (result) return result;
  return q.screens.includes(currentScreen) ? 'current' : 'not-answered';
}
/* Check / X glyphs = the Science Progress Status Icons vectors (Figma), white. */
const PQ_GLYPHS =
  '<svg class="progress-question__glyph progress-question__glyph--check" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.74578 16.5938C9.38451 16.594 9.03803 16.4504 8.78278 16.1947L5.87132 13.2843C5.55804 12.9709 5.55804 12.463 5.87132 12.1496C6.1847 11.8363 6.69268 11.8363 7.00605 12.1496L9.74578 14.8893L16.9939 7.64114C17.3073 7.32787 17.8153 7.32787 18.1287 7.64114C18.442 7.95452 18.442 8.4625 18.1287 8.77587L10.7088 16.1947C10.4535 16.4504 10.1071 16.594 9.74578 16.5938Z" fill="#fff"/></svg>' +
  '<svg class="progress-question__glyph progress-question__glyph--x" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7674 7.23264C16.6184 7.08368 16.4163 7 16.2056 7C15.9949 7 15.7929 7.08368 15.6439 7.23264L12 10.8765L8.35615 7.23264C8.20714 7.08368 8.00508 7 7.79439 7C7.5837 7 7.38164 7.08368 7.23264 7.23264C7.08368 7.38164 7 7.5837 7 7.79439C7 8.00508 7.08368 8.20714 7.23264 8.35615L10.8765 12L7.23264 15.6439C7.08368 15.7929 7 15.9949 7 16.2056C7 16.4163 7.08368 16.6184 7.23264 16.7674C7.38164 16.9163 7.5837 17 7.79439 17C8.00508 17 8.20714 16.9163 8.35615 16.7674L12 13.1235L15.6439 16.7674C15.7929 16.9163 15.9949 17 16.2056 17C16.4163 17 16.6184 16.9163 16.7674 16.7674C16.9163 16.6184 17 16.4163 17 16.2056C17 15.9949 16.9163 15.7929 16.7674 15.6439L13.1235 12L16.7674 8.35615C16.9163 8.20714 17 8.00508 17 7.79439C17 7.5837 16.9163 7.38164 16.7674 7.23264Z" fill="#fff"/></svg>';
function updateProgressQuestion(container, state) {
  state.questions.forEach((q, i) => {
    const item = container.querySelector('[data-question="' + (i + 1) + '"]');
    if (!item) return;
    const icon = item.querySelector('.progress-question__icon');
    const label = item.querySelector('.progress-question__label');
    if (!icon.querySelector('.progress-question__glyph')) icon.innerHTML = PQ_GLYPHS;
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    const qState = progressItemState(q);
    const visited = qState !== 'not-answered';
    if (visited) icon.classList.add('progress-question__icon--' + qState);
    label.classList.toggle('progress-question__label--visited', visited);
    const target = q.screens[0];
    const navigable = visited && target != null && target !== currentScreen;
    item.style.cursor = navigable ? 'pointer' : '';
    item.onclick = navigable ? (() => goTo(target)) : null;
  });
  for (let n = 1; n < state.questions.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    const qState = progressItemState(state.questions[n - 1]);
    conn.classList.toggle('progress-question__connector--visited', qState === 'correct' || qState === 'incorrect');
  }
}
function syncPracticeProgressNav(sectionEl) {
  const nav = sectionEl && sectionEl.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, advancedProgress);
}

/* ===================== Shared: draggable feedback popup (as part 03) ===================== */
let popupDrag = null;
function toCanvas(e) {
  const app = document.getElementById('app');
  const m = app.style.transform.match(/scale\(([^)]+)\)/);
  const scale = m ? parseFloat(m[1]) : 1;
  return { x: (e.clientX - (parseFloat(app.style.left) || 0)) / scale, y: (e.clientY - (parseFloat(app.style.top) || 0)) / scale };
}
/* Drag bounds: the whole canvas above the bar (#app's live design-space size). */
function clampPopupPosition(x, y, popupEl) {
  const app = document.getElementById('app');
  const w = popupEl.offsetWidth, h = popupEl.offsetHeight;
  return { x: Math.min(Math.max(x, 0), app.offsetWidth - w), y: Math.min(Math.max(y, 0), (app.offsetHeight - 74) - h) };
}
function popupPointerDown(e, id) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  const popup = document.getElementById(id);
  if (!popup) return;
  const { x, y } = toCanvas(e);
  const top = isNaN(parseFloat(popup.style.top)) ? popup.offsetTop : parseFloat(popup.style.top);
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  popupDrag = { id, offX: x - (parseFloat(popup.style.left) || popup.offsetLeft), offY: y - top };
  e.preventDefault();
}
window.addEventListener('pointermove', (e) => {
  if (!popupDrag) return;
  if (e.buttons === 0) { popupDrag = null; return; }
  const popup = document.getElementById(popupDrag.id);
  if (!popup) return;
  const { x, y } = toCanvas(e);
  const p = clampPopupPosition(x - popupDrag.offX, y - popupDrag.offY, popup);
  popup.style.left = p.x + 'px';
  popup.style.top = p.y + 'px';
});
window.addEventListener('pointerup', () => { popupDrag = null; });
window.addEventListener('pointercancel', () => { popupDrag = null; });
/* Every open returns the popup to its CSS default position. */
function resetPopupPosition(popup) {
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}
/* reserve: every label this button can show, as invisible SemiBold copies in the
   label's grid cell, so the pill keeps one footprint across hover and label swaps. */
function renderPopupAction(popupId, action, onClick, reserve) {
  const popup = document.getElementById(popupId);
  let actions = popup.querySelector('.scq-popup-actions');
  if (actions) actions.remove();
  if (!action) return;
  actions = document.createElement('div');
  actions.className = 'scq-popup-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'popup-action';
  const label = document.createElement('span');
  label.className = 'nav-label';
  [...new Set([action.label, ...(reserve || [])])].forEach(t => {
    const r = document.createElement('span');
    r.className = 'nav-label__reserve';
    r.setAttribute('aria-hidden', 'true');
    r.textContent = t;
    label.appendChild(r);
  });
  const txt = document.createElement('span');
  txt.setAttribute('data-m-swap', '');   // the label is the only part of the button that ever changes (Motion.swap)
  txt.textContent = action.label;
  label.appendChild(txt);
  btn.appendChild(label);
  btn.onclick = onClick;
  actions.appendChild(btn);
  popup.appendChild(actions);
}
/* First-attempt retry feedback is dismissed by the learner's next edit. */
function dismissRetryPopup(popupId, done) {
  if (done) return;
  const p = document.getElementById(popupId);
  if (p) p.classList.add('hidden');
}
/* Popup body: one <p> per authored paragraph; '' = an authored empty paragraph,
   kept as a one-line gap (_question-template-defaults "Paragraph structure"). */
function popupBodyHtml(paras) {
  return paras.map(p => p === '' ? '<p aria-hidden="true"> </p>' : '<p>' + p + '</p>').join('');
}

/* ===================== Image zoom (global, as part 03) =====================
   Clone-based (720-templates "Image zoom"): the stage receives a clone of the
   trigger's [data-zoom-wrapper], enlarged with one uniform transform, capped at
   the Image Zoom Surface envelope (1200x640 -> 1072x512 media after the 64px margin)
   and never beyond the source's own resolution. */
const ZOOM_MEDIA_MAX_W = 1200 - 2 * 72, ZOOM_MEDIA_MAX_H = 690 - 2 * 24;   // envelope 1200x690, padding 24/72 -> media 1056x642 (720-design-guidelines, producer 2026-10-13)
let zoomReturnFocus = null;
let zoomLive = [];   // live elements moved into the zoom stage, with their place markers
function openImgZoom(trigger) {
  const wrapper = trigger.closest('[data-zoom-wrapper]');
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!wrapper || !modal || !stage) return;
  const panel = modal.querySelector('.img-zoom-modal__panel');
  const img = wrapper.querySelector('img');
  const ratio = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : wrapper.offsetWidth / wrapper.offsetHeight;
  let uw = wrapper.offsetWidth, uh = uw / ratio;
  if (uh > wrapper.offsetHeight) { uh = wrapper.offsetHeight; uw = uh * ratio; }
  const resCap = img && img.naturalWidth ? img.naturalWidth / uw : Infinity;
  /* PROJECT DEVIATION (data-zoom-tall; producer 2026-10-12, re-confirmed 2026-10-19, as part 07): on a canvas
     TALLER than the canonical 1280x710 the panel may exceed the 1200x690 envelope and take the canvas height less
     16px each side and 24px vertical padding. Math.max keeps the canonical 642 as a floor. Under the 2026-10-13
     geometry this wide bill (ratio 1.84) is width-bound at 1056 anyway, so the deviation no longer changes its size. */
  const tall = 'zoomTall' in trigger.dataset;
  panel.classList.toggle('img-zoom-modal__panel--tall', tall);
  const maxH = tall ? Math.max(ZOOM_MEDIA_MAX_H, document.getElementById('app').offsetHeight - 2 * 16 - 2 * 24) : ZOOM_MEDIA_MAX_H;
  const k = Math.min(ZOOM_MEDIA_MAX_W / uw, maxH / uh, resCap);
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.querySelectorAll('[data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  Object.assign(clone.style, { position: 'absolute', left: '0', top: '0', margin: '0', borderRadius: '0',
    width: uw + 'px', height: uh + 'px', transform: 'scale(' + k + ')', transformOrigin: '0 0' });
  stage.innerHTML = '';
  stage.style.width = (uw * k) + 'px';
  stage.style.height = (uh * k) + 'px';
  stage.appendChild(clone);
  /* Live controls (data-zoom-live = element ids, S3's blank): the element itself is MOVED into the clone, where the clone's
     transform enlarges it with the picture, and a comment marker holds its place; closeImgZoom puts it back. Never cloned,
     so the answer state, its listeners and its ids stay single (client round 1, 2026-10-19). */
  zoomLive = (wrapper.dataset.zoomLive || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)).filter(Boolean).map(el => {
    const mark = document.createComment('zoom-live');
    el.before(mark);
    clone.appendChild(el);
    return { el, mark };
  });
  panel.setAttribute('aria-label', trigger.dataset.zoomAlt || 'عرض الصورة مكبّرة');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  zoomReturnFocus = trigger;
  modal.querySelector('.img-zoom-modal__close').focus();
}
function closeImgZoom() {
  const modal = document.getElementById('img-zoom-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  zoomLive.forEach(({ el, mark }) => mark.replaceWith(el));   // live controls go home before the stage is emptied
  zoomLive = [];
  document.getElementById('img-zoom-modal-stage').innerHTML = '';
  if (zoomReturnFocus && document.contains(zoomReturnFocus)) zoomReturnFocus.focus();
  zoomReturnFocus = null;
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-zoom-src]');
  if (t) { openImgZoom(t); return; }
  if (e.target.closest('[data-zoom-close]')) closeImgZoom();
});

/* Escape closes whichever hint is open, else the zoom (Hint policy -> Closing). */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const hint = document.querySelector('[id$="-hint-overlay"]:not(.hidden)');
  if (hint) { closeHintOverlay(hint); return; }
  closeImgZoom();
});
let hintReturnFocus = null;
function openHintOverlay(id, trigger) {
  const ov = document.getElementById(id);
  if (!ov) return;
  hintReturnFocus = trigger || null;
  ov.classList.remove('hidden');
  const btn = ov.querySelector('.hint-card__close');
  if (btn) btn.focus();
}
function closeHintOverlay(ov) {
  if (!ov || ov.classList.contains('hidden')) return;
  ov.classList.add('hidden');
  if (hintReturnFocus && document.contains(hintReturnFocus)) hintReturnFocus.focus();
  hintReturnFocus = null;
}

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
/* Slide 71: the "workout-big" pair (presenter note "הגיף הנבחר עם משקולת כבדה שמרים אותה
   מעל הראש"; supplied by the producer 2026-10-06). Measured from the files: 1280x720, 4.01s,
   meaningful final frame (ink 79k / 73k px, same as mid-clip; no blank tail), so no freezeAt.
   No scale fit: frame-0 ink heights 598 / 598px (0%, final frames 1.2%). The feet's lowest ink
   over the clip reaches video y 686 / 680 = box y 343 / 340 of 360, so shiftY 16 / 19 seats
   both on the bar line (359 / 359). The raised weights reach the top of the frame (video y 0-8)
   -> box y 16-24 after the shift, 27px+ under the closing line at the 710px floor. */
const S0_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-workout-big.mp4', fit: { scale: 1, shiftY: 16 } },
  'character-2': { video: 'assets/video/character-2-workout-big.mp4', fit: { scale: 1, shiftY: 19 } }
};
function s0Enter() {
  applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  syncS0Back();
}


/* ===================== S1 (index 1) — SingleChoiceQuestionImage (slide 72) =====================
   720-templates SingleChoiceQuestion (+ SingleChoiceQuestionImage), as part 03 S2. Correct:
   option 1 (a) "כי שיטת מדידה אחידה תאפשר להשוות נתונים באופן מהימן.", the only option filled
   green on slide 72. Two attempts (template default; the slide authors no retry box):
   retry -> the chosen option red + ✗, the correct one not revealed, Retry gate on the same
   option; final wrong -> the correct option green + ✓ and the chosen one red + ✗. No hint
   (the slide has no hint button). Feedback = slide 72's boxes: correct and final-wrong share
   the two-paragraph explanation; the final-wrong box authors only its first title line, so
   the canonical second line "התשובה הנכונה מוצגת." follows it. Leaving and returning never
   resets an unresolved question. Line break after the comma in the second explanation
   paragraph: the 378px wrap orphaned "מהימנות המחקר." (producer rule 2026-10-06; paragraph 1 has
   no comma and keeps the natural wrap). */
const S1Q = { correctId: 'a', maxAttempts: 2 };
let s1Selected = null, s1Attempts = 0, s1Done = false, s1LastWrong = null, s1Outcome = null;
const S1_EXPLAIN = [
  'نظام قياس موحَّد شرط مهم للبحث المشترك بين دولتين.',
  'هكذا يمكن مقارنة البيانات،<br>وتكرار القياسات وتعزيز موثوقية البحث.'
];
const S1_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S1_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S1_EXPLAIN }
};
const s1Opts = () => document.querySelectorAll('#s1 .scq-opt');

function s1Enter() {
  document.getElementById('s1-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s1'));
  s1Render();
}
/* Single owner of the options + bar state, derived from the recorded state. */
function s1Render() {
  s1Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s1Done) {
      if (id === S1Q.correctId && (s1Outcome === 'correct' || s1Outcome === 'wrong2')) cls = 'correct';
      else if (s1Outcome === 'wrong2' && id === s1Selected) cls = 'wrong';
    } else if (id === s1LastWrong && id === s1Selected) cls = 'wrong';
    else if (id === s1Selected) cls = 'selected';
    o.classList.toggle('selected', cls === 'selected');
    o.classList.toggle('correct', cls === 'correct');
    o.classList.toggle('wrong', cls === 'wrong');
    o.setAttribute('aria-checked', id === s1Selected ? 'true' : 'false');
    o.disabled = s1Done;
  });
  const btn = document.getElementById('s1-check');
  setNavLabel(btn, s1Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s1Done && (!s1Selected || s1Selected === s1LastWrong);   // Retry gate
}
function s1Select(id) {
  if (s1Done) return;
  dismissRetryPopup('s1-popup', s1Done);
  s1Selected = id;
  s1Render();
}
function s1Primary() {
  if (s1Done) { advanceScreen(); return; }
  s1Check();
}
function s1Check() {
  if (!s1Selected || s1Done || s1Selected === s1LastWrong) return;
  s1Attempts++;
  /* xAPI: the graded answer — after the guards, before the finish/retry branch; the option's visible text is the metadata choice (guide §6.3). */
  xapiAnswered('001', 'q1', s1Selected === S1Q.correctId, s1Selected === S1Q.correctId || s1Attempts >= S1Q.maxAttempts,
    { choices: [xapiAnswerText(document.querySelector('#s1 .scq-opt[data-id="' + s1Selected + '"]'))] });
  if (s1Selected === S1Q.correctId) { s1Finish('correct'); return; }
  if (s1Attempts >= S1Q.maxAttempts) { s1Finish('wrong2'); return; }
  s1LastWrong = s1Selected;                 // chosen option red + ✗, correct not revealed
  s1Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}   /* resume: synchronous save after the last commitment (guide §8.3, D-13) */
  s1ShowPopup('retry');
}
function s1Finish(outcome) {
  s1Done = true; s1Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s1Render();
  syncPracticeProgressNav(document.getElementById('s1'));
  s1ShowPopup(outcome);
}
function s1ShowPopup(type) {
  const cfg = S1_FEEDBACK[type];
  const popup = document.getElementById('s1-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = popupBodyHtml(cfg.body);
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}

/* ===================== S4 (index 4) — StatementAssessmentQuestion, part ב (slide 75) =====================
   A yes / no claim about the chart, run as a two-option SingleChoiceQuestion (as S1 / S2). Correct:
   option 1 (a) "כן", the only box filled green on slide 75. ONE attempt only (producer 2026-10-06: with just
   two options a second attempt would hand the answer over; the slide's own retry box "שננסה שוב?" is
   therefore not built): a wrong answer goes straight to the final view -> the correct option green + ✓,
   the chosen one red + ✗. No hint (none on the slide). Feedback = slide 75's boxes; correct and final-wrong
   share the explanation; the final-wrong box authors "התשובה לא נכונה." (kept as authored), so the
   canonical second line "התשובה הנכונה מוצגת." follows it. Number + unit joined by a no-break space. Last
   screen of question 3: its result counts only with part א (S3). */
const S4Q = { correctId: 'a', maxAttempts: 1 };
let s4Selected = null, s4Attempts = 0, s4Done = false, s4Outcome = null;
const S4_EXPLAIN = [
  // One paragraph: the slide's break after the comma split a sentence (QA 2026-10-12). "ל-29.5": hyphen before a number.
  // The range stays on one line (no orphan "ל-29.5 מ"ק)." at the end).
  'يُظهر رسم بياني استهلاك المياه الخاص أنه على مدار 4 فترات قياس في عام 2026، كان استهلاك المياه للعائلة متقاربًا <span style="white-space:nowrap">(بين 25 م³ و29.5 م³).</span>'   // client round 1 (2026-10-19): "בין התקופות" removed; the client's spelling kept (הייתה, מ״ק)
];
const S4_FEEDBACK = {
  correct: { title: 'ممتاز!', body: S4_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN }
};
const s4Opts = () => document.querySelectorAll('#s4 .scq-opt');

function s4Enter() {
  document.getElementById('s4-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s4'));
  s4Render();
}
/* Single owner of the options + bar state, derived from the recorded state. */
function s4Render() {
  s4Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s4Done) {
      if (id === S4Q.correctId && (s4Outcome === 'correct' || s4Outcome === 'wrong2')) cls = 'correct';
      else if (s4Outcome === 'wrong2' && id === s4Selected) cls = 'wrong';
    } else if (id === s4Selected) cls = 'selected';
    o.classList.toggle('selected', cls === 'selected');
    o.classList.toggle('correct', cls === 'correct');
    o.classList.toggle('wrong', cls === 'wrong');
    o.setAttribute('aria-checked', id === s4Selected ? 'true' : 'false');
    o.disabled = s4Done;
  });
  const btn = document.getElementById('s4-check');
  setNavLabel(btn, s4Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s4Done && !s4Selected;   // resolved = always on (no score gate)
}
function s4Select(id) {
  if (s4Done) return;
  s4Selected = id;
  s4Render();
}
function s4Primary() {
  if (s4Done) { advanceScreen(); return; }
  s4Check();
}
function s4Check() {
  if (!s4Selected || s4Done) return;
  s4Attempts++;
  /* xAPI: true-false — value true = "כן" (option a, the catalogue's correct answer); maxAttempts is 1, so the idiom always yields .last. */
  xapiAnswered('003', 'q2', s4Selected === S4Q.correctId, s4Selected === S4Q.correctId || s4Attempts >= S4Q.maxAttempts,
    { value: s4Selected === 'a' });
  if (s4Selected === S4Q.correctId) { s4Finish('correct'); return; }
  s4Finish('wrong2');                       // the single attempt is used: straight to the final view
}
function s4Finish(outcome) {
  s4Done = true; s4Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s4Render();
  syncPracticeProgressNav(document.getElementById('s4'));
  s4ShowPopup(outcome);
}
function s4ShowPopup(type) {
  const cfg = S4_FEEDBACK[type];
  const popup = document.getElementById('s4-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = popupBodyHtml(cfg.body);
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}

/* ===================== S2 (index 2) — SingleChoiceQuestion, no image (slide 73) =====================
   As S1 without the image column, plus the hint. Correct: option 2 (b) "זו אותה כמות בדיוק,
   שנכתבה בשלוש יחידות מידה שונות", the only option filled green on slide 73. Two attempts
   (template default; the slide authors no retry box): retry -> the chosen option red + ✗,
   correct not revealed, Retry gate on the same option; final wrong -> the correct option green
   + ✓, the chosen one red + ✗. Hint (slide 73's hint box) is visible from the start and reusable
   until the question resolves. Feedback = slide 73's boxes: correct and final-wrong share the
   explanation (a bold equation line, then two paragraphs); the final-wrong box authors only its
   first title line, so the canonical second line "התשובה הנכונה מוצגת." follows it. Number + unit
   joined by a no-break space. Line breaks at the natural commas where the 378px popup wrap
   orphaned "רק" / split "אבל כשבודקים גם / את יחידות" (producer rule 2026-10-06). */
const S2Q = { correctId: 'b', maxAttempts: 2 };
let s2Selected = null, s2Attempts = 0, s2Done = false, s2LastWrong = null, s2Outcome = null;
const S2_EXPLAIN = [
  '<strong>0.5&nbsp;لتر = 500&nbsp;مل = 500&nbsp;سم³.</strong>',
  'الرسومات الثلاثة تصف نفس الكمية بالضبط،<br>لكن بوحدات قياس مختلفة.',
  'عند النظر إلى الأرقام فقط، قد يبدو أن 0.5 و500 كميتان مختلفتان،<br>لكن عند فحص وحدات القياس أيضًا،<br>يتضح أنهما يمثلان نفس الحجم.'
];
const S2_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S2_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2_EXPLAIN }
};
const s2Opts = () => document.querySelectorAll('#s2 .scq-opt');

function s2Enter() {
  document.getElementById('s2-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s2'));
  s2Render();
}
function s2Render() {
  s2Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s2Done) {
      if (id === S2Q.correctId) cls = 'correct';
      else if (s2Outcome === 'wrong2' && id === s2Selected) cls = 'wrong';
    } else if (id === s2LastWrong && id === s2Selected) cls = 'wrong';
    else if (id === s2Selected) cls = 'selected';
    o.classList.toggle('selected', cls === 'selected');
    o.classList.toggle('correct', cls === 'correct');
    o.classList.toggle('wrong', cls === 'wrong');
    o.setAttribute('aria-checked', id === s2Selected ? 'true' : 'false');
    o.disabled = s2Done;
  });
  const btn = document.getElementById('s2-check');
  setNavLabel(btn, s2Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s2Done && (!s2Selected || s2Selected === s2LastWrong);   // Retry gate
  s2SyncHint();
}
function s2Select(id) {
  if (s2Done) return;
  dismissRetryPopup('s2-popup', s2Done);
  s2Selected = id;
  s2Render();
}
function s2Primary() {
  if (s2Done) { advanceScreen(); return; }
  s2Check();
}
function s2Check() {
  if (!s2Selected || s2Done || s2Selected === s2LastWrong) return;
  s2Attempts++;
  /* xAPI: the graded answer — after the guards, before the finish/retry branch; the option's visible text is the metadata choice (guide §6.3). */
  xapiAnswered('002', 'q1', s2Selected === S2Q.correctId, s2Selected === S2Q.correctId || s2Attempts >= S2Q.maxAttempts,
    { choices: [xapiAnswerText(document.querySelector('#s2 .scq-opt[data-id="' + s2Selected + '"]'))] });
  if (s2Selected === S2Q.correctId) { s2Finish('correct'); return; }
  if (s2Attempts >= S2Q.maxAttempts) { s2Finish('wrong2'); return; }
  s2LastWrong = s2Selected;                 // chosen option red + ✗, correct not revealed
  s2Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s2ShowPopup('retry');
}
function s2Finish(outcome) {
  s2Done = true; s2Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  closeHintOverlay(document.getElementById('s2-hint-overlay'));
  s2Render();
  syncPracticeProgressNav(document.getElementById('s2'));
  s2ShowPopup(outcome);
}
function s2ShowPopup(type) {
  const cfg = S2_FEEDBACK[type];
  const popup = document.getElementById('s2-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = popupBodyHtml(cfg.body);
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
/* Hint availability (producer 2026-10-07, content developer's rule): outside the basic practice the hint button appears only
   after the first wrong attempt - "hidden, not disabled" (visibility) - then stays until the question resolves. */
function s2SyncHint() {
  const h = document.getElementById('s2-hint');
  h.hidden = s2Done;
  h.style.visibility = (!s2Done && s2Attempts > 0) ? 'visible' : 'hidden';
}
function s2OpenHint() {
  if (!s2Done && s2Attempts > 0) {
    /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
    xapiRequestedHint('002', 'q1');
    openHintOverlay('s2-hint-overlay', document.getElementById('s2-hint'));
  }
}
function s2CloseHint() { closeHintOverlay(document.getElementById('s2-hint-overlay')); }
function s2CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s2CloseHint(); }

/* ===================== S3 (index 3) — DropdownQuestion on an image, part א (slide 74) =====================
   720-templates DropdownQuestion, single-dropdown variant (as part 03 S1) with the blank placed on
   an image (local variant: compact trigger, list opening upward). One blank; correct: מ"ק. Two
   attempts (template default; the slide authors no retry box). Interaction: a click outside or
   Escape closes the list; picking a value fills the trigger; "צדקתי?" enables once a value is
   picked and (Retry gate) it differs from the one just marked wrong. Non-final wrong: retry popup,
   the blank shows ✕ (per-answer verdict rule, producer 2026-10-06) until the learner opens or
   changes it, and stays open. Final wrong: the blank shows מ"ק at once (green ✓) and the View
   My Answer Toggle swaps it with the learner's own pick (red ✗). No hint (note). Part ב is the next
   screen of question 3 (slide 75), not built yet. Keyboard as part 03 S1. */
const S3Q = { correct: { 1: 'م³' }, maxAttempts: 2 };
const S3_SLOTS = [1];
/* Slide 74's boxes: correct and final-wrong share the one authored explanation line; the final-wrong
   box authors both title lines ("התשובה אינה נכונה במלואה." / "התשובה הנכונה מוצגת."); the retry
   box is the 2-attempt template default, titled as the slide's own wrong box. */
const S3_EXPLAIN = [
  'الكميات الكبيرة من السوائل، كاستهلاك الماء لدى عائلة، تُقاس بالمتر المكعب (م³).'
];
const S3_FEEDBACK = {
  retry:   { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S3_EXPLAIN },
  wrong2: {
    title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.',
    body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
/* Verdict icons = the Dropdown Menu component's own vectors (as part 02). */
const DQ_CHECK_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const DQ_WRONG_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';
const s3Sel = { 1: null };
let s3Attempts = 0, s3Done = false, s3Outcome = null, s3LastWrong = null;
const s3Wrong = new Set();    // the slot marked ✕ after a non-final wrong attempt, until the learner opens or changes it
let s3Answer = null, s3View = 'solution';
let s3OpenSlot = null;
const s3Snap = () => JSON.stringify(s3Sel);
function s3Announce(msg) { const l = document.getElementById('s3-live'); if (l) l.textContent = msg; }
const s3WordsOf = n => document.getElementById('s3-w' + n).textContent;
/* Value shown in the blank, and its verdict, derived from the recorded state (single owner). */
function s3Shown(n) {
  if (s3Done && s3Outcome === 'wrong2') return s3View === 'answer' ? s3Answer[n].value : S3Q.correct[n];
  return s3Sel[n];
}
function s3MarkOf(n) {
  if (!s3Done) return s3Wrong.has(n) ? 'wrong' : null;
  if (s3Outcome === 'wrong2' && s3View === 'answer') return s3Answer[n].correct ? 'correct' : 'wrong';
  return 'correct';
}
const s3Locked = () => s3Done;
const S3_PROMPT = 'اختاروا';   // the agreed prompt, shortened to fit the compact blank on the bill
function s3Render() {
  S3_SLOTS.forEach(n => {
    const btn = document.getElementById('s3-btn-' + n), sel = document.getElementById('s3-sel-' + n);
    const mark = s3MarkOf(n), open = s3OpenSlot === n, val = s3Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s3Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? DQ_CHECK_SVG : DQ_WRONG_SVG);
    sel.textContent = val || S3_PROMPT;   // short prompt: "בחרו תשובה" does not fit the 104px trigger (QA 2026-10-12)
    sel.classList.toggle('is-prompt', !val);
    document.getElementById('s3-verdict-' + n).textContent = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    document.getElementById('s3-wrap-' + n).classList.toggle('is-open', open);
    const list = document.getElementById('s3-list-' + n);
    list.classList.toggle('hidden', !open);
    list.querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', o.dataset.value === val ? 'true' : 'false'));
  });
  s3UpdateCheck();
}
function s3UpdateCheck() {
  const btn = document.getElementById('s3-check');
  if (s3Done) { btn.disabled = false; return; }
  btn.disabled = !S3_SLOTS.every(n => s3Sel[n]) || s3Snap() === s3LastWrong;   // Retry gate
}
function s3CloseList(focusTrigger) {
  const n = s3OpenSlot;
  s3OpenSlot = null;
  s3Render();
  if (focusTrigger && n) document.getElementById('s3-btn-' + n).focus();
}
function s3Toggle(n) {
  if (s3Locked(n)) return;
  s3GhSeen = true; s3GhStop();                  // the learner found the control: the hint is done for good
  dismissRetryPopup('s3-popup', s3Done);        // opening the list is a corrective action
  s3Wrong.delete(n);                            // ...and clears the slot's ✕
  s3OpenSlot = (s3OpenSlot === n) ? null : n;
  s3Render();
}
function s3Select(n, value) {
  if (s3Locked(n)) return;
  dismissRetryPopup('s3-popup', s3Done);
  s3Wrong.delete(n);
  s3Sel[n] = value;
  s3OpenSlot = null;
  s3Render();
  document.getElementById('s3-btn-' + n).focus();
  s3Announce(s3WordsOf(n) + ' ' + value);
}
function s3FocusOption(n, i, exact) {
  const opts = [...document.querySelectorAll('#s3-list-' + n + ' .dq-option')];
  const o = exact ? opts[i] : opts[(i + opts.length) % opts.length];
  if (o) o.focus();
}
function s3BtnKey(e, n) {
  if (s3Locked(n)) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (s3OpenSlot !== n) { dismissRetryPopup('s3-popup', s3Done); s3Wrong.delete(n); s3OpenSlot = n; s3Render(); }
    s3GhSeen = true; s3GhStop();
    const opts = [...document.querySelectorAll('#s3-list-' + n + ' .dq-option')];
    const cur = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
    s3FocusOption(n, cur >= 0 ? cur : 0, true);
  } else if (e.key === 'Escape' && s3OpenSlot === n) { e.preventDefault(); e.stopPropagation(); s3CloseList(true); }   // only the list: an enlarged view stays open
}
function s3OptKey(e, n) {
  const opts = [...document.querySelectorAll('#s3-list-' + n + ' .dq-option')];
  const i = opts.indexOf(e.currentTarget);
  if (e.key === 'ArrowDown') { e.preventDefault(); s3FocusOption(n, i + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); s3FocusOption(n, i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); s3FocusOption(n, 0, true); }
  else if (e.key === 'End') { e.preventDefault(); s3FocusOption(n, opts.length - 1, true); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s3Select(n, e.currentTarget.dataset.value); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); s3CloseList(true); }   // only the list: an enlarged view stays open
  else if (e.key === 'Tab') { s3CloseList(false); }
}
/* One document-level listener: a click outside the dropdown closes the open list. */
document.addEventListener('click', (e) => {
  if (s3OpenSlot !== null && !e.target.closest('.dq-dropdown-wrap')) s3CloseList(false);
});
function s3Primary() {
  if (s3Done) { advanceScreen(); return; }
  s3Check();
}
function s3Check() {
  if (s3Done || !S3_SLOTS.every(n => s3Sel[n]) || s3Snap() === s3LastWrong) return;
  s3OpenSlot = null;
  s3Attempts++;
  const right = {};
  S3_SLOTS.forEach(n => { right[n] = s3Sel[n] === S3Q.correct[n]; });
  /* xAPI: after the slot loop (right is final only then); the single dropdown's value is the metadata choice text (guide §6.3). */
  xapiAnswered('003', 'q1', S3_SLOTS.every(n => right[n]), S3_SLOTS.every(n => right[n]) || s3Attempts >= S3Q.maxAttempts,
    { choices: [s3Sel[1]] });
  if (S3_SLOTS.every(n => right[n])) { s3Finish('correct'); return; }
  if (s3Attempts >= S3Q.maxAttempts) {
    s3Answer = {};
    S3_SLOTS.forEach(n => { s3Answer[n] = { value: s3Sel[n], correct: right[n] }; });   // before the reveal overwrites the blank
    s3View = 'solution';
    s3Finish('wrong2');
    return;
  }
  S3_SLOTS.forEach(n => { if (!right[n]) s3Wrong.add(n); });   // retry: the wrong pick shows ✕ (per-answer verdict rule)
  s3LastWrong = s3Snap();
  s3Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s3ShowPopup('retry');
}
function s3Finish(outcome) {
  s3Done = true; s3Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s3-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s3'));
  if (outcome === 'wrong2') { s3ApplyView(); return; }
  s3Render();
  s3ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong blank + popup. */
function s3ApplyView() {
  if (s3Answer === null) return;
  s3Render();
  s3ShowPopup('wrong2', s3View);
}
/* View My Answer toggle (producer, QA 2026-10-14): the popup stays and ONLY what differs between the two views fades
   out and in — the second title line and the button label — so the learner never re-reads what did not change
   (the first title line and the explanation body stay still). Motion.swap does the fade (motion.js, PROJECT DEVIATION). */
function splitFeedbackTitle(title) {
  const i = title.indexOf('<br>');
  return i < 0 ? { l1: title, l2: null } : { l1: title.slice(0, i), l2: title.slice(i + 4) };
}
function feedbackTitleHtml(t) {
  return t.l2 === null ? t.l1 : t.l1 + '<br><span data-m-swap>' + t.l2 + '</span>';
}
/* Returns true when the open popup can be updated in place (same outcome, same first line, same body). */
function swapFeedbackView(popup, type, cfg, bodyHtml) {
  const t = splitFeedbackTitle(cfg.title), cur = popup._fb;
  const l2 = popup.querySelector('.scq-popup-title [data-m-swap]'), lab = popup.querySelector('.popup-action [data-m-swap]');
  if (popup.classList.contains('hidden') || !cur || cur.type !== type || cur.l1 !== t.l1 || cur.body !== bodyHtml ||
      t.l2 === null || !l2 || !lab || !cfg.action) return false;
  Motion.swap(l2, t.l2);
  Motion.swap(lab, cfg.action.label);
  return true;
}

function s3ToggleView() {
  if (s3Answer === null) return;
  s3View = (s3View === 'solution') ? 'answer' : 'solution';
  s3ApplyView();
}
function s3ShowPopup(type, view) {
  const base = S3_FEEDBACK[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // answer view inherits the explanation body
  const popup = document.getElementById('s3-popup');
  const bodyHtml = popupBodyHtml(cfg.body);
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s3-popup', cfg.action || null, s3ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s3Enter() {
  document.getElementById('s3-popup').classList.add('hidden');
  s3GhStop(); s3GhMaybe();
  syncPracticeProgressNav(document.getElementById('s3'));
  s3OpenSlot = null;
  if (s3Done) {                                 // resolved: locked; a final-wrong question comes back on the solution view
    if (s3Answer !== null) s3View = 'solution';
    setNavLabel(document.getElementById('s3-check'), 'متابعة');
  } else {
    setNavLabel(document.getElementById('s3-check'), 'هل إجابتي صحيحة؟');   // unresolved: selection and attempts are kept
  }
  s3Render();
}


/* Click gesture hint on the blank (_gesture-hints.md): FINITE — exactly two ripple demonstrations at the
   trigger (fade out in place between them), then it hides for good: a looping animation is not accessible
   (WCAG 2.2.2; producer 2026-10-06). It also stops the instant the learner opens the list (the real
   interaction) and never returns after that, nor after it has played out (no replay on re-entry, no idle
   timer). Token-guarded; every phase also checks the learner is still on S3; skipped under
   prefers-reduced-motion. */
const S3_GH_PLAYS = 2;
let s3GhSeen = false, s3GhDone = false, s3GhTimer = null, s3GhToken = 0;
function s3GhStop() {
  s3GhToken++;
  if (s3GhTimer) { clearTimeout(s3GhTimer); s3GhTimer = null; }
  const el = document.getElementById('s3-gh');
  if (el) el.className = 'dqg';
}
function s3GhMaybe() {
  if (s3GhSeen || s3GhDone || s3Done) return;
  s3GhStart();
}
function s3GhStart() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  s3GhStop();
  const myToken = s3GhToken, el = document.getElementById('s3-gh');
  if (!el) return;
  const RIPPLE_MS = 1600, FADE_MS = 300, GAP_MS = 900;
  let played = 0;
  const live = () => { if (myToken !== s3GhToken) return false; if (currentScreen !== 3) { s3GhStop(); return false; } return true; };
  function phaseRipple() { if (!live()) return; el.className = 'dqg dqg-show dqg-ripple'; s3GhTimer = setTimeout(phaseFade, RIPPLE_MS); }
  function phaseFade() {
    if (!live()) return;
    played++;
    el.className = 'dqg';                                      // opacity only; the anchor never moves
    if (played >= S3_GH_PLAYS) { s3GhDone = true; s3GhTimer = null; return; }   // played out: hidden for good
    s3GhTimer = setTimeout(phaseRipple, FADE_MS + GAP_MS);
  }
  phaseRipple();
}

/* ===================== S6 (index 6) — interactive doughnut (slide 77) =====================
   Click (or Enter / Space) on a slice reveals its callout: an arrow, the picture(s) of the category and its name. The
   slice's own aria-label then names the category. "המשך" enables once all six have been opened (SCREEN_GATES[6], so the
   button and the ← key agree). Opened slices stay opened for the session; coming back to this screen from part 06
   (#last) the learner has already finished it, so everything is shown. */
const S6_SLICES = [
  { k: 'shower',  val: '54.4', name: 'الاستحمام والاغتسال' },
  { k: 'toilet',  val: '54.4', name: 'شطف المرحاض' },
  { k: 'kitchen', val: '30',   name: 'المطبخ: الشرب، والطهي، وغسل الأواني' },
  { k: 'sink',    val: '10',   name: 'حوض الحمام' },
  { k: 'laundry', val: '8',    name: 'غسيل الملابس' },
  { k: 'garden',  val: '8',    name: 'تنسيق الحدائق وغسيل السيارة' }
];
/* Callouts accumulate (Roni 2026-10-14, reverses the one-at-a-time QA 2026-10-12): every opened slice keeps its
   callout, so the full breakdown shows together at the end. s6Shown = slices seen (the "המשך" gate, green marks). */
const s6Shown = new Set();
let s6Current = null;
function s6Render() {
  S6_SLICES.forEach(s => {
    const seen = s6Shown.has(s.k);
    document.querySelectorAll('#s6 [data-co="' + s.k + '"]').forEach(el => el.classList.toggle('is-shown', seen));
    document.querySelector('#s6 [data-seen="' + s.k + '"]')?.classList.toggle('is-seen', seen);
    const g = document.querySelector('#s6 .s6-slice[data-k="' + s.k + '"]');
    if (g) g.setAttribute('aria-label', seen ? s.name + '، ' + s.val + ' لتر، مكشوف' : s.val + ' لتر. انقروا لاكتشاف الفئة');
  });
  document.getElementById('s6-continue').disabled = partEnded || s6Shown.size !== S6_SLICES.length;   // and off once the component ended
}
function s6Open(k) {
  if (s6Current === k) return;
  s6GhSeen = true; s6GhStop();          // the learner found the gesture
  s6Current = k;
  s6Shown.add(k);
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}   /* resume: a slice of the המשך gate was earned (D-13) */
  s6Render();
  const s = S6_SLICES.find(x => x.k === k);
  const live = document.getElementById('s6-live');
  if (live && s) live.textContent = s.name + '، ' + s.val + ' لتر.' + (s6Shown.size === S6_SLICES.length ? 'تم الكشف عن جميع الفئات.' : 'تم الكشف عن ' + s6Shown.size + ' من أصل ' + S6_SLICES.length + '.');
}
/* Click gesture hint (_gesture-hints.md, as S3's): FINITE — two ripple demonstrations on the biggest slice, then it hides for good
   (a looping animation is not accessible; producer 2026-10-06). It waits for the ring's entrance (~1s), stops the instant the learner
   opens any slice (any equivalent element counts as the gesture found) and never returns after that or after it has played out.
   Token-guarded; skipped under prefers-reduced-motion. */
const S6_GH_PLAYS = 2, S6_GH_DELAY_MS = 1000;
let s6GhSeen = false, s6GhDone = false, s6GhTimer = null, s6GhToken = 0;
function s6GhStop() {
  s6GhToken++;
  if (s6GhTimer) { clearTimeout(s6GhTimer); s6GhTimer = null; }
  const el = document.getElementById('s6-gh');
  if (el) el.className = 'dqg';
}
function s6GhMaybe() {
  if (s6GhSeen || s6GhDone || s6Shown.size > 0) return;
  s6GhStart();
}
function s6GhStart() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  s6GhStop();
  const myToken = s6GhToken, el = document.getElementById('s6-gh');
  if (!el) return;
  const RIPPLE_MS = 1600, FADE_MS = 300, GAP_MS = 900;
  let played = 0;
  const live = () => { if (myToken !== s6GhToken) return false; if (currentScreen !== 6) { s6GhStop(); return false; } return true; };
  function phaseRipple() { if (!live()) return; el.className = 'dqg dqg-show dqg-ripple'; s6GhTimer = setTimeout(phaseFade, RIPPLE_MS); }
  function phaseFade() {
    if (!live()) return;
    played++;
    el.className = 'dqg';
    if (played >= S6_GH_PLAYS) { s6GhDone = true; s6GhTimer = null; return; }
    s6GhTimer = setTimeout(phaseRipple, FADE_MS + GAP_MS);
  }
  s6GhTimer = setTimeout(phaseRipple, S6_GH_DELAY_MS);
}
function s6Enter() { s6Render(); s6GhStop(); s6GhMaybe(); }
document.querySelectorAll('#s6 .s6-slice').forEach(g => {
  g.addEventListener('click', () => s6Open(g.dataset.k));
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s6Open(g.dataset.k); } });
});

function resetScreenState(n) {
  if (n === 0) s0Enter();
  else if (n === 1) s1Enter();
  else if (n === 2) s2Enter();
  else if (n === 3) s3Enter();
  else if (n === 4) s4Enter();
  else if (n === 6) s6Enter();
}

/* A page loaded in a hidden tab/window gets its first play() aborted by
   Chrome and the clip would stay on frame 0 once shown. Returning to the page
   re-runs only the companion-clip entry. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (currentScreen === 0) applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
});

/* ===================== Nav labels ===================== */
/* Relabel a nav button in place, keeping the SemiBold width reserve in sync. */
function setNavLabel(btn, text) {
  const l = btn && btn.querySelector('.nav-label');
  if (!l) return;
  l.querySelector('span').textContent = text;
  l.dataset.label = text;
}
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
  /* Back from part 06 lands on this part's last screen (route-stack #last link): the learner finished it already. */
  if (window.location.hash === '#last') { S6_SLICES.forEach(s => s6Shown.add(s.k)); queueMicrotask(() => goTo(TOTAL_SCREENS - 1)); }
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
   from metadata/methodica-science-mass-liquid-02-05.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: null,                     // advanced-practice intro
  1: ['001', 1],               // the two researchers (single choice)
  2: ['002', 1],               // 0.5 l = 500 ml = 500 cm³ (single choice)
  3: ['003', 1], 4: ['003', 2],   // the water bill: א unit dropdown, ב the chart yes/no
  5: ['004', 1], 6: ['004', 2]    // "הידעת?" household water: text, then the click-to-reveal pie
};

var XAPI_COMP_SLUG = 'methodica-science-mass-liquid-02-05';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-liquid-02-05.json';
var XAPI_END_BTN = 's6-continue';   /* the part's last button (D-8, restoreEndedButton) */

/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* No pass mark ('3 שאלות מתקדמות', slide 71): every learner completes. The score is the three questions the
     intro promised; question 3 is correct only when both of its halves (א, ב) are. */
  const ok = advancedProgress.questions.filter(q => progressItemResult(q) === 'correct').length;
  return { success: true, score: { scaled: ok / advancedProgress.questions.length } };
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
   Every question screen renders from its state variables (sNRender is the single owner of its options / blank /
   slices + bar button), so the painters are the screens' own renderers and nothing answer-bearing lives only in the
   DOM. Never captured: the open list (s3OpenSlot), the gesture-hint timers / tokens (only the seen / done flags, so
   a finite hint does not replay), popup positions, partEnded (after a reload the LEDGER decides — restoreEndedButton,
   D-8). Sets travel as arrays; const Sets / objects are refilled in place, never reassigned. */

/* ── 1. capture ── */
function rsScq(selected, attempts, done, outcome, lw) {
  return { selected: selected, attempts: attempts, done: done, outcome: outcome, lw: lw };
}
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    gates: { s6Shown: [...s6Shown] },   /* SCREEN_GATES[6]: all six slices opened */
    screens: {
      s1: rsScq(s1Selected, s1Attempts, s1Done, s1Outcome, s1LastWrong),
      s2: rsScq(s2Selected, s2Attempts, s2Done, s2Outcome, s2LastWrong),
      s3: { sel: Object.assign({}, s3Sel), attempts: s3Attempts, done: s3Done, outcome: s3Outcome, lw: s3LastWrong,
            wrong: [...s3Wrong], answer: s3Answer === null ? null : JSON.parse(JSON.stringify(s3Answer)), view: s3View,
            ghSeen: s3GhSeen, ghDone: s3GhDone },
      s4: { selected: s4Selected, attempts: s4Attempts, done: s4Done, outcome: s4Outcome },   /* one attempt: no retry gate */
      s6: { current: s6Current, ghSeen: s6GhSeen, ghDone: s6GhDone }
    }
  };
}

/* ── 2. variables (never the DOM). Safe with a partial payload. ── */
function rsStr(v) { return typeof v === 'string' ? v : null; }
/* The harness forces done:true everywhere to sweep the painters; a resolved question without a verdict renders as correct. */
function rsOutcome(v, done) { var o = rsStr(v); return (done && !o) ? 'correct' : o; }
/* The final-wrong snapshot { slot: { value, correct } } over the given slots, or null. */
function rsAnswer(a, slots) {
  if (!a || typeof a !== 'object') return null;
  var out = {};
  slots.forEach(function (n) { var s = (a[n] && typeof a[n] === 'object') ? a[n] : {}; out[n] = { value: rsStr(s.value), correct: !!s.correct }; });
  return out;
}
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults && typeof st.qResults === 'object') Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.gates && Array.isArray(st.gates.s6Shown)) {
    s6Shown.clear();
    st.gates.s6Shown.forEach(function (k) { if (S6_SLICES.some(function (s) { return s.k === k; })) s6Shown.add(k); });
  }
  var sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  var v;
  if ((v = sc.s1) && typeof v === 'object') {
    s1Selected = rsStr(v.selected); s1Attempts = v.attempts | 0; s1Done = !!v.done; s1Outcome = rsOutcome(v.outcome, s1Done);
    s1LastWrong = rsStr(v.lw);
    if (s1Attempts > 0 && !s1Done && s1LastWrong === null) s1LastWrong = s1Selected;   /* older document (rule 9) */
  }
  if ((v = sc.s2) && typeof v === 'object') {
    s2Selected = rsStr(v.selected); s2Attempts = v.attempts | 0; s2Done = !!v.done; s2Outcome = rsOutcome(v.outcome, s2Done);
    s2LastWrong = rsStr(v.lw);
    if (s2Attempts > 0 && !s2Done && s2LastWrong === null) s2LastWrong = s2Selected;   /* rule 9 */
  }
  if ((v = sc.s3) && typeof v === 'object') {
    S3_SLOTS.forEach(function (n) { s3Sel[n] = (v.sel && typeof v.sel === 'object') ? rsStr(v.sel[n]) : null; });   /* const: refilled in place */
    s3Attempts = v.attempts | 0; s3Done = !!v.done; s3Outcome = rsOutcome(v.outcome, s3Done); s3LastWrong = rsStr(v.lw);
    s3Wrong.clear();
    if (Array.isArray(v.wrong)) v.wrong.forEach(function (n) { if (S3_SLOTS.indexOf(n) !== -1) s3Wrong.add(n); });
    s3Answer = rsAnswer(v.answer, S3_SLOTS);
    s3View = (v.view === 'answer' && s3Answer !== null) ? 'answer' : 'solution';   /* the answer view needs its snapshot */
    s3GhSeen = !!v.ghSeen; s3GhDone = !!v.ghDone;
    if (s3Attempts > 0 && !s3Done && s3LastWrong === null) s3LastWrong = s3Snap();   /* rule 9, after the blank is back */
  }
  if ((v = sc.s4) && typeof v === 'object') {
    s4Selected = rsStr(v.selected); s4Attempts = v.attempts | 0; s4Done = !!v.done; s4Outcome = rsOutcome(v.outcome, s4Done);
  }
  if ((v = sc.s6) && typeof v === 'object') {
    s6Current = (S6_SLICES.some(function (s) { return s.k === v.current; })) ? v.current : null;
    s6GhSeen = !!v.ghSeen; s6GhDone = !!v.ghDone;
  }
}

/* ── 3. what lives only in the DOM — nothing here: s3Render repaints the blank's label from s3Sel, s6Render the slice
      marks and callouts from s6Shown, and the gesture-hint element is written only by its timers (never restarted
      once seen / done). ── */
function applyResumeDom(st) {}

/* ── 4. painter dispatch — the screen's own pure renderer per answered / gated screen (rule 11). Idempotent, never
      resets state, never throws on a clean screen. The progress nav is re-derived too: sNEnter synced it before the
      second applyResumeVars pass restored the done flags. ── */
function restoreScreenUI(n) {
  switch (n) {
    case 1: s1Render(); syncPracticeProgressNav(document.getElementById('s1')); break;
    case 2: s2Render(); syncPracticeProgressNav(document.getElementById('s2')); break;
    case 3:
      setNavLabel(document.getElementById('s3-check'), s3Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
      s3Render(); syncPracticeProgressNav(document.getElementById('s3'));
      break;
    case 4: s4Render(); syncPracticeProgressNav(document.getElementById('s4')); break;
    case 6: s6Render(); break;   /* slice marks + callouts from s6Shown; s6-continue from s6Shown + partEnded */
    default: break;              /* 0 (intro), 5 (fact text): no state */
  }
  /* A resolved question's feedback re-shows on the initial restore only (in-session Back does it via goTo(n, true)). */
  if (typeof _restoring !== 'undefined' && _restoring) { try { reopenFeedbackIfResolved(n); } catch (e) {} }
}
