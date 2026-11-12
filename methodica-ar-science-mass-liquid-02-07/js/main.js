/* methodica-ar-science-mass-liquid-02-07 — js/main.js
   Engine + per-screen logic. Part 07 = component 07 of the script (slides 87-92):
   the part's peak question — its intro (S0) and its 4 lettered sub-parts.
   Built so far: S0 peak intro (slide 87), S1 family intro (slide 88), S2 sub-part א (slide 89), S3 sub-part ב (slide 90), S4 sub-part ג (slide 91), S5 sub-part ד (slide 92). Engine ported from part 06 (same contracts). */
'use strict';

const TOTAL_SCREENS = 6;   // S0-S5 = slides 87-92 (the whole part)
let currentScreen = 0;

/* ===================== Companion character (carried over from part 01) =====================
   Same contract as parts 03-06: the logical ID is read back from this lomda's namespaced
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
   Same pattern as parts 03-06 (720-templates _global-components "Back navigation in a
   branched journey"): S0's חזרה pops the part being returned to; with no recorded
   crossing the button stays hidden. There is no forward hop out of this part: the exit is the reporting layer's job
   (producer 2026-10-07, see SCREEN_GATES). */
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
function syncS0Back() {
  const btn = document.getElementById('s0-back');
  if (btn) btn.hidden = !((typeof DEV_NAV !== 'undefined' && DEV_NAV) && hasPrevPart());   // production: never shown (90-boot.js hides it too)
}

/* ===================== Peak assessment (initialised on S0) =====================
   Slide 87 (producer's brief, 2026-10-06; the 6-10-26 deck): "יש בה 4 סעיפים. עליכם להצליח
   ב - 3 לפחות." One peak question, four lettered sub-parts (א-ד, slides 89-92); each sub-part
   is its own scored unit and passThreshold = ceil(2N/3) (_question-template-defaults "Pass
   threshold formula", Peak / climax) = 3 for N = 4 — equal to the authored 3. Same shape as
   part 06's peakProgress (one item per scored unit; `screens` = the data-screen indices the
   item spans). No scoring happens on this screen and no peak content is rendered; the
   sub-part screens record their result here. */
const peakProgress = {
  kind: 'peak',
  questions: [
    { number: 1, letter: 'أ', screens: [2] },
    { number: 2, letter: 'ب', screens: [3] },
    { number: 3, letter: 'ج', screens: [4] },
    { number: 4, letter: 'د', screens: [5] }
  ]
};
/* Each sub-part screen's own result: null while unresolved, else 'correct' | 'incorrect'. A peak
   item resolves the moment its sub-part is answered (_global-components "Progress Question"). */
const SCREEN_RESULT = {
  2: () => s2Done ? (s2Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  3: () => s3Done ? (s3Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  4: () => s4Done ? (s4Outcome === 'correct' ? 'correct' : 'incorrect') : null,
  5: () => s5Done ? (s5Outcome === 'correct' ? 'correct' : 'incorrect') : null
};
function peakItemResult(q) {
  if (!q.screens.length) return null;
  const results = q.screens.map(n => (SCREEN_RESULT[n] ? SCREEN_RESULT[n]() : null));
  if (results.some(r => r === null)) return null;
  return results.every(r => r === 'correct') ? 'correct' : 'incorrect';
}
function peakPassed() { return peakProgress.questions.filter(q => peakItemResult(q) === 'correct').length >= peakProgress.passThreshold; }
peakProgress.total = peakProgress.questions.length;
peakProgress.passThreshold = Math.ceil(2 * peakProgress.total / 3);
window.lomdaState.peakAssessment = peakProgress;

/* ===================== Canvas scaling ===================== */
/* Viewport-filling canvas (same model as parts 01-06). */
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
/* Back onto a resolved question reopens its feedback (_global-components "Reopening feedback on return"). */
function reopenFeedbackIfResolved(n) {
  if (n === 2 && s2Done) s2ShowPopup(s2Outcome);
  if (n === 3 && s3Done) { if (s3Answer !== null) s3ApplyView(); else s3ShowPopup(s3Outcome); }
  if (n === 4 && s4Done) s4ShowPopup(s4Outcome);
  if (n === 5 && s5Done) { if (s5Answer !== null) s5ApplyView(); else s5ShowPopup(s5Outcome); }
}

function goBack() {
  if (currentScreen === 0) { goToPrevPart(); return; }
  goTo(currentScreen - 1, true);
}

/* Gates per screen live here so the ← key and the button always agree. The part ends on S5 (slide 92): its resolved
   "סיימתי" (renamed from "שנמשיך?", producer QA 2026-10-12: the lomda ends here) reports the component 'completed' with the
   peak result (peakProgress / peakPassed(), 3 of 4) through partFinish() — the reporting layer (2026-10-22) — and the platform
   routes the learner; the lomda itself navigates nowhere. */
const SCREEN_GATES = { 2: () => s2Done, 3: () => s3Done, 4: () => s4Done, 5: () => s5Done };
function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(document.getElementById('s5-check')); return; }   // the unit's final click
  goTo(currentScreen + 1);
}

document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (document.querySelector('[id$="-hint-overlay"]:not(.hidden)')) return;             // an open hint owns the keys
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
/* Slide 87: the delivered clips are the "jetpack" pair (Character-1-jetpack / Character-2-jetpack,
   2026-10-06) — the companion hovering with a jetpack, the 14:02 deck's note "הגיף הנבחר מרפת עם
   ג'טפק" (the 6-10-26 note still says "עם מדליה"; the slide's still is a placeholder).
   character-1 = the grey companion, character-2 = the turquoise one (same two as part 01).
   Measured on the clips (2026-10-06): both 1280x720, pure #fff background (255; one 253 patch at the
   bottom-left corner of clip 2 = the flame's soft edge), 1.40s / 2.47s, a meaningful final frame in
   both (ink through the last sample, no blank tail, so no freezeAt). Frame-0 ink heights 613 / 637px
   (3.9%, and the flame — not the body — carries the difference), so no scale fit; the character HOVERS
   (no ground line) and the ink spans almost the full frame height, so no shiftY either: both entries
   keep the no-op fit. */
const S0_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-jetpack.mp4', fit: { scale: 1, shiftY: 0 } },
  'character-2': { video: 'assets/video/character-2-jetpack.mp4', fit: { scale: 1, shiftY: 0 } }
};
function s0Enter() {
  applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
  syncS0Back();
}

