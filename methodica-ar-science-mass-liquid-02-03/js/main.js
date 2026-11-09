/* methodica-ar-science-mass-liquid-02-03 — js/main.js
   Engine + per-screen logic. Part 03 = component 03 of the script
   (slides 60-66): the basic-practice intro (S0) and its 3 questions (2-of-3
   gate), then the advanced-practice intro (the deck's "סטנדרטי ב'") and its
   2 questions — no score gate (720: advanced practice has no threshold;
   producer 2026-10-06). Built: S0, S1-S3, S4, S5-S6; S6 hands off to part 04. */
'use strict';

const TOTAL_SCREENS = 7;   // S0-S6 = slides 60-66
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
/* Forward to the next part (part 04), recording this part on the route stack so part
   04's Back returns here (its last screen, via #last). */
const PART_ID = 'methodica-ar-science-mass-liquid-02-03';
const NEXT_PART_ID = 'methodica-ar-science-mass-liquid-02-04';
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
/* Viewport-filling canvas (same model as parts 01-02): scale so the 1280x710
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
   S0 / S4 are ungated (TransitionScreens). S3 is the last question of the basic practice:
   besides being resolved, its advance is the practice's 2-of-3 score gate
   (practiceProgress.passThreshold). Below the threshold the learner does not progress
   further inside the lomda — the platform remediates (producer 2026-10-06; 720
   basic-practice convention). S6 closes the advanced practice, which has NO score gate
   (720: every learner completes it and continues; producer 2026-10-06) — once resolved
   it hands off to part 04. The gates live here, so the button and the ← key agree. */
const SCREEN_GATES = {
  1: () => s1Done,
  2: () => s2Done,
  3: () => s3Done,   /* resolved; below the 2-of-3 verdict advanceScreen() ENDS the component instead of moving on */
  5: () => s5Done,
  6: () => s6Done
};
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part
  /* S3 closes the basic practice: below its 2-of-3 threshold the learner does not go on to the advanced
     practice — the component ENDS here with completed success:false and the platform remediates
     (recommendedAfterFail → component 02; guide §6.4, decision 2026-10-22). */
  if (currentScreen === 3 && !basicPracticePassed()) { partFinish(document.getElementById('s3-check')); return; }
  goTo(currentScreen + 1);
}

/* Back onto a resolved question reopens its feedback (final-wrong: on the
   solution view) — _global-components "Reopening feedback on return". */
function reopenFeedbackIfResolved(n) {
  if (n === 1 && s1Done) { if (s1Outcome === 'wrong2') s1ApplyView(); else s1ShowPopup(s1Outcome); }
  if (n === 2 && s2Done) s2ShowPopup(s2Outcome);
  if (n === 3 && s3Done) { if (s3Answer !== null) s3ApplyView(); else s3ShowPopup(s3Outcome); }
  if (n === 5 && s5Done) { if (s5Outcome === 'wrong2') s5ApplyView(); else s5ShowPopup(s5Outcome); }
  if (n === 6 && s6Done) s6ShowPopup(s6Outcome);
}

/* ← / → move between screens — except inside a dropdown or a text field, where the
   arrow keys belong to the list (its own key handlers) or move the caret. */
