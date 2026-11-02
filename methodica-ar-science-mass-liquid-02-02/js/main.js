/* methodica-ar-science-mass-liquid-02-02 — js/main.js
   Engine + per-screen logic. Part 02 = component 02 of the script
   (slides 52-58): the standard-practice intro (S0) and its 6 questions.
   Built: S0 (intro), S1-S6 (practice questions 1-6). */
'use strict';

const TOTAL_SCREENS = 7;   // S0 intro + practice questions 1-6; S6's advance is the 4-of-6 score gate and hands off to part 03
let currentScreen = 0;

/* ===================== Companion character (carried over from part 01) =====================
   Part 01's selection screen writes the logical ID to localStorage under this
   lomda's namespaced key (720-templates _global-components "Cross-part
   persistence"). This part never shows the selection screen: it reads the key
   back, validates it against its own character IDs, and falls back to the
   primary character only for asset resolution. */
const LOMDA_ID = 'methodica-ar-science-mass-liquid-02';
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
/* Forward to the next part (part 03, the basic practice - the approved journey for this
   lomda, producer 2026-10-06), recording this part on the route stack so part 03's Back
   returns here (its last screen, via #last). */
const PART_ID = 'methodica-ar-science-mass-liquid-02-02';
const NEXT_PART_ID = 'methodica-ar-science-mass-liquid-02-03';
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
/* Viewport-filling canvas (same model as part 01): scale so the 1280x710
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
function closeAllOverlays() {
  document.querySelectorAll('.scq-popup, [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  closeRecallPopup();   // its id does not match the generic sweep (720-templates "RecallPopup")
}

function goTo(n, viaBack) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  closeAllOverlays();
  closeImgZoom();
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
   S0 is ungated (TransitionScreen). S6 is the last question: besides being resolved,
   its advance is the practice's 4-of-6 score gate (practiceProgress.passThreshold =
   ceil(2*6/3), the intro's own "צריך לענות נכון על 4 שאלות לפחות."). Below the
   threshold the learner does not progress further inside the lomda - the platform
   remediates (producer 2026-10-06; same convention as part 03's gates). On pass the
   advance hands off to part 03. The gates live here, so the button and the ← key agree. */
const SCREEN_GATES = {
  1: () => s1Done,
  2: () => s2Done,
  3: () => s3Done,
  4: () => s4Done,
  5: () => s5Done,
  6: () => s6Done   /* resolved. The 4-of-6 verdict is REPORTED, not gated: below it the component still ends
                       (completed success:false) and the platform remediates (guide §6.4, decision 2026-10-22) */
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong: on the
   solution view) — _global-components "Reopening feedback on return". */
function reopenFeedbackIfResolved(n) {
  if (n === 1 && s1Done) { if (s1Outcome === 'wrong2') s1ApplyView(); else s1ShowPopup(s1Outcome); }
  if (n === 2 && s2Done) s2ShowPopup(s2Outcome);
  if (n === 3 && s3Done) { if (s3Outcome === 'wrong2') s3ApplyView(); else s3ShowPopup(s3Outcome); }
  if (n === 4 && s4Done) s4ShowPopup(s4Outcome);
  if (n === 5 && s5Done) { if (s5Outcome === 'wrong2') s5ApplyView(); else s5ShowPopup(s5Outcome); }
  if (n === 6 && s6Done) { if (s6Outcome === 'wrong2') s6ApplyView(); else s6ShowPopup(s6Outcome); }
}

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('recall-overlay').classList.contains('hidden')) return;   // the open Recall popup owns the keys
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
/* Slide 52: the "workout" clips (presenter note "הדמות בגיף מרימה משקולות
   רגילות"; verified visually: character-1 = the gray companion, character-2 =
   the turquoise one, both curling dumbbells; 1280x720, 4.01s, white ground,
   final frame = the opening pose, so no freezeAt). No scale fit (frame-0 ink
   heights 657 / 672px, 2.2%, within the ~3% band). shiftY seats each clip's
   ground line on the bar line, as part 01 does: character-1's feet bob
   between box y 338.5 and 342 of 360, so 18 keeps the lowest point at the
   line without clipping it; character-2's stay at 338-339, so 21. */
const S0_CHARACTER = {
  'character-1': { video: '../unit-assets/video/character-1-workout.mp4', fit: { scale: 1, shiftY: 18 } },
  'character-2': { video: 'assets/video/character-2-workout.mp4', fit: { scale: 1, shiftY: 21 } }
};
function s0Enter() {
  applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  syncS0Back();
}

function resetScreenState(n) {
  if (n === 0) s0Enter();
  else if (n === 1) s1Enter();
  else if (n === 2) s2Enter();
  else if (n === 3) s3Enter();
  else if (n === 4) s4Enter();
  else if (n === 5) s5Enter();
  else if (n === 6) s6Enter();
}

/* A page loaded in a hidden tab/window gets its first play() aborted by
   Chrome ("video-only background media was paused to save power") and the
   clip would stay on frame 0 once shown. Returning to the page re-runs only
   the companion-clip entry (continues a paused, unfinished clip, leaves an
   ended one on its final frame) — never a whole screen entry, which would
   close an open feedback popup or hint. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentScreen === 0) applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
});

/* ===================== Progress question (standard practice, 6 questions) =====================
   720-templates _global-components "Progress Question". One item per question;
   `screens` lists the data-screen indices the question spans (empty = not built
   yet, never clickable). Item state is derived from the screens' own recorded
   results on every sync — never stored. */