function resetScreenState(n) {
  if (n === 0) s0Enter();
  else if (n === 2) s2Enter();
  else if (n === 3) s3Enter();
  else if (n === 4) s4Enter();
  else if (n === 5) s5Enter();
}

/* A page loaded in a hidden tab/window gets its first play() aborted by Chrome and the
   clip would stay on frame 0 once shown. Returning to the page re-runs only the
   companion-clip entry (continues a paused, unfinished clip, leaves an ended one). */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (currentScreen === 0) applyCompanionCharacter(S0_CHARACTER, 's0-char-video');
});

/* ===================== Shared: draggable feedback popup (as parts 01-06) ===================== */
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
  // A right-anchored popup (.scq-popup--right, S2/S3) switches to left anchoring at its current spot, otherwise the
  // over-constrained `right` wins and the drag only moves vertically (QA 2026-10-07).
  popup.style.left = (parseFloat(popup.style.left) || popup.offsetLeft) + 'px';
  popup.style.right = 'auto';
  popupDrag = { id, offX: x - parseFloat(popup.style.left), offY: y - top };
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
  popup.style.right = '';
  popup.style.top = '';
  popup.style.bottom = '';
}
/* First-attempt retry feedback is dismissed by the learner's next edit. */
function dismissRetryPopup(popupId, done) {
  if (done) return;
  const p = document.getElementById(popupId);
  if (p) p.classList.add('hidden');
}

/* ===================== S2 (index 2) — ImageHotspotQuestion, point variant, MULTI-SELECT (slide 89, peak sub-part א) =====================
   720-templates ImageHotspotQuestion (point variant, reference S16) with MultipleChoiceQuestion selection semantics:
   the picks are a Set; "צדקתי?" enables at one pick or more (never on a count); correctness = set equality with the
   five green cells of the slide. Two attempts (template default). Non-final wrong: every PICKED dot is marked
   (correct green / wrong red), unpicked correct ones stay neutral; the next change of the Set clears the marks and
   dismisses the retry popup; the check button re-enables only when the Set differs from the one just marked
   (Retry gate, setsEqual). Final wrong: the whole correct set turns green, the wrong picks red, everything locks;
   no View My Answer toggle (MultipleChoiceQuestion.md). Correct: the correct set green, locked. A question left
   mid-way comes back exactly as left; a resolved one comes back locked with its popup. */
const S2Q = { correct: new Set(['jan', 'feb', 'mar', 'total', 'avg']), maxAttempts: 2 };
const s2Selected = new Set();
const s2Touched = new Set();   // dots the learner has clicked: their ripple stays off for the session (pulse rule)
let s2Attempts = 0, s2Done = false, s2Outcome = null, s2LastWrong = null, s2Marked = null;
/* The deck numbers the two data items 1. / 2. (auto-numbering, invisible to text extraction; producer 2026-10-07) and leaves
   an empty paragraph before the closing sentence. {n, t} = a numbered item; "" = that spacer. */
const S2_EXPLAIN = [
  "للتحقق من ادعاء العائلة، يجب مراعاة البيانات التالية:",
  { n: "1.‏", t: "كمية استهلاك المياه في كل شهر خلال الفترة (أو إجمالي الاستهلاك في هذه الفترة)." },
  { n: "2.‏", t: "متوسط الاستهلاك لأسرة معيشية في إسرائيل." },
  "",
  "من الأول سيكون بالإمكان استنتاج متوسط الاستهلاك الشهري للعائلة، ومقارنته بمتوسط استهلاك الأسرة المعيشية في إسرائيل."
];
function popupBodyHtml(paras) {
  return paras.map(p => typeof p === "object"
    ? '<div class="fb-li"><span class="fb-li__n">' + p.n + '</span><span>' + p.t + '</span></div>'
    : p === "" ? '<p aria-hidden="true">&nbsp;</p>' : '<p>' + p + '</p>').join("");
}
/* Slide 89's boxes as authored. The retry box is authored with the partly-right title; when nothing picked is
   right the regular title applies (_question-template-defaults "Wrong-answer title when the answer is partly
   right"). The final-wrong box: the authored first line + the canonical second line "התשובה הנכונה מוצגת.". */
const S2_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:       { title: 'صحيح جدًا‎!', body: S2_EXPLAIN },
  wrong2:        { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2_EXPLAIN },
  wrong2Partial: { title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.', body: S2_EXPLAIN }
};
function setsEqual(a, b) { if (a.size !== b.size) return false; for (const v of a) if (!b.has(v)) return false; return true; }
const s2Snap = () => [...s2Selected].sort().join(',');
const s2Dots = () => document.querySelectorAll('#s2 .hs-dot');
function s2Announce(msg) { const l = document.getElementById('s2-live'); if (l) l.textContent = msg; }
/* Single owner of the dots + bar state, derived from the recorded state. s2Marked = the Set judged on the last
   non-final wrong attempt (its per-pick marks stay until the learner changes the Set). */
