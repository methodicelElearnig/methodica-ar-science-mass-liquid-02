/* methodica-science-mass-liquid-02-01 — js/main.js
   Engine + per-screen logic. Part 01 = component 01 of the script (6-10-26 deck, slides 3-50):
   S0 character pick, S1-S21 (all built). Every screen carries its own slide reference. */
'use strict';

const TOTAL_SCREENS = 22;
let currentScreen = 0;

window.lomdaState = window.lomdaState || { selectedCharacter: null };
const CHARACTER_STORAGE_KEY = 'methodica-science-mass-liquid-02_selectedCharacter';

/* ===================== Canvas scaling ===================== */
/* Viewport-filling canvas (same model as the QA-approved 720 Science modules):
   scale so the 1280x710 design fits, then grow #app along the spare axis (in
   design px) so it covers the whole window — no letterbox gutters. Content
   stays centred; edge-anchored chrome (flag, nav bar) reaches the real edges. */
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
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]').forEach(el => el.classList.add('hidden'));
  closeRecallPopup();   // its id does not match the generic popup sweep (720-templates "RecallPopup")
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

function goBack() { goTo(currentScreen - 1, true); }

function advanceScreen() {
  const gate = SCREEN_GATES[currentScreen];
  if (gate && !gate()) return;
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(document.getElementById(XAPI_END_BTN)); return; }   // end of the part: ArrowLeft = the Continue button (QA 2026-10-07); the component ends here
  goTo(currentScreen + 1);
}

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('recall-overlay').classList.contains('hidden')) return;   // the open Recall popup owns the keys
  if (e.key === 'ArrowLeft') advanceScreen();
  if (e.key === 'ArrowRight') goBack();
});

/* ===================== RecallPopup (global, one instance for the part) =====================
   720-templates _global-components "RecallPopup": one #recall-overlay serves every trigger on the part (here S21's
   .scq-hint.recall-btn); it never gates on question state. Closes on the X, the backdrop and Escape; goTo() closes it
   through closeRecallPopup(). Modal: Tab stays on the close button, focus returns to the trigger on close. */
let recallReturnFocus = null;
function openRecallPopup(trigger) {
  const ov = document.getElementById('recall-overlay');
  if (!ov) return;
  recallReturnFocus = trigger || null;
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
/* ===================== Image zoom (global, as part 02) =====================
   Clone-based (720-templates "Image zoom"): the stage receives a clone of the
   trigger's [data-zoom-wrapper], enlarged with one uniform transform, capped at
   the Image Zoom Surface envelope (1200x640 -> 1072x512 media after the 64px margin) and never beyond
   the source's own resolution. A plain wrapper takes its image's aspect ratio.
   A [data-zoom-composite] wrapper (the S2 comic: three panels + live overlays)
   is cloned whole: its box is the union of the wrapper and every visible overlay,
   so bubbles that overhang a panel edge stay in the zoom; art cropped by an
   overflow-hidden frame counts only as that frame. */
const ZOOM_MEDIA_MAX_W = 1200 - 2 * 72, ZOOM_MEDIA_MAX_H = 690 - 2 * 24;   // envelope 1200x690, padding 24/72 -> media 1056x642 (720-design-guidelines, producer 2026-10-13)
let zoomReturnFocus = null;
function zoomCompositeBox(wrapper) {
  const s = wrapper.getBoundingClientRect().width / wrapper.offsetWidth;   // the canvas scale (scaleApp)
  const wr = wrapper.getBoundingClientRect();
  let x0 = 0, y0 = 0, x1 = wrapper.offsetWidth, y1 = wrapper.offsetHeight;
  wrapper.querySelectorAll('*').forEach(el => {
    if (el.closest('.img-zoom-btn')) return;
    for (let a = el.parentElement; a && a !== wrapper; a = a.parentElement) {
      if (getComputedStyle(a).overflow !== 'visible') return;   // clipped: its frame already counts
    }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    x0 = Math.min(x0, (r.left - wr.left) / s); y0 = Math.min(y0, (r.top - wr.top) / s);
    x1 = Math.max(x1, (r.right - wr.left) / s); y1 = Math.max(y1, (r.bottom - wr.top) / s);
  });
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}
function openImgZoom(trigger) {
  const wrapper = trigger.closest('[data-zoom-wrapper]');
  const modal = document.getElementById('img-zoom-modal');
  const stage = document.getElementById('img-zoom-modal-stage');
  if (!wrapper || !modal || !stage) return;
  const panel = modal.querySelector('.img-zoom-modal__panel');
  const composite = wrapper.hasAttribute('data-zoom-composite');
  let uw, uh, ox = 0, oy = 0, resCap = Infinity, maxH = ZOOM_MEDIA_MAX_H;
  panel.classList.toggle('img-zoom-modal__panel--tall', composite);
  if (composite) {
    const b = zoomCompositeBox(wrapper);
    uw = b.w; uh = b.h; ox = -b.x0; oy = -b.y0;
    /* PROJECT DEVIATION (producer 2026-10-11, re-confirmed 2026-10-19): the portrait comic is height-bound and
       carries caption text, so on a canvas TALLER than the canonical 1280x710 its panel may exceed the 1200x690
       envelope and take the canvas height less 16px each side and 24px vertical padding. Math.max keeps the
       canonical 642 as a floor, so this path never yields less than the standard cap (at 16:9 the two effectively
       coincide: 720 - 80 = 640 vs 642). Reconciling the two producer decisions is a Skill Maintainer item. */
    maxH = Math.max(ZOOM_MEDIA_MAX_H, document.getElementById('app').offsetHeight - 2 * 16 - 2 * 24);
  } else {
    const img = wrapper.querySelector('img');
    const ratio = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : wrapper.offsetWidth / wrapper.offsetHeight;
    uw = wrapper.offsetWidth; uh = uw / ratio;
    if (uh > wrapper.offsetHeight) { uh = wrapper.offsetHeight; uw = uh * ratio; }
    if (img && img.naturalWidth) resCap = img.naturalWidth / uw;
  }
  const k = Math.min(ZOOM_MEDIA_MAX_W / uw, maxH / uh, resCap);
  const clone = wrapper.cloneNode(true);
  clone.querySelectorAll('.img-zoom-btn').forEach(b => b.remove());
  clone.querySelectorAll('[data-reveal]').forEach(el => el.removeAttribute('data-reveal'));
  clone.removeAttribute('data-reveal');
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));   // no duplicate ids (S3 panel images carry one)
  Object.assign(clone.style, { position: 'absolute', left: (ox * k) + 'px', top: (oy * k) + 'px', margin: '0', borderRadius: '0',
    width: (composite ? wrapper.offsetWidth : uw) + 'px',
    height: (composite ? wrapper.offsetHeight : uh) + 'px',
    transform: 'scale(' + k + ')', transformOrigin: '0 0' });
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImgZoom(); });

/* Per-screen "may we advance" gates (resolved-state, never correctness-state) */
const SCREEN_GATES = {
  0: () => !!window.lomdaState.selectedCharacter,
  1: () => s2Done,
  4: () => icxUnlocked,
  6: () => hsAllOpened(),
  7: () => s7Done,
  8: () => frc8Seen.every(Boolean),
  10: () => s10Concluded,
  11: () => s11Concluded,
  13: () => s13BothTried(),
  15: () => s15AllOpened(),
  16: () => s16Visited.size >= S16_KEYS.length,
  17: () => s17Done,
  18: () => s18Done,
  20: () => s20Done,
  21: () => s21Done
};

function reopenFeedbackIfResolved(n) {
  if (n === 1 && s2Done) { s2ShowPopup(s2Outcome); }
  if (n === 7 && s7Done) { if (s7Outcome === 'wrong2') s7ApplyView(); else s7ShowPopup(s7Outcome); }
  if (n === 17 && s17Done) { s17ShowPopup(s17Outcome); }
  if (n === 18 && s18Done) { if (s18Outcome === 'wrong2') s18ApplyView(); else s18ShowPopup(s18Outcome); }
  if (n === 20 && s20Done) { s20ShowPopup(s20Outcome); }
  if (n === 21 && s21Done) { if (s21Outcome === 'wrong2') s21ApplyView(); else s21ShowPopup(s21Outcome); }
}

/* ===================== Shared: draggable feedback popup ===================== */
let popupDrag = null;

function toCanvas(e) {
  const app = document.getElementById('app');
  const m = app.style.transform.match(/scale\(([^)]+)\)/);
  const scale = m ? parseFloat(m[1]) : 1;
  return {
    x: (e.clientX - (parseFloat(app.style.left) || 0)) / scale,
    y: (e.clientY - (parseFloat(app.style.top)  || 0)) / scale
  };
}
/* Drag bounds: the whole canvas above the bar. The canvas is viewport-filling
   (scaleApp), so the bounds come from #app's live design-space size rather
   than a fixed 1280x710 (G9). */
function clampPopupPosition(x, y, popupEl) {
  const app = document.getElementById('app');
  const w = popupEl.offsetWidth, h = popupEl.offsetHeight;
  const minX = 0, maxX = app.offsetWidth - w;
  const minY = 0, maxY = (app.offsetHeight - 74) - h;
  return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, minY), maxY) };
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

/* Every open returns the popup to its CSS default position (.scq-popup):
   clearing the drag's inline offsets is enough. */
function resetPopupPosition(popup) {
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}

/* reserve: every label this button can show. Like the nav buttons' "nav label"
   (Figma 2567:20391), invisible SemiBold copies of them share the label's grid
   cell, so the pill keeps one footprint across hover (Bold) and label swaps. */
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


/* ===================== Screen image map (FullImageWithTextOverlay) ===================== */
const SCREEN_IMAGES = {
  's3-img-1': { src: 'assets/img/s3-comic-panel-1.png', alt: 'صورة 1: رجل محتار يحك رأسه بجانب طاولة عليها عصي قياس قديمة.' },
  's3-img-2': { src: '../unit-assets/img/s3-comic-panel-2.png', alt: 'صورة 2: حشد مبتهج في أحد شوارع فرنسا، وفي وسطه رجل يرفع علم فرنسا.' },
  's3-img-3': { src: 'assets/img/s3-comic-panel-3.png', alt: 'الصورة 3: خريطة العالم، مع تحديد موقع الولايات المتحدة الأمريكية وليبيريا وميانمار عليها.' },
  's6w-img': { src: 'assets/img/s6w-supermarket-welcome.png', alt: 'ممر مضاء في السوبرماركت بين أكشاك الفواكه والخضروات ورفوف المشروبات، وفي وسطه لافتة كبيرة.' },
  's6-img': { src: 'assets/img/s6-supermarket-shelves.png', alt: 'رف في السوبرماركت: قناني صغيرة من الخلاصة، قناني مياه، دلاء، صناديق تخزين، محاقن وخزانة تخزين.' }
};
function mountScreenImage(imgId) {
  const img = document.getElementById(imgId);
  const asset = SCREEN_IMAGES[imgId];
  if (!img || !asset || img.getAttribute('src') === asset.src) return;
  img.src = asset.src;
  img.alt = asset.alt;
}
function s3Enter() { ['s3-img-1', 's3-img-2', 's3-img-3'].forEach(mountScreenImage); }
function s6wEnter() { mountScreenImage('s6w-img'); }

/* ===================== Companion character video (TransitionScreen) =====================
   720-templates TransitionScreen.md JS contract. Each TransitionScreen keeps
   its own map. Re-entry: a correct clip is never restarted; an interrupted
   clip resumes; an ended clip stays on its last frame. */
const DEFAULT_CHARACTER = 'character-1';   // only reachable via DEV jumps: S1 gates on a selection
function applyCompanionCharacter(characterMap, videoId) {
  const char = window.lomdaState.selectedCharacter || DEFAULT_CHARACTER;
  const assets = characterMap[char] || characterMap[DEFAULT_CHARACTER];
  const vid = document.getElementById(videoId);
  if (!vid || !assets) return;
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
/* Slide 6: the arms-out "explainer" clips (presenter note). No scale fit
   (frame-0 ink heights 642 / 666px, 3.6%, within the ~3% band). shiftY puts
   each clip's own ground line (box y 339 / 337 of 360) on the bar line —
   the clip layer clips the empty frame below the feet (producer 2026-09-30). */
const S4_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-standing.mp4', fit: { scale: 1, shiftY: 20 } },
  'character-2': { video: 'assets/video/character-2-standing.mp4', fit: { scale: 1, shiftY: 22 } }
};
function s4Enter() { applyCompanionCharacter(S4_CHARACTER, 's4-char-video'); }
/* Slide 14: the "thinking" clips (presenter note "הדמות בגיף בתנוחת חשיבה").
   No scale fit (frame-0 ink heights 340 / 345px, 1.5%, within the ~3% band);
   shiftY puts each clip's own ground line (box y 346 / 344 of 360) on the bar
   line, as on slide 6. NOTE: the character-2 thinking clip was delivered as
   "character-2-selection.mp4.mp4" (verified visually: turquoise character,
   thinking pose, 4.01s; the real S1 selection clip is character-2-selection.mp4)
   and renamed to character-2-thinking.mp4 on 2026-10-22 (MEDIA-CHANGES.md §2). */
const S9_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-thinking.mp4', fit: { scale: 1, shiftY: 13 } },
  'character-2': { video: 'assets/video/character-2-thinking.mp4', fit: { scale: 1, shiftY: 15 } }
};
function s9Enter() { applyCompanionCharacter(S9_CHARACTER, 's9-char-video'); }
/* Slide 41: the "presenting two objects" clips - bottle in one hand, balance scale in the other (presenter note
   "הגיף הנבחר מחזיק בקבוק ביד אחת ומאזני כפות ביד השניה"; verified visually: character-1 grey, character-2
   turquoise; 1280x720, 6.00s; re-delivered 2026-10-05 with a clean white background, mean 255). No scale
   fit (frame-0 ink heights 653 / 660px, 1.1%, within the ~3% band); shiftY puts each clip's ground line (box y
   339.5 / 337.5 of 360) on the bar line, as on slides 6 and 14. */
const S14_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-presenting-two-objects.mp4', fit: { scale: 1, shiftY: 20 } },
  'character-2': { video: 'assets/video/character-2-presenting-two-objects.mp4', fit: { scale: 1, shiftY: 22 } }
};
function s14Enter() { applyCompanionCharacter(S14_CHARACTER, 's14-char-video'); }

/* Slide 48: the "stretching" clips (presenter note "הגיף שנבחר באנימציה של מתיחות"; verified visually: character-1 grey,
   character-2 turquoise, side-stretch with an arm overhead; 1280x720, 4.01s). No scale fit (frame-0 ink heights 659 / 661px,
   re-delivered 2026-10-06 with a clean white background; 657 / 651px, 0.9%; the pose moves, so later frames are 608-667 - the screen is judged on frame 0 like the others); shiftY puts each clip's
   ground line (feet planted: ink bottom y 670 / 674 of 720 = box y 335 / 337 of 360) on the bar line, as on slides 6, 14, 41.
   Background: clean white (mean 255, 0 noise) - the re-delivery, as on slide 41 (G84). */
const S19_CHARACTER = {
  'character-1': { video: 'assets/video/character-1-stretching.mp4', fit: { scale: 1, shiftY: 25 } },
  'character-2': { video: 'assets/video/character-2-stretching.mp4', fit: { scale: 1, shiftY: 23 } }
};
function s19Enter() { applyCompanionCharacter(S19_CHARACTER, 's19-char-video'); }

/* ===================== resetScreenState dispatcher ===================== */
/* ===================== S4 (index 4) — InfoCardsImage =====================
   Illustrative clips (role B): muted, no native controls; each plays once and
   holds its final frame. First visit = a sequence (producer 2026-10-01): DOM
   order is the RTL reading order, so clip 0 (מוצק, rightmost) plays first; when
   the sequence clip ends the next one starts. Continue unlocks as soon as the
   first clip starts playing (producer 2026-10-11, was: when the third first play
   ended) — the clips are illustrative, with no narrated learning content to wait
   for; if the browser refuses playback it unlocks too, so no one is stuck.
   icxDone[i] = clip i finished its required first play (only ever
   turns true). A clip's replay button is shown only while that clip stands
   finished (producer 2026-10-05): hidden before and during its first play and
   during a replay, shown on 'ended'. A replay plays that clip alone - it never
   re-locks Continue, restarts the sequence, or starts another clip. Pressing it
   from the keyboard parks focus on the clip (tabindex -1) while the button is
   hidden and hands it back to the button when the clip ends. goTo() pauses everything on leave; entry continues the sequence
   clip (or an interrupted replay) from its current frame and never replays an
   ended clip. No 720 contract covers media under reduced motion (the motion rule
   is reveal/popup only), so the sequence is the same there. */
const ICX_N = 3;
const icxDone = [false, false, false];
let icxSeq = 0;                                   // clip the sequence is on (3 = done)
let icxUnlocked = false;                          // Continue: on once clip 0 starts (only ever turns true)
const icxVideos = () => [...document.querySelectorAll('#s5 .icx-video')];
function icxSync() {
  const vids = icxVideos();
  document.querySelectorAll('#s5 .icx-replay').forEach((b, i) => { b.hidden = !(icxDone[i] && vids[i].ended); });
  document.getElementById('s5-continue').disabled = !icxUnlocked;
}
function icxUnlock() {
  if (icxUnlocked) return;
  icxUnlocked = true; icxSync();
  /* resume: synchronous save after the last commitment (guide §8.3, D-13) — the same one-liner follows every
     gate-earning state change, every sNFinish and every retry branch below */
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
}
/* Reading delay before the FIRST clip starts (producer 2026-10-07): the title and definition
   ("מהו נפח?" + "נפח הוא המקום שגוף מוצק, נוזל או גז תופסים במרחב.") are 12 words. At a typical
   silent-reading pace for grades 7-8 (~180 words/min) that is ~4.0 s, plus ~0.8 s for the
   entrance reveal (600 ms fade + 180 ms stagger) and a moment to take in the cards: 5 s from
   entering the screen. Applies only while clip 0 has never started; a clip that was already
   playing (interrupted) resumes at once, and clips 2 and 3 follow their predecessor directly. */
const ICX_READ_DELAY_MS = 5000;
let icxReadTimer = null;
function icxEnter() {
  clearTimeout(icxReadTimer);
  icxVideos().forEach((v, i) => {
    if (v.readyState === 0) { v.preload = 'auto'; v.load(); }   // show first frames
    const interrupted = v.paused && !v.ended && v.currentTime > 0;
    if (i === icxSeq && i === 0 && !v.ended && v.currentTime === 0) {
      icxReadTimer = setTimeout(() => {                         // first clip: wait for the reading time
        if (currentScreen === 4 && icxSeq === 0 && v.paused && !v.ended && v.currentTime === 0) v.play().catch(icxUnlock);
      }, ICX_READ_DELAY_MS);
    } else if (i === icxSeq ? !v.ended : (icxDone[i] && interrupted)) v.play().catch(() => {});
  });
  icxSync();
}
icxVideos().forEach((v, i) => {
  v.addEventListener('ended', () => {
    icxDone[i] = true;
    if (i === icxSeq) {
      icxSeq++;
      if (icxSeq < ICX_N && currentScreen === 4) icxVideos()[icxSeq].play().catch(() => {});
    }
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    icxSync();
    const clip = v.closest('.icx-clip');                          // a keyboard replay: give focus back
    if (clip && document.activeElement === clip) document.querySelectorAll('#s5 .icx-replay')[i].focus();
  });
  v.addEventListener('play', icxSync);
  if (i === 0) v.addEventListener('playing', icxUnlock);
});
document.querySelectorAll('#s5 .icx-replay').forEach((btn, i) => btn.addEventListener('click', () => {
  if (!icxDone[i]) return;
  const v = icxVideos()[i];
  const hadFocus = document.activeElement === btn;
  v.currentTime = 0;
  v.play().catch(() => {});
  icxSync();                                                      // ended is false again -> hide now
  if (hadFocus) v.closest('.icx-clip').focus({ preventScroll: true });
}));
// Start fetching the clips once the first screen has loaded, not at boot.
window.addEventListener('load', () => document.querySelectorAll('#s5 .icx-video').forEach(v => { if (v.paused && !v.currentTime) { v.preload = 'auto'; v.load(); } }));