document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('.dq-dropdown-wrap, input, textarea')) return;
  if (!document.getElementById('recall-overlay').classList.contains('hidden')) return;   // the open Recall popup owns the keys
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ===================== Practice set (basic practice, slide 60) =====================
   The intro's own copy: "3 שאלות", "ענו נכון על 2 שאלות ומעלה כדי להתקדם."
   Shape follows part 02's practiceProgress (720-templates _global-components
   "Progress Question"): one item per question; `screens` lists the data-screen
   indices the question spans (empty = not built yet, never clickable).
   passThreshold = ceil(2N/3) (_question-template-defaults "Pass threshold
   formula") = 2 for N = 3, matching the authored copy. Hints are per question
   (each slide's own note decides; slide 61: "ללא כפתור רמז"), so nothing
   hint-related is set here. Item state is derived from the screens' own
   recorded results on every sync — never stored. */
const practiceProgress = {
  questions: [
    { number: 1, screens: [1] },
    { number: 2, screens: [2] },
    { number: 3, screens: [3] }
  ]
};
practiceProgress.passThreshold = Math.ceil(2 * practiceProgress.questions.length / 3);
/* Advanced practice (slides 65-66, the deck's "סטנדרטי ב'"): 2 harder questions with their
   own Progress Question nav (its screens carry data-practice="b"). No pass threshold and no
   score gate — 720: advanced practice is completed by every learner, who then continues to
   the peak question (producer 2026-10-06; replaces an earlier 2-of-2 gate derived from
   ceil(2N/3), which applies only where the script states a "K of N" condition). */
const advancedProgress = {
  questions: [
    { number: 1, screens: [5] },
    { number: 2, screens: [6] }
  ]
};
/* Each question screen's own result: null while unresolved, else 'correct' | 'incorrect'. */
const SCREEN_RESULT = {
  1: () => s1Done ? (s1Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => s3Done ? (s3Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  5: () => s5Done ? (s5Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  6: () => s6Done ? (s6Outcome === 'correct' ? 'correct' : 'incorrect') : null
};
/* The basic practice's score: questions scored correct (a question with lettered sub-parts
   counts only when all of them are right) against passThreshold. One count feeds the S3 gate,
   success and score.scaled (2026-11-09, 08.11 sheet fixes 1, 2 — xapiPartResult below). */
function practiceCorrect(set) {
  return set.questions.filter(q => progressItemResult(q) === 'correct').length;
}
const basicPracticeCorrect = () => practiceCorrect(practiceProgress);
const basicPracticePassed = () => basicPracticeCorrect() >= practiceProgress.passThreshold;
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
  if (nav) updateProgressQuestion(nav, sectionEl.dataset.practice === 'b' ? advancedProgress : practiceProgress);
}

/* ===================== Shared: draggable feedback popup (as part 02) ===================== */
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
/* Slide 60: the "light workout" clips (presenter note "הגיף שנבחר מרימה
   משקולות קלות"; verified visually: character-1 = the grey companion,
   character-2 = the turquoise one — the same two as part 01's selection
   clips — both curling small dumbbells; 1280x720, 4.00s, pure #fff ground
   (producer re-export 2026-10-06), final frame = a full pose close to the
   opening one, so no freezeAt). No scale fit (frame-0 ink heights 648 /
   667px, 2.9%, within the ~3% band). shiftY seats each clip's ground line on
   the bar line: the feet hold still, lowest ink (sole + soft shadow) at box
   y 338.5 of 360 in both clips, so 21. */
const S0_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-light-workout.mp4', fit: { scale: 1, shiftY: 21 } },
  'character-2': { video: 'assets/video/character-2-light-workout.mp4', fit: { scale: 1, shiftY: 21 } }
};
/* Slide 64: the regular-weights "workout" pair (note: "כמו בתרגול סטנדרטי א'"). Started as
   copies of part 02 S0's files; re-exported by the producer with a pure #fff ground
   (2026-10-06, same names). Measured: 1280x720, 4.00s, meaningful final frame (no freezeAt);
   no scale fit (frame-0 ink 652 / 664px, 1.8%); lowest ink at box y 336.5 / 338.5 of 360, so
   shiftY 23 / 21 seats both on the bar line (359.5). Bubble tail (x 99) clears the dumbbells
   by 14 / 11px over the bubble's rows in every frame. */
const S4_CHARACTER = {
  'character-1': { video: '../unit-assets/video/character-1-workout.mp4', fit: { scale: 1, shiftY: 23 } },
  'character-2': { video: 'assets/video/character-2-workout.mp4', fit: { scale: 1, shiftY: 21 } }
};
function s4Enter() { applyCompanionCharacter(S4_CHARACTER, 's4-char-video'); }
function s0Enter() {
  applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  syncS0Back();
}

/* ===================== S1 (index 1) — DropdownQuestion, single dropdown (slide 61) =====================
   720-templates DropdownQuestion, single-dropdown variant, with part 02 S3's component
   build (same Figma set). One blank; correct: 1. Two attempts (template default; slide 61
   authors the retry box "שננסה שוב?"). Interaction: a click outside or Escape closes the
   list; picking a value fills the trigger; "צדקתי?" enables once a value is picked and
   (Retry gate) it differs from the one just marked wrong. Non-final wrong: retry popup, the
   blank shows ✕ (per-answer verdict rule, producer 2026-10-06) until the learner opens or
   changes it, and stays open. Final wrong: the blank shows 1 at once (green ✓) and the
   View My Answer Toggle swaps it with the learner's own pick (red ✗). No hint (note).
   Keyboard: Enter / Space / ArrowDown opens, Arrow keys / Home / End move, Enter or Space
   picks, Escape closes and returns to the trigger. */
const S1Q = { correct: { 1: '1' }, maxAttempts: 2 };
const S1_SLOTS = [1];
/* Slide 61's boxes, verbatim. Correct and final-wrong carry the same authored explanation
   (two paragraphs, an empty paragraph, three paragraphs; "1 מ״ל = 1 סמ״ק." is a bold run).
   Number + unit joined by a no-break space (_question-template-defaults). The final-wrong
   box authors only its first title line; the second is the canonical "התשובה הנכונה
   מוצגת." (the reveal replaces the learner's value in the blank). Line break after the
   first comma: producer decision 2026-10-06 (a <br>, same paragraph — no added gap). */
const S1_EXPLAIN = [
  'مل وسم³ هما وحدتا حجم مختلفتان،<br>لكنهما متساويتان:',
  '<strong>1 مل = 1 سم³.</strong>',
  '',
  'لذلك، يمكن للمصنّعين أن يكتبوا على القنينة',
  '"500 مل" أو "500 سم³".',
  'كلا الشكلين صحيحان.'
];
const S1_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S1_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.',
    body: S1_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
/* Verdict icons = the Dropdown Menu component's own vectors (as part 02). */
const DQ_CHECK_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const DQ_WRONG_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';
const DQ_PROMPT = 'اختاروا إجابة';
const s1Sel = { 1: null };
let s1Attempts = 0, s1Done = false, s1Outcome = null, s1LastWrong = null;
const s1Wrong = new Set();    // the slot marked ✕ after a non-final wrong attempt, until the learner opens or changes it
let s1Answer = null, s1View = 'solution';
let s1OpenSlot = null;
const s1Snap = () => JSON.stringify(s1Sel);
function s1Announce(msg) { const l = document.getElementById('s1-live'); if (l) l.textContent = msg; }
const s1WordsOf = n => document.getElementById('s1-w' + n).textContent;
/* Value shown in the blank, and its verdict, derived from the recorded state (single owner). */
function s1Shown(n) {
  if (s1Done && s1Outcome === 'wrong2') return s1View === 'answer' ? s1Answer[n].value : S1Q.correct[n];
  return s1Sel[n];
}
function s1MarkOf(n) {
  if (!s1Done) return s1Wrong.has(n) ? 'wrong' : null;
  if (s1Outcome === 'wrong2' && s1View === 'answer') return s1Answer[n].correct ? 'correct' : 'wrong';
  return 'correct';
}
const s1Locked = () => s1Done;
function s1Render() {
  S1_SLOTS.forEach(n => {
    const btn = document.getElementById('s1-btn-' + n), sel = document.getElementById('s1-sel-' + n);
    const mark = s1MarkOf(n), open = s1OpenSlot === n, val = s1Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s1Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? DQ_CHECK_SVG : DQ_WRONG_SVG);
    sel.textContent = val || DQ_PROMPT;   // empty trigger always carries the prompt (producer 2026-10-07)
    sel.classList.toggle('is-prompt', !val);
    document.getElementById('s1-verdict-' + n).textContent = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    document.getElementById('s1-wrap-' + n).classList.toggle('is-open', open);
    const list = document.getElementById('s1-list-' + n);
    list.classList.toggle('hidden', !open);
    list.querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', o.dataset.value === val ? 'true' : 'false'));
  });
  s1UpdateCheck();
}
function s1UpdateCheck() {
  const btn = document.getElementById('s1-check');
  if (s1Done) { btn.disabled = false; return; }
  btn.disabled = !S1_SLOTS.every(n => s1Sel[n]) || s1Snap() === s1LastWrong;   // Retry gate
}
function s1CloseList(focusTrigger) {
  const n = s1OpenSlot;
  s1OpenSlot = null;
  s1Render();
  if (focusTrigger && n) document.getElementById('s1-btn-' + n).focus();
}
function s1Toggle(n) {
  if (s1Locked(n)) return;
  dismissRetryPopup('s1-popup', s1Done);        // opening the list is a corrective action
  s1Wrong.delete(n);                            // ...and clears the slot's ✕
  s1OpenSlot = (s1OpenSlot === n) ? null : n;
  s1Render();
}
function s1Select(n, value) {
  if (s1Locked(n)) return;
  dismissRetryPopup('s1-popup', s1Done);
  s1Wrong.delete(n);
  s1Sel[n] = value;
  s1OpenSlot = null;
  s1Render();
  document.getElementById('s1-btn-' + n).focus();
  s1Announce(s1WordsOf(n) + ' ' + value);
}
function s1FocusOption(n, i, exact) {
  const opts = [...document.querySelectorAll('#s1-list-' + n + ' .dq-option')];
  const o = exact ? opts[i] : opts[(i + opts.length) % opts.length];
  if (o) o.focus();
}
function s1BtnKey(e, n) {
  if (s1Locked(n)) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (s1OpenSlot !== n) { dismissRetryPopup('s1-popup', s1Done); s1Wrong.delete(n); s1OpenSlot = n; s1Render(); }
    const opts = [...document.querySelectorAll('#s1-list-' + n + ' .dq-option')];
    const cur = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
    s1FocusOption(n, cur >= 0 ? cur : 0, true);
  } else if (e.key === 'Escape' && s1OpenSlot === n) { e.preventDefault(); s1CloseList(true); }
}
function s1OptKey(e, n) {
  const opts = [...document.querySelectorAll('#s1-list-' + n + ' .dq-option')];
  const i = opts.indexOf(e.currentTarget);
  if (e.key === 'ArrowDown') { e.preventDefault(); s1FocusOption(n, i + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); s1FocusOption(n, i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); s1FocusOption(n, 0, true); }
  else if (e.key === 'End') { e.preventDefault(); s1FocusOption(n, opts.length - 1, true); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s1Select(n, e.currentTarget.dataset.value); }
  else if (e.key === 'Escape') { e.preventDefault(); s1CloseList(true); }
  else if (e.key === 'Tab') { s1CloseList(false); }
}
/* One document-level listener: a click outside the dropdown closes the open list. */
document.addEventListener('click', (e) => {
  if (s1OpenSlot !== null && !e.target.closest('.dq-dropdown-wrap')) s1CloseList(false);
});
function s1Primary() {
  if (s1Done) { advanceScreen(); return; }
  s1Check();
}
function s1Check() {
  if (s1Done || !S1_SLOTS.every(n => s1Sel[n]) || s1Snap() === s1LastWrong) return;
  s1OpenSlot = null;
  s1Attempts++;
  const right = {};
  S1_SLOTS.forEach(n => { right[n] = s1Sel[n] === S1Q.correct[n]; });
  /* xAPI: the catalogue types the single dropdown as choice — the chosen option's visible text (data-value = the option text). */
  xapiAnswered('001', 'q1', right[1], right[1] || s1Attempts >= S1Q.maxAttempts, { choices: [s1Sel[1]] });
  if (S1_SLOTS.every(n => right[n])) { s1Finish('correct'); return; }
  if (s1Attempts >= S1Q.maxAttempts) {
    s1Answer = {};
    S1_SLOTS.forEach(n => { s1Answer[n] = { value: s1Sel[n], correct: right[n] }; });   // before the reveal overwrites the blank
    s1View = 'solution';
    s1Finish('wrong2');
    return;
  }
  S1_SLOTS.forEach(n => { if (!right[n]) s1Wrong.add(n); });   // retry: the wrong pick shows ✕ (per-answer verdict rule)
  s1LastWrong = s1Snap();
  s1Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}   /* resume: synchronous save after the last commitment (guide §8.3, D-13) */
  s1ShowPopup('retry');
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
/* View My Answer Toggle - the single owner of the resolved-wrong blank + popup. */
function s1ApplyView() {
  if (s1Answer === null) return;
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
  const bodyHtml = popupBodyHtml(cfg.body);
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
  document.getElementById('s1-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s1'));
  s1OpenSlot = null;
  if (s1Done) {                                 // resolved: locked; a final-wrong question comes back on the solution view
    if (s1Answer !== null) s1View = 'solution';
    setNavLabel(document.getElementById('s1-check'), 'متابعة');
  } else {
    setNavLabel(document.getElementById('s1-check'), 'هل إجابتي صحيحة؟');   // unresolved: selection and attempts are kept
  }
  s1Render();
}