function s2Render() {
  s2Dots().forEach(d => {
    const id = d.dataset.id, picked = s2Selected.has(id), right = S2Q.correct.has(id);
    let cls = '';
    if (s2Done) {
      if (right) cls = 'correct';                                  // the whole correct set is revealed (correct or final wrong)
      else if (picked) cls = 'wrong';                               // the learner's wrong picks
    } else if (s2Marked && picked && s2Marked.has(id)) {
      cls = right ? 'correct' : 'wrong';                            // retry marks on the picks just judged
    } else if (picked) cls = 'selected';
    d.classList.toggle('selected', cls === 'selected');
    d.classList.toggle('correct', cls === 'correct');
    d.classList.toggle('wrong', cls === 'wrong');
    d.classList.toggle('answered', s2Attempts > 0 || s2Selected.size > 0 || s2Done);
    d.classList.toggle('is-touched', s2Touched.has(id));
    d.setAttribute('aria-checked', picked ? 'true' : 'false');
    d.disabled = s2Done;
  });
  if (s2Done) document.getElementById('s2').classList.remove('hs-demo');   // resolved: no ripple on the verdict board
  const btn = document.getElementById('s2-check');
  setNavLabel(btn, s2Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = !s2Done && (s2Selected.size === 0 || s2Snap() === s2LastWrong);   // Retry gate
}
function s2Toggle(id) {
  if (s2Done) return;
  dismissRetryPopup('s2-popup', s2Done);
  if (s2Selected.has(id)) s2Selected.delete(id); else s2Selected.add(id);
  s2Touched.add(id);                                                  // a clicked dot stops its own ripple, only its own
  if (s2Marked && s2Snap() !== s2LastWrong) s2Marked = null;        // a genuine change clears the retry marks
  s2Render();
  const d = document.querySelector('#s2 .hs-dot[data-id="' + id + '"]');
  if (d) s2Announce(d.getAttribute('aria-label') + (s2Selected.has(id) ? '— محدَّد' : '— تم إلغاء الاختيار'));
}
function s2Primary() {
  if (s2Done) { advanceScreen(); return; }
  s2Check();
}
const s2PicksPartlyRight = set => [...set].some(id => S2Q.correct.has(id));
function s2Check() {
  if (s2Done || s2Selected.size === 0 || s2Snap() === s2LastWrong) return;
  s2Attempts++;
  /* xAPI: multi-select choice — every picked hotspot; the dots have no text, so xapiAnswerText reads their aria-label, which is the metadata choice (guide §6.3). */
  xapiAnswered('001', 'q1', setsEqual(s2Selected, S2Q.correct), setsEqual(s2Selected, S2Q.correct) || s2Attempts >= S2Q.maxAttempts,
    { choices: [...s2Selected].map(id => xapiAnswerText(document.querySelector('#s2 .hs-dot[data-id="' + id + '"]'))) });
  if (setsEqual(s2Selected, S2Q.correct)) { s2Finish('correct'); return; }
  if (s2Attempts >= S2Q.maxAttempts) { s2Finish('wrong2'); return; }
  s2Marked = new Set(s2Selected);                                   // per-pick marks on the retry
  s2LastWrong = s2Snap();
  s2Render();
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}   /* resume: synchronous save after the last commitment (guide §8.3, D-13) */
  s2ShowPopup('retry');
}
function s2Finish(outcome) {
  s2Done = true; s2Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s2Render();
  s2ShowPopup(outcome);
}
function s2ShowPopup(type) {
  const partial = type !== 'correct' && s2PicksPartlyRight(s2Selected);
  const cfg = S2_FEEDBACK[partial ? type + 'Partial' : type];
  const popup = document.getElementById('s2-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = popupBodyHtml(cfg.body);
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
/* Ripple lifecycle (ImageHotspotQuestion "Hotspot pulse rule"; the CSS beside .hs-dot__mark). A dot settles on its own
   when its second ripple ends (::after is the later ripple of each dot). */
document.addEventListener('animationend', (e) => {
  if (e.animationName !== 'hs-pulse' || e.pseudoElement !== '::after') return;
  const d = e.target.closest('#s2 .hs-dot');
  if (d) d.classList.add('is-settled');
});
/* Each entry: dots never clicked ripple twice again. On the first visit the ripple waits for the bill's own entrance
   reveal to end (it starts while the bill is still invisible otherwise); later entries have no reveal and start at once. */
function s2StartDemo() {
  const scr = document.getElementById('s2'), bill = scr.querySelector('.hs-img');
  scr.classList.remove('hs-demo');
  s2Dots().forEach(d => d.classList.remove('is-settled'));
  if (s2Done) return;
  const go = () => { if (currentScreen === 2 && !s2Done) scr.classList.add('hs-demo'); };
  if (!scr.classList.contains('m-animate') && !scr.classList.contains('m-hold')) { go(); return; }
  const done = (e) => {
    if (e.target !== bill) return;
    bill.removeEventListener('animationend', done); bill.removeEventListener('animationcancel', done);
    if (e.type === 'animationend') go();          // cancelled = the learner left mid-reveal; the next entry starts it
  };
  bill.addEventListener('animationend', done); bill.addEventListener('animationcancel', done);
}
/* ===== Enlarged bill layout, S2 + S3 (client round 1, 2026-10-19; PERMANENT since the final UX round; S3 joined it in the
   closing round, Nimrod 2026-10-20: the bill in sub-part ב looks like the one in א, so neither screen has a zoom) =====
   One writer (hsLayout). The bill frame (and on S2 its live dots) is scaled/cropped in place (CSS .hs-enlarged, set in the markup),
   so picks, marks, the retry gate and the feedback all run on the same buttons. Crop = the bill's data region, in fractions of
   the picture: x 3.8-96.2%, y 36.8-99.1% (all eight S2 dots lie inside: x 59-86%, y 41-95%). */
const S2_CROP = { x0: 0.038, y0: 0.368, x1: 0.962, y1: 0.991 };
/* gap 28: the bill's right edge stops at x 812, left of the bottom-right feedback popup (x 814-1240). feedbackRoom: the tallest
   S2 popup (final, ~312px) + margin, kept free above the bar in portrait so feedback never covers a dot. flagClear 128: the
   Report Problem button's box ends at x 120 (its circle at 96), so the bill starts 8px after it. */
const S2_ENL = { textW: 400, gap: 28, flagClear: 128, margin: 24, portraitTextTop: 116, portraitGap: 32, feedbackRoom: 340 };
function hsLayout(id) {
  const scr = document.getElementById(id);
  if (!scr || !scr.classList.contains('active')) return;                          // measured only while the screen is laid out
  const stage = scr.querySelector('.hs-stage'), frame = scr.querySelector('.hs-img'), img = scr.querySelector('.hs-bill'), text = scr.querySelector('.hs-text, .hs-question');
  const pad = parseFloat(getComputedStyle(frame).paddingLeft) || 0;
  const iw = img.offsetWidth, ih = img.offsetHeight, fw = frame.offsetWidth, fh = frame.offsetHeight;
  const cl = pad + S2_CROP.x0 * iw, ct = pad + S2_CROP.y0 * ih, cw = (S2_CROP.x1 - S2_CROP.x0) * iw, ch = (S2_CROP.y1 - S2_CROP.y0) * ih;
  const sh = stage.offsetHeight, E = S2_ENL;
  let k, vx, vy;
  if (window.matchMedia('(orientation: portrait)').matches) {
    scr.style.setProperty('--hs-text-top', E.portraitTextTop + 'px');
    const top = E.portraitTextTop + text.offsetHeight + E.portraitGap;          // the question across the top
    k = Math.min((1280 - 2 * 40) / cw, (sh - top - E.feedbackRoom) / ch);           // room left above the bar for the feedback
    vx = 40 + ((1280 - 2 * 40) - cw * k) / 2; vy = top;
  } else {
    const vw = 1280 - 40 - E.textW - E.gap - E.flagClear;                          // left of the 400px question column
    k = Math.min(vw / cw, (sh - 2 * E.margin) / ch);
    vx = E.flagClear + (vw - cw * k) / 2; vy = (sh - ch * k) / 2;
    scr.style.setProperty('--hs-text-top', Math.round(vy) + 'px');                  // the question starts level with the bill
  }
  scr.style.setProperty('--hs-k', k);
  scr.style.setProperty('--hs-tx', (vx - k * cl) + 'px');
  scr.style.setProperty('--hs-ty', (vy - k * ct) + 'px');
  scr.style.setProperty('--hs-clip', 'inset(' + ct + 'px ' + (fw - cl - cw) + 'px ' + (fh - ct - ch) + 'px ' + cl + 'px round ' + (12 / k) + 'px)');
  const fr = scr.querySelector('.hs-zoom-frame');
  Object.assign(fr.style, { left: vx + 'px', top: vy + 'px', width: (cw * k) + 'px', height: (ch * k) + 'px' });
}
window.addEventListener('resize', () => { if (currentScreen === 2 || currentScreen === 3) hsLayout('s' + currentScreen); });
function s2Enter() {
  document.getElementById('s2-popup').classList.add('hidden');
  hsLayout('s2');
  s2Render();
  s2StartDemo();
}

/* ===================== Shared: popup action (View My Answer Toggle) + hint overlay — as parts 03 / 06 ===================== */
/* reserve: every label this button can show, as invisible SemiBold copies in the label's grid cell, so the pill keeps
   one footprint across hover and label swaps. */
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
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const hint = document.querySelector('[id$="-hint-overlay"]:not(.hidden)');
  if (hint) closeHintOverlay(hint);
});
/* Type 1 verdict icons (16px, no circle) — exports of the Figma NumberValue states, as parts 03 / 06. */
const VIQ_CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.52036 15C6.12296 15.0002 5.74183 14.8126 5.46106 14.4787L2.25845 10.6774C1.91385 10.2681 1.91385 9.60467 2.25845 9.19536C2.60317 8.78619 3.16194 8.78619 3.50666 9.19536L6.52036 12.7737L14.4933 3.30688C14.8381 2.89771 15.3968 2.89771 15.7415 3.30688C16.0862 3.71618 16.0862 4.37966 15.7415 4.78896L7.57966 14.4787C7.29889 14.8126 6.91776 15.0002 6.52036 15Z" fill="#609E12"/></svg>';
const VIQ_WRONG_SVG = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.6743 2.32569C15.4657 2.11715 15.1828 2 14.8879 2C14.5929 2 14.31 2.11715 14.1014 2.32569L9 7.42709L3.8986 2.32569C3.69 2.11715 3.40711 2 3.11215 2C2.81718 2 2.53429 2.11715 2.32569 2.32569C2.11715 2.53429 2 2.81718 2 3.11215C2 3.40711 2.11715 3.69 2.32569 3.8986L7.42709 9L2.32569 14.1014C2.11715 14.31 2 14.5929 2 14.8879C2 15.1828 2.11715 15.4657 2.32569 15.6743C2.53429 15.8829 2.81718 16 3.11215 16C3.40711 16 3.69 15.8829 3.8986 15.6743L9 10.5729L14.1014 15.6743C14.31 15.8829 14.5929 16 14.8879 16C15.1828 16 15.4657 15.8829 15.6743 15.6743C15.8829 15.4657 16 15.1828 16 14.8879C16 14.5929 15.8829 14.31 15.6743 14.1014L10.5729 9L15.6743 3.8986C15.8829 3.69 16 3.40711 16 3.11215C16 2.81718 15.8829 2.53429 15.6743 2.32569Z" fill="#B20010"/></svg>';