function resetScreenState(n) {
  syncAllCharacterMedia();
  if (n === 0) s1Enter();
  else if (n === 1) s2Enter();
  else if (n === 2) s3Enter();
  else if (n === 3) s4Enter();
  else if (n === 4) icxEnter();
  else if (n === 5) s6wEnter();
  else if (n === 6) hsEnter();
  else if (n === 7) s7Enter();
  else if (n === 8) frc8Enter();
  else if (n === 9) s9Enter();
  else if (n === 10) fill11Enter();
  else if (n === 11) s11Enter();
  else if (n === 12) s12Enter();
  else if (n === 13) s13Enter();
  else if (n === 14) s14Enter();
  else if (n === 19) s19Enter();
  else if (n === 15) s15Reset();
  else if (n === 16) s16Enter();
  else if (n === 17) s17Enter();
  else if (n === 18) s18Enter();
  else if (n === 20) s20Enter();
  else if (n === 21) s21Enter();
}

/* ===================== Companion character (documented gap) =====================
   No character art/video was supplied for this module (see report). Screens
   that would show the companion character render a labelled placeholder
   instead of guessing at an asset. */
function syncAllCharacterMedia() {
  document.querySelectorAll('[data-char-slot]').forEach(el => {
    const char = window.lomdaState.selectedCharacter;
    el.textContent = char ? ('الشخصية: ' + char + ' (ملف مفقود — انظروا التقرير)') : 'ملف الشخصية مفقود';
  });
}

/* ===================== S1 — TwoOptionSelection (character pick) ===================== */
/* Companion selection clips (720-templates _global-components, re-entry rule
   2026-09-29): play once; on re-entry an interrupted clip resumes from where
   it stopped, a finished clip stays on its last frame (never replayed). */
function s1ResumeVideos() {
  document.querySelectorAll('#s0 .option-card-video').forEach(v => {
    if (v.paused && !v.ended) v.play().catch(() => {});
  });
}
// Old iOS Safari re-runs autoplay when the screen shows again; drop it once played.
document.querySelectorAll('#s0 .option-card-video').forEach(v =>
  v.addEventListener('ended', () => v.removeAttribute('autoplay'), { once: true }));

function s1Enter() {
  s1ResumeVideos();
  const saved = window.lomdaState.selectedCharacter;
  document.querySelectorAll('#s0 .option-card').forEach(c => {
    const isSel = !!saved && c.dataset.value === saved;
    c.classList.toggle('selected', isSel);
    c.setAttribute('aria-checked', isSel ? 'true' : 'false');
  });
  document.getElementById('s0-continue').disabled = !saved;
}

/* Radiogroup keyboard activation: Enter / Space selects the focused card. */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest && e.target.closest('#s0 .option-card');
  if (!card) return;
  e.preventDefault();
  selectOption(card);
});

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
function selectOption(cardEl) {
  document.querySelectorAll('#s0 .option-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.selectedCharacter = cardEl.dataset.value;
  /* The choice goes through the shared layer (unit-js/40-resume.js setUnitCharacter): the localStorage
     cache under CHARACTER_STORAGE_KEY (= UI_CHARACTER_KEY) for the next parts, and — once resume is
     on — this part's state document. */
  if (typeof setUnitCharacter === 'function') setUnitCharacter(cardEl.dataset.value);
  else { try { localStorage.setItem(CHARACTER_STORAGE_KEY, cardEl.dataset.value); } catch (err) {} }
  document.getElementById('s0-continue').disabled = false;
}
function advanceFromS0() { advanceScreen(); }

/* ===================== S2 — SingleChoiceQuestion media=image (slide 4 "מדידה בעבר") =====================
   Correct answer: option 2 (b) — the only option whose radio is filled
   (#34B050) on slide 4. ONE attempt — approved deviation from the 2-attempt
   default (QA comment chen, producer 2026-10-11): a wrong check goes straight
   to the final reveal (wrong2: chosen option red, correct option green, popup).
   No hint ("ללא רמז בשאלה זו"). Feedback: slide 4 authors a
   correct box ("נכון.") and one incorrect box ("התשובה אינה נכונה."), both with
   the same body -> correct + wrong2 share it (shared-explanation convention);
   wrong2 gets the canonical second title line. The retry copy stays defined but
   is unreachable at maxAttempts 1. */
const S2Q = { correctId: 'b', maxAttempts: 1 };
let s2Selected = null, s2Attempts = 0, s2Done = false, s2LastWrong = null, s2Outcome = null;
const S2_BODY = [
  'بدون نظام قياس موحد، قد تنشأ أخطاء وسوء فهم.',
  'إذن، كيف حلّوا المشكلة؟',
  '<strong>لنكمل ونكتشف.</strong>'
];
const S2_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح.', body: S2_BODY },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2_BODY }
};
function s2Opts() { return document.querySelectorAll('#s2 .scq-opt'); }
function s2Opt(id) { return document.querySelector('#s2 .scq-opt[data-id="' + id + '"]'); }