/* Escape closes whichever hint is open (Hint policy -> Closing). */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const hint = document.querySelector('[id$="-hint-overlay"]:not(.hidden)');
  if (hint) closeHintOverlay(hint);
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
   720-templates _global-components "RecallPopup", ported from parts 01 / 02. The trigger is S3's .scq-hint.recall-btn in the question
   content - always available, independent of the bar Hint (own overlay, own trigger, own state). Closes on the X, the backdrop and
   Escape; goTo() closes it through closeRecallPopup(). Modal: Tab stays on the close button; focus returns to the trigger on close. */
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
  if (!ov || ov.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeRecallPopup();
  else if (e.key === 'Tab') { e.preventDefault(); const x = ov.querySelector('.recall-popup-close'); if (x) x.focus(); }
});
/* ===================== S2 (index 2) — SingleChoiceQuestionImage (slide 62) =====================
   720-templates SingleChoiceQuestion (+ SingleChoiceQuestionImage), as part 02 S2. Correct:
   option 3 (c) "כ-0.5 ליטר", the only option filled green on slide 62. Two attempts
   (template default; slide 62 authors the retry box): retry -> the chosen option red + ✗, the
   correct one not revealed, Retry gate on the same option; final wrong -> the correct option
   green + ✓ and the chosen one red + ✗ (no answer toggle in this template). Hint (slide 62's
   hint box) is visible from the start and reusable until the question resolves. Feedback =
   slide 62's boxes as authored: correct and final-wrong share the explanation (four
   paragraphs); the final-wrong box authors only its first title line, so the canonical
   second line "התשובה הנכונה מוצגת." follows it (as part 01's single-choice screens).
   Number + unit joined by a no-break space. Leaving and returning never resets an
   unresolved question. Line breaks at a natural comma / colon where the 378px popup
   wrap orphaned a word or split a phrase (producer rule 2026-10-06; paragraph 3 fits
   on one line and keeps none). */
const S2Q = { correctId: 'c', maxAttempts: 2 };
let s2Selected = null, s2Attempts = 0, s2Done = false, s2LastWrong = null, s2Outcome = null;
const S2_EXPLAIN = [
  '0.5 لتر يساوي 500 مل،<br>وهذا هو الحجم الشائع لقنينة المياه الشخصية.',
  'الخيارات الأخرى تصف أحجامًا مختلفة:<br>5 سم³ تساوي 5 مل، بحجم ملعقة صغيرة.',
  '0.05 لتر تساوي 50 مل فقط.',
  '5,000 مل تساوي 5 لترات،<br>وهذا أكثر بكثير من حجم قنينة الماء الفردية.'
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
  document.getElementById('s2-hint').hidden = s2Done;                      // the hint retires on resolve
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
  xapiAnswered('002', 'q1', s2Selected === S2Q.correctId, s2Selected === S2Q.correctId || s2Attempts >= S2Q.maxAttempts, { choices: [xapiAnswerText(document.querySelector('#s2 .scq-opt[data-id="' + s2Selected + '"]'))] });
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
function s2OpenHint() {
  if (!s2Done) {
    /* xAPI: requested.1 — after the gate, immediately before the reveal; this function only opens (the close path reports nothing). */
    xapiRequestedHint('002', 'q1');
    openHintOverlay('s2-hint-overlay', document.getElementById('s2-hint'));
  }
}
function s2CloseHint() { closeHintOverlay(document.getElementById('s2-hint-overlay')); }
function s2CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s2CloseHint(); }

/* ===================== S3 (index 3) — ValueInputQuestion, Variant C inline-in-prose (slide 63) =====================
   720-templates ValueInputQuestion, Variant C: two fields (א / ב), scored as ONE unit (correct
   only if both are right), marked per field. Correct: 3,000 and 0.5 (the slide's green runs).
   Two attempts (template default; slide 63 authors the retry box). Input: type text + a
   character filter; thousands commas allowed; values compared as parsed numbers, and the
   Retry gate compares parsed numbers too ("3000" / "3,000" / "3000.0" are one answer).
   Non-final wrong: the right field gets ✓ and locks, the wrong one gets ✕ and stays open
   (its mark clears once edited) — part 02's partial-correction flow; retry title
   "התשובה אינה נכונה במלואה." when one field is right. Final wrong: both fields show the
   correct values (green) and the View My Answer Toggle swaps in the learner's own typed
   strings, marked per field. Hint visible from the start, reusable until resolved.
   Feedback = slide 63's boxes: correct "נכון!" and final-wrong share the explanation; the
   deck's final box is the partly-right one ("התשובה אינה נכונה במלואה."), so a final answer
   with nothing right takes the regular title "התשובה אינה נכונה." (the retry box's own
   title); both get the canonical second line "התשובה הנכונה מוצגת.". Explanation
   equations: LTR islands in the slide's own visual order (slide 63 renders 3 x 1,000 = 3,000 and 500 ÷ 1,000 = 0.5;
   QA 2026-10-07) — see .viq-eq. */