const practiceProgress = {
  questions: [
    { number: 1, screens: [1] },
    { number: 2, screens: [2] },
    { number: 3, screens: [3] },
    { number: 4, screens: [4] },
    { number: 5, screens: [5] },
    { number: 6, screens: [6] }
  ]
};
practiceProgress.passThreshold = Math.ceil(2 * practiceProgress.questions.length / 3);   // 4 of 6
/* The practice's score: questions scored correct against passThreshold (as part 03). */
function practicePassed(set) {
  const correct = set.questions.filter(q => progressItemResult(q) === 'correct').length;
  return correct >= set.passThreshold;
}
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'. */
const SCREEN_RESULT = {
  1: () => s1Done ? (s1Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => s3Done ? (s3Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  4: () => s4Done ? (s4Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  5: () => s5Done ? (s5Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  6: () => s6Done ? (s6Outcome === 'correct' ? 'correct' : 'incorrect') : null
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
  if (nav) updateProgressQuestion(nav, practiceProgress);
}

/* ===================== Shared: draggable feedback popup (as part 01) ===================== */
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

/* ===================== Shared: pointer drag-and-drop helper (as part 01) =====================
   Pointer Events only (mouse, touch, pen), per the DragAndDropQuestion Image Top
   reference (createPointerDnd): a clone of the picked element follows the pointer
   in viewport-fixed coordinates, scaled like #app; drop targets are hit-tested
   under the pointer. A press without a move is a tap. */
function createPointerDnd(opts) {
  const targets = new Map();
  let active = null;
  const appScale = () => {
    const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  };
  function attachSource(elem, dragId) {
    if (!elem) return;
    elem.dataset.pdragId = dragId;
    if (elem.dataset.pdragAttached === '1') return;
    elem.dataset.pdragAttached = '1';
    elem.addEventListener('pointerdown', onDown);
  }
  function attachTarget(elem, targetId) { if (elem) targets.set(elem, targetId); }
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const src = e.currentTarget, dragId = src.dataset.pdragId;
    if (!dragId || (opts.canDrag && !opts.canDrag(dragId, src))) return;
    e.preventDefault();
    const rect = src.getBoundingClientRect(), scale = appScale();
    const ghost = src.cloneNode(true);
    ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    Object.assign(ghost.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width / scale + 'px', height: rect.height / scale + 'px', margin: '0', pointerEvents: 'none', zIndex: '9999', opacity: '0.92', transform: 'scale(' + scale + ')', transformOrigin: 'top left' });
    ghost.classList.remove('dragging', 'is-selected');
    ghost.classList.add('pointer-drag-ghost');
    document.body.appendChild(ghost);
    active = { dragId, src, ghost, pointerId: e.pointerId, offX: e.clientX - rect.left, offY: e.clientY - rect.top, moved: false, over: null };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }
  function hitTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    for (const [t, id] of targets) if (t === el || t.contains(el)) return { t, id };
    return null;
  }
  function onMove(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    if (e.buttons === 0) { onUp(e); return; }       // a move with no button held ends the drag
    e.preventDefault();
    if (!active.moved) { active.moved = true; active.src.classList.add('dragging'); if (opts.onPick) opts.onPick(active.dragId, active.src); }
    active.ghost.style.left = e.clientX - active.offX + 'px';
    active.ghost.style.top = e.clientY - active.offY + 'px';
    const hit = hitTarget(e.clientX, e.clientY), id = hit ? hit.id : null;
    if (id !== active.over) {
      for (const [t] of targets) t.classList.remove('drag-over');
      if (hit) hit.t.classList.add('drag-over');
      active.over = id;
    }
  }
  function onUp(e) {
    if (!active || (e && e.pointerId !== undefined && e.pointerId !== active.pointerId)) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    const { dragId, src, ghost, moved, over } = active;
    for (const [t] of targets) t.classList.remove('drag-over');
    active = null;
    src.classList.remove('dragging');
    ghost.remove();
    if (!moved) { if (opts.onTap) opts.onTap(dragId, src); return; }
    if (over && opts.onDrop) opts.onDrop(dragId, over); else if (opts.onCancel) opts.onCancel(dragId);
  }
  return { attachSource, attachTarget };
}

/* ===================== S1 (index 1) — DragAndDropQuestion, paragraph blanks (slide 53) =====================
   Local variant of 720-templates DragAndDropQuestion (producer 2026-10-05; see the
   markup comment), with part 01 S7's interaction model: each blank holds exactly
   one word; dropping on a filled blank sends its word back to the bank; dropping
   elsewhere returns it; placed words stay draggable until checked; Check enables
   when all five blanks are filled (the three distractors never block it). Two
   attempts (template default; the note authors no deviation): retry -> the right
   blanks get ✓ and lock (partial correction), the wrong ones ✕ until their content
   changes (per-answer verdict rule, producer 2026-10-07), Retry gate on the identical
   placement; final wrong -> the solution at
   once + the View My Answer Toggle (note: "טוגל מעבר התשובה שלי / התשובה הנכונה").
   No hint (note). Answers = the slide's green runs, one per blank, in text order.
   Keyboard / tap: press a word to pick it, then press a blank to place it;
   pressing a filled blank picks its word up again; Escape drops the pick. */
const S1Q = {
  accept: {
    's1-t1': ['s1-d-different'],
    's1-t2': ['s1-d-trade'],
    's1-t3': ['s1-d-metric'],
    's1-t4': ['s1-d-uniform'],
    's1-t5': ['s1-d-liter']
  },
  reveal: { 's1-t1': 's1-d-different', 's1-t2': 's1-d-trade', 's1-t3': 's1-d-metric', 's1-t4': 's1-d-uniform', 's1-t5': 's1-d-liter' },
  maxAttempts: 2
};
const S1_LABEL = {
  's1-d-trade': 'المتاجرة', 's1-d-metric': 'المتري', 's1-d-uniform': 'الموحّد', 's1-d-different': 'متباينة',
  's1-d-liter': 'اللتر', 's1-d-cubit': 'ذراع', 's1-d-sail': 'الإبحار', 's1-d-decimal': 'العشري'
};
/* Slide 53's feedback boxes, as authored. The final-wrong title already ends with
   its own "answers are shown" line, so it is split there rather than given the
   canonical second line again (_question-template-defaults "Anti-duplication").
   Correct and final-wrong share the authored explanation. */
const S1_EXPLAIN = [
  'النظام المتري هو نظام قياس موحّد، يُستخدم في جميع دول العالم تقريبًا. وهو مبني على وحدات قياس متفق عليها، مثل المتر واللتر والغرام.',
  'هكذا يستطيع الناس في أماكن مختلفة أن يفهم بعضهم بعضًا، وأن يقارنوا القياسات بسهولة.'
];
/* Retry title = the slide's own wording ("התשובה אינה נכונה במלואה.") - an earlier "תשובתך" wording was a typo. */
const S1_FEEDBACK = {
  retry:   { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S1_EXPLAIN },
  wrong2:  {
    title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابات الصحيحة معروضة.',
    body: S1_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
const s1Place = {};
Object.keys(S1_LABEL).forEach(d => { s1Place[d] = 'source'; });
let s1Attempts = 0, s1Done = false, s1Outcome = null, s1LastWrong = null;
let s1Marks = null;          // null | { targetId: 'correct' | 'wrong' }
/* Partial correction (producer 2026-10-05; _global-components "Partial-correction
   flow"): after a non-final wrong attempt the blanks that are already correct get
   their ✓ and stay locked in place, so the retry only asks for the rest. */
const s1Kept = new Set();
const s1IsKept = t => s1Kept.has(t);
let s1Judged = null;      // { targetId: chipId } at a non-final wrong check: a wrong target's ✕ shows only while unchanged
function s1MarkOf(t) {
  if (!s1Marks) return null;
  const m = s1Marks[t] || null;
  if (s1Done || !s1Judged || m !== 'wrong') return m;
  return s1In(t) === s1Judged[t] ? m : null;          // the ✕ clears once the target's content changes
}
let s1Answer = null, s1View = 'solution';
let s1Pick = null;           // word picked by keyboard / tap
let s1Dnd = null;
let s1SkipClick = false;     // the click that trails a handled drag / tap
const s1Targets = () => Object.keys(S1Q.accept);
const s1In = t => Object.keys(s1Place).find(d => s1Place[d] === t) || null;
const s1Snap = () => JSON.stringify(s1Place);
const s1BlankName = t => 'مكان فارغ ' + (s1Targets().indexOf(t) + 1);
function s1Announce(msg) { const l = document.getElementById('s1-live'); if (l) l.textContent = msg; }

function s1Render() {
  Object.keys(s1Place).forEach(d => {
    const chip = document.getElementById(d), placed = s1Place[d] !== 'source';
    chip.classList.toggle('is-placed', placed);
    chip.classList.remove('dragging');
    chip.classList.toggle('is-selected', s1Pick === d);
    chip.setAttribute('aria-pressed', s1Pick === d ? 'true' : 'false');
    chip.disabled = placed || s1Done;
  });
  s1Targets().forEach(t => {
    const zone = document.getElementById(t), d = s1In(t), mark = s1MarkOf(t);
    zone.innerHTML = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    const locked = s1Done || s1IsKept(t);
    zone.classList.toggle('locked', locked);
    if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'ddqp-placed';
      card.textContent = S1_LABEL[d];
      zone.appendChild(card);
      if (!locked && s1Dnd) s1Dnd.attachSource(card, d);
    }
    const verdict = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', s1BlankName(t) + ': ' + (d ? S1_LABEL[d] : 'فارغة') + verdict);
    zone.tabIndex = locked ? -1 : 0;
    if (locked) zone.removeAttribute('role'); else zone.setAttribute('role', 'button');
  });
  s1UpdateCheck();
}
function s1UpdateCheck() {
  const btn = document.getElementById('s1-check');
  if (s1Done) { btn.disabled = false; return; }
  const full = s1Targets().every(t => !!s1In(t));
  btn.disabled = !full || s1Snap() === s1LastWrong;         // Retry gate
}
function s1StartEdit() { dismissRetryPopup('s1-popup', s1Done); }
function s1PlaceChip(d, t) {
  const evicted = s1In(t);
  if (evicted && evicted !== d) s1Place[evicted] = 'source';
  s1Place[d] = t;
  s1Pick = null;
  s1Render();
  s1Announce('تم وضع الكلمة ' + S1_LABEL[d] + ' في ' + s1BlankName(t));
}
function s1InitDnd() {
  if (s1Dnd) return;
  s1Dnd = createPointerDnd({
    canDrag: d => !s1Done && !s1IsKept(s1Place[d]),
    onPick: d => { s1StartEdit(); s1Pick = null; s1Place[d] = 'source'; s1Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s1SkipClick = true; if (s1IsKept(t)) { s1Render(); return; } s1PlaceChip(d, t); },
    onCancel: () => { s1SkipClick = true; s1Render(); },
    onTap: (d, src) => { s1SkipClick = true; if (src.classList.contains('ddqp-placed')) s1ZonePress(s1Place[d]); else s1ChipPress(d); }
  });
  Object.keys(s1Place).forEach(d => s1Dnd.attachSource(document.getElementById(d), d));
  s1Targets().forEach(t => {
    const zone = document.getElementById(t);
    s1Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s1SkipClick) { s1SkipClick = false; return; } s1ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s1ZonePress(t); } });
  });
  // keyboard activation of a word (a pointer press is handled by the DnD helper's tap)
  Object.keys(s1Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s1ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 1 && s1Pick) { s1Pick = null; s1Render(); } });
  document.addEventListener('pointerdown', () => { s1SkipClick = false; }, true);   // a new gesture never inherits the flag
}
function s1ChipPress(d) {
  if (s1Done || s1Place[d] !== 'source') return;
  s1StartEdit();
  s1Pick = (s1Pick === d) ? null : d;
  s1Render();
  if (s1Pick) s1Announce('تم اختيار الكلمة ' + S1_LABEL[d] + '. اختاروا مكانًا فارغًا لوضعها.');
}
function s1ZonePress(t) {
  if (s1Done || s1IsKept(t)) return;
  if (s1Pick) { s1StartEdit(); s1PlaceChip(s1Pick, t); return; }
  const d = s1In(t);
  if (!d) return;
  s1StartEdit();
  s1Place[d] = 'source'; s1Pick = d;                      // pick the placed word up again
  s1Render();
  s1Announce('تم اختيار الكلمة ' + S1_LABEL[d] + '. اختاروا مكانًا فارغًا لوضعها.');
}
function s1MarksFor(placement) {
  const m = {};
  s1Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S1Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
function s1Primary() {
  if (s1Done) { advanceScreen(); return; }
  s1Check();
}
function s1Check() {
  if (s1Done || !s1Targets().every(t => !!s1In(t))) return;
  s1Pick = null;
  s1Attempts++;
  const marks = s1MarksFor(s1Place);
  const allCorrect = Object.values(marks).every(v => v === 'correct');
  /* xAPI: after the marks loop (allCorrect is final here). matching: one pair per blank — source = the placed word, target = the catalogue sentence by blank index (the DOM holds no sentence label; t1..t5 = answers.target order). */
  xapiAnswered('001', 'q1', allCorrect, allCorrect || s1Attempts >= S1Q.maxAttempts, { pairs: s1Targets().map((t, i) => ({ source: S1_LABEL[s1In(t)], target: i })) });
  if (allCorrect) {
    s1Marks = marks; s1Finish('correct');
  } else if (s1Attempts >= S1Q.maxAttempts) {
    s1Answer = Object.assign({}, s1Place);                 // the learner's final answer, before the reveal
    s1View = 'solution';
    s1Finish('wrong2');
  } else {
    s1LastWrong = s1Snap();                                // Retry gate snapshot
    s1Marks = {};                                          // retry: right blanks ✓ (kept, locked), wrong ones ✕
    s1Targets().forEach(t => { if (marks[t] === 'correct') { s1Marks[t] = 'correct'; s1Kept.add(t); } else s1Marks[t] = 'wrong'; });
    s1Judged = {}; s1Targets().forEach(t => { s1Judged[t] = s1In(t); });
    s1Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}   /* resume: synchronous save after the last commitment (guide §8.3, D-13) */
    s1ShowPopup('retry');
  }
}
function s1Finish(outcome) {
  s1Done = true; s1Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s1-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s1'));
  if (outcome === 'wrong2') { s1ApplyView(); return; }
  s1Render();
  s1ShowPopup(outcome);
}
/* View My Answer Toggle — the single owner of the resolved-wrong board + popup. */
function s1ApplyView() {
  if (s1Answer === null) return;
  Object.keys(s1Place).forEach(d => { s1Place[d] = 'source'; });
  if (s1View === 'answer') { Object.assign(s1Place, s1Answer); s1Marks = s1MarksFor(s1Answer); }
  else { Object.keys(S1Q.reveal).forEach(t => { s1Place[S1Q.reveal[t]] = t; }); s1Marks = s1MarksFor(s1Place); }
  s1Render();
  s1ShowPopup('wrong2', s1View);
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

function s1ToggleView() {
  if (s1Answer === null) return;
  s1View = (s1View === 'solution') ? 'answer' : 'solution';
  s1ApplyView();
}
function s1ShowPopup(type, view) {
  const base = S1_FEEDBACK[type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // answer view inherits the explanation body
  const popup = document.getElementById('s1-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s1-popup', cfg.action || null, s1ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s1Enter() {
  s1InitDnd();
  document.getElementById('s1-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s1'));
  if (s1Done) {                                            // resolved: locked board; Back reopens the popup
    if (s1Answer !== null) { s1View = 'solution'; Object.keys(s1Place).forEach(d => { s1Place[d] = 'source'; }); Object.keys(S1Q.reveal).forEach(t => { s1Place[S1Q.reveal[t]] = t; }); s1Marks = s1MarksFor(s1Place); }
    setNavLabel(document.getElementById('s1-check'), 'متابعة');
    s1Render();
    return;
  }
  /* Unresolved: the learner's placement, attempt count and kept ✓ blanks survive
     leaving and returning ("Partial-correction flow": navigation never clears
     correct progress); only a pending keyboard pick is dropped. */
  s1Pick = null;
  setNavLabel(document.getElementById('s1-check'), 'هل إجابتي صحيحة؟');
  s1Render();
}

/* ===================== Image zoom (global, as part 01) =====================
   Clone-based (720-templates "Image zoom"): the stage receives a clone of the
   trigger's [data-zoom-wrapper], enlarged with one uniform transform, capped at
   the Image Zoom Surface envelope (1200x640 -> 1072x512 media after the 64px margin) and never beyond
   the source's own resolution. The clone takes the image's own aspect ratio, so
   a contained image shows whole, without the frame's letterbox bands. */
const ZOOM_MEDIA_MAX_W = 1200 - 2 * 72, ZOOM_MEDIA_MAX_H = 690 - 2 * 24;   // envelope 1200x690, padding 24/72 -> media 1056x642 (720-design-guidelines, producer 2026-10-13)
let zoomReturnFocus = null;
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
  const k = Math.min(ZOOM_MEDIA_MAX_W / uw, ZOOM_MEDIA_MAX_H / uh, resCap);
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.querySelectorAll('[data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  Object.assign(clone.style, { position: 'absolute', left: '0', top: '0', margin: '0', borderRadius: '0',
    width: uw + 'px', height: uh + 'px', transform: 'scale(' + k + ')', transformOrigin: '0 0' });
  stage.innerHTML = '';
  stage.style.width = (uw * k) + 'px';
  stage.style.height = (uh * k) + 'px';
  stage.appendChild(clone);
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
  const rc = document.getElementById('recall-overlay');
  if (rc && !rc.classList.contains('hidden')) { closeRecallPopup(); return; }
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

/* ===================== RecallPopup (global, one instance for the part) =====================
   720-templates _global-components "RecallPopup", ported from part 01 (S21). Here the trigger is S3's Recall button (.scq-hint.recall-btn, in the question content),
   which supplies the heading through data-recall-title. Closes on the X, the backdrop and Escape; goTo() closes it through
   closeRecallPopup(). Modal: Tab stays on the close button; focus returns to the trigger on close. */
let recallReturnFocus = null;
function openRecallPopup(trigger) {
  const ov = document.getElementById('recall-overlay');
  if (!ov) return;
  recallReturnFocus = trigger || null;
  const t = trigger && trigger.dataset.recallTitle;
  if (t) document.getElementById('recall-title').textContent = t;
  ov.classList.remove('hidden');
  const x = ov.querySelector('.recall-popup-close');
  if (x) x.focus();
}
function closeRecallPopup() {
  const ov = document.getElementById('recall-overlay');
  if (!ov || ov.classList.contains('hidden')) return;
  ov.classList.add('hidden');
  if (recallReturnFocus && document.contains(recallReturnFocus)) recallReturnFocus.focus();
  recallReturnFocus = null;
}
function closeRecallPopupOnBackdrop(e) { if (e.target === e.currentTarget) closeRecallPopup(); }
document.addEventListener('keydown', (e) => {
  const ov = document.getElementById('recall-overlay');
  if (!ov || ov.classList.contains('hidden') || e.key !== 'Tab') return;
  e.preventDefault();
  const x = ov.querySelector('.recall-popup-close'); if (x) x.focus();
});
/* ===================== S2 (index 2) — SingleChoiceQuestionImage (slide 54) =====================
   720-templates SingleChoiceQuestion (+ SingleChoiceQuestionImage). Correct: option
   1 (a), the only option filled green on slide 54. Two attempts (template default):
   retry -> the chosen option red + ✗, the correct one not revealed, Retry gate on
   the same option; final wrong -> the correct option green + ✓ and the chosen one
   red + ✗ (no answer toggle in this template). Hint (slide 54's hint box) is visible
   from the start and reusable until the question resolves. Feedback = slide 54's
   boxes as authored: correct and final-wrong share the explanation; the final-wrong
   title keeps its own second line "התשובה הנכונה מסומנת." (no duplicate canonical
   line). Leaving and returning never resets an unresolved question. */
const S2Q = { correctId: 'a', maxAttempts: 2 };
let s2Selected = null, s2Attempts = 0, s2Done = false, s2LastWrong = null, s2Outcome = null;
const S2_EXPLAIN = [
  'الميزة الرئيسية للنظام المتري هي التوحيد: 100 مل في سويسرا هي بالضبط 100 مل في إسرائيل واليابان.',
  'هكذا يمكن مقارنة البيانات والتجارة وتبادل المعرفة دون أخطاء ودون الحاجة إلى تحويل وحدات القياس.'
];
const S2_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S2_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة مُشار إليها.', body: S2_EXPLAIN }
};
const s2Opts = () => document.querySelectorAll('#s2 .scq-opt');
const s2Opt = id => document.querySelector('#s2 .scq-opt[data-id="' + id + '"]');

function s2Enter() {
  document.getElementById('s2-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s2'));
  s2Render();
}
/* Single owner of the options + bar state, derived from the recorded state. */
function s2Render() {
  s2Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s2Done) {
      if (id === S2Q.correctId && (s2Outcome === 'correct' || s2Outcome === 'wrong2')) cls = 'correct';
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
  /* xAPI: choice — the chosen option's visible text (= answers[] in the catalogue). */
  xapiAnswered('002', 'q1', s2Selected === S2Q.correctId, s2Selected === S2Q.correctId || s2Attempts >= S2Q.maxAttempts, { choices: [xapiAnswerText(s2Opt(s2Selected))] });
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
  popup.querySelector('.scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
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
    /* xAPI: requested.1 — after the gate, immediately before the reveal; this function only opens (the close path reports nothing). */
    xapiRequestedHint('002', 'q1');
    openHintOverlay('s2-hint-overlay', document.getElementById('s2-hint'));
  }
}
function s2CloseHint() { closeHintOverlay(document.getElementById('s2-hint-overlay')); }
function s2CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s2CloseHint(); }