function s2Enter() {
  if (s2Done) { s2ApplyLocked(); return; }
  s2ResetInitial();
}
function s2ResetInitial() {
  s2Selected = null; s2Attempts = 0; s2Done = false; s2LastWrong = null; s2Outcome = null;
  s2Opts().forEach(o => {
    o.classList.remove('selected', 'correct', 'wrong');
    o.disabled = false;
    o.setAttribute('aria-checked', 'false');
  });
  const btn = document.getElementById('s2-check');
  setNavLabel(btn, 'هل إجابتي صحيحة؟');
  btn.disabled = true;
  document.getElementById('s2-popup').classList.add('hidden');
}
function s2Select(id) {
  if (s2Done) return;
  dismissRetryPopup('s2-popup', s2Done);
  if (s2Attempts > 0) s2Opts().forEach(o => o.classList.remove('wrong'));
  s2Opts().forEach(o => {
    const on = o.dataset.id === id;
    o.classList.toggle('selected', on);
    o.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  s2Selected = id;
  document.getElementById('s2-check').disabled = (id === s2LastWrong);   // Retry gate
}
/* One bar slot: "צדקתי?" checks until resolved, then progresses. */
function s2Primary() {
  if (s2Done) { advanceScreen(); return; }
  s2Check();
}
function s2Mark(id, cls) {
  const o = s2Opt(id);
  o.classList.remove('selected');
  o.classList.add(cls);
}
function s2Check() {
  if (!s2Selected || s2Done) return;
  s2Attempts++;
  /* xAPI: the graded answer — after the guards, before the finish/retry branch; one attempt, so the first verdict is also the last; the option's visible text is the metadata choice (guide §6.3). */
  xapiAnswered('002', 'q1', s2Selected === S2Q.correctId, s2Selected === S2Q.correctId || s2Attempts >= S2Q.maxAttempts,
    { choices: [xapiAnswerText(s2Opt(s2Selected))] });
  if (s2Selected === S2Q.correctId) {
    s2Mark(s2Selected, 'correct');
    s2Finish('correct');
  } else if (s2Attempts >= S2Q.maxAttempts) {
    s2Mark(s2Selected, 'wrong');
    s2Mark(S2Q.correctId, 'correct');
    s2Finish('wrong2');
  } else {
    s2Mark(s2Selected, 'wrong');       // chosen option red + ✗, correct not revealed
    s2LastWrong = s2Selected;
    document.getElementById('s2-check').disabled = true;
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s2ShowPopup('retry');
  }
}
function s2Finish(outcome) {
  s2Done = true; s2Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s2ApplyLocked();
  s2ShowPopup(outcome);
}
function s2ApplyLocked() {
  s2Opts().forEach(o => { o.disabled = true; });
  const btn = document.getElementById('s2-check');
  setNavLabel(btn, 'متابعة');
  btn.disabled = false;
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

/* ===================== S6 (index 6) — Info / discovery hotspots (slides 9 + 10) =====================
   One screen: slide 9 = closed, slide 10 = each dot's popup. Every dot opens its
   popup (image, then live text); one popup at a time; Continue unlocks once every
   popup has been opened (presenter note). Copy = slide 10's text boxes with their
   bold runs. Labels = slide 10's product labels, as live text on the product
   (producer 2026-10-01). Figure sizes keep each image's own ratio (max 210 x 178.5: x1.05 over the
   original 200 x 170, QA comment chen, producer 2026-10-11 — the largest uniform factor at which, on the
   1280 x 710 canvas, the tallest popup (vanilla) still opens below its dot without covering another dot).
   No close button (producer 2026-10-01): focus stays on the dot, which is described
   by the popup text while open; Escape / click outside / another dot close it. */
const HS_ITEMS = {
  vanilla: { name: 'خلاصة الفانيليا', img: 'assets/img/s6-vanilla.png', alt: 'قنينة خلاصة الفانيليا', fw: 119.7, fh: 178.5, label: 'خلاصة<br>الفانيليا<br>30 مل', lx: '50%', ly: '66.8%',
    text: '<strong>الأحجام الصغيرة</strong> (مثل مستخلصات النكهات،<br>ومنتجات التجميل والأدوية) تُقاس<br><strong>بالمل (مليلتر) وبالسم³<br>(سنتيمتر مكعب).</strong>' },
  water: { name: 'قنينة ماء', img: 'assets/img/s6-water-bottle.png', alt: 'قنينة ماء', fw: 118.65, fh: 178.5, label: '1.5<br>لتر', lx: '50%', ly: '76.8%',
    text: '<strong>الأحجام المتوسطة</strong> (مثل قناني الشراب، والإبريق، والدلو) تُقاس <strong>باللتر.</strong>' },
  bucket: { name: 'دلو', img: 'assets/img/bucket.png', alt: 'دلو', fw: 178.5, fh: 178.5, label: '6 لترات', lx: '50%', ly: '80%',
    text: '<strong>الأحجام المتوسطة</strong> (كالدلو، وقناني الشراب، والإبريق) تُقاس <strong>باللتر.</strong>' },
  box: { name: 'علبة تخزين', img: 'assets/img/s6-storage-box.png', alt: 'علبة تخزين الطعام', fw: 210, fh: 139.65, label: 'علبة تخزين<br>500 سم³', lx: '50%', ly: '62%',
    text: '<strong>الأجسام الهندسية الصغيرة</strong>،<br>(مثل علب تخزين الطعام) تُقاس<br><strong>بالسم³ (السنتيمتر المكعب)</strong>' },
  /* Syringe: 1254 x 1254 canvas, the syringe itself at x 97-1157 / y 532-773 ->
     shown by that region at 297 px wide (k 0.2802, 297 x 67.5) so the scale reads — the popup's
     inner width, so it grows +3% where the others grow +5%. */
  syringe: { name: 'محقنة', img: 'assets/img/s6-syringe.png', alt: 'محقنة مدرَّجة بتدريجات من 0 إلى 1', fw: 297, fh: 67.5, crop: { w: 1254, h: 1254, x0: 97, y0: 532, x1: 1157 }, label: '', lx: '50%', ly: '50%',
    text: 'نفس الحجم يمكن أن يظهر على المحقنة<br>\nسواء كـ-1 مل (مليلتر) أو كـ-1 سم³<br>\n(سنتيمتر مكعب).<br>\n<strong>1 سم³ = 1 مل</strong>' },
  cabinet: { name: 'خزانة تخزين', img: null,
    text: '<strong>الأحجام الكبيرة جدًا</strong> (مثل الخزائن والغرف وخزانات المياه وأحواض السباحة) تُقاس <strong>بالمتر المكعب (م³)</strong>' }
};
const hsVisited = new Set();
let hsOpenId = null;
function hsAllOpened() { return Object.keys(HS_ITEMS).every(id => hsVisited.has(id)); }
function hsDotEl(id) { return document.querySelector('#s6 .hs-dot[data-id="' + id + '"]'); }
/* Fetch every popup picture when the screen opens, so a click normally finds its picture already loaded. */
const hsPreloaded = {};
function hsPreload() {
  Object.values(HS_ITEMS).forEach(it => {
    if (it.img && !hsPreloaded[it.img]) { const im = new Image(); im.src = it.img; hsPreloaded[it.img] = im; }
  });
}
function hsEnter() {
  mountScreenImage('s6-img');
  hsPreload();
  hsClose(false);
  document.querySelectorAll('#s6 .hs-dot').forEach(d => {
    d.classList.toggle('is-visited', hsVisited.has(d.dataset.id));
    d.classList.remove('is-settled');   // each entry: unvisited dots pulse twice again
  });
  document.getElementById('s6-continue').disabled = !hsAllOpened();
}
/* The two pulses are over: freeze the ring hidden so hover/focus-out never replays it. */
document.addEventListener('animationend', (e) => {
  if (e.animationName === 'hs-pulse') e.target.closest('.hs-dot').classList.add('is-settled');
});
function hsOpen(id) {
  const item = HS_ITEMS[id], pop = document.getElementById('s6-pop');
  if (!item || !pop) return;
  if (hsOpenId) hsClose(false);
  const img = pop.querySelector('.hs-pop__img'), fig = pop.querySelector('.hs-pop__fig'), label = pop.querySelector('.hs-pop__label');
  pop.classList.toggle('hs-pop--text', !item.img);
  if (item.img) {
    // One <img> serves every product: a new src kept the PREVIOUS picture on screen until the new 0.9-1.6 MB PNG had
    // arrived (QA 2026-10-12, Nimrod). Hidden until the new picture is ready; reopening the same product shows at once.
    const reveal = () => { img.style.visibility = ''; };
    if (img.getAttribute('src') !== item.img) {
      img.style.visibility = 'hidden';
      img.onload = img.onerror = reveal;
      img.src = item.img;
      if (img.complete) reveal();
    } else reveal();
    img.alt = item.alt;
    fig.style.setProperty('--fw', item.fw + 'px'); fig.style.setProperty('--fh', item.fh + 'px');
    fig.classList.toggle('hs-pop__fig--crop', !!item.crop);
    if (item.crop) {
      const k = item.fw / (item.crop.x1 - item.crop.x0);
      Object.assign(img.style, { width: item.crop.w * k + 'px', height: item.crop.h * k + 'px', left: -item.crop.x0 * k + 'px', top: -item.crop.y0 * k + 'px' });
    } else { Object.assign(img.style, { width: '', height: '', left: '', top: '' }); }
    label.innerHTML = item.label; label.style.setProperty('--lx', item.lx); label.style.setProperty('--ly', item.ly);
  } else { img.removeAttribute('src'); img.alt = ''; label.innerHTML = ''; }
  pop.querySelector('.hs-pop__text').innerHTML = item.text;
  pop.hidden = false;
  hsFitWidth(pop, item.img ? item.fw : 0);
  hsOpenId = id;
  const dot = hsDotEl(id);
  dot.classList.add('is-open', 'is-visited'); dot.setAttribute('aria-expanded', 'true'); dot.setAttribute('aria-describedby', 's6-pop-text');
  hsVisited.add(id);
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  hsPlace();
  document.getElementById('s6-continue').disabled = !hsAllOpened();
}
/* Hug the popup to its rendered lines (producer 2026-10-01): lay the text out at the
   320px maximum, take the widest line (lines are right-aligned, so the union of the
   line boxes is the widest one) or the figure if wider, and narrow the popup to it.
   Same wrap points, no empty band on the left; the figure stays centred over the text. */
function hsFitWidth(pop, figW) {
  pop.style.width = '';
  const t = pop.querySelector('.hs-pop__text');
  const s = t.getBoundingClientRect().width / t.offsetWidth || 1;
  const r = document.createRange(); r.selectNodeContents(t);
  const rects = [...r.getClientRects()].filter(q => q.width > 0);
  if (!rects.length) return;
  const textW = (Math.max(...rects.map(q => q.right)) - Math.min(...rects.map(q => q.left))) / s;
  const chrome = pop.offsetWidth - t.offsetWidth;
  pop.style.width = Math.min(pop.offsetWidth, Math.ceil(Math.max(textW, figW)) + 1 + chrome) + 'px';
}
function hsClose(returnFocus) {
  const pop = document.getElementById('s6-pop');
  if (!pop) return;
  pop.hidden = true;
  if (!hsOpenId) return;
  const dot = hsDotEl(hsOpenId);
  dot.classList.remove('is-open'); dot.setAttribute('aria-expanded', 'false'); dot.removeAttribute('aria-describedby');
  hsOpenId = null;
  if (returnFocus) dot.focus();
}
/* Place the open popup next to its dot inside the visible band: above, else below,
   else to the right, else to the left of the dot (stage px). The beak points at it.
   Above/below: if the centred popup would cover another dot, slide it sideways just
   enough to clear that dot, as long as the beak stays on its own dot. */
function hsPlace() {
  if (!hsOpenId) return;
  const pop = document.getElementById('s6-pop'), stage = document.getElementById('s6-stage'), band = stage.parentElement;
  const dot = hsDotEl(hsOpenId);
  const s = stage.getBoundingClientRect().width / stage.offsetWidth;
  const st = stage.getBoundingClientRect(), bd = band.getBoundingClientRect();
  const vis = { l: (bd.left - st.left) / s + 8, t: (bd.top - st.top) / s + 22, r: (bd.right - st.left) / s - 8, b: (bd.bottom - st.top) / s - 8 };
  const dx = dot.offsetLeft + dot.offsetWidth / 2, dy = dot.offsetTop + dot.offsetHeight / 2;
  const W = pop.offsetWidth, H = pop.offsetHeight, R = 16 + 16.5 + 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  const others = [...document.querySelectorAll('#s6 .hs-dot')].filter(d => d !== dot).map(d => ({ x: d.offsetLeft + d.offsetWidth / 2, y: d.offsetTop + d.offsetHeight / 2 }));
  const covers = (l, t) => others.filter(o => o.x > l - 16 && o.x < l + W + 16 && o.y > t - 16 && o.y < t + H + 16).length;
  const beakOk = l => dx - l - 16.5 >= 12 && dx - l - 16.5 <= W - 45;
  const bestLeft = top => {
    const base = clamp(dx - W / 2, vis.l, vis.r - W);
    const cands = [base].concat(...others.map(o => [o.x + 22, o.x - 22 - W])).map(l => clamp(l, vis.l, vis.r - W)).filter(beakOk);
    return cands.sort((a, b) => covers(a, top) - covers(b, top) || Math.abs(a - base) - Math.abs(b - base))[0] ?? base;
  };
  const vy = clamp(dy - H / 2, vis.t, vis.b - H);
  const options = [
    { side: 'above', left: bestLeft(dy - R - H), top: dy - R - H, ok: dy - R - H >= vis.t },
    { side: 'below', left: bestLeft(dy + R), top: dy + R, ok: dy + R + H <= vis.b },
    { side: 'right', left: dx + R, top: vy, ok: dx + R + W <= vis.r },
    { side: 'left', left: dx - R - W, top: vy, ok: dx - R - W >= vis.l }
  ];
  const o = options.find(p => p.ok) || options[0];
  pop.classList.remove('hs-pop--above', 'hs-pop--below', 'hs-pop--right', 'hs-pop--left');
  pop.classList.add('hs-pop--' + o.side);
  pop.style.left = o.left + 'px'; pop.style.top = o.top + 'px';
  if (o.side === 'above' || o.side === 'below') pop.style.setProperty('--beak-x', clamp(dx - o.left - 16.5, 12, W - 45) + 'px');
  else pop.style.setProperty('--beak-y', clamp(dy - o.top - 9, 10, H - 28) + 'px');
}
document.addEventListener('click', (e) => {
  if (currentScreen !== 6) return;
  const dot = e.target.closest('#s6 .hs-dot');
  if (dot) { if (hsOpenId === dot.dataset.id) hsClose(true); else hsOpen(dot.dataset.id); return; }
  if (hsOpenId && !e.target.closest('#s6-pop')) hsClose(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && currentScreen === 6 && hsOpenId) hsClose(true); });
window.addEventListener('resize', () => { if (currentScreen === 6) hsPlace(); });

/* ===================== Shared: pointer drag-and-drop helper =====================
   Pointer Events only (mouse, touch, pen), per the DragAndDropQuestion Image Top
   reference (createPointerDnd, methodica-science-mass-measure-01-01): a clone of
   the picked element follows the pointer in viewport-fixed coordinates, scaled
   like #app; drop targets are hit-tested under the pointer.
   opts.returnMs (opt-in, S13): after a drag the ghost glides back onto its source over returnMs (instant under
   reduced motion) and the source keeps .dragging until it lands; the drop/cancel callbacks still fire at once. */
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
    if (settle) settle();                               // a glide still running lands at once
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
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (moved && opts.returnMs && !reduced) {
      const r = src.getBoundingClientRect();
      ghost.style.transition = 'left ' + opts.returnMs + 'ms ease, top ' + opts.returnMs + 'ms ease';
      ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
      let timer = null;
      settle = () => { clearTimeout(timer); settle = null; ghost.remove(); src.classList.remove('dragging'); };
      timer = setTimeout(settle, opts.returnMs);
    } else {
      src.classList.remove('dragging');
      ghost.remove();
    }
    if (!moved) { if (opts.onTap) opts.onTap(dragId, src); return; }   // a press without a drag = tap
    if (over && opts.onDrop) opts.onDrop(dragId, over); else if (opts.onCancel) opts.onCancel(dragId);
  }
  return { attachSource, attachTarget };
}

/* ===================== S7 (index 7) — DragAndDropQuestion, Image Top (slide 11) =====================
   720-templates DragAndDropQuestion (Image Top layout): each target holds exactly
   one chip; dropping on an occupied target evicts its chip to the bank; dropping
   elsewhere returns it; placed chips stay draggable until checked; Check enables
   when all four targets are filled; two attempts (retry -> each target ✓ / ✕, per-answer
   verdict rule, producer 2026-10-07: every chip stays movable and a target's mark clears
   once its content changes; Retry gate on the identical placement; final wrong -> solution shown at once + View My
   Answer Toggle). Scoring (producer 2026-10-01, "the most scientifically correct"):
   1 ml = 1 cm3, so the two small items each accept either small unit; the reveal
   uses the slide's solved layout (perfume = ml, dice = cm3).
   Keyboard / tap (no Figma state - the same Selected look as dragging): press a
   chip to pick it, then press a target to place it; pressing a filled target picks
   its chip up again; Escape drops the pick. */
const S7Q = {
  accept: {
    's7-t-perfume': ['s7-d-ml', 's7-d-cc'],
    's7-t-dice':    ['s7-d-ml', 's7-d-cc'],
    's7-t-bucket':  ['s7-d-l'],
    's7-t-truck':   ['s7-d-m3']
  },
  reveal: { 's7-t-perfume': 's7-d-ml', 's7-t-dice': 's7-d-cc', 's7-t-bucket': 's7-d-l', 's7-t-truck': 's7-d-m3' },
  maxAttempts: 2
};
/* Slide 11's full chip names (QA comment chen, producer 2026-10-11). Shown in two lines (unit, then the
   parenthesised name: one line does not fit the 216px chip); announced and labelled as one phrase. */
const S7_LABEL = { 's7-d-ml': 'مل (مليلتر)', 's7-d-cc': 'سم³ (سنتيمتر مكعب)', 's7-d-l': 'لتر', 's7-d-m3': 'م³ (متر مكعب)' };
const s7LabelHtml = d => '<span class="itd-label">' + S7_LABEL[d].replace(' (', '<br>(') + '</span>';
const S7_NAME = { 's7-t-perfume': 'عطر', 's7-t-dice': 'مكعب لعب', 's7-t-bucket': 'دلو', 's7-t-truck': 'شاحنة' };
/* Slide 11 feedback boxes, as authored (the incorrect box keeps its own paragraphing). */
const S7_FEEDBACK = {
  retryPartial: { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: ['الأحجام الصغيرة تُقاس بالمل أو السم³.', 'الأحجام المتوسطة تُقاس باللترات.', 'الأحجام الكبيرة جدًا بالمتر المكعب.'] },
  wrong2:  {
    title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.',
    body: ['الأحجام الصغيرة تُقاس بالمل أو السم³. الأحجام المتوسطة باللتر.', 'الأحجام الكبيرة جدًا بالمتر المكعب.'],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
/* Partial-title rule (multi-slot answers): any slot right = "not fully correct". Chosen per attempt in s7ShowPopup. */
S7_FEEDBACK.wrong2Partial = Object.assign({}, S7_FEEDBACK.wrong2, {
  title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.',
  answerView: Object.assign({}, S7_FEEDBACK.wrong2.answerView, { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.' })
});
const s7Place = { 's7-d-ml': 'source', 's7-d-cc': 'source', 's7-d-l': 'source', 's7-d-m3': 'source' };
let s7Attempts = 0, s7Done = false, s7Outcome = null, s7LastWrong = null;
let s7Marks = null;          // null | { targetId: 'correct' | 'wrong' }
let s7Judged = null;         // { targetId: chipId } at a non-final wrong check: its marks show only while unchanged
function s7MarkOf(t) {
  if (!s7Marks) return null;
  if (s7Done || !s7Judged) return s7Marks[t];
  return s7In(t) === s7Judged[t] ? s7Marks[t] : null;      // retry marks: only while the target holds what was judged
}
let s7Answer = null, s7View = 'solution', s7RetryPartial = false;
let s7Pick = null;           // chip picked by keyboard / tap
let s7Dnd = null;
let s7SkipClick = false;    // the click that trails a handled drag / tap
const s7Targets = () => Object.keys(S7Q.accept);
const s7In = t => Object.keys(s7Place).find(d => s7Place[d] === t) || null;
const s7Snap = () => JSON.stringify(s7Place);
function s7Announce(msg) { const l = document.getElementById('s7-live'); if (l) l.textContent = msg; }

function s7Render() {
  Object.keys(s7Place).forEach(d => {
    const chip = document.getElementById(d), placed = s7Place[d] !== 'source';
    chip.classList.remove('dragging');                    // re-added by onPick while a drag is live
    chip.classList.toggle('is-placed', placed);
    chip.classList.toggle('is-selected', s7Pick === d);
    chip.setAttribute('aria-pressed', s7Pick === d ? 'true' : 'false');
    chip.disabled = placed || s7Done;
    chip.setAttribute('aria-hidden', placed ? 'true' : 'false');
  });
  document.querySelector('#s7 .itd-bank').classList.toggle('is-empty', Object.values(s7Place).every(v => v !== 'source'));
  s7Targets().forEach(t => {
    const zone = document.getElementById(t), d = s7In(t), mark = s7MarkOf(t);
    zone.textContent = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s7Done);
    if (mark) { const m = document.createElement('span'); m.className = 'itd-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'itd-placed';
      card.innerHTML = s7LabelHtml(d);
      zone.appendChild(card);
      if (!s7Done && s7Dnd) s7Dnd.attachSource(card, d);
    }
    const state = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', S7_NAME[t] + ': ' + (d ? S7_LABEL[d] : 'فارغة') + state);
    zone.tabIndex = s7Done ? -1 : 0;
  });
  s7UpdateCheck();
}
function s7UpdateCheck() {
  const btn = document.getElementById('s7-check');
  if (s7Done) { btn.disabled = false; return; }
  const full = s7Targets().every(t => !!s7In(t));
  btn.disabled = !full || s7Snap() === s7LastWrong;         // Retry gate
}
function s7StartEdit() { dismissRetryPopup('s7-popup', s7Done); }
function s7PlaceChip(d, t) {
  const evicted = s7In(t);
  if (evicted && evicted !== d) s7Place[evicted] = 'source';
  s7Place[d] = t;
  s7Pick = null;
  s7Render();
  s7Announce(S7_LABEL[d] + ' وُضع تحت ' + S7_NAME[t]);
}
function s7InitDnd() {
  if (s7Dnd) return;
  s7Dnd = createPointerDnd({
    canDrag: () => !s7Done,
    onPick: d => { s7StartEdit(); s7Pick = null; s7Place[d] = 'source'; s7Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s7SkipClick = true; s7PlaceChip(d, t); },
    onCancel: () => { s7SkipClick = true; s7Render(); },
    onTap: (d, src) => { s7SkipClick = true; if (src.classList.contains('itd-placed')) s7ZonePress(s7Place[d]); else s7ChipPress(d); }
  });
  Object.keys(s7Place).forEach(d => s7Dnd.attachSource(document.getElementById(d), d));
  s7Targets().forEach(t => {
    const zone = document.getElementById(t);
    s7Dnd.attachTarget(zone, t);
    // A pointer gesture that ends over a zone also fires a click there; the drag helper already handled it.
    zone.addEventListener('click', () => { if (s7SkipClick) { s7SkipClick = false; return; } s7ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s7ZonePress(t); } });
  });
  // Keyboard on a chip: Enter / Space fire click (the pointer path is handled by onTap).
  Object.keys(s7Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s7ChipPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 7 && s7Pick) { s7Pick = null; s7Render(); } });
  document.addEventListener('pointerdown', () => { s7SkipClick = false; }, true);   // a new gesture never inherits the flag
}
function s7ChipPress(d) {
  if (s7Done || s7Place[d] !== 'source') return;
  s7StartEdit();
  s7Pick = (s7Pick === d) ? null : d;
  s7Render();
  if (s7Pick) s7Announce('تم اختيار ' + S7_LABEL[d] + '. اختاروا عنصرًا للوضع عليه.');
}
function s7ZonePress(t) {
  if (s7Done) return;
  if (s7Pick) { s7StartEdit(); s7PlaceChip(s7Pick, t); return; }
  const d = s7In(t);
  if (!d) return;
  s7StartEdit();
  s7Place[d] = 'source'; s7Pick = d;                      // pick the placed chip up again
  s7Render();
  s7Announce('تم اختيار ' + S7_LABEL[d] + '. اختاروا عنصرًا للوضع عليه.');
}
function s7MarksFor(placement) {
  const m = {};
  s7Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = S7Q.accept[t].includes(d) ? 'correct' : 'wrong'; });
  return m;
}
function s7Primary() {
  if (s7Done) { advanceScreen(); return; }
  s7Check();
}
const s7AnyRight = placement => Object.values(s7MarksFor(placement)).some(v => v === 'correct');
function s7Check() {
  if (s7Done || !s7Targets().every(t => !!s7In(t))) return;
  s7Pick = null;
  s7Attempts++;
  const marks = s7MarksFor(s7Place);
  const allCorrect = Object.values(marks).every(v => v === 'correct');
  /* xAPI: item 006 q1 (matching) — source = the unit chip, target = the product zone (metadata answers.source / answers.target) */
  xapiAnswered('006', 'q1', allCorrect, allCorrect || s7Attempts >= S7Q.maxAttempts, { pairs: s7Targets().map(t => ({ source: S7_LABEL[s7In(t)], target: S7_NAME[t] })) });
  if (allCorrect) {
    s7Marks = marks; s7Finish('correct');
  } else if (s7Attempts >= S7Q.maxAttempts) {
    s7Answer = Object.assign({}, s7Place);                 // the learner's final answer, before the reveal
    s7View = 'solution';
    s7Finish('wrong2');
  } else {
    s7LastWrong = s7Snap();
    s7Marks = marks;                                       // retry: each target ✓ / ✕ (per-answer verdict rule)
    s7Judged = {}; s7Targets().forEach(t => { s7Judged[t] = s7In(t); });
    s7RetryPartial = s7AnyRight(s7Place);                  // judged on the answer in front of us, per attempt
    s7Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s7ShowPopup('retry');
  }
}
function s7Finish(outcome) {
  s7Done = true; s7Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s7-check'), 'متابعة');
  if (outcome === 'wrong2') { s7ApplyView(); return; }
  s7Render();
  s7ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong board + popup. */
function s7ApplyView() {
  if (s7Answer === null) return;
  Object.keys(s7Place).forEach(d => { s7Place[d] = 'source'; });
  if (s7View === 'answer') { Object.assign(s7Place, s7Answer); s7Marks = s7MarksFor(s7Answer); }
  else { Object.keys(S7Q.reveal).forEach(t => { s7Place[S7Q.reveal[t]] = t; }); s7Marks = s7MarksFor(s7Place); }
  s7Render();
  s7ShowPopup('wrong2', s7View);
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

function s7ToggleView() {
  if (s7Answer === null) return;
  s7View = (s7View === 'solution') ? 'answer' : 'solution';
  s7ApplyView();
}
function s7ShowPopup(type, view) {
  const partial = type === 'retry' ? s7RetryPartial : type === 'wrong2' ? s7AnyRight(s7Answer || s7Place) : false;
  const base = S7_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // answer view inherits the explanation body
  const popup = document.getElementById('s7-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s7-popup', cfg.action || null, s7ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s7Enter() {
  s7InitDnd();
  document.getElementById('s7-popup').classList.add('hidden');
  if (s7Done) {                                            // resolved: locked board; Back reopens the popup
    if (s7Answer !== null) { s7View = 'solution'; Object.keys(s7Place).forEach(d => { s7Place[d] = 'source'; }); Object.keys(S7Q.reveal).forEach(t => { s7Place[S7Q.reveal[t]] = t; }); s7Marks = s7MarksFor(s7Place); }
    setNavLabel(document.getElementById('s7-check'), 'متابعة');
    s7Render();
    return;
  }
  Object.keys(s7Place).forEach(d => { s7Place[d] = 'source'; });
  s7Attempts = 0; s7Outcome = null; s7LastWrong = null; s7Marks = null; s7Judged = null; s7Answer = null; s7View = 'solution'; s7Pick = null; s7RetryPartial = false;
  setNavLabel(document.getElementById('s7-check'), 'هل إجابتي صحيحة؟');
  s7Render();
}

/* ===================== S8 (index 8) — FlipCardsReveal (slides 12 + 13) =====================
   720-templates FlipCardsReveal.md, two-way
   variant (producer 2026-10-01), as the approved methodica-math-ratio-03-01
   screen 08. frc8Seen[] = ever revealed, only ever turns true, drives the gate;
   frc8Face[] = the card's current face. Flipping back never clears frc8Seen, so
   Continue stays unlocked. Re-entry keeps both (faces as the learner left them).
   Gesture hint: _gesture-hints.md click/tap family - two demonstrations on the
   rightmost card, then hidden for good (frcGhPlay); a flip of ANY card stops it at
   once. frc8GhSeen (the real flip) and frc8GhDone (played out) are never cleared,
   so the hint never returns. */
/* Shared tap-hint lifecycle (S8 / S10 / S11 .frc-gh): finite two-cycle default (_gesture-hints.md "Default
   lifecycle", producer 2026-10-08; QA 2026-10-11 - it used to loop until the first action). The rings' CSS runs
   2 x 2s; a token-free per-hint timer hides the whole hint when they end - a timer, not animationend, so it also
   ends where CSS animations do not advance (the QA review system). */
const FRC_GH_CYCLE_MS = 2000, FRC_GH_PLAYS = 2;
const frcGhTimers = {};
function frcGhPlay(id, onDone) {
  const el = document.getElementById(id);
  if (!el) return;
  clearTimeout(frcGhTimers[id]);
  el.querySelectorAll('.frc-gh-ring').forEach(r => { r.style.animation = 'none'; void r.offsetWidth; r.style.animation = ''; });   // restart both rings
  el.classList.remove('frc-gh-stopped');
  frcGhTimers[id] = setTimeout(() => { el.classList.add('frc-gh-stopped'); onDone(); }, FRC_GH_CYCLE_MS * FRC_GH_PLAYS);
}
function frcGhHalt(id) { clearTimeout(frcGhTimers[id]); document.getElementById(id)?.classList.add('frc-gh-stopped'); }
const frc8Seen = [false, false];
const frc8Face = [false, false];
let frc8GhSeen = false, frc8GhDone = false;
function frc8GhStart() {
  if (frc8GhSeen || frc8GhDone) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  frcGhPlay('s8-gh', () => { frc8GhDone = true; });
}
function frc8GhStop() { frcGhHalt('s8-gh'); }
function frc8ApplyFace(card, back) {
  card.classList.toggle('is-flipped', back);
  card.setAttribute('aria-expanded', back ? 'true' : 'false');
  card.querySelector('.frc-card-front').setAttribute('aria-hidden', back ? 'true' : 'false');
  card.querySelector('.frc-card-back').setAttribute('aria-hidden', back ? 'false' : 'true');
  card.querySelector('.frc-hint-text').textContent = back ? 'انقروا لقلب البطاقة مرة أخرى.' : 'انقروا لقلب البطاقة.';
}
/* Click / Enter / Space: the card is a real <button>, so the keyboard path is the
   browser's own activation and focus stays on the card. */
function frc8Flip(card) {
  frc8GhSeen = true;
  frc8GhStop();
  const i = +card.dataset.index;
  frc8Face[i] = !frc8Face[i];
  if (frc8Face[i]) frc8Seen[i] = true;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  frc8ApplyFace(card, frc8Face[i]);
  document.getElementById('s8-continue').disabled = !frc8Seen.every(Boolean);
}
function frc8Enter() {
  document.querySelectorAll('#s8 .frc-card').forEach(c => frc8ApplyFace(c, frc8Face[+c.dataset.index]));
  document.getElementById('s8-continue').disabled = !frc8Seen.every(Boolean);
  frc8GhStart();
}

/* ===================== S10 (data-screen 10) — 1 סמ״ק cube -> 1 ליטר box (slides 15-26) ===================== */
let fill11Count = 0, fill11Done = false;
/* Cube volume builder (S10). Positions come from the cube image's own edge vectors
   in its pixel space: a = left/back edge, b = right/back edge, c = vertical edge.
   Silhouette (alpha) of s10-cube.png: left x 132, right x 1214, top vertex (754,49),
   bottom vertex (591,1201) -> a.x = 132-591, b.x = 1214-591, c.x ~ 0. The y parts
   are taken slightly short of the true edges (perspective + rounded corners), so
   neighbours overlap a little rather than leave gaps; the painter's order (layer by
   layer, far to near) hides the overlaps behind the faces that really are in front.
   Each layer is its own group so later states can show / hide / animate it. */
/* hull: the dice silhouette's six corner points in image px (straight-edge corners), used to fit the box. */
const CUBE_STACK = { src: 'assets/img/s10-cube.png', imgW: 1304, imgH: 1206, a: [-450, -248], b: [615, -240], c: [0, -700], n: 10, layers: 10,
  hull: [[756.5,49],[588.5,1202],[132,246],[132,837],[1215,320],[1215,960]] };
function buildCubeStack(host, size, g = CUBE_STACK) {
  if (!host || host.dataset.built === '1') return;
  const s = size / g.imgW, h = g.imgH * s, N = g.n;
  const xs = [], ys = [];
  for (const i of [0, N - 1]) for (const j of [0, N - 1]) for (const k of [0, g.layers - 1]) {
    xs.push((i * g.a[0] + j * g.b[0] + k * g.c[0]) * s); ys.push((i * g.a[1] + j * g.b[1] + k * g.c[1]) * s);
  }
  const minX = Math.min(...xs), minY = Math.min(...ys), W = Math.max(...xs) - minX + size, H = Math.max(...ys) - minY + h;
  const frag = document.createDocumentFragment();
  for (let k = 0; k < g.layers; k++) {
    const layer = document.createElement('div');
    layer.className = 'cube-layer';
    layer.dataset.layer = String(k + 1);
    const cells = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) cells.push([i, j]);
    cells.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));            // far (high i+j) first
    for (const [i, j] of cells) {
      const im = document.createElement('img');
      im.src = g.src; im.alt = ''; im.draggable = false; im.decoding = 'async';
      im.width = Math.round(size); im.height = Math.round(h);
      im.style.width = size + 'px'; im.style.height = h + 'px';
      im.style.left = ((i * g.a[0] + j * g.b[0] + k * g.c[0]) * s - minX).toFixed(2) + 'px';
      im.style.top = ((i * g.a[1] + j * g.b[1] + k * g.c[1]) * s - minY).toFixed(2) + 'px';
      layer.appendChild(im);
    }
    frag.appendChild(layer);
  }
  host.appendChild(frag);
  host.dataset.built = '1';
  const target = host.closest('.fill-target') || host;
  target.style.setProperty('--stack-w', W.toFixed(1) + 'px');
  target.style.setProperty('--stack-h', H.toFixed(1) + 'px');
  target.closest('.screen')?.style.setProperty('--stack-w', W.toFixed(1) + 'px');
}
/* S10 transparent 1-liter box geometry (shared by the page and the producer's scripts).
   The box is a parallelepiped whose three axes are the cube lattice's own vectors
   (CUBE_STACK a, b, c), fitted around the hull of the rendered dice with a clearance
   `margin` (px). Everything is in stack-local px (the .cube-stack box). The silhouette
   of a parallelepiped is a hexagon: O (near-bottom vertex) -> LB -> LT -> VT (top) ->
   RT -> RB; M is the near-top vertex, H the hidden back-bottom vertex. */
function cubeBoxGeometry(g, size, margin) {
  const s = size / g.imgW, N = g.n, K = g.layers;
  const lat = (i, j, k) => [(i * g.a[0] + j * g.b[0] + k * g.c[0]) * s, (i * g.a[1] + j * g.b[1] + k * g.c[1]) * s];
  let minX = Infinity, minY = Infinity;
  for (const i of [0, N - 1]) for (const j of [0, N - 1]) for (const k of [0, K - 1]) { const q = lat(i, j, k); minX = Math.min(minX, q[0]); minY = Math.min(minY, q[1]); }
  const un = v => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
  const na = un([g.a[1], -g.a[0]]), nb = un([g.b[1], -g.b[0]]);   // na: outward normal of the bottom-left edge; nb: of the top-left edge
  const dot = (p, n) => p[0] * n[0] + p[1] * n[1];
  let xL = Infinity, xR = -Infinity, saMax = -Infinity, saMin = Infinity, sbMax = -Infinity, sbMin = Infinity;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < K; k++) {
    if (i && j && k && i < N - 1 && j < N - 1 && k < K - 1) continue;   // inner cubes are never on the hull
    const q = lat(i, j, k);
    for (const v of g.hull) {
      const p = [q[0] - minX + v[0] * s, q[1] - minY + v[1] * s];
      xL = Math.min(xL, p[0]); xR = Math.max(xR, p[0]);
      const da = dot(p, na), db = dot(p, nb);
      saMax = Math.max(saMax, da); saMin = Math.min(saMin, da); sbMax = Math.max(sbMax, db); sbMin = Math.min(sbMin, db);
    }
  }
  xL -= margin; xR += margin; saMax += margin; saMin -= margin; sbMax += margin; sbMin -= margin;
  const solve = (n1, c1, n2, c2) => { const d = n1[0] * n2[1] - n1[1] * n2[0]; return [(c1 * n2[1] - c2 * n1[1]) / d, (n1[0] * c2 - n2[0] * c1) / d]; };
  const onA = (c, x) => [x, (c - na[0] * x) / na[1]];
  const onB = (c, x) => [x, (c - nb[0] * x) / nb[1]];
  const O = solve(na, saMax, nb, sbMin);          // near-bottom vertex: bottom-left edge meets bottom-right edge
  const LB = onA(saMax, xL), RB = onB(sbMin, xR);  // bottom corners on the vertical side edges
  // box height: the top-left edge (through LT, along b) must clear sbMax, the top-right edge (through RT, along a) must clear saMin
  const gh = Math.max((sbMax - dot(LB, nb)) / -nb[1], (dot(RB, na) - saMin) / na[1]);
  const up = p => [p[0], p[1] - gh];
  const LT = up(LB), RT = up(RB), M = up(O), H = [LB[0] + RB[0] - O[0], LB[1] + RB[1] - O[1]], VT = up(H);
  return { s, O, LB, LT, VT, RT, RB, M, H, gh, layersCount: K, bbox: { l: xL, r: xR, t: VT[1], b: O[1] },
    faces: { front: [O, LB, LT, M], side: [O, RB, RT, M], top: [M, LT, VT, RT], bottom: [O, LB, H, RB], backLeft: [LB, H, VT, LT], backRight: [RB, H, VT, RT] } };
}