const S3_KEYS = ['a', 'b'];
const S3Q = { correct: { a: 3000, b: 0.5 }, maxAttempts: 2 };
const S3_CORRECT_TEXT = { a: '3,000', b: '0.5' };
const S3_EXPLAIN = [
  'أ. <span class="viq-eq">3 <strong>×</strong> 1,000 = <strong>3,000</strong></span>',
  'كل لتر يضيف 1,000 مل.',
  '',
  'ب. <span class="viq-eq">500 <strong>÷</strong> 1,000 = <strong>0.5</strong></span>'
];
const S3_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'صحيح!', body: S3_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.',
    body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  },
  wrong2Partial: {
    title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.',
    body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
let s3Attempts = 0, s3Done = false, s3Outcome = null, s3LastWrong = null;
let s3Answer = null, s3View = 'solution';
let s3RetryPartial = false;
const s3Kept = new Set();     // fields right after a non-final wrong attempt (✓, locked)
const s3Wrong = new Set();    // fields marked ✕ after it, until the learner edits them
const s3In = k => document.getElementById('s3-input-' + k);
function s3Num(raw) {
  const n = raw.trim().replace(/,/g, '');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(n) ? Number(n) : null;
}
/* Retry-gate signature: every field's parsed number (raw text while it does not parse). */
function s3Sig() {
  return S3_KEYS.map(k => { const v = s3Num(s3In(k).value); return v === null ? s3In(k).value.trim() : String(v); }).join('|');
}
const s3Filled = () => S3_KEYS.every(k => s3In(k).value.trim() !== '');
const s3Locked = k => s3Done || s3Kept.has(k);
function s3MarkOf(k) {
  if (s3Done) {
    if (s3Outcome === 'wrong2' && s3View === 'answer') return s3Answer[k].correct ? 'correct' : 'wrong';
    return 'correct';
  }
  if (s3Kept.has(k)) return 'correct';
  return s3Wrong.has(k) ? 'wrong' : null;
}
/* Single owner of the fields + bar state, derived from the recorded state. */
/* S3 is the part's end when the gate stopped it (08.11 sheet fix 5): after a reload partEnded is false, so the LEDGER
   decides (2026-11-09: every s3Render keeps the button disabled, not only the restore, which the feedback re-show re-rendered). */
const s3Ended = () => partEnded || (s3Done && !basicPracticePassed() && typeof xapiComponentEnded === 'function' && xapiComponentEnded());
function s3Render() {
  S3_KEYS.forEach(k => {
    const field = document.getElementById('s3-field-' + k), inp = s3In(k), mark = s3MarkOf(k);
    if (s3Done && s3Outcome === 'wrong2') inp.value = s3View === 'answer' ? s3Answer[k].value : S3_CORRECT_TEXT[k];
    field.classList.toggle('is-correct', mark === 'correct');
    field.classList.toggle('is-wrong', mark === 'wrong');
    field.classList.toggle('is-locked', s3Locked(k));
    inp.disabled = s3Locked(k);
    document.getElementById('s3-ico-' + k).innerHTML = mark === 'correct' ? DQ_CHECK_SVG : mark === 'wrong' ? DQ_WRONG_SVG : '';
    document.getElementById('s3-verdict-' + k).textContent = mark === 'correct' ? 'صحيح' : mark === 'wrong' ? 'غير صحيح' : '';
  });
  const btn = document.getElementById('s3-check');
  setNavLabel(btn, s3Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = s3Done ? s3Ended() : (!s3Filled() || s3Sig() === s3LastWrong);   // Retry gate; resolved = on until the component ended (below the gate the click ends it)
  if (s3Done && s3Ended()) btn.setAttribute('aria-disabled', 'true');
  document.getElementById('s3-hint').hidden = s3Done;                                          // the hint retires on resolve
}
function s3FocusField(k) { if (!s3Locked(k)) s3In(k).focus(); }
S3_KEYS.forEach(k => {
  const inp = document.getElementById('s3-input-' + k);
  inp.addEventListener('input', () => {
    const clean = inp.value.replace(/[^0-9,.-]/g, '');
    if (clean !== inp.value) inp.value = clean;
    s3Wrong.delete(k);                          // editing a field clears its ✕
    dismissRetryPopup('s3-popup', s3Done);      // and is a corrective action
    s3Render();
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('s3-check').disabled) { e.preventDefault(); s3Primary(); }
  });
});
function s3Primary() {
  if (s3Done) { advanceScreen(); return; }
  s3Check();
}
function s3Check() {
  if (s3Done || !s3Filled() || s3Sig() === s3LastWrong) return;
  s3Attempts++;
  const right = {};
  S3_KEYS.forEach(k => { right[k] = s3Num(s3In(k).value) === S3Q.correct[k]; });
  /* xAPI: two catalogue questions on one screen (q1 = field א, 3,000; q2 = field ב, 0.5) — per-field correct, a shared isLast from the screen's attempts (guide §6.3). value = the parsed number when the text parses (the numeric builder reads "," as a decimal point, so "3,000" must not reach it raw), else the raw text. */
  xapiAnswered('003', 'q1', right.a, S3_KEYS.every(k => right[k]) || s3Attempts >= S3Q.maxAttempts, { value: s3Num(s3In('a').value) ?? s3In('a').value });
  xapiAnswered('003', 'q2', right.b, S3_KEYS.every(k => right[k]) || s3Attempts >= S3Q.maxAttempts, { value: s3Num(s3In('b').value) ?? s3In('b').value });
  if (S3_KEYS.every(k => right[k])) { s3Finish('correct'); return; }
  if (s3Attempts >= S3Q.maxAttempts) {
    s3Answer = {};
    S3_KEYS.forEach(k => { s3Answer[k] = { value: s3In(k).value, correct: right[k] }; });   // raw typed strings, before the reveal overwrites them
    s3View = 'solution';
    s3Finish('wrong2');
    return;
  }
  s3RetryPartial = S3_KEYS.some(k => right[k]);
  S3_KEYS.forEach(k => { if (right[k]) s3Kept.add(k); else s3Wrong.add(k); });
  s3LastWrong = s3Sig();
  s3Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s3ShowPopup('retry');
}
function s3Finish(outcome) {
  s3Done = true; s3Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  syncPracticeProgressNav(document.getElementById('s3'));
  if (outcome === 'wrong2') { s3ApplyView(); return; }
  s3Render();
  s3ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong fields + popup. */
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
  const key = type === 'retry' && s3RetryPartial ? 'retryPartial'
            : type === 'wrong2' && S3_KEYS.some(k => s3Answer[k].correct) ? 'wrong2Partial' : type;
  const base = S3_FEEDBACK[key];
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
  syncPracticeProgressNav(document.getElementById('s3'));
  if (s3Done && s3Answer !== null) s3View = 'solution';   // a final-wrong question comes back on the solution view
  s3Render();                                              // unresolved: typed values, attempts and ✓ fields are kept
}
/* Bar button (closing round 2026-10-20, Nimrod / Roni): the Recall button moved from the question content into the bar's hint slot, with the Recall label; it opens the Recall popup (white, X, title + diagram) but is positioned and gated like a hint. The screen's hint text, where there was one, is replaced by the diagram. */
function s3OpenHint() {
  if (!s3Done) {
    /* xAPI: requested.1 — after the gate, immediately before the Recall popup opens (open only; closeRecallPopup reports nothing). Item 003 carries q1 and q2; the hint is reported once, on q1. */
    xapiRequestedHint('003', 'q1');
    openRecallPopup(document.getElementById('s3-hint'));
  }
}

/* ===================== S5 (index 5) — DropdownQuestion, three blanks in one equation (slide 65) =====================
   720-templates DropdownQuestion (multi-blank), as part 02 S3. Correct: 3,000 / 3,000 / 0.003.
   Two attempts (template default; slide 65 authors the retry box). One list open at a time; a
   click outside or Escape closes it; "צדקתי?" enables when every blank has a value and (Retry
   gate) the set differs from the one just marked wrong. A non-final wrong attempt marks the
   right blanks ✓ and locks them (part 02's partial-correction flow) and the wrong ones ✕ until
   opened or changed (per-answer verdict rule, producer 2026-10-06); final wrong: every wrong
   blank shows its correct value (green), the right ones untouched, and the View My Answer
   Toggle swaps in the learner's own picks (red). Hint visible from the start.
   Feedback = slide 65's boxes. The final box authors its own second line "התשובות הנכונות
   מוצגות כעת." — kept instead of the canonical one (no duplicate). Partly right ->
   "התשובה אינה נכונה במלואה." on the retry and the final attempt (_question-template-defaults).
   Line breaks after the comma in paragraphs 1 and 4 (balanced-line rule, producer 2026-10-06) —
   the same shape the slide itself gives paragraph 2. */
const S5Q = { correct: { 1: '3,000', 2: '3,000', 3: '0.003' }, maxAttempts: 2 };
const S5_SLOTS = [1, 2, 3];
const S5_EXPLAIN = [
  '3 لترات تساوي 3,000 مل،<br>لأنه عند التحويل من لتر إلى مل نضرب في 1,000.',
  '',
  '3,000 مل تساوي أيضًا 3,000 سم³،',
  'لأن 1 مل = 1 سم³.',
  '',
  '3 لترات تساوي 0.003 م³،<br>لأنه عند التحويل من اللتر إلى م³ نقسم على 1,000.',
  // Client round 1 (2026-10-19): the mL -> m³ step (1 m³ = 1,000,000 mL). Hyphen before a number; the product is an LTR run.
  'عند التحويل من مل إلى م³ نقسم<br>على <span dir="ltr">1,000 × 1,000</span> (أي على 1,000,000).'
];
const S5_PARTIAL_TITLE = 'الإجابة ليست صحيحة بالكامل.';
const S5_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: S5_PARTIAL_TITLE, body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'صحيح جدًا‎!', body: S5_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>الإجابات الصحيحة تظهر الآن.',
    body: S5_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  },
  wrong2Partial: {
    title: S5_PARTIAL_TITLE + '<br>الإجابات الصحيحة تظهر الآن.',
    body: S5_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: S5_PARTIAL_TITLE + '<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
const s5Sel = { 1: null, 2: null, 3: null };
let s5Attempts = 0, s5Done = false, s5Outcome = null, s5LastWrong = null;
let s5Answer = null, s5View = 'solution';
let s5OpenSlot = null;
const s5Kept = new Set();            // blanks already right after a non-final wrong attempt (✓, locked)
const s5Wrong = new Set();           // blanks marked ✕ after it, until the learner opens or changes them
const s5Snap = () => JSON.stringify(s5Sel);
const s5RetryIsPartial = () => s5Kept.size > 0;
const s5FinalIsPartial = () => !!s5Answer && S5_SLOTS.some(n => s5Answer[n].correct);
function s5Announce(msg) { const l = document.getElementById('s5-live'); if (l) l.textContent = msg; }
const s5WordsOf = n => document.getElementById('s5-w' + n).textContent;
function s5Shown(n) {
  if (s5Done && s5Outcome === 'wrong2') return s5View === 'answer' ? s5Answer[n].value : S5Q.correct[n];
  return s5Sel[n];
}
function s5MarkOf(n) {
  if (s5Done) {
    if (s5Outcome === 'wrong2' && s5View === 'answer') return s5Answer[n].correct ? 'correct' : 'wrong';
    return 'correct';
  }
  if (s5Kept.has(n)) return 'correct';
  return s5Wrong.has(n) ? 'wrong' : null;
}
const s5Locked = n => s5Done || s5Kept.has(n);
function s5Render() {
  S5_SLOTS.forEach(n => {
    const btn = document.getElementById('s5-btn-' + n), sel = document.getElementById('s5-sel-' + n);
    const mark = s5MarkOf(n), open = s5OpenSlot === n, val = s5Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s5Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? DQ_CHECK_SVG : DQ_WRONG_SVG);
    sel.textContent = val || DQ_PROMPT;   // empty trigger always carries the prompt (producer 2026-10-07)
    sel.classList.toggle('is-prompt', !val);
    document.getElementById('s5-verdict-' + n).textContent = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    document.getElementById('s5-wrap-' + n).classList.toggle('is-open', open);
    const list = document.getElementById('s5-list-' + n);
    list.classList.toggle('hidden', !open);
    list.querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', o.dataset.value === val ? 'true' : 'false'));
  });
  const btn = document.getElementById('s5-check');
  if (s5Done) btn.disabled = false;
  else btn.disabled = !S5_SLOTS.every(n => s5Sel[n]) || s5Snap() === s5LastWrong;   // Retry gate
  s5SyncHint();
}
function s5CloseList(focusTrigger) {
  const n = s5OpenSlot;
  s5OpenSlot = null;
  s5Render();
  if (focusTrigger && n) document.getElementById('s5-btn-' + n).focus();
}
function s5Toggle(n) {
  if (s5Locked(n)) return;
  dismissRetryPopup('s5-popup', s5Done);        // opening a list is a corrective action
  s5Wrong.delete(n);                            // ...and clears that slot's ✕
  s5OpenSlot = (s5OpenSlot === n) ? null : n;   // one list at a time
  s5Render();
}
function s5Select(n, value) {
  if (s5Locked(n)) return;
  dismissRetryPopup('s5-popup', s5Done);
  s5Wrong.delete(n);
  s5Sel[n] = value;
  s5OpenSlot = null;
  s5Render();
  document.getElementById('s5-btn-' + n).focus();
  s5Announce(s5WordsOf(n) + ' ' + value);
}
function s5FocusOption(n, i, exact) {
  const opts = [...document.querySelectorAll('#s5-list-' + n + ' .dq-option')];
  const o = exact ? opts[i] : opts[(i + opts.length) % opts.length];
  if (o) o.focus();
}
function s5BtnKey(e, n) {
  if (s5Locked(n)) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (s5OpenSlot !== n) { dismissRetryPopup('s5-popup', s5Done); s5Wrong.delete(n); s5OpenSlot = n; s5Render(); }
    const opts = [...document.querySelectorAll('#s5-list-' + n + ' .dq-option')];
    const cur = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
    s5FocusOption(n, cur >= 0 ? cur : 0, true);
  } else if (e.key === 'Escape' && s5OpenSlot === n) { e.preventDefault(); s5CloseList(true); }
}
function s5OptKey(e, n) {
  const opts = [...document.querySelectorAll('#s5-list-' + n + ' .dq-option')];
  const i = opts.indexOf(e.currentTarget);
  if (e.key === 'ArrowDown') { e.preventDefault(); s5FocusOption(n, i + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); s5FocusOption(n, i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); s5FocusOption(n, 0, true); }
  else if (e.key === 'End') { e.preventDefault(); s5FocusOption(n, opts.length - 1, true); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s5Select(n, e.currentTarget.dataset.value); }
  else if (e.key === 'Escape') { e.preventDefault(); s5CloseList(true); }
  else if (e.key === 'Tab') { s5CloseList(false); }
}
document.addEventListener('click', (e) => {
  if (s5OpenSlot !== null && !e.target.closest('.dq-dropdown-wrap')) s5CloseList(false);
});
function s5Primary() {
  if (s5Done) { advanceScreen(); return; }
  s5Check();
}
function s5Check() {
  if (s5Done || !S5_SLOTS.every(n => s5Sel[n]) || s5Snap() === s5LastWrong) return;
  s5OpenSlot = null;
  s5Attempts++;
  const right = {};
  S5_SLOTS.forEach(n => { right[n] = s5Sel[n] === S5Q.correct[n]; });
  /* xAPI: performance (content team, MOE QA 2026-10-25) — one step per dropdown, in slot order; the step names come from the metadata
     (correctAnswers[].stepId: مل, سم³, م³), the values are the chosen strings as shown ("3,000", "0.003"). */
  xapiAnswered('004', 'q1', S5_SLOTS.every(n => right[n]), S5_SLOTS.every(n => right[n]) || s5Attempts >= S5Q.maxAttempts, { steps: S5_SLOTS.map(n => s5Sel[n]) });
  if (S5_SLOTS.every(n => right[n])) { s5Finish('correct'); return; }
  if (s5Attempts >= S5Q.maxAttempts) {
    s5Answer = {};
    S5_SLOTS.forEach(n => { s5Answer[n] = { value: s5Sel[n], correct: right[n] }; });   // before the reveal overwrites a wrong blank
    s5View = 'solution';
    s5Finish('wrong2');
    return;
  }
  S5_SLOTS.forEach(n => { if (right[n]) s5Kept.add(n); else s5Wrong.add(n); });   // retry: the right ones get ✓ and lock, the wrong ones ✕
  s5LastWrong = s5Snap();
  s5Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s5ShowPopup('retry');
}
function s5Finish(outcome) {
  s5Done = true; s5Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  closeRecallPopup();                            // resolved: the Recall button is gone, and so is its popup
  setNavLabel(document.getElementById('s5-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s5'));
  if (outcome === 'wrong2') { s5ApplyView(); return; }
  s5Render();
  s5ShowPopup(outcome);
}
function s5ApplyView() {
  if (s5Answer === null) return;
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
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
  const popup = document.getElementById('s5-popup');
  const bodyHtml = popupBodyHtml(cfg.body);
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
  document.getElementById('s5-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s5'));
  s5OpenSlot = null;
  if (s5Done) {
    if (s5Answer !== null) s5View = 'solution';
    setNavLabel(document.getElementById('s5-check'), 'متابعة');
  } else {
    setNavLabel(document.getElementById('s5-check'), 'هل إجابتي صحيحة؟');
  }
  s5Render();
}
/* Hint availability (producer 2026-10-07, content developer's rule): outside the basic practice the hint button appears only
   after the first wrong attempt - "hidden, not disabled" (visibility) - then stays until the question resolves. */