/* ===================== S3 (index 3) — DropdownQuestion, multiple blanks + image (slide 55) =====================
   720-templates DropdownQuestion (multi-blank) as a local variant with the image column of
   S2 (see the markup comment). Two blanks; correct: 1,000 and 0.8. Two attempts (template
   default; none authored otherwise). Interaction: one list open at a time; a click outside or
   Escape closes it; picking a value fills the trigger; "צדקתי?" enables when both blanks have
   a value and (Retry gate) the pair differs from the one just marked wrong. A non-final wrong
   attempt marks the blanks that are right with ✓ and locks them (producer 2026-10-05,
   "Partial-correction flow") - only the wrong ones stay open, each marked ✕ until the
   learner opens or changes it (per-answer verdict rule, producer 2026-10-07); no hint
   (note). Final wrong:
   every wrong blank shows its correct value at once (green), the already-right one is
   untouched, and the View My Answer Toggle swaps the wrong ones with the learner's own picks
   (red). Keyboard: Enter / Space / ArrowDown opens, Arrow keys / Home / End move, Enter or
   Space picks, Escape closes and returns to the trigger. */
const S3Q = { correct: { 1: '1,000', 2: '0.8' }, maxAttempts: 2 };
const S3_SLOTS = [1, 2];
const S3_EXPLAIN = [
  'في علبة الحليب 1 لتر، أي ما يعادل 1,000 مل.',
  'في قنينة عصير الليمون 800 مل، وهي 0.8 لتر.'
];
/* Slide 55's boxes as authored (plain titles). When the learner's answer is PARTIAL - at least
   one blank right - the title is "התשובה אינה נכונה במלואה." on the retry AND on the final
   wrong attempt (retryPartial / wrong2Partial; producer 2026-10-05, overriding the authored
   plain title - _question-template-defaults "Retry title when part of the answer is right").
   When no blank is right the authored titles stay. The final box keeps its authored second
   line "התשובה הנכונה מסומנת."; the learner-answer view keeps the same first line + the explanation body, second line "אפשר לצפות שוב בפתרון הנכון.". */