/* Build the transparent 1 ליטר box around the stack: one SVG behind (hidden faces) and one in
   front (front, side, top). Each face is a separate polygon; opacity per face comes from CSS. */
const S10_BOX_CLEARANCE = 5;   // px between the outer dice and the box walls
function buildCubeBox(host, size, g = CUBE_STACK) {
  const target = host && host.closest('.fill-target');
  if (!target || target.querySelector('.s10-box')) return;
  const geo = cubeBoxGeometry(g, size, S10_BOX_CLEARANCE);
  const pad = 2, vb = [geo.bbox.l - pad, geo.bbox.t - pad, geo.bbox.r - geo.bbox.l + 2 * pad, geo.bbox.b - geo.bbox.t + 2 * pad];
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (cls, faces) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 's10-box ' + cls); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', vb.map(v => v.toFixed(2)).join(' '));
    svg.style.left = vb[0].toFixed(2) + 'px'; svg.style.top = vb[1].toFixed(2) + 'px'; svg.style.width = vb[2].toFixed(2) + 'px'; svg.style.height = vb[3].toFixed(2) + 'px';
    for (const [name, pts] of faces) {
      const p = document.createElementNS(NS, 'polygon');
      p.setAttribute('class', 's10-box__face s10-box__face--' + name);
      p.setAttribute('points', pts.map(q => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' '));
      svg.appendChild(p);
    }
    return svg;
  };
  target.insertBefore(mk('s10-box--back', [['bottom', geo.faces.bottom], ['back-left', geo.faces.backLeft], ['back-right', geo.faces.backRight]]), host);
  host.after(mk('s10-box--front', [['front', geo.faces.front], ['side', geo.faces.side], ['top', geo.faces.top]]));
  if (target.closest('#s10')) { s10BuildScale(target, geo); s10BuildDims(target, geo); }   // S10-only extras
}
/* 10 x 10 x 10 dimensions (slide 26): one per box axis, each parallel to an outer box edge
   and offset S10_DIM.off px outward along that edge's normal - a (bottom-left edge O-LB),
   b (bottom-right edge O-RB), c (right vertical edge RB-RT) - with its "10" further out on
   the same normal. Same coordinate space as the box, so it scales and moves with it.
   Label per axis: [distance out from the line, position along it (0 = first vertex, 1 =
   second)]. c's "10" sits beside the line's upper part, not its middle: the middle is level
   with the right arrow's tip, which would read as pointing at the number. */
const S10_DIM = { off: 12, head: 7, label: { a: [22, .5], b: [22, .5], c: [16, .85] } };
function s10BuildDims(target, geo) {
  if (target.querySelector('.s10-dims')) return;
  const NS = 'http://www.w3.org/2000/svg', pad = 40;
  const vb = [geo.bbox.l - pad, geo.bbox.t - pad, geo.bbox.r - geo.bbox.l + 2 * pad, geo.bbox.b - geo.bbox.t + 2 * pad];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 's10-dims'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', vb.map(v => v.toFixed(2)).join(' '));
  svg.style.left = vb[0].toFixed(2) + 'px'; svg.style.top = vb[1].toFixed(2) + 'px'; svg.style.width = vb[2].toFixed(2) + 'px'; svg.style.height = vb[3].toFixed(2) + 'px';
  svg.setAttribute('hidden', '');   // an SVG element has no .hidden property: use the attribute
  svg.innerHTML = '<defs><marker id="s10-ah" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="' + S10_DIM.head + '" markerHeight="' + S10_DIM.head + '" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z"/></marker></defs>';
  const cx = (geo.bbox.l + geo.bbox.r) / 2, cy = (geo.bbox.t + geo.bbox.b) / 2;
  for (const [axis, p, q] of [['a', geo.O, geo.LB], ['b', geo.O, geo.RB], ['c', geo.RB, geo.RT]]) {
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
    let n = [-dy / len, dx / len];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    if ((mx - cx) * n[0] + (my - cy) * n[1] < 0) n = [-n[0], -n[1]];   // outward
    const o = S10_DIM.off, line = document.createElementNS(NS, 'line');
    line.setAttribute('class', 's10-dims__line s10-dims__line--' + axis);
    line.setAttribute('x1', (p[0] + n[0] * o).toFixed(2)); line.setAttribute('y1', (p[1] + n[1] * o).toFixed(2));
    line.setAttribute('x2', (q[0] + n[0] * o).toFixed(2)); line.setAttribute('y2', (q[1] + n[1] * o).toFixed(2));
    line.setAttribute('marker-start', 'url(#s10-ah)'); line.setAttribute('marker-end', 'url(#s10-ah)');
    const t = document.createElementNS(NS, 'text'), [ld, lt] = S10_DIM.label[axis], L = o + ld;
    const lx = p[0] + dx * lt, ly = p[1] + dy * lt;
    t.setAttribute('class', 's10-dims__label s10-dims__label--' + axis);
    t.setAttribute('x', (lx + n[0] * L).toFixed(2)); t.setAttribute('y', (ly + n[1] * L).toFixed(2));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
    t.textContent = '10';
    svg.append(line, t);
  }
  target.appendChild(svg);
}
/* Totals column (slides 16-25): placed left of the box's left vertical edge, in stack-local px.
   Number k sits one line step above number k-1, starting at the height of layer 1 on that edge
   (the slide's own logic: the column grows upward with the layers; a 22px line is taller than
   one layer step, so the numbers are a scale beside the box rather than one per layer pixel). */
const S10_SCALE = { width: 46, gap: 10, step: 24, line: 24 };
function s10BuildScale(target, geo) {
  const ol = target.querySelector('.s10-scale'); if (!ol) return;
  ol.style.left = (geo.bbox.l - S10_SCALE.gap - S10_SCALE.width).toFixed(2) + 'px';
  ol.style.top = '0px';
  ol.dataset.y1 = (geo.LB[1] - geo.gh / (2 * geo.layersCount)).toFixed(2);   // centre of layer 1 on the side edge
}
/* Show the first n layers (1..10) — ready for the earlier states; the final state shows all 10. */
function cubeStackShow(host, n) { host.querySelectorAll('.cube-layer').forEach(l => { l.hidden = +l.dataset.layer > n; }); }
const S10_CUBE_SIZE = 22;   // image width per repeated cube (step 3: 38 -> 22px, ~58%); the dice body is ~18px wide

/* S10 progressive fill (producer 2026-10-04, slides 16-25). State: fill11Count = cubes shown
   (0..1000, step 100 = one layer), fill11Done at 1000; both live for the session, so leaving
   and returning restores the layers, the totals and the Continue state (module convention:
   screen state is kept in JS, nothing is reset on re-entry). */
function s10Render(animateNew) {
  const n = fill11Count / 100, stack = document.getElementById('s10-stack');
  cubeStackShow(stack, n);
  if (animateNew && n) { const layer = stack.querySelector('.cube-layer[data-layer="' + n + '"]'); if (layer) { layer.classList.remove('is-new'); void layer.offsetWidth; layer.classList.add('is-new'); } }
  const ol = document.getElementById('s10-scale'), y1 = parseFloat(ol.dataset.y1 || '0');
  while (ol.children.length > n) ol.lastElementChild.remove();
  while (ol.children.length < n) {
    const k = ol.children.length + 1, li = document.createElement('li');
    li.textContent = String(k * 100);
    const unit = document.createElement('span'); unit.className = 's10-scale__unit'; unit.textContent = 'مكعبات'; li.appendChild(unit);
    li.style.top = (y1 - (k - 1) * S10_SCALE.step - S10_SCALE.line / 2).toFixed(2) + 'px';
    if (k === 10) li.classList.add('s10-scale__total');
    if (animateNew && k === n) li.classList.add('is-new');
    ol.appendChild(li);
  }
  stack.setAttribute('aria-label', n === 10 ? 'علبة سعة 1 لتر ممتلئة: 10 طبقات من 100 مكعب، 10 × 10 × 10 = 1000 مكعب سعة 1 سم³' : n ? 'علبة سعة 1 لتر، عدد الطبقات ' + n + ' (100 مكعب في كل طبقة)، عدد المكعبات ' + fill11Count + ' (حجم كل مكعب 1 سم³)' : 'صندوق سعة 1 لتر فارغ');
  const btn = document.getElementById('s10-cube-btn');
  btn.setAttribute('aria-label', fill11Done ? 'الصندوق ممتلئ: 1000 مكعب بحجم 1 سم³' : 'أضيفوا إلى الصندوق طبقة من 100 مكعب (الطبقة ' + (n + 1) + ' من أصل 10)');
  btn.setAttribute('aria-disabled', fill11Done ? 'true' : 'false');   // stays focusable, so the 10th keyboard activation doesn't drop focus
  btn.classList.toggle('pulse', !fill11Done);
  s10RenderConclusion(false);
}
/* Slide 26 completion: right after the 10th click (no extra click) the 10 x 10 x 10 marks and
   the conclusion bubble appear, then Continue lights (note: "מופיעים סימונים על הצלעות
   10*10*10 ועולה בועית מסקנת ביניים. ואז כפתור המשך נדלק"). Sequence: layer 10 + 1000 fade
   (.25s) -> bubble + dimensions fade (.3s) -> Continue enabled; instant under reduced motion
   and on re-entry. s10Concluded drives the Continue button and the gate. */
let s10Concluded = false, s10ConclTimer = 0;
/* Bubble outline = one path (Figma Speech Bubbles 457:6419, Bottom/Wide). From the component's
   vector: stroke 3 on a centre line inset 1.5 from the border box, corner radius 9.5 on that line
   (outer 11), beak base 31.467 on the bottom centre line, tip 14.36 below it, miter joins. Sized
   from the element's own border box at render; tip x from data-tip-x (frame 880). */
const S10_BUBBLE = { s: 1.5, r: 9.5, beakBase: 124.429 - 92.9619, beakHeight: 185.969 - 171.609 };
function s10BuildBubbleShape(el) {
  const NS = 'http://www.w3.org/2000/svg';
  let svg = el.querySelector('.s10-bubble-shape');
  if (!svg) {
    svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 's10-bubble-shape'); svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(document.createElementNS(NS, 'path')); el.prepend(svg);
  }
  const { s, r, beakBase: B, beakHeight: Hb } = S10_BUBBLE, W = el.offsetWidth, H = el.offsetHeight, tx = parseFloat(el.dataset.tipX);
  const yb = H - s, yt = yb + Hb, n = v => +v.toFixed(3);
  const d = 'M' + n(s + r) + ',' + s + ' H' + n(W - s - r) + ' A' + r + ',' + r + ' 0 0 1 ' + n(W - s) + ',' + n(s + r)
    + ' V' + n(H - s - r) + ' A' + r + ',' + r + ' 0 0 1 ' + n(W - s - r) + ',' + n(yb)
    + ' H' + n(tx + B / 2) + ' L' + n(tx) + ',' + n(yt) + ' L' + n(tx - B / 2) + ',' + n(yb)
    + ' H' + n(s + r) + ' A' + r + ',' + r + ' 0 0 1 ' + s + ',' + n(H - s - r) + ' V' + n(s + r) + ' A' + r + ',' + r + ' 0 0 1 ' + n(s + r) + ',' + s + ' Z';
  const ht = n(yt + 3);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + ht); svg.setAttribute('width', W); svg.setAttribute('height', ht);
  svg.querySelector('path').setAttribute('d', d);
}
function s10RenderConclusion(animate) {
  const bubble = document.getElementById('s10-conclusion'), dims = document.querySelector('#s10 .s10-dims');
  [bubble, dims].forEach(el => { if (!el) return; el.toggleAttribute('hidden', !s10Concluded); el.classList.toggle('is-new', !!animate && s10Concluded); });
  if (s10Concluded && bubble) s10BuildBubbleShape(bubble);
  document.getElementById('s10-continue').disabled = !s10Concluded;
}
function s10Conclude() {
  clearTimeout(s10ConclTimer);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { s10Concluded = true; s10RenderConclusion(false); try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {} return; }
  s10ConclTimer = setTimeout(() => {
    s10Concluded = true; s10RenderConclusion(true);
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    document.getElementById('s10-continue').disabled = true;            // lights after the bubble is in
    s10ConclTimer = setTimeout(() => { if (s10Concluded) document.getElementById('s10-continue').disabled = false; }, 300);
  }, 250);
}
/* Tap gesture hint (S8's lifecycle, frcGhPlay): two demonstrations from entry, then hidden for good; the first real
   click stops it at once. s10GhSeen is set only by fill11Click (the real source of truth) and s10GhDone when it has
   played out; neither is cleared, so the hint never returns for clicks 2-10 or on re-entry. Skipped under reduced motion. */
let s10GhSeen = false, s10GhDone = false;
function s10GhStart() {
  if (s10GhSeen || s10GhDone || fill11Count > 0) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  frcGhPlay('s10-gh', () => { s10GhDone = true; });
}
function s10GhStop() { frcGhHalt('s10-gh'); }
function fill11Enter() {
  buildCubeStack(document.getElementById('s10-stack'), S10_CUBE_SIZE);
  buildCubeBox(document.getElementById('s10-stack'), S10_CUBE_SIZE);
  clearTimeout(s10ConclTimer);
  if (fill11Done) { fill11Count = 1000; s10Concluded = true; }   // re-entry: the full final state, at once
  s10Render(false);
  s10GhStart();
}
function fill11Click() {
  if (fill11Done || fill11Count >= 1000) return;
  s10GhSeen = true;
  s10GhStop();
  fill11Count += 100;
  if (fill11Count >= 1000) fill11Done = true;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s10Render(true);
  if (fill11Done) s10Conclude();
}
/* ===================== S11 (data-screen 11) — 1 ליטר box -> 1 מ"ק truck (slides 27-37) =====================
   Rebuilt (producer 2026-10-04). The ONLY control is the middle 1 ליטר box (the approved S10 object,
   live, cube 22px as in S10, in a real <button>: mouse / touch / Enter / Space). The right cube is decorative.
   Each activation reveals the next existing .cube-layer of the truck load (10 layers x 100 one-liter
   boxes; slides 28-37 add one row per click). State lives for the session (s11Count 0..10, s11Done),
   so leaving and returning restores it. Gesture hint: S8/S10's lifecycle, on the box; set only by the
   real click. Continue: disabled until the 10th layer (slides 27-37). The totals column and slide 38's
   completion (bubble, 10x10x10, "(= 1000 ליטר)") are later steps. */
const S11_CUBE_SIZE = 22;   // = S10_CUBE_SIZE: the box is S10's, at S10's size and position (producer)
/* Truck load unit: assets/img/s11-box.png — one glass 1 ליטר box drawn in the cargo's own perspective
   (cargo edges measured on the displayed truck: a = side-face floor edge, b = door-face floor edge,
   c = post; raster = 8 x display). Lattice vectors in raster px; size = displayed unit width (94% of the cargo). */