function s5SyncHint() {
  const h = document.getElementById('s5-hint');
  h.hidden = s5Done;
  h.style.visibility = (!s5Done && s5Attempts > 0) ? 'visible' : 'hidden';
}
/* Bar button (closing round 2026-10-20, Nimrod / Roni): the Recall button moved from the question content into the bar's hint slot, with the Recall label; it opens the Recall popup (white, X, title + diagram) but is positioned and gated like a hint. The screen's hint text, where there was one, is replaced by the diagram. Gated like the part's other hints: hidden (not disabled) until the first wrong attempt, then available until the question resolves. */
function s5OpenHint() {
  if (!s5Done && s5Attempts > 0) {
    /* xAPI: requested.1 — after the gate, immediately before the Recall popup opens (open only; closeRecallPopup reports nothing). */
    xapiRequestedHint('004', 'q1');
    openRecallPopup(document.getElementById('s5-hint'));
  }
}

/* ===================== S6 (index 6) — SingleChoiceQuestion, no image (slide 66) =====================
   As S2 without the image column. Correct: option 2 (b). Retry -> the chosen option red + ✗,
   correct not revealed; final wrong -> correct green + ✓, chosen red + ✗. Feedback = slide 66's
   boxes (shared explanation; the final box authors only its first title line, so the canonical
   "התשובה הנכונה מוצגת." follows). Last question of the advanced practice: once resolved,
   "שנמשיך?" hands off to part 04 for every learner — no score gate (producer 2026-10-06). */