const S3_PARTIAL_TITLE = 'الإجابة ليست صحيحة بالكامل.';
const S3_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: S3_PARTIAL_TITLE, body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'ممتاز!', body: S3_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة مُشار إليها.',
    body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  },
  wrong2Partial: {
    title: S3_PARTIAL_TITLE + '<br>الإجابة الصحيحة مُشار إليها.',
    body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: S3_PARTIAL_TITLE + '<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
/* Partial = at least one blank right in the answer being judged. Retry: a blank was kept (the
   right ones lock after the first wrong attempt). Final: read from the snapshot taken at check
   time, so the title is the same in both toggle views and on re-entry. */
const s3RetryIsPartial = () => s3Kept.size > 0;
const s3FinalIsPartial = () => !!s3Answer && S3_SLOTS.some(n => s3Answer[n].correct);
const S3_CHECK_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const S3_WRONG_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';
const S3_PROMPT = 'اختاروا إجابة';
const s3Sel = { 1: null, 2: null };
let s3Attempts = 0, s3Done = false, s3Outcome = null, s3LastWrong = null;
let s3Answer = null, s3View = 'solution';
let s3OpenSlot = null;
const s3Kept = new Set();            // blanks already right after a non-final wrong attempt (✓, locked)
const s3Wrong = new Set();           // blanks marked ✕ after it, until the learner opens or changes them
const s3Snap = () => JSON.stringify(s3Sel);
function s3Announce(msg) { const l = document.getElementById('s3-live'); if (l) l.textContent = msg; }
const s3WordsOf = n => document.getElementById('s3-w' + n).textContent;
/* Value shown in a blank, and its verdict, derived from the recorded state (single owner). */
function s3Shown(n) {
  if (s3Done && s3Outcome === 'wrong2') return s3View === 'answer' ? s3Answer[n].value : S3Q.correct[n];
  return s3Sel[n];
}
function s3MarkOf(n) {
  if (s3Done) {
    if (s3Outcome === 'wrong2' && s3View === 'answer') return s3Answer[n].correct ? 'correct' : 'wrong';
    return 'correct';
  }
  if (s3Kept.has(n)) return 'correct';
  return s3Wrong.has(n) ? 'wrong' : null;
}
const s3Locked = n => s3Done || s3Kept.has(n);
function s3Render() {
  S3_SLOTS.forEach(n => {
    const btn = document.getElementById('s3-btn-' + n), sel = document.getElementById('s3-sel-' + n);
    const mark = s3MarkOf(n), open = s3OpenSlot === n, val = s3Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s3Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? S3_CHECK_SVG : S3_WRONG_SVG);
    sel.textContent = val || S3_PROMPT;   // empty trigger always carries the prompt (producer 2026-10-07)
    sel.classList.toggle('is-prompt', !val);
    document.getElementById('s3-verdict-' + n).textContent = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    document.getElementById('s3-wrap-' + n).classList.toggle('is-open', open);
    const list = document.getElementById('s3-list-' + n);
    list.classList.toggle('hidden', !open);
    list.querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', o.dataset.value === val ? 'true' : 'false'));
  });
  s3UpdateCheck();
  s3SyncHint();
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
  dismissRetryPopup('s3-popup', s3Done);        // opening a list is a corrective action
  s3Wrong.delete(n);                            // ...and clears that slot's ✕
  s3OpenSlot = (s3OpenSlot === n) ? null : n;   // one list at a time
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
    const opts = [...document.querySelectorAll('#s3-list-' + n + ' .dq-option')];
    const cur = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
    s3FocusOption(n, cur >= 0 ? cur : 0, true);
  } else if (e.key === 'Escape' && s3OpenSlot === n) { e.preventDefault(); s3CloseList(true); }
}
function s3OptKey(e, n) {
  const opts = [...document.querySelectorAll('#s3-list-' + n + ' .dq-option')];
  const i = opts.indexOf(e.currentTarget);
  if (e.key === 'ArrowDown') { e.preventDefault(); s3FocusOption(n, i + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); s3FocusOption(n, i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); s3FocusOption(n, 0, true); }
  else if (e.key === 'End') { e.preventDefault(); s3FocusOption(n, opts.length - 1, true); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s3Select(n, e.currentTarget.dataset.value); }
  else if (e.key === 'Escape') { e.preventDefault(); s3CloseList(true); }
  else if (e.key === 'Tab') { s3CloseList(false); }
}
/* One document-level listener: a click outside every dropdown closes the open list. */
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
  /* xAPI: performance — the two lists differ, so one question with two steps in the catalogue's steps[] order (slot 1 = מ״ל בקרטון החלב, slot 2 = ליטר בבקבוק הלימונדה); each value is the option text the learner sees. */
  xapiAnswered('003', 'q1', S3_SLOTS.every(n => right[n]), S3_SLOTS.every(n => right[n]) || s3Attempts >= S3Q.maxAttempts, { steps: [s3Sel[1], s3Sel[2]] });
  if (S3_SLOTS.every(n => right[n])) { s3Finish('correct'); return; }
  if (s3Attempts >= S3Q.maxAttempts) {
    s3Answer = {};
    S3_SLOTS.forEach(n => { s3Answer[n] = { value: s3Sel[n], correct: right[n] }; });   // before the reveal overwrites a wrong blank
    s3View = 'solution';
    s3Finish('wrong2');
    return;
  }
  S3_SLOTS.forEach(n => { if (right[n]) s3Kept.add(n); else s3Wrong.add(n); });   // retry: the right ones get ✓ and lock, the wrong ones ✕
  s3LastWrong = s3Snap();
  s3Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s3ShowPopup('retry');
}
function s3Finish(outcome) {
  s3Done = true; s3Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  closeRecallPopup();                            // resolved: the Recall button is gone, and so is its popup
  setNavLabel(document.getElementById('s3-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s3'));
  if (outcome === 'wrong2') { s3ApplyView(); return; }
  s3Render();
  s3ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong blanks + popup. */
function s3ApplyView() {
  if (s3Answer === null) return;
  s3Render();
  s3ShowPopup('wrong2', s3View);
}
function s3ToggleView() {
  if (s3Answer === null) return;
  s3View = (s3View === 'solution') ? 'answer' : 'solution';
  s3ApplyView();
}
function s3ShowPopup(type, view) {
  const key = type === 'retry' && s3RetryIsPartial() ? 'retryPartial'
            : type === 'wrong2' && s3FinalIsPartial() ? 'wrong2Partial' : type;
  const base = S3_FEEDBACK[key];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // answer view inherits the explanation body
  const popup = document.getElementById('s3-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
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
/* Bar button (closing round 2026-10-20, Nimrod / Roni): the Recall button moved from the question content into the bar's hint slot, with the Recall label; it opens the Recall popup (white, X, title + diagram) but is positioned and gated like a hint. The screen's hint text, where there was one, is replaced by the diagram. S3 has no hint text; same rule as the part's hints: hidden (not disabled) until the first wrong attempt, then available through the retry until the question resolves. */
function s3SyncHint() {
  const h = document.getElementById('s3-hint');
  h.hidden = s3Done;
  h.style.visibility = (!s3Done && s3Attempts > 0) ? 'visible' : 'hidden';
}
function s3OpenHint() {
  if (!s3Done && s3Attempts > 0) {
    /* xAPI: requested.1 — after the gate, immediately before the Recall popup opens (open only; closeRecallPopup reports nothing). */
    xapiRequestedHint('003', 'q1');
    openRecallPopup(document.getElementById('s3-hint'));
  }
}
function s3Enter() {
  document.getElementById('s3-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s3'));
  s3OpenSlot = null;
  if (s3Done) {                                 // resolved: locked; a final-wrong question comes back on the solution view
    if (s3Answer !== null) s3View = 'solution';
    setNavLabel(document.getElementById('s3-check'), 'متابعة');
  } else {
    setNavLabel(document.getElementById('s3-check'), 'هل إجابتي صحيحة؟');   // unresolved: selections, attempts and the ✓ blanks are kept
  }
  s3Render();
}

/* Figma "nav label": feed each label's own text into data-label so the
   invisible SemiBold reserve always matches the visible label. */
function initNavLabels() {
  document.querySelectorAll('.nav-label').forEach(l => {
    const span = l.querySelector('span');
    if (span) l.dataset.label = span.textContent;
  });
}
/* Relabel a nav button in place, keeping the SemiBold width reserve in sync. */
function setNavLabel(btn, text) {
  const l = btn && btn.querySelector('.nav-label');
  if (!l) return;
  l.querySelector('span').textContent = text;
  l.dataset.label = text;
}

/* ===================== S4 (index 4) — SingleChoice, speech bubbles (slide 56) =====================
   720-templates SingleChoiceQuestion on the SingleChoiceQuestionImage layout + two speech bubbles
   (Figma Screen Templates/MultipleChoiceBubbleText, radio variant). Correct: option 3 (c) "שניהם
   צודקים.", the only option filled green on slide 56. Two attempts: retry -> the chosen option red
   + ✗, the correct one not revealed, Retry gate on the same option; final wrong -> the correct
   option green + ✓, the chosen one red + ✗ (no answer toggle). The slide's hint is visible from the
   start and reusable until the question resolves. Feedback = slide 56's boxes as authored; the
   final-wrong title keeps its own second line "התשובה הנכונה מסומנת.". Correct and final-wrong share
   the authored explanation. Single answer: no "not fully correct" title. Leaving and returning never
   resets an unresolved question. */
const S4Q = { correctId: 'c', maxAttempts: 2 };
let s4Selected = null, s4Attempts = 0, s4Done = false, s4LastWrong = null, s4Outcome = null;
const NB4 = '\u00A0';
const S4_EXPLAIN = [
  '2' + NB4 + 'لتر <span class="nb">و2,000' + NB4 + 'مل</span> يمثّلان نفس الكمية، لكن بوحدات قياس مختلفة. <span class="nb">1' + NB4 + 'لتر = 1,000' + NB4 + 'مل.</span>'
];
const S4_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'الإجابة صحيحة.', body: S4_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة مُشار إليها.', body: S4_EXPLAIN }
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
    } else if (id === s4LastWrong && id === s4Selected) cls = 'wrong';
    else if (id === s4Selected) cls = 'selected';
    o.classList.toggle('selected', cls === 'selected');
    o.classList.toggle('correct', cls === 'correct');
    o.classList.toggle('wrong', cls === 'wrong');
    o.setAttribute('aria-checked', id === s4Selected ? 'true' : 'false');
    o.disabled = s4Done;
  });
  const btn = document.getElementById('s4-check');
  setNavLabel(btn, s4Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s4Done && (!s4Selected || s4Selected === s4LastWrong);   // Retry gate
  s4SyncHint();
}
function s4Select(id) {
  if (s4Done) return;
  dismissRetryPopup('s4-popup', s4Done);
  s4Selected = id;
  s4Render();
}
function s4Primary() {
  if (s4Done) { advanceScreen(); return; }
  s4Check();
}
function s4Check() {
  if (!s4Selected || s4Done || s4Selected === s4LastWrong) return;
  s4Attempts++;
  /* xAPI: choice — the chosen option's visible text (= answers[] in the catalogue). */
  xapiAnswered('004', 'q1', s4Selected === S4Q.correctId, s4Selected === S4Q.correctId || s4Attempts >= S4Q.maxAttempts, { choices: [xapiAnswerText(document.querySelector('#s4 .scq-opt[data-id="' + s4Selected + '"]'))] });
  if (s4Selected === S4Q.correctId) { s4Finish('correct'); return; }
  if (s4Attempts >= S4Q.maxAttempts) { s4Finish('wrong2'); return; }
  s4LastWrong = s4Selected;                 // chosen option red + ✗, correct not revealed
  s4Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s4ShowPopup('retry');
}
function s4Finish(outcome) {
  s4Done = true; s4Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  closeHintOverlay(document.getElementById('s4-hint-overlay'));
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
  popup.querySelector('.scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
/* Hint availability (producer 2026-10-07, content developer's rule): outside the basic practice the hint button appears only
   after the first wrong attempt - "hidden, not disabled" (visibility) - then stays until the question resolves. */
function s4SyncHint() {
  const h = document.getElementById('s4-hint');
  h.hidden = s4Done;
  h.style.visibility = (!s4Done && s4Attempts > 0) ? 'visible' : 'hidden';
}
function s4OpenHint() {
  if (!s4Done && s4Attempts > 0) {
    /* xAPI: requested.1 — after the gate, immediately before the reveal; this function only opens (the close path reports nothing). */
    xapiRequestedHint('004', 'q1');
    openHintOverlay('s4-hint-overlay', document.getElementById('s4-hint'));
  }
}
function s4CloseHint() { closeHintOverlay(document.getElementById('s4-hint-overlay')); }
function s4CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s4CloseHint(); }

/* ===================== S5 (index 5) — DragAndDropMatchingQuestion, units onto the picture (slide 57) =====================
   S1's interaction model on four zones over the picture: each zone holds one chip; dropping on a
   filled zone sends its chip back; dropping elsewhere returns it; placed chips stay draggable until
   checked; Check enables when all four zones are filled (no distractors). Two "ליטר" chips: either
   satisfies the tub or the bucket (note: both must be right). Two attempts (template default):
   retry -> the right zones get ✓ and lock (partial correction), the wrong ones ✕ until their
   content changes (per-answer verdict rule, producer 2026-10-07), Retry gate on the identical
   placement; final wrong -> the solution + the View My Answer Toggle (note). No hint (note).
   Feedback = slide 57's boxes as authored (the final box's second line lacks its full stop in the
   slide; added with the producer's approval, 2026-10-06); correct and final-wrong share the authored four-line explanation. The
   slide's titles are plain, so a PARTLY right answer gets "התשובה אינה נכונה במלואה." on the retry
   and on the final attempt, both views (_question-template-defaults "Wrong-answer title when the
   answer is partly right"), as S3. */
const S5Q = {
  accept: {
    's5-t-bottle': ['s5-d-mlcc'],
    's5-t-tub':    ['s5-d-l1', 's5-d-l2'],
    's5-t-bucket': ['s5-d-l1', 's5-d-l2'],
    's5-t-pool':   ['s5-d-m3']
  },
  reveal: { 's5-t-bottle': 's5-d-mlcc', 's5-t-tub': 's5-d-l1', 's5-t-bucket': 's5-d-l2', 's5-t-pool': 's5-d-m3' },
  maxAttempts: 2
};
const S5_LABEL = { 's5-d-mlcc': 'مل أو سم³', 's5-d-l1': 'لتر', 's5-d-l2': 'لتر', 's5-d-m3': 'م³' };
const S5_ZONE_NAME = { 's5-t-bottle': 'قنينة ماء', 's5-t-tub': 'حوض استحمام', 's5-t-bucket': 'دلو', 's5-t-pool': 'حوض سباحة' };
const S5_EXPLAIN = [
  'نختار وحدة القياس بحسب حجم الشيء.',
  'يُقاس حجم حوض السباحة بالمتر المكعب.',
  'نقيس حجم الدلو والحوض باللتر.',
  'نقيس حجم قنينة الماء الشخصية بالمليلتر أو بالسنتيمتر المكعب.'
];
const S5_PARTIAL_TITLE = 'الإجابة ليست صحيحة بالكامل.';
const S5_ANSWER_LINE = 'يمكنكم مشاهدة الحل الصحيح مرة أخرى.';
const S5_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: S5_PARTIAL_TITLE, body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'صحيح جدًا‎!', body: S5_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>الإجابات الصحيحة مُشار إليها.',
    body: S5_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>' + S5_ANSWER_LINE, action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  },
  wrong2Partial: {
    title: S5_PARTIAL_TITLE + '<br>الإجابات الصحيحة مُحدَّدة.',
    body: S5_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: S5_PARTIAL_TITLE + '<br>' + S5_ANSWER_LINE, action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
const s5Place = {};
Object.keys(S5_LABEL).forEach(d => { s5Place[d] = 'source'; });
let s5Attempts = 0, s5Done = false, s5Outcome = null, s5LastWrong = null;
let s5Marks = null;
const s5Kept = new Set();
const s5IsKept = t => s5Kept.has(t);
let s5Judged = null;      // { targetId: chipId } at a non-final wrong check: a wrong target's ✕ shows only while unchanged
function s5MarkOf(t) {
  if (!s5Marks) return null;
  const m = s5Marks[t] || null;
  if (s5Done || !s5Judged || m !== 'wrong') return m;
  return s5In(t) === s5Judged[t] ? m : null;          // the ✕ clears once the target's content changes
}
let s5Answer = null, s5View = 'solution';
let s5Pick = null, s5Dnd = null, s5SkipClick = false;
const s5Targets = () => Object.keys(S5Q.accept);
const s5In = t => Object.keys(s5Place).find(d => s5Place[d] === t) || null;
/* Retry-gate signature by UNIT LABEL per target, not chip id: the two ליטר chips are interchangeable, so swapping them is the
   same answer and must keep the check disabled (QA 2026-10-07). */
const s5Snap = () => JSON.stringify(Object.keys(S5Q.accept).map(t => S5_LABEL[s5In(t)] || ''));
const s5RetryIsPartial = () => s5Kept.size > 0;
const s5FinalIsPartial = () => !!s5Answer && Object.values(s5MarksFor(s5Answer)).some(v => v === 'correct');
function s5Announce(msg) { const l = document.getElementById('s5-live'); if (l) l.textContent = msg; }

function s5Render() {
  Object.keys(s5Place).forEach(d => {
    const chip = document.getElementById(d), placed = s5Place[d] !== 'source';
    chip.classList.toggle('is-placed', placed);
    chip.classList.remove('dragging');
    chip.classList.toggle('is-selected', s5Pick === d);
    chip.setAttribute('aria-pressed', s5Pick === d ? 'true' : 'false');
    chip.disabled = placed || s5Done;
  });
  s5Targets().forEach(t => {
    const zone = document.getElementById(t), d = s5In(t), mark = s5MarkOf(t);
    zone.innerHTML = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    const locked = s5Done || s5IsKept(t);
    zone.classList.toggle('locked', locked);
    if (mark) { const m = document.createElement('span'); m.className = 'ddqp-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'ddqp-placed';
      card.textContent = S5_LABEL[d];
      zone.appendChild(card);
      if (!locked && s5Dnd) s5Dnd.attachSource(card, d);
    }
    const verdict = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', S5_ZONE_NAME[t] + ': ' + (d ? S5_LABEL[d] : 'فارغة') + verdict);
    zone.tabIndex = locked ? -1 : 0;
    if (locked) zone.removeAttribute('role'); else zone.setAttribute('role', 'button');
  });
  s5UpdateCheck();
}
function s5UpdateCheck() {
  const btn = document.getElementById('s5-check');
  if (s5Done) { btn.disabled = false; return; }
  const full = s5Targets().every(t => !!s5In(t));
  btn.disabled = !full || s5Snap() === s5LastWrong;         // Retry gate
}
function s5StartEdit() { dismissRetryPopup('s5-popup', s5Done); }
function s5PlaceChip(d, t) {
  const evicted = s5In(t);
  if (evicted && evicted !== d) s5Place[evicted] = 'source';
  s5Place[d] = t;
  s5Pick = null;
  s5Render();
  s5Announce('تم وضع الوحدة ' + S5_LABEL[d] + ' على ' + S5_ZONE_NAME[t]);
}
function s5InitDnd() {
  if (s5Dnd) return;
  s5Dnd = createPointerDnd({
    canDrag: d => !s5Done && !s5IsKept(s5Place[d]),
    onPick: d => { s5StartEdit(); s5Pick = null; s5Place[d] = 'source'; s5Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s5SkipClick = true; if (s5IsKept(t)) { s5Render(); return; } s5PlaceChip(d, t); },
    onCancel: () => { s5SkipClick = true; s5Render(); },
    onTap: (d, src) => { s5SkipClick = true; if (src.classList.contains('ddqp-placed')) s5ZonePress(s5Place[d]); else s5ChipPress(d); }
  });
  Object.keys(s5Place).forEach(d => s5Dnd.attachSource(document.getElementById(d), d));
  s5Targets().forEach(t => {
    const zone = document.getElementById(t);
    s5Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s5SkipClick) { s5SkipClick = false; return; } s5ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s5ZonePress(t); } });
  });
  Object.keys(s5Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s5ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 5 && s5Pick) { s5Pick = null; s5Render(); } });
  document.addEventListener('pointerdown', () => { s5SkipClick = false; }, true);
}
function s5ChipPress(d) {
  if (s5Done || s5Place[d] !== 'source') return;
  s5StartEdit();
  s5Pick = (s5Pick === d) ? null : d;
  s5Render();
  if (s5Pick) s5Announce('تم اختيار الوحدة ' + S5_LABEL[d] + '. اختاروا مكانًا على الصورة لوضعها.');
}
function s5ZonePress(t) {
  if (s5Done || s5IsKept(t)) return;
  if (s5Pick) { s5StartEdit(); s5PlaceChip(s5Pick, t); return; }
  const d = s5In(t);
  if (!d) return;
  s5StartEdit();
  s5Place[d] = 'source'; s5Pick = d;
  s5Render();
  s5Announce('تم اختيار الوحدة ' + S5_LABEL[d] + '. اختاروا مكانًا على الصورة لوضعها.');
}
function s5MarksFor(placement) {
  const m = {};
  s5Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S5Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
function s5Primary() {
  if (s5Done) { advanceScreen(); return; }
  s5Check();
}
function s5Check() {
  if (s5Done || !s5Targets().every(t => !!s5In(t))) return;
  s5Pick = null;
  s5Attempts++;
  const marks = s5MarksFor(s5Place);
  const allCorrect = Object.values(marks).every(v => v === 'correct');
  /* xAPI: after the marks loop (allCorrect is final here). matching: one pair per zone — source = the unit chip's label, target = the zone name (both = the catalogue strings). */
  xapiAnswered('005', 'q1', allCorrect, allCorrect || s5Attempts >= S5Q.maxAttempts, { pairs: s5Targets().map(t => ({ source: S5_LABEL[s5In(t)], target: S5_ZONE_NAME[t] })) });
  if (allCorrect) {
    s5Marks = marks; s5Finish('correct');
  } else if (s5Attempts >= S5Q.maxAttempts) {
    s5Answer = Object.assign({}, s5Place);
    s5View = 'solution';
    s5Finish('wrong2');
  } else {
    s5LastWrong = s5Snap();
    s5Marks = {};                                          // retry: right zones ✓ (kept, locked), wrong ones ✕
    s5Targets().forEach(t => { if (marks[t] === 'correct') { s5Marks[t] = 'correct'; s5Kept.add(t); } else s5Marks[t] = 'wrong'; });
    s5Judged = {}; s5Targets().forEach(t => { s5Judged[t] = s5In(t); });
    s5Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s5ShowPopup('retry');
  }
}
function s5Finish(outcome) {
  s5Done = true; s5Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s5-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s5'));
  if (outcome === 'wrong2') { s5ApplyView(); return; }
  s5Render();
  s5ShowPopup(outcome);
}
function s5ApplyView() {
  if (s5Answer === null) return;
  Object.keys(s5Place).forEach(d => { s5Place[d] = 'source'; });
  if (s5View === 'answer') { Object.assign(s5Place, s5Answer); s5Marks = s5MarksFor(s5Answer); }
  else { Object.keys(S5Q.reveal).forEach(t => { s5Place[S5Q.reveal[t]] = t; }); s5Marks = s5MarksFor(s5Place); }
  s5Render();
  s5ShowPopup('wrong2', s5View);
}
function s5ToggleView() {
  if (s5Answer === null) return;
  s5View = (s5View === 'solution') ? 'answer' : 'solution';
  s5ApplyView();
}
function s5ShowPopup(type, view) {
  const key = type === 'retry' && s5RetryIsPartial() ? 'retryPartial'
            : type === 'wrong2' && s5FinalIsPartial() ? 'wrong2Partial' : type;
  const base = S5_FEEDBACK[key];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // answer view inherits the explanation body
  const popup = document.getElementById('s5-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s5-popup', cfg.action || null, s5ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s5Enter() {
  s5InitDnd();
  document.getElementById('s5-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s5'));
  if (s5Done) {
    if (s5Answer !== null) { s5View = 'solution'; Object.keys(s5Place).forEach(d => { s5Place[d] = 'source'; }); Object.keys(S5Q.reveal).forEach(t => { s5Place[S5Q.reveal[t]] = t; }); s5Marks = s5MarksFor(s5Place); }
    setNavLabel(document.getElementById('s5-check'), 'متابعة');
    s5Render();
    return;
  }
  s5Pick = null;                                           // unresolved: placement, attempts and kept ✓ zones survive
  setNavLabel(document.getElementById('s5-check'), 'هل إجابتي صحيحة؟');
  s5Render();
}

/* ===================== S6 (index 6) — categorisation drag-and-drop, two bins (slide 58) =====================
   S1's interaction model with bins that hold several cards: a card dropped on a bin joins it (in
   drop order); picking a placed card up takes it out; dropping elsewhere returns it to the tray;
   placed cards stay draggable until checked; Check enables when all six cards are in a bin. Two
   attempts: retry -> the right cards get ✓ and lock, the wrong ones stay where they are, marked ✕
   until moved (per-answer verdict rule, producer 2026-10-07), Retry gate
   on the identical placement; final wrong -> the solution (every card in its bin, ✓) + the View My
   Answer Toggle (note) showing the learner's placement with ✓ / ✗ per card. No hint (note).
   Feedback = slide 58's boxes as authored (retry title "התשובה אינה נכונה במלואה." as written, kept
   in both cases as S1; the final box is plain, so a PARTLY right final answer gets the "במלואה" first
   line, both views - _question-template-defaults "Wrong-answer title when the answer is partly
   right"). Correct and final-wrong share the authored two-paragraph explanation. */
const S6Q = {
  accept: {
    's6-b-dims':   ['s6-d-shoebox', 's6-d-rubik', 's6-d-die'],
    's6-b-vessel': ['s6-d-water', 's6-d-perfume', 's6-d-fuel']
  },
  maxAttempts: 2
};
const S6_LABEL = { 's6-d-shoebox': 'علبة أحذية', 's6-d-rubik': 'مكعب روبيك', 's6-d-water': 'ماء', 's6-d-perfume': 'عطر', 's6-d-fuel': 'بنزين', 's6-d-die': 'مكعب لعب' };
const S6_BIN_NAME = { 's6-b-dims': 'القياس وفق أبعاد الجسم', 's6-b-vessel': 'القياس بأداة قياس مدرَّجة' };
/* Slide 58 types "הם גופים גופים הנדסיים" (doubled word); corrected here with the producer's approval (2026-10-06). */
const S6_EXPLAIN = [
  'صندوق الأحذية، ومكعب روبيك، وحجر النرد هي أجسام هندسية تشبه شكلها الصندوق. لذلك، نحسب حجمها وفق: الطول × العرض × الارتفاع.',
  'الماء والعطر والبنزين كلها سوائل، لذلك نقيس حجمها بأدوات قياس مدرَّجة (مثل المخبار المدرَّج).'
];
const S6_PARTIAL_TITLE = 'الإجابة ليست صحيحة بالكامل.';
const S6_ANSWER_LINE = 'يمكنكم مشاهدة الحل الصحيح مرة أخرى.';
const S6_FEEDBACK = {
  retry:   { title: S6_PARTIAL_TITLE, body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'الإجابة صحيحة.', body: S6_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.',
    body: S6_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>' + S6_ANSWER_LINE, action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  },
  wrong2Partial: {
    title: S6_PARTIAL_TITLE + '<br>الإجابة الصحيحة معروضة.',
    body: S6_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: S6_PARTIAL_TITLE + '<br>' + S6_ANSWER_LINE, action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
const s6Place = {};                                   // cardId -> 'source' | binId
Object.keys(S6_LABEL).forEach(d => { s6Place[d] = 'source'; });
const s6Order = { 's6-b-dims': [], 's6-b-vessel': [] };  // cards per bin, in drop order
let s6Attempts = 0, s6Done = false, s6Outcome = null, s6LastWrong = null;
let s6Marks = null;                                   // null | { cardId: 'correct' | 'wrong' }
const s6Kept = new Set();                             // cards locked right after a non-final wrong attempt
let s6Judged = null;                                  // { cardId: binId } at a non-final wrong check: a wrong card's ✕ shows only while it stays put
function s6MarkOf(d) {
  if (!s6Marks) return null;
  const m = s6Marks[d] || null;
  if (s6Done || !s6Judged || m !== 'wrong') return m;
  return s6Place[d] === s6Judged[d] ? m : null;       // the ✕ clears once the card is moved
}
let s6Answer = null, s6View = 'solution';
let s6Pick = null, s6Dnd = null, s6SkipClick = false;
const s6Bins = () => Object.keys(S6Q.accept);
const s6Cards = () => Object.keys(S6_LABEL);
const s6Snap = () => JSON.stringify(s6Place);
function s6Announce(msg) { const l = document.getElementById('s6-live'); if (l) l.textContent = msg; }
function s6SetPlace(d, where) {
  const from = s6Place[d];
  if (from !== 'source') { const i = s6Order[from].indexOf(d); if (i >= 0) s6Order[from].splice(i, 1); }
  s6Place[d] = where;
  if (where !== 'source' && !s6Order[where].includes(d)) s6Order[where].push(d);
}
function s6MarksFor(placement) {
  const m = {};
  s6Cards().forEach(d => { const b = placement[d]; m[d] = (b !== 'source' && S6Q.accept[b].includes(d)) ? 'correct' : 'wrong'; });
  return m;
}
const s6RetryIsPartial = () => s6Kept.size > 0;
const s6FinalIsPartial = () => !!s6Answer && Object.values(s6MarksFor(s6Answer)).some(v => v === 'correct');

function s6CardNode(d, placed) {
  const src = document.getElementById(d);
  const el = document.createElement(placed ? 'span' : 'button');
  el.className = 'ddc-card' + (placed ? ' ddc-card--placed' : '');
  el.innerHTML = src.innerHTML;
  return el;
}
function s6Render() {
  s6Cards().forEach(d => {
    const card = document.getElementById(d), placed = s6Place[d] !== 'source';
    card.classList.toggle('is-placed', placed);
    card.classList.remove('dragging');
    card.classList.toggle('is-selected', s6Pick === d);
    card.setAttribute('aria-pressed', s6Pick === d ? 'true' : 'false');
    card.disabled = placed || s6Done;
  });
  s6Bins().forEach(b => {
    const bin = document.getElementById(b), box = bin.querySelector('.ddc-bin__cards');
    box.innerHTML = '';
    const cards = s6Order[b].filter(d => s6Place[d] === b);
    bin.dataset.count = String(cards.length);
    bin.classList.toggle('occupied', cards.length > 0);
    cards.forEach(d => {
      const mark = s6MarkOf(d);
      const locked = s6Done || s6Kept.has(d);
      const el = s6CardNode(d, true);
      el.classList.toggle('correct', mark === 'correct');
      el.classList.toggle('wrong', mark === 'wrong');
      el.classList.toggle('locked', locked);
      el.setAttribute('aria-label', S6_LABEL[d] + (mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : ''));
      if (mark) { const m = document.createElement('span'); m.className = 'ddc-card__mark'; m.setAttribute('aria-hidden', 'true'); el.appendChild(m); }
      if (!locked) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s6PlacedPress(d); } }); if (s6Dnd) s6Dnd.attachSource(el, d); }
      box.appendChild(el);
    });
    const list = cards.map(d => S6_LABEL[d]).join(', ');
    bin.setAttribute('aria-label', S6_BIN_NAME[b] + ': ' + (cards.length ? list : 'فارغة'));
    bin.tabIndex = s6Done ? -1 : 0;
    if (s6Done) bin.removeAttribute('role'); else bin.setAttribute('role', 'button');
  });
  s6UpdateCheck();
}
function s6UpdateCheck() {
  const btn = document.getElementById('s6-check');
  if (s6Done) { btn.disabled = partEnded; return; }   // resolved: on until the component ended (pass or fail — the verdict is reported, not gated)
  const full = s6Cards().every(d => s6Place[d] !== 'source');
  btn.disabled = !full || s6Snap() === s6LastWrong;         // Retry gate
}
function s6StartEdit() { dismissRetryPopup('s6-popup', s6Done); }
function s6PlaceCard(d, b) {
  s6SetPlace(d, b);
  s6Pick = null;
  s6Render();
  s6Announce(S6_LABEL[d] + ' تم وضعه في ' + S6_BIN_NAME[b]);
}
function s6InitDnd() {
  if (s6Dnd) return;
  s6Dnd = createPointerDnd({
    canDrag: d => !s6Done && !s6Kept.has(d),
    onPick: d => { s6StartEdit(); s6Pick = null; s6SetPlace(d, 'source'); s6Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, b) => { s6SkipClick = true; s6PlaceCard(d, b); },
    onCancel: () => { s6SkipClick = true; s6Render(); },
    onTap: (d, src) => { s6SkipClick = true; if (src.classList.contains('ddc-card--placed')) s6PlacedPress(d); else s6CardPress(d); }
  });
  s6Cards().forEach(d => s6Dnd.attachSource(document.getElementById(d), d));
  s6Bins().forEach(b => {
    const bin = document.getElementById(b);
    s6Dnd.attachTarget(bin, b);
    bin.addEventListener('click', e => { if (s6SkipClick) { s6SkipClick = false; return; } if (e.target.closest('.ddc-card--placed')) return; s6BinPress(b); });
    bin.addEventListener('keydown', e => { if (e.target !== bin) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s6BinPress(b); } });
  });
  s6Cards().forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s6CardPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 6 && s6Pick) { s6Pick = null; s6Render(); } });
  document.addEventListener('pointerdown', () => { s6SkipClick = false; }, true);
}
function s6CardPress(d) {
  if (s6Done || s6Place[d] !== 'source') return;
  s6StartEdit();
  s6Pick = (s6Pick === d) ? null : d;
  s6Render();
  if (s6Pick) s6Announce('تم اختيار ' + S6_LABEL[d] + '. اختاروا مجموعة لوضعه فيها.');
}
function s6PlacedPress(d) {
  if (s6Done || s6Kept.has(d)) return;
  s6StartEdit();
  s6SetPlace(d, 'source'); s6Pick = d;                  // pick the placed card up again
  s6Render();
  s6Announce('تم اختيار ' + S6_LABEL[d] + '. اختاروا مجموعة لوضعه فيها.');
}
function s6BinPress(b) {
  if (s6Done || !s6Pick) return;
  s6StartEdit();
  s6PlaceCard(s6Pick, b);
}
function s6Primary() {
  if (s6Done) { advanceScreen(); return; }
  s6Check();
}
function s6Check() {
  if (s6Done || !s6Cards().every(d => s6Place[d] !== 'source')) return;
  s6Pick = null;
  s6Attempts++;
  const marks = s6MarksFor(s6Place);
  const allCorrect = Object.values(marks).every(v => v === 'correct');
  /* xAPI: after the marks loop (allCorrect is final here). matching: one pair per card — source = the card's label, target = the bin's visible title (#s6-b-*-title carries the catalogue string with its parenthesis; S6_BIN_NAME is the short a11y name and does not). */
  xapiAnswered('006', 'q1', allCorrect, allCorrect || s6Attempts >= S6Q.maxAttempts, { pairs: s6Cards().map(d => ({ source: S6_LABEL[d], target: xapiAnswerText(document.getElementById(s6Place[d] + '-title')) })) });
  if (allCorrect) {
    s6Marks = marks; s6Finish('correct');
  } else if (s6Attempts >= S6Q.maxAttempts) {
    s6Answer = Object.assign({}, s6Place);
    s6View = 'solution';
    s6Finish('wrong2');
  } else {
    s6LastWrong = s6Snap();
    s6Marks = {};                                         // retry: right cards ✓ (kept, locked), wrong ones ✕
    s6Cards().forEach(d => { if (marks[d] === 'correct') { s6Marks[d] = 'correct'; s6Kept.add(d); } else s6Marks[d] = 'wrong'; });
    s6Judged = Object.assign({}, s6Place);
    s6Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s6ShowPopup('retry');
  }
}
function s6Finish(outcome) {
  s6Done = true; s6Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s6-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s6'));
  if (outcome === 'wrong2') { s6ApplyView(); return; }
  s6Render();
  s6ShowPopup(outcome);
}
function s6SetBoard(placement) {
  s6Cards().forEach(d => { s6Place[d] = 'source'; });
  s6Bins().forEach(b => { s6Order[b] = []; });
  s6Cards().forEach(d => { if (placement[d] !== 'source') s6SetPlace(d, placement[d]); });
}
function s6Solution() { const p = {}; s6Bins().forEach(b => S6Q.accept[b].forEach(d => { p[d] = b; })); return p; }
function s6ApplyView() {
  if (s6Answer === null) return;
  if (s6View === 'answer') { s6SetBoard(s6Answer); s6Marks = s6MarksFor(s6Answer); }
  else { s6SetBoard(s6Solution()); s6Marks = s6MarksFor(s6Place); }
  s6Render();
  s6ShowPopup('wrong2', s6View);
}
function s6ToggleView() {
  if (s6Answer === null) return;
  s6View = (s6View === 'solution') ? 'answer' : 'solution';
  s6ApplyView();
}
function s6ShowPopup(type, view) {
  const key = type === 'wrong2' && s6FinalIsPartial() ? 'wrong2Partial' : type;
  const base = S6_FEEDBACK[key];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // answer view inherits the explanation body
  const popup = document.getElementById('s6-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s6-popup', cfg.action || null, s6ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s6Enter() {
  s6InitDnd();
  document.getElementById('s6-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s6'));
  if (s6Done) {
    if (s6Answer !== null) { s6View = 'solution'; s6SetBoard(s6Solution()); s6Marks = s6MarksFor(s6Place); }
    setNavLabel(document.getElementById('s6-check'), 'متابعة');
    s6Render();
    return;
  }
  s6Pick = null;                                           // unresolved: placement, attempts and kept ✓ cards survive
  setNavLabel(document.getElementById('s6-check'), 'هل إجابتي صحيحة؟');
  s6Render();
}

/* ===================== Boot ===================== */
window.addEventListener('DOMContentLoaded', () => {
  scaleApp();
  initNavLabels();
  resetScreenState(0);
  Motion.reveal(document.querySelector('.screen.active'));   // animation-system initial-load hook
  /* Back from part 03 lands on this part's last screen (route-stack #last link); deferred
     so every screen's top-level state exists first (_global-components, Back navigation). */
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
   from metadata/methodica-ar-science-mass-liquid-02-02.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: null,                     // standard-practice intro
  1: ['001', 1],               // fill the paragraph from the word bank
  2: ['002', 1],               // the syrup bottle (single choice)
  3: ['003', 1],               // litre ↔ ml conversion (two dropdowns — performance)
  4: ['004', 1],               // speech bubbles (single choice)
  5: ['005', 1],               // unit ↔ object matching
  6: ['006', 1]                // two-bin categorisation
};

var XAPI_COMP_SLUG = 'methodica-ar-science-mass-liquid-02-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1, '005': 1, '006': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-mass-liquid-02-02.json';
var XAPI_END_BTN = 's6-check';   /* the part's last button (D-8, restoreEndedButton) */

/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* The intro promises 6 questions and 'צריך לענות נכון על 4 שאלות לפחות' — gate and denominator coincide. */
  const ok = practiceProgress.questions.filter(q => progressItemResult(q) === 'correct').length;
  return { success: practicePassed(practiceProgress), score: { scaled: ok / practiceProgress.questions.length } };
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
   Every question in this part already paints itself from its state variables (sNRender, plus the done
   branch of sNEnter for the resolved-wrong board), so the painters are thin: refill the variables, call
   the pure renderer. Per screen the payload carries the selection (place map / sel map / selected id),
   attempts, done, outcome, the Retry-gate signature (lw), the retry marks and the judged snapshot, the
   final-wrong answer with its toggle view, and the kept / wrong Sets as arrays (insertion order kept, so
   a capture → restore → capture round trip is byte-identical). Deliberately NOT captured, all transient:
   the DnD controllers (sNDnd), a pending keyboard pick (sNPick), the trailing-click flag (sNSkipClick),
   the open dropdown list (s3OpenSlot), hint / Recall overlays and the popups' dragged positions. The
   popup of a resolved question is reopened by reopenFeedbackIfResolved on the initial restore only. */
const RS_OUTCOMES = ['correct', 'wrong2'];
const rsStr = v => (typeof v === 'string' ? v : null);
const rsCopy = o => ((o && typeof o === 'object') ? JSON.parse(JSON.stringify(o)) : null);
/* done without an outcome (a document with done forced, or an older one) reads as resolved-correct */
const rsOutcome = (v, done) => (RS_OUTCOMES.includes(v) ? v : (done ? 'correct' : null));
const rsView = v => (v === 'answer' ? 'answer' : 'solution');
const rsScq = (selected, attempts, done, outcome, lw) => ({ selected: selected, attempts: attempts, done: done, outcome: outcome, lw: lw });
/* A placement map over exactly `ids`, each value 'source' or one of `targets`; null when `src` is not a map. */
function rsPlaceMap(src, ids, targets) {
  if (!src || typeof src !== 'object') return null;
  const m = {};
  ids.forEach(d => { m[d] = (src[d] === 'source' || targets.includes(src[d])) ? src[d] : 'source'; });
  return m;
}
/* The keys of `keys` present in `src` whose value passes `valid`; null when `src` is not a map. */
function rsMapOf(src, keys, valid) {
  if (!src || typeof src !== 'object') return null;
  const m = {};
  keys.forEach(k => { if (k in src && valid(src[k])) m[k] = src[k]; });
  return m;
}
const rsIsMark = v => v === 'correct' || v === 'wrong';
const rsIsStrOrNull = v => v === null || typeof v === 'string';
/* The per-slot answer of a dropdown question: { slot: { value, correct } } for every slot, else null. */
function rsSlotAnswer(src, slots) {
  if (!src || typeof src !== 'object' || !slots.every(n => src[n] && typeof src[n] === 'object')) return null;
  const a = {};
  slots.forEach(n => { a[n] = { value: rsStr(src[n].value), correct: !!src[n].correct }; });
  return a;
}
/* Refill a const map in place — the DnD helpers and the renderers close over the object itself. */
function rsFillMap(target, src) {
  Object.keys(target).forEach(k => { delete target[k]; });
  Object.keys(src).forEach(k => { target[k] = src[k]; });
}
function rsFillSet(set, arr, valid) {
  set.clear();
  if (Array.isArray(arr)) arr.forEach(x => { if (valid(x)) set.add(x); });
}

/* ── 1. capture ── */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: (typeof XAPI_Q_RESULTS === 'object' && XAPI_Q_RESULTS) ? Object.assign({}, XAPI_Q_RESULTS) : {},
    screens: {
      s1: { place: Object.assign({}, s1Place), attempts: s1Attempts, done: s1Done, outcome: s1Outcome, lw: s1LastWrong,
            marks: rsCopy(s1Marks), judged: rsCopy(s1Judged), answer: rsCopy(s1Answer), view: s1View, kept: [...s1Kept] },
      s2: rsScq(s2Selected, s2Attempts, s2Done, s2Outcome, s2LastWrong),
      s3: { sel: Object.assign({}, s3Sel), attempts: s3Attempts, done: s3Done, outcome: s3Outcome, lw: s3LastWrong,
            answer: rsCopy(s3Answer), view: s3View, kept: [...s3Kept], wrong: [...s3Wrong] },
      s4: rsScq(s4Selected, s4Attempts, s4Done, s4Outcome, s4LastWrong),
      s5: { place: Object.assign({}, s5Place), attempts: s5Attempts, done: s5Done, outcome: s5Outcome, lw: s5LastWrong,
            marks: rsCopy(s5Marks), judged: rsCopy(s5Judged), answer: rsCopy(s5Answer), view: s5View, kept: [...s5Kept] },
      s6: { place: Object.assign({}, s6Place), order: rsCopy(s6Order), attempts: s6Attempts, done: s6Done, outcome: s6Outcome, lw: s6LastWrong,
            marks: rsCopy(s6Marks), judged: rsCopy(s6Judged), answer: rsCopy(s6Answer), view: s6View, kept: [...s6Kept] }
    }
  };
}

