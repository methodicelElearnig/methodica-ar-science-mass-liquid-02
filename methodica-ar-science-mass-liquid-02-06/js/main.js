/* methodica-ar-science-mass-liquid-02-06 — js/main.js
   Engine + per-screen logic. Part 06 = component 06 of the script (slides 79-85):
   the peak question's intro (S0) and its 5 lettered sub-parts.
   Built: S0 peak intro (slide 79), S1 scenario (slide 80), S2-S6 sub-parts א-ה (slides 81-85). */
'use strict';

const TOTAL_SCREENS = 7;   // S0-S6 = slides 79-85
let currentScreen = 0;

/* ===================== Companion character (carried over from part 01) =====================
   Same contract as part 03: the logical ID is read back from this lomda's namespaced
   localStorage key, validated, and falls back to the primary character only for asset
   resolution. This part never shows the selection screen. */
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
   Same pattern as part 03 (720-templates _global-components "Back navigation in a
   branched journey"): S0's חזרה pops the part being returned to; with no recorded
   crossing the button stays hidden. The forward hop out of this part (not passed -> part 07,
   passed -> stays on S6) is wired in advanceScreen / goToNextPart. */
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
/* Forward out of this part: only a learner who did NOT pass the peak goes on to component 07, the second peak ("מועד ב'",
   producer 2026-10-06). One who passed (peakPassed(): 4 of 5) stays on this part's last screen: the button looks active but does not move on.
   The hop records this part on the route stack so part 07's Back returns here (its last screen, via #last). */
const PART_ID = 'methodica-ar-science-mass-liquid-02-06';
const NEXT_PART_ID = 'methodica-ar-science-mass-liquid-02-07';
/* The end of the part: the component 'completed' is the learner's LAST click (guide §6.5) — reported
   by partFinish() below, which also disables the button; the platform (Kata) then removes the
   component and routes by the catalogue. The hop to the next part survives only under DEV_NAV
   (local walkthrough: ?dev=1, no ?registration), carrying the query string along. */
function goToNextPart() {
  partFinish(document.getElementById(XAPI_END_BTN));
  if (typeof DEV_NAV !== 'undefined' && DEV_NAV && (peakExit() === 'next')) {
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

/* ===================== Peak assessment (initialised on S0) =====================
   Slide 79 (both decks): "יש בה 5 סעיפים. עליכם להצליח ב - 4 לפחות." One peak question, five
   lettered sub-parts (א-ה, slides 81-85); each sub-part is its own scored unit and
   passThreshold = ceil(2N/3) (_question-template-defaults "Pass threshold formula", Peak / climax)
   = 4 for N = 5 — equal to the authored 4. Same shape as part 03's
   practiceProgress (one item per scored unit; `screens` = the data-screen indices the
   item spans, empty until its screen is built). No scoring happens on this screen and
   no peak content is rendered; the sub-part screens will record their result here. */
const peakProgress = {
  kind: 'peak',
  questions: [
    { number: 1, letter: 'أ', screens: [2] },
    { number: 2, letter: 'ب', screens: [3] },
    { number: 3, letter: 'ج', screens: [4] },
    { number: 4, letter: 'د', screens: [5] },
    { number: 5, letter: 'هـ', screens: [6] }
  ]
};
/* Each sub-part screen's own result: null while unresolved, else 'correct' | 'incorrect'. A peak
   item resolves the moment its sub-part is answered (_global-components "Progress Question"). */
const SCREEN_RESULT = {
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => s3Done ? (s3Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  4: () => s4Done ? (s4Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  5: () => s5Done ? (s5Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  6: () => s6Done ? (s6Outcome === 'correct' ? 'correct' : 'incorrect') : null
};
function peakItemResult(q) {
  if (!q.screens.length) return null;
  const results = q.screens.map(n => (SCREEN_RESULT[n] ? SCREEN_RESULT[n]() : null));
  if (results.some(r => r === null)) return null;
  return results.every(r => r === 'correct') ? 'correct' : 'incorrect';
}
/* S6's exit, decided ONCE (producer 2026-10-13): a learner who passed the peak ends here ('finish'); one who did not goes on to part 07,
   the second peak ('next'). The button label and the action both read this, so they cannot disagree. */
function peakExit() { return peakPassed() ? 'finish' : 'next'; }
function peakPassed() { return peakProgress.questions.filter(q => peakItemResult(q) === 'correct').length >= peakProgress.passThreshold; }
peakProgress.total = peakProgress.questions.length;
peakProgress.passThreshold = Math.ceil(2 * peakProgress.total / 3);
window.lomdaState.peakAssessment = peakProgress;

/* ===================== Canvas scaling ===================== */
/* Viewport-filling canvas (same model as parts 01-03). */
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
  closeRecallPopup();   // its id does not match the generic popup sweep (720-templates "RecallPopup")
}
function goTo(n, viaBack) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  closeAllOverlays();
  const prev = document.querySelector('.screen.active');
  if (prev) {
    Motion.cancel(prev); prev.querySelectorAll('video').forEach(v => v.pause());
    if (prev.id === 's1') { clearTimeout(s1Timer); s1SetReady(true); }   // left mid-reveal: it will not replay
  }
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
/* Back onto a resolved question reopens its feedback (_global-components "Reopening feedback on return"). */
function reopenFeedbackIfResolved(n) {
  if (n === 2 && s2Done) s2ShowPopup(s2Outcome);
  if (n === 6 && s6Done) s6ShowPopup(s6Outcome);
  if (n === 5 && s5Done) { if (s5Answer !== null) s5ApplyView(); else s5ShowPopup(s5Outcome); }
  if (n === 4 && s4Done) s4ShowPopup(s4Outcome);
  if (n === 3 && s3Done) { if (s3Answer !== null) s3ApplyView(); else s3ShowPopup(s3Outcome); }
}

/* S0 is ungated (TransitionScreen). S1's Continue turns on once its staged reveal has
   played (slide 80's note), so its gate lives here and the ← key agrees with the button.
   S6 closes the peak: resolved AND not passed -> on to part 07 (the second peak); passed -> the learner stays here
   (the gate is false: the button and ← do nothing, the button is NOT greyed out). Sub-part screens before it need only be resolved. */
/* S6: resolved is enough — the click ends the component on BOTH outcomes (completed with the 4-of-5 verdict); only the
   DEV_NAV walkthrough still hops to part 07 on a fail (goToNextPart). The label still says 'סיימתי' / 'متابعة' by outcome. */
const SCREEN_GATES = { 1: () => s1Ready, 2: () => s2Done, 3: () => s3Done, 4: () => s4Done, 5: () => s5Done, 6: () => s6Done };
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { goToNextPart(); return; }   // end of the part
  goTo(currentScreen + 1);
}

document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea, .dq-dropdown-wrap')) return;   // the open list owns the arrow keys
  if (document.querySelector('.recall-overlay:not(.hidden)')) return;   // the open popup owns the keys
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ===================== Companion character video (TransitionScreen) =====================
   720-templates TransitionScreen.md JS contract. Re-entry: a correct clip is never
   restarted; an interrupted clip resumes; an ended clip stays on its last frame. */
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
/* Slide 79: presenter note "הגיף הנבחר עם מדליה" (the deck's still: the turquoise companion). Producer 2026-10-06:
   the delivered clips are the "climbing" pair (Character-1-climbing / Character-2-climbing), replacing part 01's "standing" clips used as a placeholder. Measured on the clips: 1280x720, 4.01s, a
   meaningful final frame in both (ink present through t = 3.98, no blank tail, so no freezeAt); frame-0 ink heights
   666 / 678px (1.8%, within the ~3% band, so no scale fit); background 251-254 (see the report: not pure #fff).
   shiftY seats each clip's ground line on the bar line: lowest ink (incl. soft shadow) at source y 698 / 704 =
   box y 349 / 352 of 360, so 359.5 - 349 = 10.5 and 359.5 - 352 = 7.5. character-1 = the grey companion, character-2 = the turquoise
   one (same two as part 01). Character-2 plays character-2-climbing-white.mp4: the same frames with the near-white ground
   lifted to pure #fff (2026-10-06), so the clip no longer shows an off-white plate edge. */
const S0_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-climbing.mp4', fit: { scale: 1, shiftY: 10.5 } },
  'character-2': { video: 'assets/video/character-2-climbing-white.mp4', fit: { scale: 1, shiftY: 7.5 } }
};
function s0Enter() {
  applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  syncS0Back();
}

/* ===================== S1 (index 1) — FullImageWithTextOverlay (slide 80) =====================
   720-templates FullImageWithTextOverlay.md; the photo is mounted from this map (markup names
   no file). Stateless on re-entry. One authored deviation from the template's ungated Continue:
   the note says the texts rise in order and "כפתור המשך נדלק" afterwards, so on the first,
   animated visit Continue stays off until the last reveal group has settled (the engine's own
   duration + stagger tokens). A revisit, reduced motion, or leaving mid-reveal shows
   everything at once, so Continue is on. */
const S1_IMAGE = { src: 'assets/img/s1-class-lemonade.png',
  alt: 'فصل من الطلاب يرفعون أكواب عصير الليمون أمام شاشة تظهر عليها طلاب من سان فرانسيسكو يرفعون أكوابًا' };
let s1Ready = false;
let s1Seen = false;
let s1Timer = null;
function s1SetReady(on) {
  const was = s1Ready;
  s1Ready = on;
  const btn = document.getElementById('s1-continue');
  if (btn) btn.disabled = !on;
  if (on && !was) { try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {} }   /* resume: synchronous save after the last commitment — the gate was earned (guide §8.3, D-13) */
}
function s1Enter() {
  const img = document.getElementById('s1-img');
  if (img && !img.getAttribute('src')) { img.src = S1_IMAGE.src; img.alt = S1_IMAGE.alt; }
  clearTimeout(s1Timer);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (s1Seen || reduced) { s1SetReady(true); s1Seen = true; return; }
  s1Seen = true;
  s1SetReady(false);
  const css = getComputedStyle(document.documentElement);
  const ms = n => { const v = css.getPropertyValue(n); return parseFloat(v) * (v.indexOf('ms') === -1 ? 1000 : 1); };
  s1Timer = setTimeout(() => s1SetReady(true), ms('--m-reveal-duration') + 2 * ms('--m-reveal-stagger') + 80);
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

/* View My Answer toggle (producer, QA 2026-10-14): the popup stays and ONLY what differs between the two views fades
   out and in - the second title line and the button label - so the learner never re-reads what did not change
   (the first title line and the explanation body stay still). Motion.swap does the fade (motion.js, PROJECT DEVIATION). */
function splitFeedbackTitle(title) {
  const i = title.indexOf('<br>');
  return i < 0 ? { l1: title, l2: null } : { l1: title.slice(0, i), l2: title.slice(i + 4) };
}
function feedbackTitleHtml(t) {
  return t.l2 === null ? t.l1 : t.l1 + '<br><span data-m-swap>' + t.l2 + '</span>';
}
/* Returns true when the open popup could be updated in place (same outcome, same first line, same body). */
function swapFeedbackView(popup, type, cfg, bodyHtml) {
  const t = splitFeedbackTitle(cfg.title), cur = popup._fb;
  const l2 = popup.querySelector('.scq-popup-title [data-m-swap]'), lab = popup.querySelector('.popup-action [data-m-swap]');
  if (popup.classList.contains('hidden') || !cur || cur.type !== type || cur.l1 !== t.l1 || cur.body !== bodyHtml ||
      t.l2 === null || !l2 || !lab || !cfg.action) return false;
  Motion.swap(l2, t.l2);
  Motion.swap(lab, cfg.action.label);
  return true;
}

/* ===================== RecallPopup (global, one instance for the part) =====================
   720-templates _global-components "RecallPopup": one #recall-overlay serves every trigger on the part;
   the trigger is the .scq-hint.recall-btn inside a question's content; it never gates on question state.
   Closes on the X, the backdrop and Escape; goTo() closes it through closeRecallPopup(). */
let recallReturnFocus = null;
function openRecallPopup(trigger, id) {
  const ov = document.getElementById(id || 'recall-overlay');   // 'recall-conv-overlay' = the conversion diagram (S5)
  if (!ov) return;
  recallReturnFocus = trigger || null;
  ov.classList.remove('hidden');
  const x = ov.querySelector('.recall-popup-close');
  if (x) x.focus();
}
function closeRecallPopup() {
  const open = document.querySelectorAll('.recall-overlay:not(.hidden)');   // either overlay
  if (!open.length) return;
  open.forEach(ov => ov.classList.add('hidden'));
  if (recallReturnFocus && document.contains(recallReturnFocus)) recallReturnFocus.focus();
  recallReturnFocus = null;
}
function closeRecallPopupOnBackdrop(e) { if (e.target === e.currentTarget) closeRecallPopup(); }
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const hint = document.querySelector('[id$="-hint-overlay"]:not(.hidden)');
  if (hint) { closeHintOverlay(hint); return; }
  closeRecallPopup();
});

/* ===================== S2 (index 2) — SingleChoiceQuestionImage, peak sub-part א (slide 81) =====================
   720-templates SingleChoiceQuestion, the part 02 S2 build (option states, retry gate, popup) without its image
   column and hint. Correct: option a (the only one filled green on slide 81). Two attempts (template default):
   retry -> the chosen option red + ✗, the correct one not revealed, Retry gate on the same option; final wrong
   -> the correct option green + ✓ and the chosen one red + ✗. Feedback = slide 81's boxes as authored: correct
   and final-wrong share the explanation; the final-wrong title is the slide's own two lines. The retry box is
   not authored on the slide, so it is the module's standard one. A question left mid-way comes back as left. */
const S2Q = { correctId: 'a', maxAttempts: 2 };
let s2Selected = null, s2Attempts = 0, s2Done = false, s2LastWrong = null, s2Outcome = null;
/* Breaks set by hand (QA comment chen, producer 2026-10-12): after punctuation, one sentence per line, no term split
   ("יחידות מידה"); the last sentence on one line - #s2-popup is 480px wide for it (430px text column, the line is 418px). */
const S2_EXPLAIN = [
  'في إسرائيل، كما في معظم دول العالم،<br>تُستخدم وحدات قياس مترية في الوصفات.<br><span class="ltr-run">cup</span> ليست وحدة قياس معروفة في إسرائيل.',
  'لذلك، قبل تحضير الوصفة، يجب تحويل وحدات القياس إلى مل.'
];
const S2_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'الإجابة صحيحة.', body: S2_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2_EXPLAIN }
};
const s2Opts = () => document.querySelectorAll('#s2 .scq-opt');
function s2Enter() {
  document.getElementById('s2-popup').classList.add('hidden');
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
  xapiAnswered('001', 'q1', s2Selected === S2Q.correctId, s2Selected === S2Q.correctId || s2Attempts >= S2Q.maxAttempts,
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
  s2Render();
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

/* ===================== S3 (index 3) — DropdownQuestion, multiple blanks (slide 82, peak sub-part ב) =====================
   720-templates DropdownQuestion (multi-blank), the part 02 S3 build without its image column. Three blanks; correct:
   480 / 120 / 60. Two attempts (template default; none authored otherwise). Interaction: one list open at a time; a
   click outside or Escape closes it; picking a value fills the trigger; "צדקתי?" enables when all blanks have a value
   and (Retry gate) the set differs from the one just marked wrong. A non-final wrong attempt marks the blanks that are
   right with ✓ and locks them (producer 2026-10-05, "Partial-correction flow") — only the wrong ones stay open, each
   marked ✕ until the learner opens or changes it (per-answer verdict rule, producer 2026-10-07). Final
   wrong: every wrong blank shows its correct value at once (green), the already-right ones are untouched, and the View
   My Answer Toggle swaps the wrong ones with the learner's own picks (red). The hint (slide 82's box) is visible from
   the start and reusable until the question resolves. Keyboard: Enter / Space / ArrowDown opens, Arrow keys / Home /
   End move, Enter or Space picks, Escape closes and returns to the trigger. */
const S3Q = { correct: { 1: '480', 2: '120', 3: '60' }, maxAttempts: 2 };
const S3_SLOTS = [1, 2, 3];
const LTR = t => '<span class="ltr-run">' + t + '</span>';
const S3_EXPLAIN = [
  'كوبان من الماء هما: ' + LTR('240 × 2 = 480') + '.',
  'نصف كوب من عصير الليمون يساوي: ' + LTR('240 × 0.5 = 120') + '.',
  'ربع كوب من الشراب هو: ' + LTR('240 × 0.25 = 60') + '.',
  'الآن أصبحت الوصفة جاهزة ويمكن للصف إعداد عصير الليمون.'
];
/* Slide 82's boxes as authored: correct "התשובה נכונה." + the explanation; final wrong "התשובה לא נכונה במלואה." /
   "התשובה נכונה מוצגת." + the same explanation. The retry box is not authored: the module's standard one — and,
   when part of the answer is right, "התשובה אינה נכונה במלואה." (_question-template-defaults "Retry title when part
   of the answer is right"). The learner-answer view keeps the same first line + the explanation body, second line
   "אפשר לצפות שוב בפתרון הנכון." (as part 02 S3). */
const S3_PARTIAL_TITLE = 'الإجابة ليست صحيحة بالكامل.';
const S3_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: S3_PARTIAL_TITLE, body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'الإجابة صحيحة.', body: S3_EXPLAIN },
  wrong2: {
    title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.',
    body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
/* Partial = at least one blank right in the answer being judged. Retry: a blank was kept (the
   right ones lock after the first wrong attempt). Final: read from the snapshot taken at check
   time, so the title is the same in both toggle views and on re-entry. */
const s3RetryIsPartial = () => s3Kept.size > 0;
const S3_CHECK_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const S3_WRONG_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';
const S3_PROMPT = 'اختاروا إجابة';
const s3Sel = { 1: null, 2: null, 3: null };
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
  s3SyncHint();
  S3_SLOTS.forEach(n => {
    const btn = document.getElementById('s3-btn-' + n), sel = document.getElementById('s3-sel-' + n);
    const mark = s3MarkOf(n), open = s3OpenSlot === n, val = s3Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s3Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? S3_CHECK_SVG : S3_WRONG_SVG);
    sel.textContent = val || S3_PROMPT;   // empty trigger always carries the prompt, closed or open (producer 2026-10-07)
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
  /* xAPI: matching — after the slot loop (right is final only then); source = the picked value, target = the blank's words, both metadata strings (guide §6.3). */
  xapiAnswered('001', 'q2', S3_SLOTS.every(n => right[n]), S3_SLOTS.every(n => right[n]) || s3Attempts >= S3Q.maxAttempts,
    { pairs: S3_SLOTS.map(n => ({ source: s3Sel[n], target: s3WordsOf(n) })) });
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
  closeHintOverlay(document.getElementById('s3-hint-overlay'));
  document.getElementById('s3-hint').hidden = true;                       // the hint retires on resolve
  setNavLabel(document.getElementById('s3-check'), 'متابعة');
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
  const key = type === 'retry' && s3RetryIsPartial() ? 'retryPartial' : type;
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
function s3Enter() {
  document.getElementById('s3-popup').classList.add('hidden');
  s3OpenSlot = null;
  s3SyncHint();
  if (s3Done) {                                 // resolved: locked; a final-wrong question comes back on the solution view
    if (s3Answer !== null) s3View = 'solution';
    setNavLabel(document.getElementById('s3-check'), 'متابعة');
  } else {
    setNavLabel(document.getElementById('s3-check'), 'هل إجابتي صحيحة؟');   // unresolved: selections, attempts and the ✓ blanks are kept
  }
  s3Render();
}

/* Hint availability (producer 2026-10-07, content developer's rule): outside the basic practice the hint button appears only
   after the first wrong attempt - "hidden, not disabled" (visibility) - then stays until the question resolves. */
function s3SyncHint() {
  const h = document.getElementById('s3-hint');
  h.hidden = s3Done;
  h.style.visibility = (!s3Done && s3Attempts > 0) ? 'visible' : 'hidden';
}
function s3OpenHint() {
  if (!s3Done && s3Attempts > 0) {
    /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
    xapiRequestedHint('001', 'q2');
    openHintOverlay('s3-hint-overlay', document.getElementById('s3-hint'));
  }
}
function s3CloseHint() { closeHintOverlay(document.getElementById('s3-hint-overlay')); }
function s3CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s3CloseHint(); }

/* ===================== S4 (index 4) — SingleChoiceQuestionImage, peak sub-part ג (slide 83) =====================
   720-templates SingleChoiceQuestion, as S2 without its image column, plus the hint (slide 83's box, visible from the
   start, reusable until the question resolves). Correct: option c (the only one filled green on slide 83). Two attempts
   (template default): retry -> the chosen option red + ✗, the correct one not revealed, Retry gate on the same option;
   final wrong -> the correct option green + ✓ and the chosen one red + ✗. Feedback = slide 83's boxes as authored:
   correct and final-wrong share the explanation and its bold closing line. The retry box is not authored: the standard
   one. A question left mid-way comes back as left. */
const S4Q = { correctId: 'c', maxAttempts: 2 };
let s4Selected = null, s4Attempts = 0, s4Done = false, s4LastWrong = null, s4Outcome = null;
/* Producer 2026-10-06: "למשל," and "כדאי" dropped from the second paragraph (slide 83 authors both); "יהיה" became "נוכל" so the sentence stays grammatical; the two <br> are the balanced-line rule (no one-word last line). */
const S4_EXPLAIN = [
  'وحدة القياس مل (مليلتر) مناسبة للكميات الصغيرة كما في الوصفات، وتعطي أعدادًا صحيحة وسهلة الاستخدام.',
  'لتر وم³ يناسبان الكميات الأكبر بكثير.<br>إذا أردنا إعداد الوصفة بكميات كبيرة،<br>يمكننا تحويلها إلى لترات.',
  '<strong>اختيار وحدة القياس المناسبة وفقًا لحجم الكمية هو جزء مهم من الاستخدام الصحيح للنظام المتري.</strong>'
];
const S4_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'الإجابة صحيحة.', body: S4_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN }
};
const s4Opts = () => document.querySelectorAll('#s4 .scq-opt');
function s4Enter() {
  document.getElementById('s4-popup').classList.add('hidden');
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
  /* xAPI: the graded answer — after the guards, before the finish/retry branch; the option's visible text is the metadata choice (guide §6.3). */
  xapiAnswered('001', 'q3', s4Selected === S4Q.correctId, s4Selected === S4Q.correctId || s4Attempts >= S4Q.maxAttempts,
    { choices: [xapiAnswerText(document.querySelector('#s4 .scq-opt[data-id="' + s4Selected + '"]'))] });
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
    /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
    xapiRequestedHint('001', 'q3');
    openHintOverlay('s4-hint-overlay', document.getElementById('s4-hint'));
  }
}
function s4CloseHint() { closeHintOverlay(document.getElementById('s4-hint-overlay')); }
function s4CloseHintOnBackdrop(e) { if (!e.target.closest('.hint-card')) s4CloseHint(); }