/* ===================== S3 (index 3) — ValueInputQuestion, Variant C inline-in-prose (slide 90, peak sub-part ב) =====================
   720-templates ValueInputQuestion, Variant C, the part 03 S3 build: three fields scored as ONE unit, marked per
   field. Correct: the month "ינואר" (a word — trimmed, exact; the numeric filter is not applied to this field), 9 and
   9,000 (thousands comma optional per the note; parsed numbers compared, Retry-gate signature on parsed numbers
   too). Two attempts. Non-final wrong: right fields ✓ and lock, wrong ones ✕ until edited (partial-correction
   flow); the hint button appears now (note: "כפתור רמז מופיע אחרי ניסיון מענה ראשון שגוי"). Final wrong: the
   correct values fill the fields (green) and the View My Answer Toggle swaps in the learner's own typed strings,
   marked per field. A question left mid-way comes back as left; a resolved one comes back locked on the solution
   view with its popup. */
const S3_KEYS = ['m', 'q', 'l'];
const S3Q = { correct: { m: 'يناير', q: 9, l: 9000 }, maxAttempts: 2 };
const S3_CORRECT_TEXT = { m: 'يناير', q: '9', l: '9,000' };
const S3_EXPLAIN = ['لقد أكملتم الجملة بشكل صحيح وفقًا للبيانات الواردة في التقرير، وأجريتم تحويلًا دقيقًا: 9&nbsp;م³ تساوي 9,000&nbsp;لتر.'];
/* Slide 90's boxes as authored. The final-wrong box: the slide's own two lines ("התשובה אינה נכונה במלואה." /
   "התשובות הנכונות מופיעות כעת."), its second line kept in place of the canonical one; a final answer with nothing
   right takes the regular first line. The final-wrong boxes carry NO explanation body: slide 90's wrong box has none
   (producer 2026-10-07, confirmed from the slide), and praise under a wrong verdict contradicts it; as S5. */