/* ── 2. variables only (never the DOM). Safe with a partial payload: any key may be missing. ── */
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults && typeof st.qResults === 'object' && typeof XAPI_Q_RESULTS === 'object' && XAPI_Q_RESULTS) {
    Object.keys(st.qResults).forEach(k => { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  }
  const sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  let v, m;
  if ((v = sc.s1) && typeof v === 'object') {
    const ids = Object.keys(S1_LABEL), targets = s1Targets();
    if ((m = rsPlaceMap(v.place, ids, targets))) rsFillMap(s1Place, m);
    s1Attempts = v.attempts | 0; s1Done = !!v.done; s1Outcome = rsOutcome(v.outcome, s1Done); s1LastWrong = rsStr(v.lw);
    s1Marks = rsMapOf(v.marks, targets, rsIsMark); s1Judged = rsMapOf(v.judged, targets, rsIsStrOrNull);
    s1Answer = rsPlaceMap(v.answer, ids, targets); s1View = rsView(v.view);
    rsFillSet(s1Kept, v.kept, t => targets.includes(t));
    if (s1Attempts > 0 && !s1Done && s1LastWrong === null) s1LastWrong = s1Snap();   /* older document: rule 9 fallback */
  }
  if ((v = sc.s2) && typeof v === 'object') {
    s2Selected = rsStr(v.selected); s2Attempts = v.attempts | 0; s2Done = !!v.done; s2Outcome = rsOutcome(v.outcome, s2Done); s2LastWrong = rsStr(v.lw);
  }
  if ((v = sc.s3) && typeof v === 'object') {
    if (v.sel && typeof v.sel === 'object') S3_SLOTS.forEach(n => { s3Sel[n] = rsStr(v.sel[n]); });
    s3Attempts = v.attempts | 0; s3Done = !!v.done; s3Outcome = rsOutcome(v.outcome, s3Done); s3LastWrong = rsStr(v.lw);
    s3Answer = rsSlotAnswer(v.answer, S3_SLOTS); s3View = rsView(v.view);
    rsFillSet(s3Kept, v.kept, n => S3_SLOTS.includes(n)); rsFillSet(s3Wrong, v.wrong, n => S3_SLOTS.includes(n));
    /* a resolved-wrong blank renders from s3Answer: a document without it falls back to the selection */
    if (s3Done && s3Outcome === 'wrong2' && s3Answer === null) { s3Answer = {}; S3_SLOTS.forEach(n => { s3Answer[n] = { value: s3Sel[n], correct: s3Sel[n] === S3Q.correct[n] }; }); }
    if (s3Attempts > 0 && !s3Done && s3LastWrong === null) s3LastWrong = s3Snap();
  }
  if ((v = sc.s4) && typeof v === 'object') {
    s4Selected = rsStr(v.selected); s4Attempts = v.attempts | 0; s4Done = !!v.done; s4Outcome = rsOutcome(v.outcome, s4Done); s4LastWrong = rsStr(v.lw);
  }
  if ((v = sc.s5) && typeof v === 'object') {
    const ids = Object.keys(S5_LABEL), targets = s5Targets();
    if ((m = rsPlaceMap(v.place, ids, targets))) rsFillMap(s5Place, m);
    s5Attempts = v.attempts | 0; s5Done = !!v.done; s5Outcome = rsOutcome(v.outcome, s5Done); s5LastWrong = rsStr(v.lw);
    s5Marks = rsMapOf(v.marks, targets, rsIsMark); s5Judged = rsMapOf(v.judged, targets, rsIsStrOrNull);
    s5Answer = rsPlaceMap(v.answer, ids, targets); s5View = rsView(v.view);
    rsFillSet(s5Kept, v.kept, t => targets.includes(t));
    if (s5Attempts > 0 && !s5Done && s5LastWrong === null) s5LastWrong = s5Snap();
  }
  if ((v = sc.s6) && typeof v === 'object') {
    const cards = s6Cards(), bins = s6Bins();
    if ((m = rsPlaceMap(v.place, cards, bins))) {
      rsFillMap(s6Place, m);
      /* drop order per bin: the saved order filtered to the cards the map puts there, then any the order lost */
      bins.forEach(b => {
        const src = (v.order && typeof v.order === 'object' && Array.isArray(v.order[b])) ? v.order[b] : [];
        const arr = src.filter((d, i) => s6Place[d] === b && src.indexOf(d) === i);
        cards.forEach(d => { if (s6Place[d] === b && !arr.includes(d)) arr.push(d); });
        s6Order[b].splice(0, s6Order[b].length, ...arr);
      });
    }
    s6Attempts = v.attempts | 0; s6Done = !!v.done; s6Outcome = rsOutcome(v.outcome, s6Done); s6LastWrong = rsStr(v.lw);
    s6Marks = rsMapOf(v.marks, cards, rsIsMark); s6Judged = rsMapOf(v.judged, cards, rsIsStrOrNull);
    s6Answer = rsPlaceMap(v.answer, cards, bins); s6View = rsView(v.view);
    rsFillSet(s6Kept, v.kept, d => cards.includes(d));
    if (s6Attempts > 0 && !s6Done && s6LastWrong === null) s6LastWrong = s6Snap();
  }
}

/* ── 3. what lives only in the DOM — nothing in this part: the word-bank chips and the placed cards are
   rebuilt by s1Render / s5Render / s6Render from the place maps, the dropdown triggers take their text from
   s3Render (s3Shown), the options' classes from s2Render / s4Render. Kept as the shared layer's contract. ── */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
}