const S6Q = { correctId: 'b', maxAttempts: 2 };
let s6Selected = null, s6Attempts = 0, s6Done = false, s6LastWrong = null, s6Outcome = null;
const S6_EXPLAIN = [
  'اللتر هو وحدة قياس حجم معيارية،<br>لكنه غير مناسب لقياس جرعة شراب دوائي.',
  'في هذه الحالة، وحدة الحجم المناسبة هي مل.'
];
const S6_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S6_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S6_EXPLAIN }
};
const s6Opts = () => document.querySelectorAll('#s6 .scq-opt');
function s6Enter() {
  document.getElementById('s6-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s6'));
  s6Render();
}
function s6Render() {
  s6Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s6Done) {
      if (id === S6Q.correctId) cls = 'correct';
      else if (s6Outcome === 'wrong2' && id === s6Selected) cls = 'wrong';
    } else if (id === s6LastWrong && id === s6Selected) cls = 'wrong';
    else if (id === s6Selected) cls = 'selected';
    o.classList.toggle('selected', cls === 'selected');
    o.classList.toggle('correct', cls === 'correct');
    o.classList.toggle('wrong', cls === 'wrong');
    o.setAttribute('aria-checked', id === s6Selected ? 'true' : 'false');
    o.disabled = s6Done;
  });
  const btn = document.getElementById('s6-check');
  setNavLabel(btn, s6Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = s6Done ? partEnded : (!s6Selected || s6Selected === s6LastWrong);   // Retry gate; resolved = on until the component ended (no score gate)
  s6SyncHint();
}
function s6Select(id) {
  if (s6Done) return;
  dismissRetryPopup('s6-popup', s6Done);
  s6Selected = id;
  s6Render();
}
function s6Primary() {
  if (s6Done) { advanceScreen(); return; }
  s6Check();
}
function s6Check() {
  if (!s6Selected || s6Done || s6Selected === s6LastWrong) return;
  s6Attempts++;
  /* xAPI: choice — the chosen option's visible text (= answers[] in the catalogue). */
  xapiAnswered('005', 'q1', s6Selected === S6Q.correctId, s6Selected === S6Q.correctId || s6Attempts >= S6Q.maxAttempts, { choices: [xapiAnswerText(document.querySelector('#s6 .scq-opt[data-id="' + s6Selected + '"]'))] });
  if (s6Selected === S6Q.correctId) { s6Finish('correct'); return; }
  if (s6Attempts >= S6Q.maxAttempts) { s6Finish('wrong2'); return; }
  s6LastWrong = s6Selected;
  s6Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s6ShowPopup('retry');
}
function s6Finish(outcome) {
  s6Done = true; s6Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  closeHintOverlay(document.getElementById('s6-hint-overlay'));
  syncPracticeProgressNav(document.getElementById('s6'));
  s6Render();
  s6ShowPopup(outcome);
}
function s6ShowPopup(type) {
  const cfg = S6_FEEDBACK[type];
  const popup = document.getElementById('s6-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = popupBodyHtml(cfg.body);
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
/* Hint availability (producer 2026-10-07, content developer's rule): outside the basic practice the hint button appears only
   after the first wrong attempt - "hidden, not disabled" (visibility) - then stays until the question resolves. */
function s6SyncHint() {
  const h = document.getElementById('s6-hint');
  h.hidden = s6Done;
  h.style.visibility = (!s6Done && s6Attempts > 0) ? 'visible' : 'hidden';
}
function s6OpenHint() {
  if (!s6Done && s6Attempts > 0) {
    /* xAPI: requested.1 — after the gate, immediately before the reveal; this function only opens (the close path reports nothing). */
    xapiRequestedHint('005', 'q1');
    openHintOverlay('s6-hint-overlay', document.getElementById('s6-hint'));
  }
}
function s6CloseHint() { closeHintOverlay(document.getElementById('s6-hint-overlay')); }
function s6CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s6CloseHint(); }

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
   ended one on its final frame). */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (currentScreen === 0) applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  if (currentScreen === 4) applyCompanionCharacter(S4_CHARACTER, 's4-char-video');
});