const S11_LOAD = { src: 'assets/img/s11-box.png', imgW: 203, imgH: 192, a: [-97.36,-41.28], b: [93.28,-34.64], c: [0,-103.44], n: 10, layers: 10, size: 23.852 };
/* Totals column: number k centred at y1 - (k-1) * step (frame px); y1 = the centre of layer 1 on the load's near edge. */
const S11_SCALE = { y1: 436.10, step: 24, line: 24 };
let s11Count = 0, s11Done = false, s11GhSeen = false, s11GhDone = false;
function s11GhStart() {   // S10's lifecycle: two demonstrations, then hidden for good (frcGhPlay)
  if (s11GhSeen || s11GhDone || s11Count > 0) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  frcGhPlay('s11-gh', () => { s11GhDone = true; });
}
function s11GhStop() { frcGhHalt('s11-gh'); }
function s11Render(animateNew) {
  const n = s11Count, load = document.getElementById('s11-load');
  cubeStackShow(load, n);
  if (animateNew && n) { const layer = load.querySelector('.cube-layer[data-layer="' + n + '"]'); if (layer) { layer.classList.remove('is-new'); void layer.offsetWidth; layer.classList.add('is-new'); } }
  const ol = document.getElementById('s11-scale');
  while (ol.children.length > n) ol.lastElementChild.remove();
  while (ol.children.length < n) {
    const k = ol.children.length + 1, li = document.createElement('li');
    li.textContent = String(k * 100);
    const unit = document.createElement('span'); unit.className = 's11-scale__unit'; unit.textContent = 'صناديق'; li.appendChild(unit);
    li.style.top = (S11_SCALE.y1 - (k - 1) * S11_SCALE.step - S11_SCALE.line / 2).toFixed(2) + 'px';
    if (k === 10) li.classList.add('s11-scale__total');
    if (animateNew && k === n) li.classList.add('is-new');
    ol.appendChild(li);
  }
  document.getElementById('s11-cargo').setAttribute('aria-label', n === 10 ? 'شاحنة ممتلئة بـ 1 م³: 10 طبقات من 100 صندوق، 1000 صندوق بسعة 1 لتر' : n ? 'شاحنة سعة 1 م³، عدد الطبقات ' + n + ' (100 صندوق في كل طبقة)، عدد الصناديق ' + (n * 100) + ' (سعة كل صندوق 1 لتر)' : 'شاحنة فارغة سعتها 1 م³');
  const btn = document.getElementById('s11-box-btn');
  btn.setAttribute('aria-label', s11Done ? 'الشاحنة ممتلئة: 1000 صندوق سعة 1 لتر' : 'أضيفوا إلى الشاحنة طبقة من 100 صندوق (الطبقة ' + (n + 1) + ' من 10)');
  btn.setAttribute('aria-disabled', s11Done ? 'true' : 'false');   // stays focusable, so the 10th keyboard activation doesn't drop focus
  btn.classList.toggle('pulse', !s11Done);
  s11RenderConclusion(false);
}
/* Slide 38 completion. Dims = S10's measurement language on the load's silhouette edges, in frame px (the load
   is a parallelepiped T0 + i*A + j*B + k*C): depth along the bottom-left edge (A), width along the top-left edge
   (B), height along the left vertical edge (C) — the load's left/top sides, clear of the totals column; each 12px
   outside its edge, "10" beside it over a light part of the truck. Colour --black-100 as S10. */
