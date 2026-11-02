/* ═══════════════════════════════════════════════════════════
   Animation System — motion.js
   Canonical engine script, carrying one PROJECT DEVIATION (see HOLD_FALLBACK_MS
   and the reveal hold below; QA 2026-10-19). Re-apply it after any engine sync,
   or fold the fix upstream into the animation-system skill and drop this note.
   Companion of engine/motion.css.
   Engine revision: 2026-10-12 (a popup's fade-in is settled when the
   document's animation timeline is frozen; see references/DECISIONS.md
   → Popup Motion). Previous: 2026-09-24 (popup observer replays only
   on a genuine open or content change). A project copy that
   deliberately differs must mark the change `PROJECT DEVIATION` and
   drop the "copy verbatim" line.

   Wiring (two one-line hooks in the project's screen-transition
   function, e.g. goTo(n)):
     1. inside goTo(n):  Motion.cancel(prev)  when leaving,
                         Motion.reveal(next)  after '.active' is added
     2. at initial load: Motion.reveal(document.querySelector('.screen.active'))

   Behavior contract:
   - Opt-in: only screens containing [data-reveal] animate; all
     other screens are untouched.
   - First visit per session only — revisit/back-nav/DEV jumps
     show everything instantly (matches the standard 720 seen-flag
     convention: entrance animations play once per session, not on
     every revisit).
   - prefers-reduced-motion: no animation at all, instant show.
   - Interaction is NOT blocked during entrance by default. Any
     per-screen exception must be justified and documented where
     it is applied.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Screens (by element id) already revealed this session. */
  const seen = new Set();

  /* PROJECT DEVIATION (QA 2026-10-19): the longest a first-screen reveal may stay
     held after `load` before the hold is abandoned and the content shown without
     its entrance animation. A painting page delivers its frame in ~16ms, so this
     is only ever reached when no frame is coming at all. */
  const HOLD_FALLBACK_MS = 400;

  function reducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Read a ms token from motion.css so timing lives in ONE place. */
  function tokenMs(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    const val = parseFloat(raw);
    if (isNaN(val)) return fallback;
    return raw.indexOf('ms') === -1 ? val * 1000 : val;
  }

  /* Reveal the entering screen's data-reveal groups (first visit only). */
  function reveal(screenEl) {
    if (!screenEl) return;
    const key = screenEl.id || 'screen-' + screenEl.getAttribute('data-screen');
    if (seen.has(key)) return;
    seen.add(key);

    const groups = screenEl.querySelectorAll('[data-reveal]');
    if (!groups.length || reducedMotion()) return;

    screenEl.classList.add('m-animate');

    /* Drop the class once the last group settles: CSS animations
       restart whenever display flips none→block, so leaving the
       class on would replay the reveal on every revisit. End state
       equals the elements' default state, so removal is invisible. */
    let maxGroup = 1;
    groups.forEach(g => {
      maxGroup = Math.max(maxGroup, parseInt(g.getAttribute('data-reveal'), 10) || 1);
    });
    const total = tokenMs('--m-reveal-duration', 600) +
                  (maxGroup - 1) * tokenMs('--m-reveal-stagger', 180) + 80;
    const startCleanup = () => {
      screenEl._mTimer = setTimeout(() => {
        screenEl.classList.remove('m-animate');
        screenEl._mTimer = null;
      }, total);
    };

    /* Initial page load: hold the reveal (paused at its hidden
       from-state) until the page has painted, otherwise the whole
       animation plays during the loading white-screen and looks
       like the content simply appeared. Screen changes after load
       start immediately. */
    if (document.readyState === 'complete') {
      startCleanup();
    } else {
      screenEl.classList.add('m-hold');
      /* PROJECT DEVIATION (QA 2026-10-19, mass-liquid-02): the hold used to be
         released by `load` + one requestAnimationFrame alone. rAF never runs in a
         page that has loaded but was never painted (a background tab), so the first
         screen stayed at opacity 0 for as long as that lasted. Measured in that
         state, document.timeline does not advance either, so merely un-pausing the
         reveal leaves it at its hidden from-state - the fallback therefore drops the
         reveal entirely and shows the groups' end state (identical to their default
         state, which startCleanup's own removal already relies on). The timer is
         armed AT load, never before, so a slow load cannot trigger it; whichever
         path lands first latches and the other becomes a no-op. */
      let released = false, holdTimer = null;
      const release = (animate) => {
        if (released) return;
        released = true;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        screenEl.classList.remove('m-hold');
        if (animate) { startCleanup(); return; }
        screenEl.classList.remove('m-animate');
      };
      window.addEventListener('load', () => {
        holdTimer = setTimeout(() => release(false), HOLD_FALLBACK_MS);
        requestAnimationFrame(() => release(true));
      }, { once: true });
    }
  }

  /* Cancel a reveal mid-flight (fast navigation / DEV jumps).
     The screen is already in `seen`, so it re-enters instantly. */
  function cancel(screenEl) {
    if (!screenEl) return;
    if (screenEl._mTimer) {
      clearTimeout(screenEl._mTimer);
      screenEl._mTimer = null;
    }
    screenEl.classList.remove('m-animate', 'm-hold');
  }

  /* ── Popup motion: replay on EVERY real open ──────────────
     The CSS rule (.m-popup:not(.hidden)) restarts the fade only when
     display flips none→block. When a popup STAYS OPEN and only its
     content is swapped (e.g. a second wrong-answer attempt reusing
     the same feedback element), there is no display flip and the
     animation never replays. Watch every .m-popup and restart the
     animation explicitly via the reflow trick below — but ONLY for a
     meaningful presentation change: a content/view change (childList /
     characterData anywhere inside), or a genuine open of the root (its
     own `hidden` class removed, or a reopen during an outside-dismiss
     exit). State-only class writes — scroll-gate `needs-scroll`,
     drag-time descendant flips, any descendant class toggle — never
     replay: classList.add/remove fire a mutation even when nothing
     changes, so a scroll handler would otherwise restart the fade on
     every scroll event. A view swap must therefore write content (a
     re-render), not only toggle classes. Style-attribute changes (drag,
     positioning) are NOT observed at all. */
  /* Cancel a pending outside-dismiss exit (see dismissPopup below) —
     e.g. a NEW popup opens while the old one is still fading out. */
  function cancelExit(el) {
    if (el._mExitTimer) {
      clearTimeout(el._mExitTimer);
      el._mExitTimer = null;
    }
    el.style.pointerEvents = '';
  }

  function popupRestart(el) {
    cancelExit(el);
    if (reducedMotion()) { el.style.animation = ''; return; }
    el.style.animation = 'none';
    void el.offsetHeight;          // force reflow so the animation resets
    el.style.animation = '';
  }

  /* ── Frozen-timeline resilience (defensive) ────────────────
     A popup enters from opacity 0 (`m-fade-in … both`). Where the
     document's animation timeline does not advance — a background or
     hidden tab or frame that is not being rendered, or a tool that
     freezes every animation — the fade never leaves its first frame
     and the popup stays invisible. One fade-duration after each open
     or content change, if the DOCUMENT timeline has not moved while
     wall-clock time has, the stranded fade is finished so the popup
     shows. The evidence is document-level on purpose: in a page that
     is rendering, the timeline always advances, so a fade stuck there
     for a page-level reason (a paused or broken animation) is left
     visible to QA, never hidden. In a normal page this does nothing.
     Not a substitute for fixing an environment that freezes animations. */
  function armFrozenSettle(el) {
    clearTimeout(el._mSettleTimer);
    const timeline = document.timeline;
    if (!timeline) return;
    const t0 = timeline.currentTime;
    el._mSettleTimer = setTimeout(() => {
      el._mSettleTimer = null;
      if (el.classList.contains('hidden')) return;
      const t1 = timeline.currentTime;
      const stalled = t1 === null || (t0 !== null && t1 - t0 < 1);
      if (!stalled) return;
      el.getAnimations().forEach(a => {
        if (a.animationName === 'm-fade-in' && a.playState === 'running') {
          try { a.finish(); } catch (e) { /* nothing to settle */ }
        }
      });
    }, tokenMs('--m-popup-duration', 260) + 150);
  }

  /* ── Popup EXIT: outside-dismiss fade-out (optional) ───────
     Only relevant if the consuming project wires a popup dismissal
     that should animate out in parallel with the learner's next
     action (e.g. correcting an answer while feedback is still open —
     the retry-dismissal case, which is the only in-screen way a
     feedback popup goes away; feedback popups have no close button).
     The fade is an INLINE animation so the class/content
     MutationObserver above ignores it; general close paths
     (navigation, and a close button or Escape on the components that
     still have one) should stay instant and never call this. */
  function dismissPopup(el) {
    if (!el || el.classList.contains('hidden')) return;
    if (el._mExitTimer) return;                     // already exiting
    if (reducedMotion()) { el.classList.add('hidden'); return; }
    el.style.animation =
      'm-fade-out var(--m-popup-exit-duration) var(--m-ease) both';
    el.style.pointerEvents = 'none';
    el._mExitTimer = setTimeout(() => {
      el._mExitTimer = null;
      el.classList.add('hidden');
      el.style.animation = '';
      el.style.pointerEvents = '';
    }, tokenMs('--m-popup-exit-duration', 200) + 40);
  }
  function watchPopups() {
    document.querySelectorAll('.m-popup').forEach(el => {
      let scheduled = false;
      const restart = () => {
        armFrozenSettle(el);
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (!el.classList.contains('hidden')) popupRestart(el);
        });
      };
      new MutationObserver(records => {
        for (const r of records) {
          // Content/view change (childList, characterData) → replay.
          if (r.type !== 'attributes') { restart(); return; }
          // Class writes replay ONLY for a genuine open of this root:
          // its own `hidden` class going away, or a reopen while an
          // outside-dismiss exit is still fading (cancels the exit).
          if (r.target === el && !el.classList.contains('hidden') &&
              (/(^|\s)hidden(\s|$)/.test(r.oldValue || '') || el._mExitTimer)) {
            restart(); return;
          }
          // Every other class write is state-only (scroll-gate
          // `needs-scroll`, drag-time hint flips, descendant toggles)
          // and must never replay the fade.
        }
      }).observe(el, {
        attributes: true, attributeFilter: ['class'], attributeOldValue: true,
        childList: true, subtree: true, characterData: true
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPopups);
  } else {
    watchPopups();
  }

  window.Motion = { reveal, cancel, dismissPopup };
})();