const S3_WRONG2_LINE2 = 'الإجابات الصحيحة تظهر الآن.';
const S3_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'صحيح جدًا‎!', body: S3_EXPLAIN },
  wrong2: {
    title: 'الإجابة غير صحيحة.<br>' + S3_WRONG2_LINE2,
    body: [],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  },
  wrong2Partial: {
    title: 'الإجابة ليست صحيحة بالكامل.<br>' + S3_WRONG2_LINE2,
    body: [],
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
/* The month: trimmed, inner spaces collapsed, Hebrew geresh/gershayim ignored. */
const s3Word = raw => raw.trim().replace(/\s+/g, ' ').replace(/["\u05f3\u05f4']/g, '');
/* The Levantine name of January is right too: the bill used to print كانون الثاني (monday 12.11.26, AR 07-001). */
const S3_MONTH_ALSO = ['كانون الثاني'];
function s3FieldRight(k) {
  if (k === 'm') { const w = s3Word(s3In(k).value); return w === S3Q.correct.m || S3_MONTH_ALSO.includes(w); }
  return s3Num(s3In(k).value) === S3Q.correct[k];
}
/* Retry-gate signature: the month as a word, the numbers parsed (raw text while one does not parse). */
function s3Sig() {
  return S3_KEYS.map(k => { if (k === 'm') return s3Word(s3In(k).value); const v = s3Num(s3In(k).value); return v === null ? s3In(k).value.trim() : String(v); }).join('|');
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
function s3Render() {
  S3_KEYS.forEach(k => {
    const field = document.getElementById('s3-field-' + k), inp = s3In(k), mark = s3MarkOf(k);
    if (s3Done && s3Outcome === 'wrong2') inp.value = s3View === 'answer' ? s3Answer[k].value : S3_CORRECT_TEXT[k];
    field.classList.toggle('is-correct', mark === 'correct');
    field.classList.toggle('is-wrong', mark === 'wrong');
    field.classList.toggle('is-locked', s3Locked(k));
    inp.disabled = s3Locked(k);
    document.getElementById('s3-ico-' + k).innerHTML = mark === 'correct' ? VIQ_CHECK_SVG : mark === 'wrong' ? VIQ_WRONG_SVG : '';
    document.getElementById('s3-verdict-' + k).textContent = mark === 'correct' ? 'صحيح' : mark === 'wrong' ? 'غير صحيح' : '';
  });
  const btn = document.getElementById('s3-check');
  setNavLabel(btn, s3Done ? 'متابعة' : 'هل إجابتي صحيحة؟');
  btn.disabled = s3Done ? false : (!s3Filled() || s3Sig() === s3LastWrong);   // Retry gate
  const hint = document.getElementById('s3-hint');
  hint.hidden = s3Done;                                                       // the hint retires on resolve
  hint.style.visibility = (!s3Done && s3Attempts > 0) ? 'visible' : 'hidden'; // hidden (not disabled) until the first wrong attempt
}
function s3FocusField(k) { if (!s3Locked(k)) s3In(k).focus(); }
function s3WireInputs() {
  S3_KEYS.forEach(k => {
    const inp = s3In(k);
    inp.addEventListener('input', () => {
      if (k !== 'm') { const clean = inp.value.replace(/[^0-9,.-]/g, ''); if (clean !== inp.value) inp.value = clean; }
      s3Wrong.delete(k);                          // editing a field clears its ✕
      dismissRetryPopup('s3-popup', s3Done);      // and is a corrective action
      s3Render();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !document.getElementById('s3-check').disabled) { e.preventDefault(); s3Primary(); }
    });
  });
}
function s3Primary() {
  if (s3Done) { advanceScreen(); return; }
  s3Check();
}
function s3Check() {
  if (s3Done || !s3Filled() || s3Sig() === s3LastWrong) return;
  s3Attempts++;
  const right = {};
  S3_KEYS.forEach(k => { right[k] = s3FieldRight(k); });
  /* xAPI: performance — after the field loop (right is final only then); the three fields in the metadata steps order (month, m³, litres) (guide §6.3).
     A right field reports Kata's form (S3_CORRECT_TEXT: 9000 and 9,000 both → "9,000", كانون الثاني → "يناير", guide §6.3c
     rule 6) — Kata holds ONE 3-step pattern (monday 12.11.26, 07-001 q2). A wrong field reports the raw typed text. */
  xapiAnswered('001', 'q2', S3_KEYS.every(k => right[k]), S3_KEYS.every(k => right[k]) || s3Attempts >= S3Q.maxAttempts,
    { steps: S3_KEYS.map(k => right[k] ? S3_CORRECT_TEXT[k] : s3In(k).value) });
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
  closeHintOverlay(document.getElementById('s3-hint-overlay'));
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
/* View My Answer toggle (producer, QA 2026-10-14): the popup stays and ONLY what differs between the two views fades
   out and in — the second title line and the button label — so the learner never re-reads what did not change
   (the first title line and the explanation body stay still). Motion.swap does the fade (canonical in animation-system
   2804cb9; motion.js here is that engine verbatim). */
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
  const key = type === 'retry' && s3RetryPartial ? 'retryPartial'
            : type === 'wrong2' && S3_KEYS.some(k => s3Answer[k].correct) ? 'wrong2Partial' : type;
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
  hsLayout('s3');
  if (s3Done && s3Answer !== null) s3View = 'solution';   // a final-wrong question comes back on the solution view
  s3Render();                                              // unresolved: typed values, attempts and ✓ fields are kept
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

/* ===================== S4 (index 4) — SingleChoiceQuestion, no image (slide 91, peak sub-part ג) =====================
   720-templates SingleChoiceQuestion, the part 06 S2 build. Correct: option c (the only one filled green on slide 91).
   Two attempts (template default): retry -> the chosen option red + ✗, the correct one not revealed, Retry gate on the
   same option; final wrong -> the correct option green + ✓ and the chosen one red + ✗. Hint visible from the start,
   reusable until the question resolves, retired on resolve. Feedback = slide 91's boxes as authored (correct and
   final-wrong share the explanation); the retry box is not authored, so the module's standard one. A question left
   mid-way comes back as left; a resolved one comes back locked with its popup. */
const S4Q = { correctId: 'c', maxAttempts: 2 };
let s4Selected = null, s4Attempts = 0, s4Done = false, s4LastWrong = null, s4Outcome = null;
/* Manual breaks at the punctuation (QA 2026-10-12): the natural wrap left "יותר." alone on a fifth line, and breaking only
   after the period would strand "לשחזור."; every line here is shorter than the 378px text box. */
const S4_EXPLAIN = ['البيانات المستمَدة من تجربة أو ملاحظة هي موضوعية<br>(لا تعتمد على العاطفة أو المعتقد)،<br>وتمنع التحيّز، ويمكن تكرارها.<br>لذلك، الحجة المبنية عليها تكون أقوى وأكثر إقناعًا.'];
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

/* ===================== Shared: pointer drag-and-drop helper — verbatim from part 01 =====================
   Pointer Events only (mouse, touch, pen), per the DragAndDropQuestion Image Top reference (createPointerDnd,
   methodica-science-mass-measure-01-01): a clone of the picked element follows the pointer in viewport-fixed
   coordinates, scaled like #app; drop targets are hit-tested under the pointer. */
function createPointerDnd(opts) {
  const targets = new Map();
  let active = null, settle = null;
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
    if (settle) settle();
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
    if (e.buttons === 0) { onUp(e); return; }
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

/* ===================== S5 (index 5) — OrderedDragAndDropQuestion (slide 92, peak sub-part ד) =====================
   The approved part 01 S18 (slide 47), ids s5-*. Correct: claim = "משפחת לוי צורכת…", evidence = "חשבון המים…",
   reasoning = "ממוצע הצריכה…" (the slide draws them in that order beside 1 / 2 / 3). Two attempts. A wrong first attempt
   shows the retry popup AND marks each slot (Figma State 05); the marks clear as soon as the learner changes anything,
   and the Retry gate keeps "צדקתי?" off while the arrangement is the one just marked wrong. The final wrong attempt shows
   the solution at once with the View My Answer Toggle. Titles follow the "not fully correct" rule per attempt (any slot
   right = "…במלואה"). Keyboard / tap = pick-then-place: press a sentence to pick it, press a slot to place it (a filled
   slot gives its sentence back), Escape drops the pick. Re-entry: resolved -> locked + feedback on Back; left mid-way ->
   as left. */
const S5Q = { correct: { 's5-t-claim': 's5-d-claim', 's5-t-evidence': 's5-d-evidence', 's5-t-reasoning': 's5-d-reasoning' }, maxAttempts: 2 };
const S5_TEXT = {
  's5-d-claim': 'عائلة منصور تستهلك كمية مياه أقل من متوسط العائلة في إسرائيل.',
  's5-d-evidence': 'فاتورة المياه وحساب المتوسط الشهري يُظهران أن متوسط الاستهلاك الشهري لعائلة منصور كان 8 م³، والمتوسط الوطني هو 9 م³.',
  's5-d-reasoning': 'متوسط الاستهلاك الشهري لعائلة منصور هو 8 م³، في حين أن استهلاك الأسرة المتوسطة المكوّنة من 4 أفراد هو 9 م³.'
};
const S5_NAME = { 's5-t-claim': 'ادّعاء', 's5-t-evidence': 'دليل', 's5-t-reasoning': 'التبرير' };
const s5Toggle = { label: 'الانتقال إلى إجابتي', view: 'answer' }, s5BackTo = { label: 'الإجابة الصحيحة', view: 'solution' };
/* Slide 92's boxes: correct "מצוין!" + its line; the final-wrong box "התשובה אינה נכונה במלואה" / "התשובה הנכונה מוצגת כעת."
   with no body (none authored for the wrong outcome). The retry box is authored with the partly-right title; when no slot
   is right the regular title applies. */
const S5_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'ممتاز!', body: ['لقد قدمتم حجة بشكل منظم وصحيح.'] },
  wrong2:        { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة الآن.', body: [], action: s5Toggle, answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: s5BackTo } },
  wrong2Partial: { title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة الآن.', body: [], action: s5Toggle, answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: s5BackTo } }
};
const s5Place = { 's5-d-reasoning': 'source', 's5-d-claim': 'source', 's5-d-evidence': 'source' };
let s5Attempts = 0, s5Done = false, s5Outcome = null, s5LastWrong = null, s5Marks = null, s5RetryPartial = false;
let s5Answer = null, s5View = 'solution', s5Pick = null, s5Dnd = null, s5SkipClick = false;
const s5Targets = () => Object.keys(S5Q.correct);
const s5In = t => Object.keys(s5Place).find(d => s5Place[d] === t) || null;
const s5Snap = () => JSON.stringify(s5Place);
function s5Announce(msg) { const l = document.getElementById('s5-live'); if (l) l.textContent = msg; }
function s5MarksFor(placement) {
  const m = {};
  s5Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = d === S5Q.correct[t] ? 'correct' : 'wrong'; });
  return m;
}
const s5AnyRight = placement => Object.values(s5MarksFor(placement)).some(v => v === 'correct');
function s5Render() {
  Object.keys(s5Place).forEach(d => {
    const card = document.getElementById(d), placed = s5Place[d] !== 'source';
    card.classList.remove('dragging');
    card.classList.toggle('is-placed', placed);
    card.classList.toggle('is-selected', s5Pick === d);
    card.setAttribute('aria-pressed', s5Pick === d ? 'true' : 'false');
    card.disabled = placed || s5Done;
    card.setAttribute('aria-hidden', placed ? 'true' : 'false');
  });
  s5Targets().forEach(t => {
    const zone = document.getElementById(t), d = s5In(t), mark = s5Marks && s5Marks[t];
    zone.textContent = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s5Done);
    if (mark) { const m = document.createElement('span'); m.className = 'ord-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'ord-placed';
      card.textContent = S5_TEXT[d];
      zone.appendChild(card);
      if (!s5Done && s5Dnd) s5Dnd.attachSource(card, d);
    }
    const state = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', S5_NAME[t] + ': ' + (d ? S5_TEXT[d] : 'فارغة') + state);
    zone.tabIndex = s5Done ? -1 : 0;
  });
  s5UpdateCheck();
}
function s5UpdateCheck() {
  const btn = document.getElementById('s5-check');
  if (s5Done) { btn.disabled = partEnded; return; }   // resolved: on until the component ended
  const full = s5Targets().every(t => !!s5In(t));
  btn.disabled = !full || s5Snap() === s5LastWrong;     // Retry gate
}
function s5StartEdit() { s5Marks = null; dismissRetryPopup('s5-popup', s5Done); }
function s5PlaceCard(d, t) {
  const evicted = s5In(t);
  if (evicted && evicted !== d) s5Place[evicted] = 'source';
  s5Place[d] = t;
  s5Pick = null;
  s5Render();
  s5Announce('تم وضع الجملة في ' + S5_NAME[t]);
}
function s5InitDnd() {
  if (s5Dnd) return;
  s5Dnd = createPointerDnd({
    canDrag: () => !s5Done,
    onPick: d => { s5StartEdit(); s5Pick = null; s5Place[d] = 'source'; s5Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s5SkipClick = true; s5PlaceCard(d, t); },
    onCancel: () => { s5SkipClick = true; s5Render(); },
    onTap: (d, src) => { s5SkipClick = true; if (src.classList.contains('ord-placed')) s5ZonePress(s5Place[d]); else s5CardPress(d); }
  });
  Object.keys(s5Place).forEach(d => s5Dnd.attachSource(document.getElementById(d), d));
  s5Targets().forEach(t => {
    const zone = document.getElementById(t);
    s5Dnd.attachTarget(zone, t);
    zone.addEventListener('click', () => { if (s5SkipClick) { s5SkipClick = false; return; } s5ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s5ZonePress(t); } });
  });
  Object.keys(s5Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s5CardPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 5 && s5Pick) { s5Pick = null; s5Render(); } });
  document.addEventListener('pointerdown', () => { s5SkipClick = false; }, true);
}
function s5CardPress(d) {
  if (s5Done || s5Place[d] !== 'source') return;
  s5StartEdit();
  s5Pick = (s5Pick === d) ? null : d;
  s5Render();
  if (s5Pick) s5Announce('تم اختيار جملة. اختاروا مكوّنًا لوضعها فيه.');
}
function s5ZonePress(t) {
  if (s5Done) return;
  if (s5Pick) { s5StartEdit(); s5PlaceCard(s5Pick, t); return; }
  const d = s5In(t);
  if (!d) return;
  s5StartEdit();
  s5Place[d] = 'source'; s5Pick = d;
  s5Render();
  s5Announce('تم اختيار جملة. اختاروا مكوّنًا لوضعها فيه.');
}
function s5Primary() { if (s5Done) { advanceScreen(); return; } s5Check(); }
function s5Check() {
  if (s5Done || !s5Targets().every(t => !!s5In(t)) || s5Snap() === s5LastWrong) return;
  s5Pick = null;
  s5Attempts++;
  const marks = s5MarksFor(s5Place);
  /* xAPI: matching — after the marks are computed; source = the placed sentence, target = the slot's name, both metadata strings, read BEFORE the final-wrong reveal rearranges the board (guide §6.3). */
  xapiAnswered('001', 'q4', Object.values(marks).every(v => v === 'correct'), Object.values(marks).every(v => v === 'correct') || s5Attempts >= S5Q.maxAttempts,
    { pairs: s5Targets().map(t => ({ source: S5_TEXT[s5In(t)], target: S5_NAME[t] })) });
  if (Object.values(marks).every(v => v === 'correct')) {
    s5Marks = marks; s5Finish('correct');
  } else if (s5Attempts >= S5Q.maxAttempts) {
    s5Answer = Object.assign({}, s5Place);
    s5View = 'solution';
    s5Finish('wrong2');
  } else {
    s5LastWrong = s5Snap();
    s5RetryPartial = s5AnyRight(s5Place);
    s5Marks = marks;
    s5Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s5ShowPopup('retry');
  }
}
function s5Finish(outcome) {
  s5Done = true; s5Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s5-check'), 'انتهيت');
  if (outcome === 'wrong2') { s5ApplyView(); return; }
  s5Render();
  s5ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong board + popup. */
function s5ApplyView() {
  if (s5Answer === null) return;
  Object.keys(s5Place).forEach(d => { s5Place[d] = 'source'; });
  if (s5View === 'answer') { Object.assign(s5Place, s5Answer); s5Marks = s5MarksFor(s5Answer); }
  else { s5Targets().forEach(t => { s5Place[S5Q.correct[t]] = t; }); s5Marks = s5MarksFor(s5Place); }
  s5Render();
  s5ShowPopup('wrong2', s5View);
}
function s5ToggleView() {
  if (s5Answer === null) return;
  s5View = (s5View === 'solution') ? 'answer' : 'solution';
  s5ApplyView();
}
function s5ShowPopup(type, view) {
  const partial = type === 'retry' ? s5RetryPartial : type === 'wrong2' ? s5AnyRight(s5Answer || s5Place) : false;
  const base = S5_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;
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
  if (s5Done) {
    if (s5Answer !== null) { s5View = 'solution'; Object.keys(s5Place).forEach(d => { s5Place[d] = 'source'; }); s5Targets().forEach(t => { s5Place[S5Q.correct[t]] = t; }); s5Marks = s5MarksFor(s5Place); }
    setNavLabel(document.getElementById('s5-check'), 'انتهيت');
    s5Render();
    return;
  }
  s5Pick = null;                                           // left mid-way (even before a first check): comes back exactly
  s5Render();                                              // as left, like S2-S4 of this part (no popup)
}

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
  s3WireInputs();
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
   from metadata/methodica-ar-science-mass-liquid-02-07.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: null,                     // מועד ב intro
  1: ['001', 1],               // the Levi family (still)
  2: ['001', 2],               // evidence hotspots (multi-select)
  3: ['001', 3],               // the three-field value input
  4: ['001', 4],               // single choice
  5: ['001', 5]                // ordered drag-and-drop; the unit ends here
};