/* ===================== Nav labels ===================== */
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

/* ===================== Boot ===================== */
window.addEventListener('DOMContentLoaded', () => {
  scaleApp();
  initNavLabels();
  resetScreenState(0);
  Motion.reveal(document.querySelector('.screen.active'));   // animation-system initial-load hook
  /* Back from part 04 lands on this part's last screen (route-stack #last link); deferred
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
   from metadata/methodica-ar-science-mass-liquid-02-03.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: null,                     // basic-practice intro
  1: ['001', 1],               // 1 ml = 1 cm³ (dropdown, single choice)
  2: ['002', 1],               // the water bottle (single choice)
  3: ['003', 1],               // litre ↔ ml both ways (two numeric fields)
  4: null,                     // "יופי של עבודה" transition into the advanced practice
  5: ['004', 1],               // 3 litres in ml / cm³ / m³ (three dropdowns — performance)
  6: ['005', 1]                // 5 litres for a portion? (single choice)
};

var XAPI_COMP_SLUG = 'methodica-ar-science-mass-liquid-02-03';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1, '005': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-mass-liquid-02-03.json';
var XAPI_END_BTN = 's6-check';   /* the part's last button (D-8, restoreEndedButton) */

/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* The intro promises 3 questions and 'ענו נכון על 2 שאלות ומעלה כדי להתקדם' — the gate is the basic set
     (2 of 3). 2026-11-09 (08.11 sheet fixes 1, 2): success and score.scaled come from the same count of
     those 3 questions only. The 2 advanced questions (S5, S6) send their own answered and never enter the
     component result (until now: scaled = correct of all 5 / 5). */
  const ok = basicPracticeCorrect();
  return { success: ok >= practiceProgress.passThreshold, score: { scaled: ok / practiceProgress.questions.length } };
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
   Every question in this part paints itself from its state variables (sNRender; a resolved-wrong
   dropdown / field shows its answer-or-solution through sNShown / s3Render by sNView), so the painters
   are thin: refill the variables, call the pure renderer. Per screen the payload carries the selection
   (sel map / selected id), attempts, done, outcome, the Retry-gate signature (lw), the final-wrong
   answer with its toggle view, and the kept / wrong Sets as arrays (insertion order kept, so a capture →
   restore → capture round trip is byte-identical). S3's two fields are the one thing that lives ONLY in
   the DOM (their .value): captured as `inputs` and written back in applyResumeDom before the painter.
   Deliberately NOT captured, all transient: the open dropdown list (sNOpenSlot), hint / Recall overlays
   and the popups' dragged positions. The popup of a resolved question is reopened by
   reopenFeedbackIfResolved on the initial restore only. S0 / S4 are TransitionScreens: no state. */
const RS_OUTCOMES = ['correct', 'wrong2'];
const rsStr = v => (typeof v === 'string' ? v : null);
const rsCopy = o => ((o && typeof o === 'object') ? JSON.parse(JSON.stringify(o)) : null);
/* done without an outcome (a document with done forced, or an older one) reads as resolved-correct */
const rsOutcome = (v, done) => (RS_OUTCOMES.includes(v) ? v : (done ? 'correct' : null));
const rsView = v => (v === 'answer' ? 'answer' : 'solution');
const rsScq = (selected, attempts, done, outcome, lw) => ({ selected: selected, attempts: attempts, done: done, outcome: outcome, lw: lw });
/* The per-slot answer of a dropdown / field question: { slot: { value, correct } } for every slot, else null. */
function rsSlotAnswer(src, slots) {
  if (!src || typeof src !== 'object' || !slots.every(n => src[n] && typeof src[n] === 'object')) return null;
  const a = {};
  slots.forEach(n => { a[n] = { value: rsStr(src[n].value), correct: !!src[n].correct }; });
  return a;
}
function rsFillSet(set, arr, valid) {
  set.clear();
  if (Array.isArray(arr)) arr.forEach(x => { if (valid(x)) set.add(x); });
}
/* S3's typed text, straight from the fields (the only state of theirs that is not in a variable). */
function rsS3Inputs() {
  const o = {};
  S3_KEYS.forEach(k => { const el = s3In(k); o[k] = el ? el.value : ''; });
  return o;
}

/* ── 1. capture ── */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: (typeof XAPI_Q_RESULTS === 'object' && XAPI_Q_RESULTS) ? Object.assign({}, XAPI_Q_RESULTS) : {},
    screens: {
      s1: { sel: Object.assign({}, s1Sel), attempts: s1Attempts, done: s1Done, outcome: s1Outcome, lw: s1LastWrong,
            answer: rsCopy(s1Answer), view: s1View, wrong: [...s1Wrong] },
      s2: rsScq(s2Selected, s2Attempts, s2Done, s2Outcome, s2LastWrong),
      s3: { inputs: rsS3Inputs(), attempts: s3Attempts, done: s3Done, outcome: s3Outcome, lw: s3LastWrong,
            answer: rsCopy(s3Answer), view: s3View, retryPartial: s3RetryPartial, kept: [...s3Kept], wrong: [...s3Wrong] },
      s5: { sel: Object.assign({}, s5Sel), attempts: s5Attempts, done: s5Done, outcome: s5Outcome, lw: s5LastWrong,
            answer: rsCopy(s5Answer), view: s5View, kept: [...s5Kept], wrong: [...s5Wrong] },
      s6: rsScq(s6Selected, s6Attempts, s6Done, s6Outcome, s6LastWrong)
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
  let v;
  if ((v = sc.s1) && typeof v === 'object') {
    if (v.sel && typeof v.sel === 'object') S1_SLOTS.forEach(n => { s1Sel[n] = rsStr(v.sel[n]); });
    s1Attempts = v.attempts | 0; s1Done = !!v.done; s1Outcome = rsOutcome(v.outcome, s1Done); s1LastWrong = rsStr(v.lw);
    s1Answer = rsSlotAnswer(v.answer, S1_SLOTS); s1View = rsView(v.view);
    rsFillSet(s1Wrong, v.wrong, n => S1_SLOTS.includes(n));
    /* a resolved-wrong blank renders from s1Answer: a document without it falls back to the selection */
    if (s1Done && s1Outcome === 'wrong2' && s1Answer === null) { s1Answer = {}; S1_SLOTS.forEach(n => { s1Answer[n] = { value: s1Sel[n], correct: s1Sel[n] === S1Q.correct[n] }; }); }
    if (s1Attempts > 0 && !s1Done && s1LastWrong === null) s1LastWrong = s1Snap();   /* older document: rule 9 fallback */
  }
  if ((v = sc.s2) && typeof v === 'object') {
    s2Selected = rsStr(v.selected); s2Attempts = v.attempts | 0; s2Done = !!v.done; s2Outcome = rsOutcome(v.outcome, s2Done); s2LastWrong = rsStr(v.lw);
  }
  if ((v = sc.s3) && typeof v === 'object') {
    s3Attempts = v.attempts | 0; s3Done = !!v.done; s3Outcome = rsOutcome(v.outcome, s3Done); s3LastWrong = rsStr(v.lw);
    s3Answer = rsSlotAnswer(v.answer, S3_KEYS); s3View = rsView(v.view); s3RetryPartial = !!v.retryPartial;
    rsFillSet(s3Kept, v.kept, k => S3_KEYS.includes(k)); rsFillSet(s3Wrong, v.wrong, k => S3_KEYS.includes(k));
    /* the typed values, the answer fallback and the rule-9 signature live in applyResumeDom: s3Sig() reads the fields */
  }
  if ((v = sc.s5) && typeof v === 'object') {
    if (v.sel && typeof v.sel === 'object') S5_SLOTS.forEach(n => { s5Sel[n] = rsStr(v.sel[n]); });
    s5Attempts = v.attempts | 0; s5Done = !!v.done; s5Outcome = rsOutcome(v.outcome, s5Done); s5LastWrong = rsStr(v.lw);
    s5Answer = rsSlotAnswer(v.answer, S5_SLOTS); s5View = rsView(v.view);
    rsFillSet(s5Kept, v.kept, n => S5_SLOTS.includes(n)); rsFillSet(s5Wrong, v.wrong, n => S5_SLOTS.includes(n));
    if (s5Done && s5Outcome === 'wrong2' && s5Answer === null) { s5Answer = {}; S5_SLOTS.forEach(n => { s5Answer[n] = { value: s5Sel[n], correct: s5Sel[n] === S5Q.correct[n] }; }); }
    if (s5Attempts > 0 && !s5Done && s5LastWrong === null) s5LastWrong = s5Snap();
  }
  if ((v = sc.s6) && typeof v === 'object') {
    s6Selected = rsStr(v.selected); s6Attempts = v.attempts | 0; s6Done = !!v.done; s6Outcome = rsOutcome(v.outcome, s6Done); s6LastWrong = rsStr(v.lw);
  }
}

/* ── 3. what lives only in the DOM: S3's two fields. Runs after goTo and BEFORE the painter (which locks /
   disables them and, on a resolved-wrong question, overwrites them by the toggle view). The dropdown
   triggers of S1 / S5 take their text from sNRender (sNShown), so nothing else is DOM-only. ── */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  const v = st.screens.s3;
  if (!v || typeof v !== 'object') return;
  if (v.inputs && typeof v.inputs === 'object') S3_KEYS.forEach(k => { const el = s3In(k); if (el) el.value = typeof v.inputs[k] === 'string' ? v.inputs[k] : ''; });
  /* a resolved-wrong field renders from s3Answer: a document without it falls back to the restored text */
  if (s3Done && s3Outcome === 'wrong2' && s3Answer === null) { s3Answer = {}; S3_KEYS.forEach(k => { const el = s3In(k), raw = el ? el.value : ''; s3Answer[k] = { value: raw, correct: s3Num(raw) === S3Q.correct[k] }; }); }
  if (s3Attempts > 0 && !s3Done && s3LastWrong === null) s3LastWrong = s3Sig();   /* older document: rule 9 fallback, now that the fields carry the text */
}

/* ── 4. painter dispatch, keyed by data-screen. Pure and idempotent: the renders re-derive the check /
   Continue button (Retry gate, partEnded), the hint, the Progress Question nav and the bar label; never a
   reset. Runs from applyExecutionState (initial restore, _restoring) and from repaintScreen on every goTo. ── */
function restoreScreenUI(n) {
  switch (n) {
    case 1: setNavLabel(document.getElementById('s1-check'), s1Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); syncPracticeProgressNav(document.getElementById('s1')); s1Render(); break;
    case 2: syncPracticeProgressNav(document.getElementById('s2')); s2Render(); break;
    case 3:
      syncPracticeProgressNav(document.getElementById('s3')); s3Render(); break;   /* s3Render keeps an ended S3 disabled (s3Ended) */
    case 5: setNavLabel(document.getElementById('s5-check'), s5Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); syncPracticeProgressNav(document.getElementById('s5')); s5Render(); break;
    case 6: syncPracticeProgressNav(document.getElementById('s6')); s6Render(); break;
    default: break;   /* 0, 4 — TransitionScreens: no state */
  }
  /* the resolved question's feedback (final-wrong: on its toggle view) re-shows on the initial restore only */
  if (typeof _restoring !== 'undefined' && _restoring) { try { reopenFeedbackIfResolved(n); } catch (e) {} }
}