/* ===================== S5 (index 5) — DropdownQuestion, multiple blanks (slide 84, peak sub-part ד) =====================
   As S3 (slide 82): three blanks; correct: 0.48 / 0.12 / 0.06; two attempts; the lists open upward; the partial-correction
   flow (right blanks get ✓ and lock after a non-final wrong attempt; wrong ones ✕ until opened or changed), the View My Answer Toggle after the final wrong one,
   and the hint (slide 84's box) visible from the start and retired on resolve. Slide 84's final-wrong title is the slide's own
   two bold lines; the correct title "התשובה נכונה."; the retry box is not authored (the standard one, "במלואה" when part is right). */
const S5Q = { correct: { 1: '0.48', 2: '0.12', 3: '0.06' }, maxAttempts: 2 };
const S5_SLOTS = [1, 2, 3];
const S5_EXPLAIN_OK = [
  'لتحويل الوصفة من مل إلى لتر، نقسم كل مكوّن على 1000:',
  LTR('480 : 1,000 = 0.48'),
  LTR('120 : 1,000 = 0.12'),
  LTR('60 : 1,000 = 0.06'),
  'حصلنا على أعداد غير صحيحة، مما يُصعِّب تحضير الوصفة بهذه الطريقة.'
];
/* Slide 84's two boxes carry the same text except "ב-1000" (correct) vs "ב-1,000" (final wrong): kept as authored. */
const S5_EXPLAIN_WRONG = S5_EXPLAIN_OK.map((t, i) => i === 0 ? t.replace('بـ 1000', 'بـ-1,000') : t);
const S5_PARTIAL_TITLE = 'الإجابة ليست صحيحة بالكامل.';
const S5_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: S5_PARTIAL_TITLE, body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'الإجابة صحيحة.', body: S5_EXPLAIN_OK },
  wrong2: {
    title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.',
    body: S5_EXPLAIN_WRONG,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
/* Partial = at least one blank right in the answer being judged. Retry: a blank was kept (the
   right ones lock after the first wrong attempt). Final: read from the snapshot taken at check
   time, so the title is the same in both toggle views and on re-entry. */
const s5RetryIsPartial = () => s5Kept.size > 0;
const S5_CHECK_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const S5_WRONG_SVG = '<svg class="dq-verdict-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';
const S5_PROMPT = 'اختاروا إجابة';
const s5Sel = { 1: null, 2: null, 3: null };
let s5Attempts = 0, s5Done = false, s5Outcome = null, s5LastWrong = null;
let s5Answer = null, s5View = 'solution';
let s5OpenSlot = null;
const s5Kept = new Set();            // blanks already right after a non-final wrong attempt (✓, locked)
const s5Wrong = new Set();           // blanks marked ✕ after it, until the learner opens or changes them
const s5Snap = () => JSON.stringify(s5Sel);
function s5Announce(msg) { const l = document.getElementById('s5-live'); if (l) l.textContent = msg; }
const s5WordsOf = n => document.getElementById('s5-w' + n).textContent;
/* Value shown in a blank, and its verdict, derived from the recorded state (single owner). */
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
  s5SyncHint();
  S5_SLOTS.forEach(n => {
    const btn = document.getElementById('s5-btn-' + n), sel = document.getElementById('s5-sel-' + n);
    const mark = s5MarkOf(n), open = s5OpenSlot === n, val = s5Shown(n);
    btn.classList.toggle('dq-correct', mark === 'correct');
    btn.classList.toggle('dq-wrong', mark === 'wrong');
    btn.disabled = s5Locked(n);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.dq-verdict-ico')?.remove();
    if (mark) btn.insertAdjacentHTML('afterbegin', mark === 'correct' ? S5_CHECK_SVG : S5_WRONG_SVG);
    sel.textContent = val || S5_PROMPT;   // empty trigger always carries the prompt, closed or open (producer 2026-10-07)
    sel.classList.toggle('is-prompt', !val);
    document.getElementById('s5-verdict-' + n).textContent = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    document.getElementById('s5-wrap-' + n).classList.toggle('is-open', open);
    const list = document.getElementById('s5-list-' + n);
    list.classList.toggle('hidden', !open);
    list.querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', o.dataset.value === val ? 'true' : 'false'));
  });
  s5UpdateCheck();
}
function s5UpdateCheck() {
  const btn = document.getElementById('s5-check');
  if (s5Done) { btn.disabled = false; return; }
  btn.disabled = !S5_SLOTS.every(n => s5Sel[n]) || s5Snap() === s5LastWrong;   // Retry gate
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
/* One document-level listener: a click outside every dropdown closes the open list. */
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
  /* xAPI: matching — after the slot loop (right is final only then); source = the picked value, target = the blank's words, both metadata strings (guide §6.3). */
  xapiAnswered('001', 'q4', S5_SLOTS.every(n => right[n]), S5_SLOTS.every(n => right[n]) || s5Attempts >= S5Q.maxAttempts,
    { pairs: S5_SLOTS.map(n => ({ source: s5Sel[n], target: s5WordsOf(n) })) });
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
  closeRecallPopup();                            // resolved: the Recall button retires, and so does its popup
  document.getElementById('s5-hint').hidden = true;                       // the hint retires on resolve
  setNavLabel(document.getElementById('s5-check'), 'متابعة');
  if (outcome === 'wrong2') { s5ApplyView(); return; }
  s5Render();
  s5ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong blanks + popup. */
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
  const key = type === 'retry' && s5RetryIsPartial() ? 'retryPartial' : type;
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
  document.getElementById('s5-popup').classList.add('hidden');
  s5OpenSlot = null;
  s5SyncHint();
  if (s5Done) {                                 // resolved: locked; a final-wrong question comes back on the solution view
    if (s5Answer !== null) s5View = 'solution';
    setNavLabel(document.getElementById('s5-check'), 'متابعة');
  } else {
    setNavLabel(document.getElementById('s5-check'), 'هل إجابتي صحيحة؟');   // unresolved: selections, attempts and the ✓ blanks are kept
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
/* Bar button (closing round 2026-10-20, Nimrod / Roni): the Recall button moved from the question content into the bar's hint slot, with the Recall label; it opens the Recall popup (white, X, title + diagram) but is positioned and gated like a hint. The screen's hint text, where there was one, is replaced by the diagram. Gated like the part's other hints: hidden (not disabled) until the first wrong attempt, then available through the retries until the question resolves. */
function s5OpenHint() {
  if (!s5Done && s5Attempts > 0) {
    /* xAPI: requested.1 — this bar button IS the sub-part's hint (gated like one); after all guards, immediately before the reveal (open only, not a toggle). */
    xapiRequestedHint('001', 'q4');
    openRecallPopup(document.getElementById('s5-hint'), 'recall-conv-overlay');
  }
}

/* ===================== S6 (index 6) — SingleChoiceQuestionImage, peak sub-part ה (slide 85) =====================
   720-templates SingleChoiceQuestion + image column, as part 02 S2, plus the hint (slide 85's box, visible from the start,
   reusable until the question resolves). Correct: option c ("7", the only one filled green on slide 85). Two attempts (template
   default): retry -> the chosen option red + ✗, the correct one not revealed, Retry gate on the same option; final wrong -> the
   correct option green + ✓ and the chosen one red + ✗. Feedback = slide 85's boxes as authored; the retry box is not authored (the
   standard one). Media: S6_MEDIA is the one place to swap the placeholder still for the clip the note asks for. */
const S6_MEDIA = { src: 'assets/img/s6-drinking-lemonade.png',
  alt: 'طلاب الصف يبتسمون ويرفعون أكواب العصير، وفي مقدمة الصورة إبريق عصير الليمون.' };
const S6Q = { correctId: 'c', maxAttempts: 2 };
let s6Selected = null, s6Attempts = 0, s6Done = false, s6LastWrong = null, s6Outcome = null;
/* Producer 2026-10-06: "למשל," and "כדאי" dropped from the second paragraph (slide 83 authors both); "יהיה" became "נוכל" so the sentence stays grammatical; the two <br> are the balanced-line rule (no one-word last line). */
const S6_EXPLAIN = [
  '4 لترات مطلوبة لتحضير عصير الليمون لكل الصف تساوي 4,000 مل.',
  'نقسم هذه الكمية الإجمالية على كمية وصفة واحدة (660 مل)، وسنحصل على عدد الحصص المطلوبة للوصول إلى 4 لترات:',
  LTR('4,000 : 660 = 6.06'),
  'لذلك يجب التقريب للأعلى وإعداد الوصفة 7 مرات، لضمان وجود ما يكفي لجميع الصف.'
];
const S6_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'الإجابة صحيحة.', body: S6_EXPLAIN },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S6_EXPLAIN }
};
const s6Opts = () => document.querySelectorAll('#s6 .scq-opt');
function s6Enter() {
  const img = document.getElementById('s6-img');
  if (img && !img.getAttribute('src')) { img.src = S6_MEDIA.src; img.alt = S6_MEDIA.alt; }
  document.getElementById('s6-popup').classList.add('hidden');
  s6Render();
}
/* Single owner of the options + bar state, derived from the recorded state. */
function s6Render() {
  s6Opts().forEach(o => {
    const id = o.dataset.id;
    let cls = '';
    if (s6Done) {
      if (id === S6Q.correctId && (s6Outcome === 'correct' || s6Outcome === 'wrong2')) cls = 'correct';
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
  // Last screen of the peak question, מועד א: `סיימתי` only for a learner whose route ENDS here (passed); one who goes on to part 07 gets the
  // module's ordinary progression label (producer 2026-10-13, canonical terminal-path rule). Same decision as advanceScreen()'s gate.
  setNavLabel(btn, !s6Done ? 'هل إجابتي صحيحة؟' : (peakExit() === 'finish' ? 'انتهيت' : 'متابعة'));
  btn.disabled = s6Done ? partEnded : (!s6Selected || s6Selected === s6LastWrong);   // Retry gate; resolved = on until the component ended (the click reports the peak, pass or fail)
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
  /* xAPI: the graded answer — after the guards, before the finish/retry branch; the option's visible text is the metadata choice (guide §6.3). */
  xapiAnswered('001', 'q5', s6Selected === S6Q.correctId, s6Selected === S6Q.correctId || s6Attempts >= S6Q.maxAttempts,
    { choices: [xapiAnswerText(document.querySelector('#s6 .scq-opt[data-id="' + s6Selected + '"]'))] });
  if (s6Selected === S6Q.correctId) { s6Finish('correct'); return; }
  if (s6Attempts >= S6Q.maxAttempts) { s6Finish('wrong2'); return; }
  s6LastWrong = s6Selected;                 // chosen option red + ✗, correct not revealed
  s6Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s6ShowPopup('retry');
}
function s6Finish(outcome) {
  s6Done = true; s6Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  closeHintOverlay(document.getElementById('s6-hint-overlay'));
  s6Render();
  s6ShowPopup(outcome);
}
function s6ShowPopup(type) {
  const cfg = S6_FEEDBACK[type];
  const popup = document.getElementById('s6-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
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
    /* xAPI: requested.1 — after all guards, immediately before the reveal (open only, not a toggle). */
    xapiRequestedHint('001', 'q5');
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

/* A page loaded in a hidden tab/window gets its first play() aborted by Chrome and the
   clip would stay on frame 0 once shown. Returning to the page re-runs only the
   companion-clip entry (continues a paused, unfinished clip, leaves an ended one). */
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
  /* Back from a later part lands on this part's last screen (route-stack #last link);
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
   from metadata/methodica-ar-science-mass-liquid-02-06.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: null,                     // peak intro
  1: ['001', 1],               // the lemonade scenario (staged reveal)
  2: ['001', 2],               // א — single choice
  3: ['001', 3],               // ב — dropdowns
  4: ['001', 4],               // ג — single choice
  5: ['001', 5],               // ד — dropdowns
  6: ['001', 6]                // ה — single choice; the part ends here
};

var XAPI_COMP_SLUG = 'methodica-ar-science-mass-liquid-02-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-mass-liquid-02-06.json';
var XAPI_END_BTN = 's6-check';   /* the part's last button (D-8, restoreEndedButton) */
/* The single catalogue item carries all five questions: its own 'completed' mirrors the component result. */
var XAPI_ITEM_RESULT = { '001': function () { return xapiPartResult(); } };
/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* 'יש בה 5 סעיפים. עליכם להצליח ב-4 לפחות' (slide 79): gate and denominator coincide. */
  const ok = peakProgress.questions.filter(q => peakItemResult(q) === 'correct').length;
  return { success: peakPassed(), score: { scaled: ok / peakProgress.total } };
}

/* The last click of the part: report, disable, navigate nowhere (xapiEndComponent). Called on the
   pass AND fail paths (a failing learner's attempt must be recorded; Kata routes on
   recommendedAfterFail). partEnded keeps the button disabled through the screen's own re-renders;
   after a reload the LEDGER decides (restoreEndedButton, Phase 4). */
let partEnded = false;
function partFinish(btn) {
  partEnded = true;
  /* The מועד א verdict, through the shared layer (D-12): the document once resume is on, localStorage meanwhile. */
  try { if (typeof setUnitResult === 'function') setUnitResult('mass-liquid-02_moedAPassed', String(peakPassed())); } catch (e) {}
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
}

/* ═══ RESUME — the four per-part hooks (unit-js/40-resume.js; guide §8.7) ═══
   Every sub-part renders from its state variables (sNRender is the single owner of its options / blanks + bar
   button + hint visibility), so the painters are the screens' own renderers and nothing answer-bearing lives only
   in the DOM. S1's gate (the staged reveal) is captured as s1Ready / s1Seen. Never captured: the open list
   (sNOpenSlot), the reveal timer, popup positions, partEnded (after a reload the LEDGER decides —
   restoreEndedButton, D-8). Sets travel as arrays; const Sets / objects are refilled in place, never reassigned. */

/* ── 1. capture ── */
function rsScq(selected, attempts, done, outcome, lw) {
  return { selected: selected, attempts: attempts, done: done, outcome: outcome, lw: lw };
}
function rsDq(sel, attempts, done, outcome, lw, kept, wrong, answer, view) {
  return { sel: Object.assign({}, sel), attempts: attempts, done: done, outcome: outcome, lw: lw,
           kept: [...kept], wrong: [...wrong], answer: answer === null ? null : JSON.parse(JSON.stringify(answer)), view: view };
}
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    gates: { s1Ready: s1Ready, s1Seen: s1Seen },   /* SCREEN_GATES[1]: the staged reveal has played (or was left) */
    screens: {
      s2: rsScq(s2Selected, s2Attempts, s2Done, s2Outcome, s2LastWrong),
      s3: rsDq(s3Sel, s3Attempts, s3Done, s3Outcome, s3LastWrong, s3Kept, s3Wrong, s3Answer, s3View),
      s4: rsScq(s4Selected, s4Attempts, s4Done, s4Outcome, s4LastWrong),
      s5: rsDq(s5Sel, s5Attempts, s5Done, s5Outcome, s5LastWrong, s5Kept, s5Wrong, s5Answer, s5View),
      s6: rsScq(s6Selected, s6Attempts, s6Done, s6Outcome, s6LastWrong)
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
/* Refill a const Set of slot numbers in place from an array. */
function rsFillSet(set, arr, slots) {
  set.clear();
  if (Array.isArray(arr)) arr.forEach(function (n) { if (slots.indexOf(n) !== -1) set.add(n); });
}
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults && typeof st.qResults === 'object') Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  if (st.gates && typeof st.gates === 'object') { s1Ready = !!st.gates.s1Ready; s1Seen = !!st.gates.s1Seen; }
  var sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  var v;
  if ((v = sc.s2) && typeof v === 'object') {
    s2Selected = rsStr(v.selected); s2Attempts = v.attempts | 0; s2Done = !!v.done; s2Outcome = rsOutcome(v.outcome, s2Done);
    s2LastWrong = rsStr(v.lw);
    if (s2Attempts > 0 && !s2Done && s2LastWrong === null) s2LastWrong = s2Selected;   /* older document (rule 9) */
  }
  if ((v = sc.s3) && typeof v === 'object') {
    S3_SLOTS.forEach(function (n) { s3Sel[n] = (v.sel && typeof v.sel === 'object') ? rsStr(v.sel[n]) : null; });   /* const: refilled in place */
    s3Attempts = v.attempts | 0; s3Done = !!v.done; s3Outcome = rsOutcome(v.outcome, s3Done); s3LastWrong = rsStr(v.lw);
    rsFillSet(s3Kept, v.kept, S3_SLOTS); rsFillSet(s3Wrong, v.wrong, S3_SLOTS);
    s3Answer = rsAnswer(v.answer, S3_SLOTS);
    s3View = (v.view === 'answer' && s3Answer !== null) ? 'answer' : 'solution';   /* the answer view needs its snapshot */
    if (s3Attempts > 0 && !s3Done && s3LastWrong === null) s3LastWrong = s3Snap();   /* rule 9, after the blanks are back */
  }
  if ((v = sc.s4) && typeof v === 'object') {
    s4Selected = rsStr(v.selected); s4Attempts = v.attempts | 0; s4Done = !!v.done; s4Outcome = rsOutcome(v.outcome, s4Done);
    s4LastWrong = rsStr(v.lw);
    if (s4Attempts > 0 && !s4Done && s4LastWrong === null) s4LastWrong = s4Selected;   /* rule 9 */
  }
  if ((v = sc.s5) && typeof v === 'object') {
    S5_SLOTS.forEach(function (n) { s5Sel[n] = (v.sel && typeof v.sel === 'object') ? rsStr(v.sel[n]) : null; });
    s5Attempts = v.attempts | 0; s5Done = !!v.done; s5Outcome = rsOutcome(v.outcome, s5Done); s5LastWrong = rsStr(v.lw);
    rsFillSet(s5Kept, v.kept, S5_SLOTS); rsFillSet(s5Wrong, v.wrong, S5_SLOTS);
    s5Answer = rsAnswer(v.answer, S5_SLOTS);
    s5View = (v.view === 'answer' && s5Answer !== null) ? 'answer' : 'solution';
    if (s5Attempts > 0 && !s5Done && s5LastWrong === null) s5LastWrong = s5Snap();   /* rule 9 */
  }
  if ((v = sc.s6) && typeof v === 'object') {
    s6Selected = rsStr(v.selected); s6Attempts = v.attempts | 0; s6Done = !!v.done; s6Outcome = rsOutcome(v.outcome, s6Done);
    s6LastWrong = rsStr(v.lw);
    if (s6Attempts > 0 && !s6Done && s6LastWrong === null) s6LastWrong = s6Selected;   /* rule 9 */
  }
}

/* ── 3. what lives only in the DOM — nothing here: s3Render / s5Render repaint the blanks' labels and verdicts from
      sNSel / sNKept / sNWrong, S1's photo is mounted by s1Enter and its Continue is re-derived by the painter. ── */
function applyResumeDom(st) {}

/* ── 4. painter dispatch — the screen's own pure renderer per answered / gated screen (rule 11). Idempotent, never
      resets state, never throws on a clean screen. ── */
function restoreScreenUI(n) {
  switch (n) {
    case 1:
      /* The Continue from the restored gate. A first visit left mid-reveal and restored (s1Seen, not s1Ready) has no
         timer left to turn it on — s1Enter already showed everything at once on that revisit — so it is on now; a LIVE
         first visit (s1Enter's timer still pending) keeps the authored staged gate. */
      s1SetReady(s1Ready || (s1Seen && s1Timer === null));
      break;
    case 2: s2Render(); break;
    case 3: setNavLabel(document.getElementById('s3-check'), s3Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); s3Render(); break;
    case 4: s4Render(); break;
    case 5: setNavLabel(document.getElementById('s5-check'), s5Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); s5Render(); break;
    case 6: s6Render(); break;   /* label + enabled state from s6Done / peakExit() / partEnded */
    default: break;              /* 0 (intro): no state */
  }
  /* A resolved question's feedback re-shows on the initial restore only (in-session Back does it via goTo(n, true)). */
  if (typeof _restoring !== 'undefined' && _restoring) { try { reopenFeedbackIfResolved(n); } catch (e) {} }
}