var XAPI_COMP_SLUG = 'methodica-ar-science-mass-liquid-02-07';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-ar-science-mass-liquid-02-07.json';
var XAPI_END_BTN = 's5-check';   /* the part's last button (D-8, restoreEndedButton) */
/* The single catalogue item carries all four questions: its own 'completed' mirrors the component result. */
var XAPI_ITEM_RESULT = { '001': function () { return xapiPartResult(); } };
/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* 'עליכם להצליח ב-3 לפחות' out of 4 sub-parts: gate and denominator coincide. */
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
  /* The מועד ב verdict, through the shared layer (D-12). */
  try { if (typeof setUnitResult === 'function') setUnitResult('mass-liquid-02_moedBPassed', String(peakPassed())); } catch (e) {}
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
}

/* ═══ RESUME — the four per-part hooks (unit-js/40-resume.js; guide §8.7) ═══
   Every sub-part renders from its state variables (sNRender is the single owner of its dots / fields / board + bar
   button + hint visibility), so the painters are the screens' own renderers. The one thing that lives only in the
   DOM is S3's three typed values (#s3-input-m/q/l): captured as `inputs` and put back by applyResumeDom BEFORE the
   painter (which locks / overwrites them from the restored state). Never captured: the keyboard pick (s5Pick), the
   DnD controller and its click latch (s5Dnd, s5SkipClick), the ripple demo, popup positions, partEnded (after a
   reload the LEDGER decides — restoreEndedButton, D-8). Sets travel as arrays; const Sets / objects are refilled in
   place, never reassigned. */