/* ── 4. painter dispatch, keyed by data-screen. Pure and idempotent: the renders re-derive the check /
   Continue button (sNUpdateCheck, partEnded), the Progress Question nav and the bar label; never a reset.
   Runs from applyExecutionState (initial restore, _restoring) and from repaintScreen on every goTo. ── */
function restoreScreenUI(n) {
  switch (n) {
    case 1: s1InitDnd(); setNavLabel(document.getElementById('s1-check'), s1Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); syncPracticeProgressNav(document.getElementById('s1')); s1Render(); break;
    case 2: syncPracticeProgressNav(document.getElementById('s2')); s2Render(); break;
    case 3: setNavLabel(document.getElementById('s3-check'), s3Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); syncPracticeProgressNav(document.getElementById('s3')); s3Render(); break;
    case 4: syncPracticeProgressNav(document.getElementById('s4')); s4Render(); break;
    case 5: s5InitDnd(); setNavLabel(document.getElementById('s5-check'), s5Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); syncPracticeProgressNav(document.getElementById('s5')); s5Render(); break;
    case 6: s6InitDnd(); setNavLabel(document.getElementById('s6-check'), s6Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); syncPracticeProgressNav(document.getElementById('s6')); s6Render(); break;
    default: break;   /* 0 — the intro (TransitionScreen): no state */
  }
  /* the resolved question's feedback (final-wrong: on its toggle view) re-shows on the initial restore only */
  if (typeof _restoring !== 'undefined' && _restoring) { try { reopenFeedbackIfResolved(n); } catch (e) {} }
}