const S11_LOAD_GEO = { T0: [297.53, 442.18], A: [-114.40, -48.50], B: [109.60, -40.70], C: [0.00, -121.54] };
const S11_DIM = { off: 12, head: 7, label: { a: [28, .5], b: [22, .25], c: [14, .5] } };   // [distance out, position along the edge]; c: "10" outside the load, on white (producer 2026-10-04)
function s11BuildDims() {
  const frame = document.querySelector('#s11 .s11-frame'); if (!frame || frame.querySelector('.s11-dims')) return;
  const NS = 'http://www.w3.org/2000/svg', g = S11_LOAD_GEO, add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 's10-dims s11-dims'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', '0 0 1280 710');
  svg.style.cssText = 'left:0;top:0;width:1280px;height:710px;z-index:3'; svg.setAttribute('hidden', '');
  svg.innerHTML = '<defs><marker id="s11-ah" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="' + S11_DIM.head + '" markerHeight="' + S11_DIM.head + '" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z"/></marker><marker id="s11-ah-halo" viewBox="-2 -2 14 14" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="' + (S11_DIM.head + 4) + '" markerHeight="' + (S11_DIM.head + 4) + '" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></marker></defs>';
  const centre = add(g.T0, [(g.A[0] + g.B[0] + g.C[0]) / 2, (g.A[1] + g.B[1] + g.C[1]) / 2]);
  // depth (a) on the top-right edge, width (b) on the top-left edge, height (c) on the RIGHT vertical edge (producer
  // 2026-10-04: line 12px outside the load, its "10" beside it on white); a white halo keeps the marks legible
  // where they cross the photo.
  const edges = [['a', add(add(add(g.T0, g.A), g.B), g.C), add(add(g.T0, g.B), g.C)], ['b', add(add(g.T0, g.A), g.C), add(add(add(g.T0, g.A), g.B), g.C)], ['c', add(g.T0, g.B), add(add(g.T0, g.B), g.C)]];
  for (const [axis, p, q] of edges) {
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
    let n = [-dy / len, dx / len];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    if ((mx - centre[0]) * n[0] + (my - centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const o = S11_DIM.off, line = document.createElementNS(NS, 'line'), halo = document.createElementNS(NS, 'line');
    halo.setAttribute('class', 's11-dims__halo');
    [[p[0] + n[0] * o, 'x1'], [p[1] + n[1] * o, 'y1'], [q[0] + n[0] * o, 'x2'], [q[1] + n[1] * o, 'y2']].forEach(([v, k]) => halo.setAttribute(k, v.toFixed(2)));
    halo.setAttribute('marker-start', 'url(#s11-ah-halo)'); halo.setAttribute('marker-end', 'url(#s11-ah-halo)');
    svg.appendChild(halo);
    line.setAttribute('class', 's10-dims__line s11-dims__line--' + axis);
    line.setAttribute('x1', (p[0] + n[0] * o).toFixed(2)); line.setAttribute('y1', (p[1] + n[1] * o).toFixed(2));
    line.setAttribute('x2', (q[0] + n[0] * o).toFixed(2)); line.setAttribute('y2', (q[1] + n[1] * o).toFixed(2));
    line.setAttribute('marker-start', 'url(#s11-ah)'); line.setAttribute('marker-end', 'url(#s11-ah)');
    const t = document.createElementNS(NS, 'text'), [ld, lt] = S11_DIM.label[axis], L = o + ld, lx = p[0] + dx * lt, ly = p[1] + dy * lt;
    t.setAttribute('class', 's10-dims__label s11-dims__label--' + axis);
    t.setAttribute('x', (lx + n[0] * L).toFixed(2)); t.setAttribute('y', (ly + n[1] * L).toFixed(2));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central'); t.textContent = '10';
    svg.append(line, t);
  }
  frame.appendChild(svg);
}
/* Sequence (slide 38 note): layer 10 + 1000 fade (.25s) -> bubble + dims fade (.3s) -> Continue; instant under
   reduced motion and on re-entry. s11Concluded drives Continue and the gate. */
let s11Concluded = false, s11ConclTimer = 0;
function s11RenderConclusion(animate) {
  const bubble = document.getElementById('s11-conclusion'), dims = document.querySelector('#s11 .s11-dims');
  [bubble, dims].forEach(el => { if (!el) return; el.toggleAttribute('hidden', !s11Concluded); el.classList.toggle('is-new', !!animate && s11Concluded); });
  if (s11Concluded && bubble) s10BuildBubbleShape(bubble);
  document.getElementById('s11-continue').disabled = !s11Concluded;
}
function s11Conclude() {
  clearTimeout(s11ConclTimer);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { s11Concluded = true; s11RenderConclusion(false); try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {} return; }
  s11ConclTimer = setTimeout(() => {
    s11Concluded = true; s11RenderConclusion(true);
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    document.getElementById('s11-continue').disabled = true;
    s11ConclTimer = setTimeout(() => { if (s11Concluded) document.getElementById('s11-continue').disabled = false; }, 300);
  }, 250);
}
function s11Enter() {
  s11BuildDims();
  clearTimeout(s11ConclTimer);
  if (s11Done) s11Concluded = true;   // re-entry: the full final state at once
  const box = document.getElementById('s11-stack');
  buildCubeStack(box, S11_CUBE_SIZE); buildCubeBox(box, S11_CUBE_SIZE); cubeStackShow(box, 10);   // the full 1 ליטר box, as left in S10
  buildCubeStack(document.getElementById('s11-load'), S11_LOAD.size, S11_LOAD);
  if (s11Done) s11Count = 10;
  s11Render(false);
  s11GhStart();
}
function s11Click() {
  if (s11Done || s11Count >= 10) return;
  s11GhSeen = true; s11GhStop();
  s11Count += 1;
  if (s11Count >= 10) s11Done = true;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s11Render(true);
  if (s11Done) s11Conclude();
}

/* ===================== S12 (data-screen 12) — conversion summary (slide 39) =====================
   Design: Figma "CycleDiagram - approved" 5451:35594. Sequence = the notes' order, described by position (producer
   2026-10-04): 1 right card, 2 upper ÷1000 (right -> middle), 3 middle card, 4 upper ÷1000 (middle -> left),
   5 left card, 6 lower x1000 (left -> middle), 7 re-emphasise the middle card, 8 lower x1000 (middle -> right),
   9 re-emphasise the right card. Automatic on the first entry (no click, no hint): each reveal a 0.45s fade, one step
   every 650ms after the title's reveal; re-emphasis = a ring in the card's own colour for 700ms. Plays once per
   session; re-entry, leaving mid-sequence and reduced motion show the final state at once. Continue not gated. */
const S12_SEQ = [
  { t: 300, step: 1 }, { t: 950, step: 2 }, { t: 1600, step: 3 }, { t: 2250, step: 4 }, { t: 2900, step: 5 },
  { t: 3550, step: 6 }, { t: 4200, emph: 's12-card-m' }, { t: 5150, step: 8 }, { t: 5800, emph: 's12-card-r' }
];
let s12Played = false, s12Timers = [];
function s12Final() {
  s12Timers.forEach(clearTimeout); s12Timers = [];
  const sc = document.getElementById('s12');
  sc.classList.remove('s12-seq');
  sc.querySelectorAll('.s12-step').forEach(e => e.classList.add('is-in'));
  sc.querySelectorAll('.s12-card.is-emph').forEach(e => e.classList.remove('is-emph'));
}
function s12Enter() {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (s12Played || reduced) { s12Played = true; s12Final(); return; }
  s12Played = true;
  const sc = document.getElementById('s12');
  sc.querySelectorAll('.s12-step').forEach(e => e.classList.remove('is-in'));
  sc.classList.add('s12-seq');
  const at = (ms, fn) => s12Timers.push(setTimeout(() => { if (currentScreen !== 12) { s12Final(); return; } fn(); }, ms));
  for (const s of S12_SEQ) {
    if (s.step) at(s.t, () => sc.querySelector('.s12-step[data-step="' + s.step + '"]').classList.add('is-in'));
    else {
      at(s.t, () => document.getElementById(s.emph).classList.add('is-emph'));
      at(s.t + 700, () => document.getElementById(s.emph).classList.remove('is-emph'));
    }
  }
  at(5800 + 700 + 300, s12Final);
}

/* ===================== S13 (data-screen 13) — 10-litre bucket conversion practice (slide 40) =====================
   Exploratory, no correctness feedback. The blue 10-litre bucket (centre) is the only source; dropping it on a
   white bucket turns that bucket blue and shows its result (right: 10,000 מ״ל / סמ״ק, left: 0.01 מ״ק) for good;
   the source always glides back to the centre (valid or not), so it stays available; repeat drops change nothing.
   Continue: both buckets tried (two independent flags, kept for the session).
   Input: pointer drag (mouse / touch / pen) via the shared createPointerDnd; keyboard / tap = S7's approved
   contract - press the blue bucket to pick it (Selected look, aria-pressed), press a white bucket to pour,
   Escape drops the pick; a polite live region announces each step.
   Hint: the canonical drag gesture (mass-measure-01-04 S1 phase chain). Plays on entry while nothing has been
   poured; pauses while the learner holds the bucket (resumes if it comes back unpoured); stops for good on the
   first placement; never under reduced motion. */
const S13_T = {
  's13-t-ml': { unit: 'مل / سم³', value: '10,000' },
  's13-t-m3': { unit: 'م³', value: '0.01' }
};
const s13Done = { 's13-t-ml': false, 's13-t-m3': false };
let s13Pick = false, s13Dnd = null, s13SkipClick = false, s13GhSeen = false;
const s13BothTried = () => Object.values(s13Done).every(Boolean);
function s13Announce(msg) { const l = document.getElementById('s13-live'); if (l) l.textContent = msg; }
function s13Render(instant) {
  const sc = document.getElementById('s13');
  if (instant) sc.classList.add('s13-instant');
  Object.keys(S13_T).forEach(id => {
    const t = document.getElementById(id), c = S13_T[id], done = s13Done[id];
    t.classList.toggle('is-done', done);
    t.querySelector('.s13-val').textContent = done ? c.value : '';
    t.setAttribute('aria-label', done ? 'دلو ' + c.unit + ': 10 لترات من الماء هي ' + c.value + ' ' + c.unit : 'دلو أبيض فارغ: ' + c.unit);
  });
  const src = document.getElementById('s13-src');
  src.classList.toggle('is-selected', s13Pick);
  src.setAttribute('aria-pressed', s13Pick ? 'true' : 'false');
  document.getElementById('s13-continue').disabled = !s13BothTried();
  if (instant) { void sc.offsetWidth; sc.classList.remove('s13-instant'); }
}
function s13Pour(id) {
  const c = S13_T[id];
  s13Pick = false;
  s13GhSeen = true; s13GhStop();                       // the first placement ends the hint for good
  s13Done[id] = true;                                  // idempotent: a repeat drop changes nothing
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s13Render(false);
  s13Announce('10 لترات من الماء تساوي ' + c.value + ' ' + c.unit + '.');
}
function s13PickToggle() {
  s13Pick = !s13Pick;
  s13Render(false);
  if (s13Pick) { s13GhStop(); s13Announce('اخترنا الدلو الأزرق. اختاروا الدلو الأبيض.'); }
  else { s13Announce('تم إلغاء الاختيار.'); s13GhMaybe(); }
}
function s13TargetPress(id) {
  if (!s13Pick) { s13Announce('اختاروا الدلو الأزرق أولًا.'); return; }
  s13Pour(id);
}
function s13InitDnd() {
  if (s13Dnd) return;
  s13Dnd = createPointerDnd({
    returnMs: 300,
    onPick: () => { s13Pick = false; s13GhStop(); s13Render(false); },
    onDrop: (d, id) => { s13SkipClick = true; s13Pour(id); },
    onCancel: () => { s13SkipClick = true; s13GhMaybe(); },
    onTap: () => { s13SkipClick = true; s13PickToggle(); }
  });
  const src = document.getElementById('s13-src');
  s13Dnd.attachSource(src, 'bucket');
  src.addEventListener('click', e => { if (e.detail === 0) s13PickToggle(); });   // Enter / Space; the pointer path is onTap
  Object.keys(S13_T).forEach(id => {
    const t = document.getElementById(id);
    s13Dnd.attachTarget(t, id);
    t.addEventListener('click', e => {
      if (e.detail === 0) { s13TargetPress(id); return; }                        // keyboard never inherits the pointer flag
      if (s13SkipClick) { s13SkipClick = false; return; }                         // the click trailing a handled drag / tap
      s13TargetPress(id);
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 13 && s13Pick) s13PickToggle(); });
  document.addEventListener('pointerdown', () => { s13SkipClick = false; }, true);   // a new gesture never inherits the flag
}
function s13Enter() {
  s13InitDnd();
  s13Pick = false;
  s13Render(true);                                     // re-entry: results as left, no fade; the source rests in the centre
  s13GhStop();
  s13GhMaybe();
}
/* Canonical drag hint (mass-measure-01-04 S1): ripple on the source > slide to the target > dwell > fade out in
   place > reset while invisible > repeat - TWICE, then hidden for good (_gesture-hints.md "Default lifecycle",
   producer 2026-10-08; QA 2026-10-11 - it used to repeat endlessly). The count survives a pause (bucket held and
   returned unpoured), so a resume finishes the two demonstrations instead of starting over.
   Token-guarded; every phase also checks the learner is still on S13. */
const S13_GH_PLAYS = 2;
let s13GhTimer = null, s13GhToken = 0, s13GhPlayed = 0;
function s13GhStop() {
  s13GhToken++;
  if (s13GhTimer) { clearTimeout(s13GhTimer); s13GhTimer = null; }
  const el = document.getElementById('s13-gh');
  if (el) el.className = 's13-gh';
}
function s13GhMaybe() {
  if (s13GhSeen || s13Pick || s13GhPlayed >= S13_GH_PLAYS || Object.values(s13Done).some(Boolean)) return;
  s13GhStart();
}
function s13GhStart() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  s13GhStop();
  const myToken = s13GhToken, el = document.getElementById('s13-gh');
  if (!el) return;
  const RIPPLE_MS = 1600, MOVE_PLUS_DWELL_MS = 1600, FADE_MS = 300, SNAP_PLUS_GAP_MS = 900;
  const live = () => { if (myToken !== s13GhToken) return false; if (currentScreen !== 13) { s13GhStop(); return false; } return true; };
  function phaseHint() { if (!live()) return; el.className = 's13-gh s13-gh-show s13-gh-ripple'; s13GhTimer = setTimeout(phaseMove, RIPPLE_MS); }
  function phaseMove() { if (!live()) return; el.className = 's13-gh s13-gh-show s13-gh-move'; s13GhTimer = setTimeout(phaseFade, MOVE_PLUS_DWELL_MS); }
  function phaseFade() { if (!live()) return; el.className = 's13-gh s13-gh-move'; s13GhTimer = setTimeout(phaseSnapBack, FADE_MS); }   // opacity only, stays at the target
  function phaseSnapBack() {   // invisible: silent reset; after the second demonstration, stop for good
    if (!live()) return;
    el.className = 's13-gh';
    if (++s13GhPlayed >= S13_GH_PLAYS) { s13GhTimer = null; return; }
    s13GhTimer = setTimeout(phaseHint, SNAP_PLUS_GAP_MS);
  }
  phaseHint();
}

/* ===================== S15 (data-screen 15) — AccordionText (slide 42) =====================
   720-templates AccordionText JS contract. Two separate values: s15Open = which item is open now (presentation,
   null on every entry); s15Visited = items ever opened (progress, only grows, drives the gate). One writer
   (s15Apply), one entry point (s15Toggle), one reset (s15Reset). Mutual exclusion comes from the single s15Open
   value; the item count comes from the DOM. */
let s15Open = null;
const s15Visited = new Set();
function s15Items() { return document.querySelectorAll('#s15 .acc-list .acc-item'); }
function s15Apply() {
  const items = s15Items();
  items.forEach(item => {
    const i = Number(item.dataset.index), head = item.querySelector('.acc-head'), body = item.querySelector('.acc-body');
    if (!head || !body) return;
    const open = s15Open === i;
    item.classList.toggle('open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.hidden = !open;
  });
  const btn = document.getElementById('s15-continue');
  if (btn) btn.disabled = s15Visited.size < items.length;
}
function s15Toggle(i) {
  const items = s15Items();
  if (!(i >= 0 && i < items.length)) return;   // guard before recording a visit
  s15Visited.add(i);
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s15Open = (s15Open === i) ? null : i;
  s15Apply();
}
function s15Reset() { s15Open = null; s15Apply(); }   // re-entry: progress persists, presentation re-derived
const s15AllOpened = () => s15Visited.size >= s15Items().length;

/* ===================== S16 (data-screen 16) — selection screen with a popup per example (slides 43-45) =====================
   Same two-concern split as the other reveal screens (AccordionText / InfoLayerHotspot reference):
     s16Open     which example's popup is showing, or null. Presentation, reset on every entry.
     s16Visited  which examples were ever opened. Progress, only grows, drives the gate (never read back from the DOM).
   One writer (s16Apply). Continue unlocks when both were opened, in any order; the gate is also in
   SCREEN_GATES so ArrowLeft cannot bypass it. The popup is modal: Tab stays on its close button, the rest of the
   screen is inert, Escape / backdrop click / the X close it, focus returns to the card that opened it, and the
   arrow keys do not navigate while it is open. */
const S16_KEYS = ['moon', 'algae'];
let s16OpenKey = null;
const s16Visited = new Set();
function s16Apply() {
  S16_KEYS.forEach(k => {
    const pop = document.getElementById('s16-pop-' + k), card = document.getElementById('s16-card-' + k);
    if (pop) pop.classList.toggle('hidden', s16OpenKey !== k);
    if (card) { card.classList.toggle('is-visited', s16Visited.has(k)); card.setAttribute('aria-expanded', s16OpenKey === k ? 'true' : 'false'); }
  });
  const modal = s16OpenKey !== null;
  document.querySelectorAll('#s16 .select-content, #s16 .btn-continue, #s16 .btn-back').forEach(el => { el.inert = modal; });
  const btn = document.getElementById('s16-continue');
  if (btn) btn.disabled = s16Visited.size < S16_KEYS.length;
}
function s16Open_(key) {
  if (S16_KEYS.indexOf(key) === -1) return;
  s16Visited.add(key);                    // recorded on open, never removed
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s16OpenKey = key;
  s16Apply();
  const c = document.querySelector('#s16-pop-' + key + ' .s16-pop-close');
  if (c) c.focus();
}
function s16Close_(key) {
  if (key && s16OpenKey !== key) return;
  const prev = s16OpenKey;
  s16OpenKey = null;
  s16Apply();
  if (prev) { const c = document.getElementById('s16-card-' + prev); if (c) c.focus(); }   // focus back on the opener
}
function s16Backdrop(e, key) { if (e.target === e.currentTarget) s16Close_(key); }
function s16Enter() { s16OpenKey = null; s16Apply(); }   // re-entry: progress persists, presentation is re-derived
document.addEventListener('keydown', e => {
  if (currentScreen !== 16 || s16OpenKey === null) return;
  if (e.key === 'Escape') { s16Close_(s16OpenKey); return; }
  if (e.key === 'Tab') { e.preventDefault(); const c = document.querySelector('#s16-pop-' + s16OpenKey + ' .s16-pop-close'); if (c) c.focus(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation();   // a modal: no screen navigation behind it
}, true);

/* ===================== S17 (data-screen 17) — SingleChoiceQuestion, text only (slide 46) =====================
   720-templates SingleChoiceQuestion on the S2 pattern. Correct: משפט ב (the filled radio on the slide). Two attempts
   (template default; the notes state no deviation). NO hint (no approved hint text - producer 2026-10-05). Feedback:
   the slide authors a correct box ("נכון מאוד!") and one incorrect box ("התשובה אינה נכונה.") with the same
   explanation -> correct + wrong2 share it, wrong2 takes the canonical second title line; retry = the template's short
   copy (not authored). Retry gate: re-selecting the option just marked wrong keeps the check disabled. Re-entry: a
   resolved question comes back locked (feedback reopens on Back); a question left mid-way comes back as left. */
const S17Q = { correctId: 'b', maxAttempts: 2 };
let s17Selected = null, s17Attempts = 0, s17Done = false, s17LastWrong = null, s17Outcome = null;
const S17_BODY = ['هذه جملة تقدم تفسيرًا أو استنتاجًا حول ظاهرة ما:<br>إنها تحدد ما الذي تسبب في نفوق الأسماك. لكنها لا تقدم أدلة ولا تبرر كيف نعرف أن ذلك صحيح. لذلك فهي تقف وحدها بوصفها ادعاءً. جملة يمكن الموافقة عليها أو الاختلاف معها.'];
const S17_FEEDBACK = {
  retry:   { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { title: 'صحيح جدًا‎!', body: S17_BODY },
  wrong2:  { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S17_BODY }
};
const s17Opts = () => document.querySelectorAll('#s17 .scq-opt');
const s17Opt = id => document.querySelector('#s17 .scq-opt[data-id="' + id + '"]');
function s17Enter() {
  if (s17Done) { s17ApplyLocked(); return; }
  if (s17Attempts > 0) return;                       // left mid-way: comes back exactly as left
  s17ResetInitial();
}
function s17ResetInitial() {
  s17Selected = null; s17Attempts = 0; s17Done = false; s17LastWrong = null; s17Outcome = null;
  s17Opts().forEach(o => { o.classList.remove('selected', 'correct', 'wrong'); o.disabled = false; o.setAttribute('aria-checked', 'false'); });
  const btn = document.getElementById('s17-check');
  setNavLabel(btn, 'هل إجابتي صحيحة؟');
  btn.disabled = true;
  document.getElementById('s17-popup').classList.add('hidden');
}
function s17Select(id) {
  if (s17Done) return;
  dismissRetryPopup('s17-popup', s17Done);
  if (s17Attempts > 0) s17Opts().forEach(o => o.classList.remove('wrong'));
  s17Opts().forEach(o => { const on = o.dataset.id === id; o.classList.toggle('selected', on); o.setAttribute('aria-checked', on ? 'true' : 'false'); });
  s17Selected = id;
  document.getElementById('s17-check').disabled = (id === s17LastWrong);   // Retry gate
}
function s17Primary() { if (s17Done) { advanceScreen(); return; } s17Check(); }   // one bar slot: check, then progress
function s17Mark(id, cls) { const o = s17Opt(id); o.classList.remove('selected'); o.classList.add(cls); }
function s17Check() {
  if (!s17Selected || s17Done) return;
  s17Attempts++;
  /* xAPI: the graded answer — after the guards, before the finish/retry branch; the option's visible text is the metadata choice (guide §6.3). */
  xapiAnswered('011', 'q1', s17Selected === S17Q.correctId, s17Selected === S17Q.correctId || s17Attempts >= S17Q.maxAttempts,
    { choices: [xapiAnswerText(s17Opt(s17Selected))] });
  if (s17Selected === S17Q.correctId) { s17Mark(s17Selected, 'correct'); s17Finish('correct'); }
  else if (s17Attempts >= S17Q.maxAttempts) { s17Mark(s17Selected, 'wrong'); s17Mark(S17Q.correctId, 'correct'); s17Finish('wrong2'); }
  else {
    s17Mark(s17Selected, 'wrong'); s17LastWrong = s17Selected; document.getElementById('s17-check').disabled = true;
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s17ShowPopup('retry');
  }
}
function s17Finish(outcome) {
  s17Done = true; s17Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  s17ApplyLocked(); s17ShowPopup(outcome);
}
function s17ApplyLocked() {
  s17Opts().forEach(o => { o.disabled = true; });
  const btn = document.getElementById('s17-check');
  setNavLabel(btn, 'متابعة');
  btn.disabled = false;
}
function s17ShowPopup(type) {
  const cfg = S17_FEEDBACK[type], popup = document.getElementById('s17-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
/* shared by the multiple-choice drafts (S21) */
function setsEqual(a, b) { if (a.size !== b.size) return false; for (const v of a) if (!b.has(v)) return false; return true; }

/* ===================== S18 (data-screen 18) — OrderedDragAndDropQuestion (slide 47) =====================
   S7's DragAndDropQuestion behaviour on the Figma Ordered layout (see the section comment in index.html). Correct:
   claim = "לכדור המתכת…", evidence = "כאשר מניחים…", reasoning = "במאזני כפות…" (the slide's explanation names them in
   that order). Two attempts. A wrong first attempt shows the retry popup AND marks each slot ✓ / ✕ (Figma State 05
   draws the per-slot check / cross at attempt 1; per-answer verdict rule, producer 2026-10-07). A slot's mark belongs to
   it and shows only while the slot holds the sentence that was judged: moving that sentence out or placing another one
   clears that slot's mark only, never the others. Every sentence stays movable (no locking). The Retry gate keeps
   "צדקתי?" off while the arrangement is the one just marked wrong. The final wrong attempt shows the solution at once with the View My Answer Toggle. Titles follow
   the "not fully correct" rule per attempt (any slot right = "התשובה אינה נכונה במלואה."). Keyboard / tap = S7's
   pick-then-place: press a sentence to pick it (Selected look), press a slot to place it (a filled slot gives its
   sentence back), Escape drops the pick. Re-entry: resolved -> locked + feedback on Back; left mid-way -> as left. */
const S18Q = { correct: { 's18-t-claim': 's18-d-claim', 's18-t-evidence': 's18-d-evidence', 's18-t-reasoning': 's18-d-reasoning' }, maxAttempts: 2 };
const S18_TEXT = {
  's18-d-claim': 'لكرة المعدن كتلة أكبر من كتلة كرة البلاستيك.',
  's18-d-evidence': 'عندما يُوضع الكرتان على ميزان الكفتين، تنخفض الكفة التي توضع عليها الكرة المعدنية أكثر.',
  's18-d-reasoning': 'في ميزان الكفتين، الكفة التي توضع عليها الكتلة الأكبر تنزل إلى الأسفل.'
};
const S18_NAME = { 's18-t-claim': 'ادّعاء', 's18-t-evidence': 'أدلة', 's18-t-reasoning': 'التبرير' };
const S18_EXPL = ['الادعاء هو أن كرة المعدن لها كتلة أكبر؛ والدليل هو أن كفة الميزان التي عليها كرة المعدن نزلت إلى الأسفل؛ والتبرير هو أنه في ميزان الكفتين، الجانب الذي له كتلة أكبر يميل إلى الأسفل.'];
const s18Toggle = { label: 'الانتقال إلى إجابتي', view: 'answer' }, s18Back = { label: 'الإجابة الصحيحة', view: 'solution' };
const S18_FEEDBACK = {
  retry:        { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial: { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:      { title: 'صحيح جدًا‎!', body: S18_EXPL },
  wrong2:        { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S18_EXPL, action: s18Toggle, answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: s18Back } },
  wrong2Partial: { title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.', body: S18_EXPL, action: s18Toggle, answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: s18Back } }
};
const s18Place = { 's18-d-claim': 'source', 's18-d-evidence': 'source', 's18-d-reasoning': 'source' };
let s18Attempts = 0, s18Done = false, s18Outcome = null, s18LastWrong = null, s18Marks = null, s18RetryPartial = false;
let s18Judged = null;        // { slotId: sentenceId } at a non-final wrong check: its marks show only while unchanged
function s18MarkOf(t) {
  if (!s18Marks) return null;
  if (s18Done || !s18Judged) return s18Marks[t];
  return s18In(t) === s18Judged[t] ? s18Marks[t] : null;   // retry marks: only while the slot holds what was judged
}
let s18Answer = null, s18View = 'solution', s18Pick = null, s18Dnd = null, s18SkipClick = false;
const s18Targets = () => Object.keys(S18Q.correct);
const s18In = t => Object.keys(s18Place).find(d => s18Place[d] === t) || null;
const s18Snap = () => JSON.stringify(s18Place);
function s18Announce(msg) { const l = document.getElementById('s18-live'); if (l) l.textContent = msg; }
function s18MarksFor(placement) {
  const m = {};
  s18Targets().forEach(t => { const d = Object.keys(placement).find(k => placement[k] === t); m[t] = d === S18Q.correct[t] ? 'correct' : 'wrong'; });
  return m;
}
const s18AnyRight = placement => Object.values(s18MarksFor(placement)).some(v => v === 'correct');
function s18Render() {
  Object.keys(s18Place).forEach(d => {
    const card = document.getElementById(d), placed = s18Place[d] !== 'source';
    card.classList.remove('dragging');                    // re-added by onPick while a drag is live
    card.classList.toggle('is-placed', placed);
    card.classList.toggle('is-selected', s18Pick === d);
    card.setAttribute('aria-pressed', s18Pick === d ? 'true' : 'false');
    card.disabled = placed || s18Done;
    card.setAttribute('aria-hidden', placed ? 'true' : 'false');
  });
  s18Targets().forEach(t => {
    const zone = document.getElementById(t), d = s18In(t), mark = s18MarkOf(t);
    zone.textContent = '';
    zone.classList.toggle('occupied', !!d && !mark);
    zone.classList.toggle('correct', mark === 'correct');
    zone.classList.toggle('wrong', mark === 'wrong');
    zone.classList.toggle('locked', s18Done);
    if (mark) { const m = document.createElement('span'); m.className = 'ord-mark'; m.setAttribute('aria-hidden', 'true'); zone.appendChild(m); }
    if (d) {
      const card = document.createElement('span');
      card.className = 'ord-placed';
      card.textContent = S18_TEXT[d];
      zone.appendChild(card);
      if (!s18Done && s18Dnd) s18Dnd.attachSource(card, d);
    }
    const state = mark === 'correct' ? '، صحيح' : mark === 'wrong' ? '، غير صحيح' : '';
    zone.setAttribute('aria-label', S18_NAME[t] + ': ' + (d ? S18_TEXT[d] : 'فارغة') + state);
    zone.tabIndex = s18Done ? -1 : 0;
  });
  s18UpdateCheck();
}
function s18UpdateCheck() {
  const btn = document.getElementById('s18-check');
  if (s18Done) { btn.disabled = false; return; }
  const full = s18Targets().every(t => !!s18In(t));
  btn.disabled = !full || s18Snap() === s18LastWrong;     // Retry gate
}
function s18StartEdit() { dismissRetryPopup('s18-popup', s18Done); }   // marks clear per slot (s18MarkOf), not all at once
function s18PlaceCard(d, t) {
  const evicted = s18In(t);
  if (evicted && evicted !== d) s18Place[evicted] = 'source';
  s18Place[d] = t;
  s18Pick = null;
  s18Render();
  s18Announce('تم وضع الجملة في ' + S18_NAME[t]);
}
function s18InitDnd() {
  if (s18Dnd) return;
  s18Dnd = createPointerDnd({
    canDrag: () => !s18Done,
    onPick: d => { s18StartEdit(); s18Pick = null; s18Place[d] = 'source'; s18Render(); document.getElementById(d).classList.add('dragging'); },
    onDrop: (d, t) => { s18SkipClick = true; s18PlaceCard(d, t); },
    onCancel: () => { s18SkipClick = true; s18Render(); },
    onTap: (d, src) => { s18SkipClick = true; if (src.classList.contains('ord-placed')) s18ZonePress(s18Place[d]); else s18CardPress(d); }
  });
  Object.keys(s18Place).forEach(d => s18Dnd.attachSource(document.getElementById(d), d));
  s18Targets().forEach(t => {
    const zone = document.getElementById(t);
    s18Dnd.attachTarget(zone, t);
    // A pointer gesture that ends over a zone also fires a click there; the drag helper already handled it.
    zone.addEventListener('click', () => { if (s18SkipClick) { s18SkipClick = false; return; } s18ZonePress(t); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s18ZonePress(t); } });
  });
  // Keyboard on a sentence: Enter / Space fire click (the pointer path is handled by onTap).
  Object.keys(s18Place).forEach(d => document.getElementById(d).addEventListener('click', e => { if (e.detail === 0) s18CardPress(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 18 && s18Pick) { s18Pick = null; s18Render(); } });
  document.addEventListener('pointerdown', () => { s18SkipClick = false; }, true);   // a new gesture never inherits the flag
}
function s18CardPress(d) {
  if (s18Done || s18Place[d] !== 'source') return;
  s18StartEdit();
  s18Pick = (s18Pick === d) ? null : d;
  s18Render();
  if (s18Pick) s18Announce('تم اختيار جملة. اختاروا مكوّنًا لوضعها فيه.');
}
function s18ZonePress(t) {
  if (s18Done) return;
  if (s18Pick) { s18StartEdit(); s18PlaceCard(s18Pick, t); return; }
  const d = s18In(t);
  if (!d) return;
  s18StartEdit();
  s18Place[d] = 'source'; s18Pick = d;                    // pick the placed sentence up again
  s18Render();
  s18Announce('تم اختيار جملة. اختاروا مكوّنًا لوضعها فيه.');
}
function s18Primary() { if (s18Done) { advanceScreen(); return; } s18Check(); }
function s18Check() {
  if (s18Done || !s18Targets().every(t => !!s18In(t))) return;
  s18Pick = null;
  s18Attempts++;
  const marks = s18MarksFor(s18Place);
  const allCorrect = Object.values(marks).every(v => v === 'correct');
  /* xAPI: item 012 q1 (matching) — source = the sentence, target = the argument part it was placed in (metadata answers.source / answers.target) */
  xapiAnswered('012', 'q1', allCorrect, allCorrect || s18Attempts >= S18Q.maxAttempts, { pairs: s18Targets().map(t => ({ source: S18_TEXT[s18In(t)], target: S18_NAME[t] })) });
  if (allCorrect) {
    s18Marks = marks; s18Finish('correct');
  } else if (s18Attempts >= S18Q.maxAttempts) {
    s18Answer = Object.assign({}, s18Place);               // the learner's final answer, before the reveal
    s18View = 'solution';
    s18Finish('wrong2');
  } else {
    s18LastWrong = s18Snap();
    s18RetryPartial = s18AnyRight(s18Place);               // judged on the answer in front of us, per attempt
    s18Marks = marks;                                      // retry: each slot ✓ / ✕ (per-answer verdict rule)
    s18Judged = {}; s18Targets().forEach(t => { s18Judged[t] = s18In(t); });
    s18Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s18ShowPopup('retry');
  }
}
function s18Finish(outcome) {
  s18Done = true; s18Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s18-check'), 'متابعة');
  if (outcome === 'wrong2') { s18ApplyView(); return; }
  s18Render();
  s18ShowPopup(outcome);
}
/* View My Answer Toggle - the single owner of the resolved-wrong board + popup. */
function s18ApplyView() {
  if (s18Answer === null) return;
  Object.keys(s18Place).forEach(d => { s18Place[d] = 'source'; });
  if (s18View === 'answer') { Object.assign(s18Place, s18Answer); s18Marks = s18MarksFor(s18Answer); }
  else { s18Targets().forEach(t => { s18Place[S18Q.correct[t]] = t; }); s18Marks = s18MarksFor(s18Place); }
  s18Render();
  s18ShowPopup('wrong2', s18View);
}
function s18ToggleView() {
  if (s18Answer === null) return;
  s18View = (s18View === 'solution') ? 'answer' : 'solution';
  s18ApplyView();
}
function s18ShowPopup(type, view) {
  const partial = type === 'retry' ? s18RetryPartial : type === 'wrong2' ? s18AnyRight(s18Answer || s18Place) : false;
  const base = S18_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // the answer view inherits the explanation body
  const popup = document.getElementById('s18-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s18-popup', cfg.action || null, s18ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s18ResetInitial() {
  Object.keys(s18Place).forEach(d => { s18Place[d] = 'source'; });
  s18Attempts = 0; s18Outcome = null; s18LastWrong = null; s18Marks = null; s18Judged = null; s18Answer = null; s18View = 'solution'; s18Pick = null; s18RetryPartial = false;
  setNavLabel(document.getElementById('s18-check'), 'هل إجابتي صحيحة؟');
  s18Render();
}
function s18Enter() {
  s18InitDnd();
  document.getElementById('s18-popup').classList.add('hidden');
  if (s18Done) {                                           // resolved: locked board; Back reopens the popup
    if (s18Answer !== null) { s18View = 'solution'; Object.keys(s18Place).forEach(d => { s18Place[d] = 'source'; }); s18Targets().forEach(t => { s18Place[S18Q.correct[t]] = t; }); s18Marks = s18MarksFor(s18Place); }
    setNavLabel(document.getElementById('s18-check'), 'متابعة');
    s18Render();
    return;
  }
  if (s18Attempts > 0) { s18Pick = null; s18Render(); return; }   // left mid-way: comes back exactly as left (no popup)
  s18ResetInitial();
}

/* ===================== Practice progress nav (S20 / S21) =====================
   720-templates _global-components.md -> Progress Question: the state of each item is DERIVED from the screens' own recorded results
   (never stored); question 1 = slide 49 (S20), question 2 = slide 50 (S21). */
const practiceProgress = {
  questions: [
    { number: 1, screens: [20] },
    { number: 2, screens: [21] }
  ]
};
function progressItemResult(q) {
  if (q.number === 1) return s20Done ? (s20Outcome === 'correct' ? 'correct' : 'incorrect') : null;
  if (q.number === 2) return s21Done ? (s21Outcome === 'correct' ? 'correct' : 'incorrect') : null;
  return null;
}
function progressItemState(q) {
  const result = progressItemResult(q);
  if (result) return result;
  return q.screens.includes(currentScreen) ? 'current' : 'not-answered';
}
function updateProgressQuestion(container, state) {
  state.questions.forEach((q, i) => {
    const item = container.querySelector('[data-question="' + (i + 1) + '"]');
    if (!item) return;
    const icon = item.querySelector('.progress-question__icon');
    const label = item.querySelector('.progress-question__label');
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
  const nav = sectionEl?.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, practiceProgress);
}

/* ===================== S20 (data-screen 20) — MultipleChoiceQuestion, warm-up 1 of 2 (slide 49) =====================
   Selection is a Set; toggle adds / removes only that id; the check gate is size >= 1 (never a count) and, after a wrong attempt,
   the Retry gate (a Set different from the one just marked wrong). Two attempts. First wrong: every SELECTED option is marked
   (green / red), the correct options not picked stay neutral; marks clear on the first change. Final wrong: the whole correct set is
   shown green and the wrong picks red, all locked. Titles per attempt: any pick right = "התשובה אינה נכונה במלואה.". No hint, no
   View My Answer Toggle. Re-entry: resolved -> locked + feedback on Back; left mid-way -> as left. */
const S20Q = { correct: new Set(['l', 'ml', 'cc', 'm3']), maxAttempts: 2 };
const S20_EXPL = ['مل، سم³، لتر، وم³ هي وحدات تقيس <strong>الحجم.</strong> كغم والغرام هما وحدتا قياس الكتلة، وسَم هي وحدة قياس الطول.'];
const S20_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:       { title: 'الإجابة صحيحة.', body: S20_EXPL },
  wrong2:        { title: 'الإجابة غير صحيحة.<br>الإجابات الصحيحة معروضة.', body: S20_EXPL },
  wrong2Partial: { title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابات الصحيحة معروضة.', body: S20_EXPL }
};
let s20Selected = new Set(), s20Attempts = 0, s20Done = false, s20Outcome = null, s20LastWrong = null, s20Marks = null, s20RetryPartial = false, s20Answer = null;
const s20Opts = () => [...document.querySelectorAll('#s20 .scq-opt')];
const s20Snap = () => JSON.stringify([...s20Selected].sort());
const s20AnyRight = set => [...set].some(id => S20Q.correct.has(id));
function s20Render() {
  s20Opts().forEach(o => {
    const id = o.dataset.id, mark = s20Marks && s20Marks[id];
    o.classList.toggle('selected', s20Selected.has(id) && !mark);
    o.classList.toggle('correct', mark === 'correct');
    o.classList.toggle('wrong', mark === 'wrong');
    o.setAttribute('aria-checked', (s20Selected.has(id) || mark === 'correct') ? 'true' : 'false');
    o.disabled = s20Done;
  });
  const btn = document.getElementById('s20-check');
  btn.disabled = s20Done ? false : (s20Selected.size < 1 || s20Snap() === s20LastWrong);   // Retry gate
}
function s20Toggle(id) {
  if (s20Done) return;
  if (s20Selected.has(id)) s20Selected.delete(id); else s20Selected.add(id);
  s20Marks = null;                                          // the retry marks clear on the first change
  dismissRetryPopup('s20-popup', s20Done);
  s20Render();
}
function s20Primary() { if (s20Done) { advanceScreen(); return; } s20Check(); }
function s20Check() {
  if (s20Done || s20Selected.size < 1) return;
  s20Attempts++;
  const exact = setsEqual(s20Selected, S20Q.correct);
  const partial = s20AnyRight(s20Selected);
  /* xAPI: item 013 q1 (choice, multi-select) — every selected option's visible text */
  xapiAnswered('013', 'q1', exact, exact || s20Attempts >= S20Q.maxAttempts, { choices: s20Opts().filter(o => s20Selected.has(o.dataset.id)).map(o => xapiAnswerText(o)) });
  if (exact) {
    s20Marks = {}; S20Q.correct.forEach(id => { s20Marks[id] = 'correct'; });
    s20Finish('correct');
  } else if (s20Attempts >= S20Q.maxAttempts) {
    s20Answer = new Set(s20Selected);                       // the learner's final answer, for the title
    s20Marks = {}; S20Q.correct.forEach(id => { s20Marks[id] = 'correct'; });
    s20Selected.forEach(id => { if (!S20Q.correct.has(id)) s20Marks[id] = 'wrong'; });
    s20Finish('wrong2');
  } else {
    s20LastWrong = s20Snap();
    s20RetryPartial = partial;                              // judged on the answer in front of us, per attempt
    s20Marks = {}; s20Selected.forEach(id => { s20Marks[id] = S20Q.correct.has(id) ? 'correct' : 'wrong'; });
    s20Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s20ShowPopup('retry');
  }
}
function s20Finish(outcome) {
  s20Done = true; s20Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s20-check'), 'متابعة');
  s20Render();
  syncPracticeProgressNav(document.getElementById('s20'));
  s20ShowPopup(outcome);
}
function s20ShowPopup(type) {
  const partial = type === 'retry' ? s20RetryPartial : type === 'wrong2' ? s20AnyRight(s20Answer || s20Selected) : false;
  const cfg = S20_FEEDBACK[partial ? type + 'Partial' : type];
  const popup = document.getElementById('s20-popup');
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = cfg.title;
  popup.querySelector('.scq-popup-body').innerHTML = cfg.body.map(p => '<p>' + p + '</p>').join('');
  renderPopupAction('s20-popup', null);
  resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s20ResetInitial() {
  s20Selected = new Set(); s20Attempts = 0; s20Done = false; s20Outcome = null; s20LastWrong = null; s20Marks = null; s20RetryPartial = false; s20Answer = null;
  setNavLabel(document.getElementById('s20-check'), 'هل إجابتي صحيحة؟');
  s20Render();
}
function s20Enter() {
  document.getElementById('s20-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s20'));
  if (s20Done) { setNavLabel(document.getElementById('s20-check'), 'متابعة'); s20Render(); return; }
  if (s20Attempts > 0) { s20Render(); return; }              // left mid-way: comes back exactly as left (no popup)
  s20ResetInitial();
}

/* ===================== S21 (data-screen 21) — DropdownQuestion, warm-up 2 of 2 (slide 50) =====================
   Two blanks, each its own correct value (1,000 / 1,000), checked together; two attempts. A non-final wrong attempt shows the retry
   popup and marks each slot ✓ / ✕ (per-answer verdict rule, producer 2026-10-07); every slot stays selectable, a ✕ clears when its
   slot is opened or changed, a ✓ when its value changes; the Retry gate keeps "צדקתי?" off while the selections are the
   ones just marked wrong; the final wrong attempt shows the solution at once, each slot judged on its own (a right slot stays green
   in every view), with the View My Answer Toggle. Titles per attempt: any slot right = "התשובה אינה נכונה במלואה.". Opening or
   changing a dropdown dismisses a retry popup. No hint. Re-entry: resolved -> locked, solution view + feedback on Back; left
   mid-way -> as left. */
const S21Q = { correct: { 1: '1,000', 2: '1,000' }, slots: [1, 2], maxAttempts: 2 };
const S21_EXPL = ['1 لتر = 1,000 مل = 1,000 سم³.<br>1 م³ = 1,000 لتر.', 'التحويلات مبنية على <strong>النظام العشري</strong>، حيث تتم الانتقالات بين الوحدات بمضاعفات 1,000.'];
const s21ToggleA = { label: 'الانتقال إلى إجابتي', view: 'answer' }, s21BackA = { label: 'الإجابة الصحيحة', view: 'solution' };
const S21_FEEDBACK = {
  retry:         { title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  retryPartial:  { title: 'الإجابة ليست صحيحة بالكامل.', body: ['هل نحاول مرة أخرى؟'] },
  correct:       { title: 'صحيح جدًا‎!', body: S21_EXPL },
  wrong2:        { title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S21_EXPL, action: s21ToggleA, answerView: { title: 'الإجابة غير صحيحة.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: s21BackA } },
  wrong2Partial: { title: 'الإجابة ليست صحيحة بالكامل.<br>الإجابة الصحيحة معروضة.', body: S21_EXPL, action: s21ToggleA, answerView: { title: 'الإجابة ليست صحيحة بالكامل.<br>يمكنكم مشاهدة الحل الصحيح مرة أخرى.', action: s21BackA } }
};
const S21_DQ_CHECK = '<img class="dq-check-ico" src="assets/img/dq-correct.svg" width="16" height="16" alt="" aria-hidden="true">';
const S21_DQ_WRONG = '<img class="dq-wrong-ico" src="assets/img/dq-incorrect.svg" width="16" height="16" alt="" aria-hidden="true">';
let s21Sel = { 1: null, 2: null }, s21Attempts = 0, s21Done = false, s21Outcome = null, s21LastWrong = null, s21RetryPartial = false;
let s21Answer = null, s21View = 'solution', s21OpenSlot = null, s21Wired = false;
let s21Marks = {};          // slot -> 'correct' | 'wrong' after a non-final wrong attempt (per-answer verdict rule)
const s21Snap = () => JSON.stringify(s21Sel);
const s21Btn = n => document.getElementById('s21-btn-' + n), s21List = n => document.getElementById('s21-list-' + n);
function s21SlotState(n) {                                  // what slot n shows: { value, verdict: null | 'correct' | 'wrong' }
  if (!s21Done) return { value: s21Sel[n], verdict: s21Marks[n] || null };
  if (s21Outcome === 'correct') return { value: s21Sel[n], verdict: 'correct' };
  const a = s21Answer[n];
  if (a.correct) return { value: a.value, verdict: 'correct' };            // an already-right slot stays right in every view
  return s21View === 'answer' ? { value: a.value, verdict: 'wrong' } : { value: S21Q.correct[n], verdict: 'correct' };
}
function s21Render() {
  S21Q.slots.forEach(n => {
    const btn = s21Btn(n), st = s21SlotState(n), sel = document.getElementById('s21-selected-' + n);
    sel.textContent = st.value || '';
    btn.dataset.empty = st.value ? 'false' : 'true';
    btn.classList.toggle('dq-correct', st.verdict === 'correct');
    btn.classList.toggle('dq-wrong', st.verdict === 'wrong');
    btn.querySelectorAll('.dq-check-ico, .dq-wrong-ico').forEach(e => e.remove());
    if (st.verdict === 'correct') btn.insertAdjacentHTML('beforeend', S21_DQ_CHECK);
    if (st.verdict === 'wrong') btn.insertAdjacentHTML('beforeend', S21_DQ_WRONG);
    btn.disabled = s21Done;
    btn.setAttribute('aria-label', 'الجملة ' + n + ': ' + (st.value ? 'تم اختيار ' + st.value + (st.verdict === 'correct' ? '، صحيح' : st.verdict === 'wrong' ? '، غير صحيح' : '') : 'اختاروا إجابة'));
    s21List(n).querySelectorAll('.dq-option').forEach(o => o.setAttribute('aria-selected', !s21Done && o.dataset.value === s21Sel[n] ? 'true' : 'false'));
  });
  const check = document.getElementById('s21-check');
  check.disabled = s21Done ? partEnded : !(s21Sel[1] && s21Sel[2]) || s21Snap() === s21LastWrong;     // Retry gate; after the component ended the button stays off
  s21SyncHint();
}
function s21CloseAll(refocus) {
  const was = s21OpenSlot;
  S21Q.slots.forEach(n => { s21List(n).classList.add('hidden'); s21Btn(n).setAttribute('aria-expanded', 'false'); document.getElementById('s21-wrap-' + n).classList.remove('is-open'); s21List(n).querySelectorAll('.dq-option').forEach(o => o.classList.remove('is-active')); });
  s21OpenSlot = null;
  if (refocus && was) s21Btn(was).focus();
}
function s21Open(n, focusFirst) {
  s21CloseAll(false);
  dismissRetryPopup('s21-popup', s21Done);                  // opening a dropdown is a corrective action
  if (s21Marks[n] === 'wrong') { delete s21Marks[n]; s21Render(); }   // ...and clears that slot's ✕
  s21List(n).classList.remove('hidden');
  s21Btn(n).setAttribute('aria-expanded', 'true');
  document.getElementById('s21-wrap-' + n).classList.add('is-open');
  s21OpenSlot = n;
  if (focusFirst) { const opts = [...s21List(n).querySelectorAll('.dq-option')]; (opts.find(o => o.dataset.value === s21Sel[n]) || opts[0]).focus(); }
}
function s21Toggle(n) {
  if (s21Done) return;
  if (s21OpenSlot === n) s21CloseAll(false); else s21Open(n, false);
}
function s21Select(n, value) {
  if (s21Done) return;
  dismissRetryPopup('s21-popup', s21Done);
  if (value !== s21Sel[n]) delete s21Marks[n];              // a changed slot no longer shows the judged verdict
  s21Sel[n] = value;
  s21CloseAll(true);
  s21Render();
}
function s21Wire() {
  if (s21Wired) return; s21Wired = true;
  S21Q.slots.forEach(n => {
    const btn = s21Btn(n), list = s21List(n);
    btn.addEventListener('keydown', e => { if (s21Done) return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); s21Open(n, true); } });
    list.querySelectorAll('.dq-option').forEach(o => {
      o.addEventListener('click', () => s21Select(n, o.dataset.value));
      o.addEventListener('mouseenter', () => { list.querySelectorAll('.dq-option').forEach(x => x.classList.remove('is-active')); });
      o.addEventListener('keydown', e => {
        const opts = [...list.querySelectorAll('.dq-option')], i = opts.indexOf(o);
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s21Select(n, o.dataset.value); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(i + 1, opts.length - 1)].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(i - 1, 0)].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); opts[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); opts[opts.length - 1].focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); s21CloseAll(true); }
        else if (e.key === 'Tab') { s21CloseAll(false); }
      });
    });
  });
  document.addEventListener('click', e => { if (s21OpenSlot && !e.target.closest('#s21 .dq-dropdown-wrap')) s21CloseAll(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentScreen === 21 && s21OpenSlot) s21CloseAll(true); });
}
/* This is the last screen of the part. The component has no pass / fail exit condition (producer 2026-10-06): every learner who finishes
   it goes on to component 2 (part 02-02), whatever the answers. The platform owns this routing: the resolved button's click reports the
   component 'completed' (partFinish, below the xAPI config at the end of this file) and the platform launches the next component.
   NEXT_PART_URL survives only for the DEV_NAV walkthrough (?dev=1, no ?registration). */
const NEXT_PART_URL = '../methodica-science-mass-liquid-02-02/index.html';
function s21Primary() { if (s21Done) { partFinish(document.getElementById('s21-check')); return; } s21Check(); }
function s21Check() {
  if (s21Done || !(s21Sel[1] && s21Sel[2])) return;
  s21CloseAll(false);
  s21Attempts++;
  const right = n => s21Sel[n] === S21Q.correct[n];
  /* xAPI: the graded answer — after the guards, before the finish/retry branch (guide §6.3). The catalogue has one choice question per
     dropdown (014/q1 = slot 1, 014/q2 = slot 2; split by the content team, MOE QA 2026-10-25), each judged on its own slot; both share
     isLast — the screen is resolved or not as a whole (cf. 03-003 q1/q2). */
  xapiAnswered('014', 'q1', right(1), S21Q.slots.every(right) || s21Attempts >= S21Q.maxAttempts, { choices: [s21Sel[1]] });
  xapiAnswered('014', 'q2', right(2), S21Q.slots.every(right) || s21Attempts >= S21Q.maxAttempts, { choices: [s21Sel[2]] });
  if (S21Q.slots.every(right)) { s21Finish('correct'); }
  else if (s21Attempts >= S21Q.maxAttempts) {
    s21Answer = {}; S21Q.slots.forEach(n => { s21Answer[n] = { value: s21Sel[n], correct: right(n) }; });    // taken BEFORE the reveal
    s21View = 'solution';
    s21Finish('wrong2');
  } else {
    s21LastWrong = s21Snap();
    s21RetryPartial = S21Q.slots.some(right);              // judged on the answer in front of us, per attempt
    s21Marks = {}; S21Q.slots.forEach(n => { s21Marks[n] = right(n) ? 'correct' : 'wrong'; });   // per-answer ✓ / ✕
    s21Render();
    try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
    s21ShowPopup('retry');
  }
}
function s21Finish(outcome) {
  s21Done = true; s21Outcome = outcome;
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
  setNavLabel(document.getElementById('s21-check'), 'متابعة');
  syncPracticeProgressNav(document.getElementById('s21'));
  if (outcome === 'wrong2') { s21ApplyView(); return; }
  s21Render();
  s21ShowPopup(outcome);
}
/* Bar button (closing round 2026-10-20, Nimrod / Roni): the Recall button moved from the question content into the bar's hint slot, with the Recall label; it opens the Recall popup (white, X, title + diagram) but is positioned and gated like a hint. The screen's hint text, where there was one, is replaced by the diagram. Reference material: there from the start (never gated), retires when the question resolves. */
function s21SyncHint() {
  const h = document.getElementById('s21-hint');
  h.hidden = s21Done;
  h.style.visibility = s21Done ? 'hidden' : 'visible';
}
function s21OpenHint() {
  if (s21Done) return;
  xapiRequestedHint('014', 'q1');   /* xAPI: the Recall popup lives in the bar's hint slot — the open path only, never the close; one popup for both blanks, reported on q1 */
  openRecallPopup(document.getElementById('s21-hint'));
}
function s21ApplyView() { if (s21Answer === null) return; s21Render(); s21ShowPopup('wrong2', s21View); }
function s21ToggleView() { if (s21Answer === null) return; s21View = (s21View === 'solution') ? 'answer' : 'solution'; s21ApplyView(); }
function s21ShowPopup(type, view) {
  const partial = type === 'retry' ? s21RetryPartial : type === 'wrong2' ? S21Q.slots.some(n => s21Answer[n].correct) : false;
  const base = S21_FEEDBACK[partial ? type + 'Partial' : type];
  const cfg = (view === 'answer' && base.answerView) ? Object.assign({}, base, base.answerView) : base;   // the answer view inherits the explanation body
  const popup = document.getElementById('s21-popup');
  const bodyHtml = cfg.body.map(p => '<p>' + p + '</p>').join('');
  if (swapFeedbackView(popup, type, cfg, bodyHtml)) return;   // the toggle: only the changed lines fade (a dragged popup stays where it is)
  const t = splitFeedbackTitle(cfg.title);
  popup.classList.remove('type-retry', 'type-correct', 'type-wrong2');
  popup.classList.add('type-' + type);
  popup.querySelector('.scq-popup-title').innerHTML = feedbackTitleHtml(t);
  popup.querySelector('.scq-popup-body').innerHTML = bodyHtml;
  const reserve = [base.action, base.answerView && base.answerView.action].filter(Boolean).map(a => a.label);
  renderPopupAction('s21-popup', cfg.action || null, s21ToggleView, reserve);
  popup._fb = { type, l1: t.l1, body: bodyHtml };
  if (popup.classList.contains('hidden')) resetPopupPosition(popup);
  popup.classList.remove('hidden');
}
function s21ResetInitial() {
  s21Sel = { 1: null, 2: null }; s21Attempts = 0; s21Done = false; s21Outcome = null; s21LastWrong = null; s21RetryPartial = false; s21Answer = null; s21View = 'solution'; s21Marks = {};
  setNavLabel(document.getElementById('s21-check'), 'هل إجابتي صحيحة؟');
  s21Render();
}
function s21Enter() {
  s21Wire();
  s21CloseAll(false);
  document.getElementById('s21-popup').classList.add('hidden');
  syncPracticeProgressNav(document.getElementById('s21'));
  if (s21Done) {                                            // resolved: locked, back on the solution view
    s21View = 'solution';
    setNavLabel(document.getElementById('s21-check'), 'متابعة');
    s21Render();
    return;
  }
  if (s21Attempts > 0) { s21Render(); return; }             // left mid-way: comes back exactly as left (no popup)
  s21ResetInitial();
}


/* ===================== Shared retry-popup dismissal ===================== */
function dismissRetryPopup(popupId, done) {
  if (done) return;
  document.getElementById(popupId)?.classList.add('hidden');
}

/* ===================== Boot ===================== */
window.addEventListener('DOMContentLoaded', () => {
  scaleApp();
  initNavLabels();
  Object.keys(SCREEN_IMAGES).forEach(mountScreenImage);   // preload: images fade in on entry and must not reveal empty
  resetScreenState(0);
  Motion.reveal(document.querySelector('.screen.active'));   // animation-system initial-load hook
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
    window.parent.postMessage({ type: 'DEV_READY', total: document.querySelectorAll('.screen').length }, '*');
  }
}

/* ═══════════════════ xAPI (720) — this component's configuration ═══════════════════
   Data only, read at CALL time by the shared layer in ../unit-js/ (guide §6.1). Item suffixes come
   from metadata/methodica-science-mass-liquid-02-01.json (informationToBot per item); the harness checks the map against the
   catalogue both ways and against the DOM's data-screen set. Keys = data-screen (0-based). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],                                     // character pick
  1: ['002', 1],                                     // hook comic + question (s2)
  2: ['003', 1], 3: ['003', 2],                      // history of the metric system (s3), "this unit: volume" (s4)
  4: ['004', 1],                                     // what is volume — the three content clips (s5)
  5: ['005', 1], 6: ['005', 2],                      // supermarket welcome + hotspot shelves
  7: ['006', 1],                                     // unit ↔ product drag-and-drop
  8: ['007', 1],                                     // two measuring methods (flip cards)
  9: ['008', 1], 10: ['008', 2], 11: ['008', 3],     // conversion intro (thinking clip), cube → box → truck fill-ups
  12: ['009', 1], 13: ['009', 2],                    // conversion diagram, bucket practice
  14: ['010', 1], 15: ['010', 2], 16: ['010', 3],    // scientific argument: concept, structure, examples
  17: ['011', 1],                                    // which sentence is the claim
  18: ['012', 1],                                    // order the three sentences
  19: null,                                          // "מה נשאר לנו בראש?" — narrative lead-in to the warm-ups, no catalogue item
  20: ['013', 1],                                    // warm-up: which units measure volume
  21: ['014', 1]                                     // warm-up: conversion relations (dropdowns)
};

var XAPI_COMP_SLUG = 'methodica-science-mass-liquid-02-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '002': 1, '006': 1, '011': 1, '012': 1, '013': 1, '014': 1 }   /* items whose question is graded in CODE (xapiAnswered call sites) */;
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-liquid-02-01.json';
var XAPI_END_BTN = 's21-check';   /* the part's last button (D-8, restoreEndedButton) */

/* The component result for its 'completed' (guide §6.4: the denominator is what the learner was told). */
function xapiPartResult() {
  /* Instruction component, no pass/fail condition (producer 2026-10-06): the six graded questions are answered
     individually ('answered' statements), the component itself is completed by reaching its end. */
  return { success: true };
}

/* The last click of the part: report, disable, navigate nowhere (xapiEndComponent). Called on the
   pass AND fail paths (a failing learner's attempt must be recorded; Kata routes on
   recommendedAfterFail). partEnded keeps the button disabled through the screen's own re-renders;
   after a reload the LEDGER decides (restoreEndedButton, Phase 4). */
let partEnded = false;
function partFinish(btn) {
  partEnded = true;
  if (typeof DEV_NAV !== 'undefined' && DEV_NAV) window.location.href = NEXT_PART_URL + window.location.search;
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { if (typeof flushResumeSave === 'function') flushResumeSave(); } catch (e) {}
}

/* ═══ RESUME — the four per-part hooks (unit-js/40-resume.js; guide §8.7) ═══
   Called by the shared layer in this order on a restore (applyExecutionState): applyResumeVars → goTo(n) →
   applyResumeVars again (undoes the reset that resetScreenState(n) just did) → applyResumeDom → restoreScreenUI(n).
   restoreScreenUI(n) also runs on EVERY goTo (repaintScreen), outside _restoring, so each painter is pure and
   idempotent: it re-derives the screen from its state variables and never resets anything (no sNResetInitial, no
   resetScreenState). The painters are thin because every screen here already renders from its variables
   (sNRender / sNApply / the done-and-attempts branches of sNEnter).
   Never captured (transient or DOM-only presentation, re-derived on entry): the Dnd controllers (sNDnd), picks
   (sNPick, s13Pick), the click-skip flags, the open hotspot / accordion item / s16 popup / s21 dropdown, timers and
   hint tokens, popup positions. Keyed by data-screen: 1 = #s2, 4 = #s5, 6 = #s6, then n = #sN. */

/* ── helpers (rs-prefixed: no identifier may be declared in both layers, §3.3) ── */
const rsStr = v => (typeof v === 'string' ? v : null);
const rsObj = v => ((v && typeof v === 'object' && !Array.isArray(v)) ? Object.assign({}, v) : null);
/* done without an outcome (the harness forces done:true everywhere to sweep the painters) reads as 'correct' */
const rsOutcome = (o, done) => { const x = (o === 'correct' || o === 'wrong2') ? o : null; return (done && !x) ? 'correct' : x; };
function rsBoolArr(src, n) { const out = []; for (let i = 0; i < n; i++) out.push(!!(Array.isArray(src) && src[i])); return out; }
/* refill a const Set in the payload's order (identity kept); `allowed` = list of valid members, or a typeof name */
function rsFillSet(set, arr, allowed) {
  set.clear();
  if (!Array.isArray(arr)) return;
  arr.forEach(x => { if (typeof allowed === 'string' ? typeof x === allowed : allowed.includes(x)) set.add(x); });
}
function rsScqSlice(selected, attempts, done, outcome, lw) {
  return { selected: selected, attempts: attempts, done: done, outcome: outcome, lw: lw };
}
function rsS21Answer() {
  if (s21Answer === null) return null;
  const a = {};
  S21Q.slots.forEach(n => { a[n] = { value: s21Answer[n] ? s21Answer[n].value : null, correct: !!(s21Answer[n] && s21Answer[n].correct) }; });
  return a;
}

/* ── 1. capture — JSON-serialisable, deterministic (no DOM reads); Sets → arrays, absent → null ── */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    gates: {
      icxDone: icxDone.slice(), icxSeq: icxSeq, icxUnlocked: icxUnlocked,                                   // #s5 clips
      hsVisited: [...hsVisited],                                                                          // #s6 hotspots
      frc8Seen: frc8Seen.slice(), frc8Face: frc8Face.slice(), frc8GhSeen: frc8GhSeen, frc8GhDone: frc8GhDone,   // #s8 flip cards
      fill11Count: fill11Count, fill11Done: fill11Done, s10Concluded: s10Concluded, s10GhSeen: s10GhSeen, s10GhDone: s10GhDone,
      s11Count: s11Count, s11Done: s11Done, s11Concluded: s11Concluded, s11GhSeen: s11GhSeen, s11GhDone: s11GhDone,
      s12Played: s12Played,
      s13Done: Object.assign({}, s13Done), s13GhSeen: s13GhSeen, s13GhPlayed: s13GhPlayed,
      s15Visited: [...s15Visited],
      s16Visited: [...s16Visited]
    },
    screens: {
      s2:  rsScqSlice(s2Selected, s2Attempts, s2Done, s2Outcome, s2LastWrong),
      s7:  { place: Object.assign({}, s7Place), attempts: s7Attempts, done: s7Done, outcome: s7Outcome, lw: s7LastWrong,
             marks: rsObj(s7Marks), judged: rsObj(s7Judged), answer: rsObj(s7Answer), view: s7View, retryPartial: s7RetryPartial },
      s17: rsScqSlice(s17Selected, s17Attempts, s17Done, s17Outcome, s17LastWrong),
      s18: { place: Object.assign({}, s18Place), attempts: s18Attempts, done: s18Done, outcome: s18Outcome, lw: s18LastWrong,
             marks: rsObj(s18Marks), judged: rsObj(s18Judged), answer: rsObj(s18Answer), view: s18View, retryPartial: s18RetryPartial },
      s20: { selected: [...s20Selected], attempts: s20Attempts, done: s20Done, outcome: s20Outcome, lw: s20LastWrong,
             marks: rsObj(s20Marks), retryPartial: s20RetryPartial, answer: s20Answer ? [...s20Answer] : null },
      s21: { sel: Object.assign({}, s21Sel), attempts: s21Attempts, done: s21Done, outcome: s21Outcome, lw: s21LastWrong,
             marks: rsObj(s21Marks) || {}, retryPartial: s21RetryPartial, answer: rsS21Answer(), view: s21View }
    }
  };
}

/* ── 2. variables only, never the DOM. Safe with a partial payload (any key may be missing). const Sets and
      objects keep their identity (clear / per-key assign). Rule 9: a mid-way question without a saved
      LastWrong gets its current signature, so the Retry gate still holds after an old document. ── */
function applyResumeVars(st) {
  if (!st || typeof st !== 'object') return;
  if (st.qResults && typeof st.qResults === 'object') Object.keys(st.qResults).forEach(k => { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  const g = st.gates;
  if (g && typeof g === 'object') {
    rsBoolArr(g.icxDone, ICX_N).forEach((b, i) => { icxDone[i] = b; });
    icxSeq = Math.max(0, Math.min(ICX_N, g.icxSeq | 0));
    icxUnlocked = !!g.icxUnlocked;
    rsFillSet(hsVisited, g.hsVisited, Object.keys(HS_ITEMS));
    rsBoolArr(g.frc8Seen, frc8Seen.length).forEach((b, i) => { frc8Seen[i] = b; });
    rsBoolArr(g.frc8Face, frc8Face.length).forEach((b, i) => { frc8Face[i] = b; });
    frc8GhSeen = !!g.frc8GhSeen; frc8GhDone = !!g.frc8GhDone;
    fill11Count = Math.max(0, Math.min(1000, g.fill11Count | 0)); fill11Done = !!g.fill11Done; s10Concluded = !!g.s10Concluded;
    s10GhSeen = !!g.s10GhSeen; s10GhDone = !!g.s10GhDone;
    s11Count = Math.max(0, Math.min(10, g.s11Count | 0)); s11Done = !!g.s11Done; s11Concluded = !!g.s11Concluded;
    s11GhSeen = !!g.s11GhSeen; s11GhDone = !!g.s11GhDone;
    s12Played = !!g.s12Played;
    Object.keys(s13Done).forEach(k => { s13Done[k] = !!(g.s13Done && typeof g.s13Done === 'object' && g.s13Done[k]); });
    s13GhSeen = !!g.s13GhSeen; s13GhPlayed = Math.max(0, g.s13GhPlayed | 0);
    rsFillSet(s15Visited, g.s15Visited, 'number');
    rsFillSet(s16Visited, g.s16Visited, S16_KEYS);
  }
  const sc = st.screens;
  if (!sc || typeof sc !== 'object') return;
  let v;
  if ((v = sc.s2) && typeof v === 'object') {
    s2Selected = rsStr(v.selected); s2Attempts = v.attempts | 0; s2Done = !!v.done; s2Outcome = rsOutcome(v.outcome, s2Done);
    s2LastWrong = rsStr(v.lw);
    if (s2Attempts > 0 && !s2Done && s2LastWrong === null) s2LastWrong = s2Selected;   // rule 9 (SCQ: the signature is the option)
  }
  if ((v = sc.s7) && typeof v === 'object') {
    Object.keys(s7Place).forEach(d => { const p = (v.place && typeof v.place === 'object') ? v.place[d] : null; s7Place[d] = (p === 'source' || s7Targets().includes(p)) ? p : 'source'; });
    s7Attempts = v.attempts | 0; s7Done = !!v.done; s7Outcome = rsOutcome(v.outcome, s7Done);
    s7Marks = rsObj(v.marks); s7Judged = rsObj(v.judged); s7Answer = rsObj(v.answer);
    s7View = v.view === 'answer' ? 'answer' : 'solution'; s7RetryPartial = !!v.retryPartial;
    s7LastWrong = rsStr(v.lw);
    if (s7Attempts > 0 && !s7Done && s7LastWrong === null) s7LastWrong = s7Snap();      // rule 9
  }
  if ((v = sc.s17) && typeof v === 'object') {
    s17Selected = rsStr(v.selected); s17Attempts = v.attempts | 0; s17Done = !!v.done; s17Outcome = rsOutcome(v.outcome, s17Done);
    s17LastWrong = rsStr(v.lw);
    if (s17Attempts > 0 && !s17Done && s17LastWrong === null) s17LastWrong = s17Selected;   // rule 9
  }
  if ((v = sc.s18) && typeof v === 'object') {
    Object.keys(s18Place).forEach(d => { const p = (v.place && typeof v.place === 'object') ? v.place[d] : null; s18Place[d] = (p === 'source' || s18Targets().includes(p)) ? p : 'source'; });
    s18Attempts = v.attempts | 0; s18Done = !!v.done; s18Outcome = rsOutcome(v.outcome, s18Done);
    s18Marks = rsObj(v.marks); s18Judged = rsObj(v.judged); s18Answer = rsObj(v.answer);
    s18View = v.view === 'answer' ? 'answer' : 'solution'; s18RetryPartial = !!v.retryPartial;
    s18LastWrong = rsStr(v.lw);
    if (s18Attempts > 0 && !s18Done && s18LastWrong === null) s18LastWrong = s18Snap();   // rule 9
  }
  if ((v = sc.s20) && typeof v === 'object') {
    rsFillSet(s20Selected, v.selected, 'string');
    s20Attempts = v.attempts | 0; s20Done = !!v.done; s20Outcome = rsOutcome(v.outcome, s20Done);
    s20Marks = rsObj(v.marks); s20RetryPartial = !!v.retryPartial;
    s20Answer = Array.isArray(v.answer) ? new Set(v.answer.filter(x => typeof x === 'string')) : null;
    s20LastWrong = rsStr(v.lw);
    if (s20Attempts > 0 && !s20Done && s20LastWrong === null) s20LastWrong = s20Snap();   // rule 9
  }
  if ((v = sc.s21) && typeof v === 'object') {
    S21Q.slots.forEach(n => { s21Sel[n] = rsStr((v.sel && typeof v.sel === 'object') ? v.sel[n] : null); });
    s21Attempts = v.attempts | 0; s21Done = !!v.done; s21Outcome = rsOutcome(v.outcome, s21Done);
    s21Marks = rsObj(v.marks) || {}; s21RetryPartial = !!v.retryPartial;
    s21View = v.view === 'answer' ? 'answer' : 'solution';
    s21Answer = null;
    if (v.answer && typeof v.answer === 'object') {
      s21Answer = {};
      S21Q.slots.forEach(n => { const a = (v.answer[n] && typeof v.answer[n] === 'object') ? v.answer[n] : {}; s21Answer[n] = { value: rsStr(a.value), correct: !!a.correct }; });
    }
    /* s21SlotState / s21ShowPopup('wrong2') read s21Answer[n]: a resolved-wrong slot without its answer is rebuilt from the selections */
    if (s21Done && s21Outcome === 'wrong2' && s21Answer === null) {
      s21Answer = {};
      S21Q.slots.forEach(n => { s21Answer[n] = { value: s21Sel[n], correct: s21Sel[n] === S21Q.correct[n] }; });
    }
    s21LastWrong = rsStr(v.lw);
    if (s21Attempts > 0 && !s21Done && s21LastWrong === null) s21LastWrong = s21Snap();   // rule 9
  }
}

/* ── 3. what lives ONLY in the DOM after the variables are restored: nothing in this part. Every mark, face,
      visited ring, dropdown label and board is re-derived from the variables by the painters below (S2 / S17
      option marks by rsPaintScq, S8 faces by frc8ApplyFace, S6 rings and S21 labels by their renders). ── */
function applyResumeDom(st) {
  if (!st || !st.screens || typeof st.screens !== 'object') return;
}

/* ── 4. painter dispatch — one branch per interactive / gated screen; every gated Continue is re-derived
      from the restored state (rule 11). A painter failure is logged, never thrown (navigation must go on). ── */
function rsPaint(name, fn) { try { fn(); } catch (e) { console.error('[paint] ' + name, e); } }
function rsBtn(id, disabled) { const b = document.getElementById(id); if (b) b.disabled = disabled; }
/* SingleChoiceQuestion (S2 / S17): sNEnter paints only the lock, never the marks — those are written by the
   check handlers, so a restored question re-derives them here: resolved → the chosen option (and the correct
   one on wrong2), mid-way → the option just marked wrong (= lw) stays red, any other choice shows as selected. */
function rsPaintScq(root, checkId, correctId, q) {
  const opts = document.querySelectorAll(root + ' .scq-opt');
  const mark = (id, cls) => { const o = document.querySelector(root + ' .scq-opt[data-id="' + id + '"]'); if (o) { o.classList.remove('selected'); o.classList.add(cls); } };
  opts.forEach(o => {
    const on = !!q.selected && o.dataset.id === q.selected;
    o.classList.remove('selected', 'correct', 'wrong');
    o.classList.toggle('selected', on && !q.done && q.selected !== q.lw);
    o.setAttribute('aria-checked', on ? 'true' : 'false');
    o.disabled = q.done;
  });
  if (q.done) {
    if (q.outcome === 'wrong2') { if (q.selected && q.selected !== correctId) mark(q.selected, 'wrong'); mark(correctId, 'correct'); }
    else mark(q.selected || correctId, 'correct');
  } else if (q.selected && q.selected === q.lw) mark(q.selected, 'wrong');
  const btn = document.getElementById(checkId);
  if (btn) { setNavLabel(btn, q.done ? 'متابعة' : 'هل إجابتي صحيحة؟'); btn.disabled = q.done ? false : (!q.selected || q.selected === q.lw); }
}
function restoreScreenUI(n) {
  switch (n) {
    case 1: rsPaint('s2', () => rsPaintScq('#s2', 's2-check', S2Q.correctId, { selected: s2Selected, done: s2Done, outcome: s2Outcome, lw: s2LastWrong })); break;
    case 4: rsPaint('s5', () => {   // clips: Continue from icxUnlocked; a clip finished before the reload sits on its first frame — offer its replay
      icxSync();
      icxVideos().forEach((v, i) => { if (icxDone[i] && v.paused && !v.ended && v.currentTime === 0) { const b = document.querySelectorAll('#s5 .icx-replay')[i]; if (b) b.hidden = false; } });
    }); break;
    case 6: rsPaint('s6', () => {   // hotspots: visited rings + Continue from hsVisited
      document.querySelectorAll('#s6 .hs-dot').forEach(d => d.classList.toggle('is-visited', hsVisited.has(d.dataset.id)));
      rsBtn('s6-continue', !hsAllOpened());
    }); break;
    case 7: rsPaint('s7', () => { s7InitDnd(); setNavLabel(document.getElementById('s7-check'), s7Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); s7Render(); }); break;
    case 8: rsPaint('s8', () => {   // flip cards: faces from frc8Face, Continue from frc8Seen (the hint is entry-only)
      document.querySelectorAll('#s8 .frc-card').forEach(c => frc8ApplyFace(c, !!frc8Face[+c.dataset.index]));
      rsBtn('s8-continue', !frc8Seen.every(Boolean));
    }); break;
    case 10: rsPaint('s10', () => s10Render(false)); break;    // layers, totals, conclusion + Continue from fill11Count / s10Concluded
    case 11: rsPaint('s11', () => s11Render(false)); break;    // same, from s11Count / s11Concluded
    case 13: rsPaint('s13', () => s13Render(true)); break;     // poured buckets + Continue from s13Done, no fade
    case 15: rsPaint('s15', s15Apply); break;                  // Continue from s15Visited
    case 16: rsPaint('s16', s16Apply); break;                  // visited cards + Continue from s16Visited
    case 17: rsPaint('s17', () => rsPaintScq('#s17', 's17-check', S17Q.correctId, { selected: s17Selected, done: s17Done, outcome: s17Outcome, lw: s17LastWrong })); break;
    case 18: rsPaint('s18', () => { s18InitDnd(); setNavLabel(document.getElementById('s18-check'), s18Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); s18Render(); }); break;
    case 20: rsPaint('s20', () => { setNavLabel(document.getElementById('s20-check'), s20Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); s20Render(); syncPracticeProgressNav(document.getElementById('s20')); }); break;
    case 21: rsPaint('s21', () => { s21Wire(); setNavLabel(document.getElementById('s21-check'), s21Done ? 'متابعة' : 'هل إجابتي صحيحة؟'); s21Render(); syncPracticeProgressNav(document.getElementById('s21')); }); break;
    default: break;   // 0 (character pick: the shared layer owns it), 2, 3, 5, 9, 12, 14, 19 — no state, or entry-only (S12 plays / shows its final state from s12Played in s12Enter)
  }
  /* a resolved question's feedback re-shows on the initial restore only — the unit itself reopens it on Back alone */
  if (typeof _restoring !== 'undefined' && _restoring) { try { reopenFeedbackIfResolved(n); } catch (e) {} }
}