/* ── 1. capture ── */
function rsScq(selected, attempts, done, outcome, lw) {
  return { selected: selected, attempts: attempts, done: done, outcome: outcome, lw: lw };
}
function rsInputVal(k) { var el = s3In(k); return el ? el.value : ''; }
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    screens: {
      s2: { selected: [...s2Selected], touched: [...s2Touched], attempts: s2Attempts, done: s2Done, outcome: s2Outcome,
            lw: s2LastWrong, marked: s2Marked === null ? null : [...s2Marked] },
      s3: { inputs: { m: rsInputVal('m'), q: rsInputVal('q'), l: rsInputVal('l') },
            attempts: s3Attempts, done: s3Done, outcome: s3Outcome, lw: s3LastWrong,
            kept: [...s3Kept], wrong: [...s3Wrong], answer: s3Answer === null ? null : JSON.parse(JSON.stringify(s3Answer)),
            view: s3View, retryPartial: s3RetryPartial },
      s4: rsScq(s4Selected, s4Attempts, s4Done, s4Outcome, s4LastWrong),
      s5: { place: Object.assign({}, s5Place), attempts: s5Attempts, done: s5Done, outcome: s5Outcome, lw: s5LastWrong,
            marks: s5Marks === null ? null : Object.assign({}, s5Marks), retryPartial: s5RetryPartial,
            answer: s5Answer === null ? null : Object.assign({}, s5Answer), view: s5View }
    }
  };
}

/* ── 2. variables (never the DOM). Safe with a partial payload. ── */
function rsStr(v) { return typeof v === 'string' ? v : null; }
/* The harness forces done:true everywhere to sweep the painters; a resolved question without a verdict renders as correct. */
function rsOutcome(v, done) { var o = rsStr(v); return (done && !o) ? 'correct' : o; }
/* Refill a const Set in place from an array, keeping only known members. */
function rsFillSet(set, arr, known) {
  set.clear();
  if (Array.isArray(arr)) arr.forEach(function (k) { if (known.indexOf(k) !== -1) set.add(k); });
}
/* A board placement { dragId: 'source' | targetId } over s5Place's own keys (the const object's key order). */
function rsPlacement(p) {
  var out = {}, targets = s5Targets();
  Object.keys(s5Place).forEach(function (d) { var t = p && typeof p === 'object' ? p[d] : null; out[d] = targets.indexOf(t) !== -1 ? t : 'source'; });
  return out;
}
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults && typeof st.qResults === 'object') Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  var sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  var v, ids;
  if ((v = sc.s2) && typeof v === 'object') {
    ids = [...s2Dots()].map(function (d) { return d.dataset.id; });
    rsFillSet(s2Selected, v.selected, ids); rsFillSet(s2Touched, v.touched, ids);   /* const Sets: refilled in place */
    s2Attempts = v.attempts | 0; s2Done = !!v.done; s2Outcome = rsOutcome(v.outcome, s2Done); s2LastWrong = rsStr(v.lw);
    s2Marked = Array.isArray(v.marked) ? new Set(v.marked.filter(function (k) { return ids.indexOf(k) !== -1; })) : null;
    if (s2Attempts > 0 && !s2Done && s2LastWrong === null) s2LastWrong = s2Snap();   /* older document (rule 9) */
  }
  if ((v = sc.s3) && typeof v === 'object') {
    s3Attempts = v.attempts | 0; s3Done = !!v.done; s3Outcome = rsOutcome(v.outcome, s3Done); s3LastWrong = rsStr(v.lw);
    rsFillSet(s3Kept, v.kept, S3_KEYS); rsFillSet(s3Wrong, v.wrong, S3_KEYS);
    if (v.answer && typeof v.answer === 'object') {
      s3Answer = {};
      S3_KEYS.forEach(function (k) { var s = (v.answer[k] && typeof v.answer[k] === 'object') ? v.answer[k] : {}; s3Answer[k] = { value: typeof s.value === 'string' ? s.value : '', correct: !!s.correct }; });
    } else s3Answer = null;
    s3View = (v.view === 'answer' && s3Answer !== null) ? 'answer' : 'solution';   /* the answer view needs its snapshot */
    s3RetryPartial = !!v.retryPartial;
    /* the rule-9 fallback for s3LastWrong is s3Sig(), read from the fields: applyResumeDom does it once they are back */
  }
  if ((v = sc.s4) && typeof v === 'object') {
    s4Selected = rsStr(v.selected); s4Attempts = v.attempts | 0; s4Done = !!v.done; s4Outcome = rsOutcome(v.outcome, s4Done);
    s4LastWrong = rsStr(v.lw);
    if (s4Attempts > 0 && !s4Done && s4LastWrong === null) s4LastWrong = s4Selected;   /* rule 9 */
  }
  if ((v = sc.s5) && typeof v === 'object') {
    var place = rsPlacement(v.place);
    Object.keys(s5Place).forEach(function (d) { s5Place[d] = place[d]; });   /* const object: same identity, same keys */
    s5Attempts = v.attempts | 0; s5Done = !!v.done; s5Outcome = rsOutcome(v.outcome, s5Done); s5LastWrong = rsStr(v.lw);
    if (v.marks && typeof v.marks === 'object') {
      s5Marks = {};
      s5Targets().forEach(function (t) { s5Marks[t] = v.marks[t] === 'correct' ? 'correct' : 'wrong'; });
    } else s5Marks = null;
    s5RetryPartial = !!v.retryPartial;
    s5Answer = (v.answer && typeof v.answer === 'object') ? rsPlacement(v.answer) : null;
    s5View = (v.view === 'answer' && s5Answer !== null) ? 'answer' : 'solution';
    if (s5Attempts > 0 && !s5Done && s5LastWrong === null) s5LastWrong = s5Snap();   /* rule 9 */
  }
}

/* ── 3. what lives only in the DOM: S3's typed values (runs AFTER goTo, BEFORE the painter, which locks / overwrites
      them from the restored state, rule 11). The other screens render wholly from their variables. ── */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
  var v = st.screens.s3;
  if (v && typeof v === 'object' && v.inputs && typeof v.inputs === 'object') {
    S3_KEYS.forEach(function (k) { var el = s3In(k); if (el) el.value = typeof v.inputs[k] === 'string' ? v.inputs[k] : ''; });
    if (s3Attempts > 0 && !s3Done && s3LastWrong === null) s3LastWrong = s3Sig();   /* rule 9, only once the fields are back */
  }
}

/* ── 4. painter dispatch — the screen's own pure renderer per answered screen (rule 11). Idempotent, never resets
      state, never throws on a clean screen. hsLayout / the ripple demo are s2Enter's and s3Enter's (they need the
      active screen and are not state). ── */
function restoreScreenUI(n) {
  switch (n) {
    case 2: s2Render(); break;
    case 3: s3Render(); break;
    case 4: s4Render(); break;
    case 5:
      if (s5Done) setNavLabel(document.getElementById('s5-check'), 'انتهيت');
      s5Render();   /* board + marks from s5Place / s5Marks; s5-check from s5Done / partEnded */
      break;
    default: break;   /* 0 (intro), 1 (the family still): no state */
  }
  /* A resolved question's feedback re-shows on the initial restore only (in-session Back does it via goTo(n, true)). */
  if (typeof _restoring !== 'undefined' && _restoring) { try { reopenFeedbackIfResolved(n); } catch (e) {} }
}
