/* Structural + headless verification for methodica-ar-science-mass-liquid-02 (the Arabic twin of
   methodica-science-mass-liquid-02) — the reporting /
   issue-reporting / resume layer and the invariants it depends on.

   Every assertion corresponds to a failure that is SILENT at runtime: the lomda keeps working, the
   learner notices nothing, and the data is wrong or missing. Procedure:
   2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md (§6.8, §10.2) and the
   response-layer rules of 2026-10-19 (unit-js/20-xapi.js header; harness checks H1–H13).

   Adapted 2026-10-22 from methodica-science-body-matter-01/_test/verify-report.js for this unit's
   layout: each part's script is js/main.js (js/motion.js loads before it), styles in css/, assets
   local + unit-assets/. goTo() adds .active BEFORE resetScreenState(n) here (the QA-approved order
   of this unit; the boot cover handles the first paint), and the platform hook sits at the tail.
   The resume groups (hooks, stage A/B, painter sweeps) run only once RESUME_ENABLED is true
   (Phase 4) — until then they report as skipped rather than failing.

   RUN (jsdom must live OUTSIDE this OneDrive tree):
     NODE_PATH=C:/lomda-test/node_modules node _test/verify-report.js
   Without jsdom the static groups still run and the runtime group reports SKIPPED.
   Optional argument: a built package to check instead of the repo (the runtime group then
   reads the stub from the repo, which a package rightly does not carry). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = process.argv[2] || path.join(__dirname, '..');
const REPO = path.join(__dirname, '..');
const UNIT_SLUG = 'methodica-ar-science-mass-liquid-02';
const COMPONENTS = ['01', '02', '03', '04', '05', '06', '07'];
const PREFIX = 'https://lomdot.education.gov.il/metodica/720/ar/science/mass-liquid/02/';
const SHARED = ['10-identity', '20-xapi', '25-report', '40-resume', '50-loader', '90-boot'];
const HOOKS = ['capturePartPayload', 'applyResumeVars', 'applyResumeDom', 'restoreScreenUI'];
const CHAR_KEY = UNIT_SLUG + '_selectedCharacter';
const RESULT_KEYS = ['mass-liquid-02_moedAPassed', 'mass-liquid-02_moedBPassed'];

const compSlug = (c) => UNIT_SLUG + '-' + c;
const compDir = (c) => path.join(BASE, compSlug(c));
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p).replace(/^\uFEFF/, ''));
const partJs = (c) => read(path.join(compDir(c), 'js', 'main.js'));
const indexHtml = (c) => read(path.join(compDir(c), 'index.html'));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, skipped = 0;
const failures = [];
function ok(scope, name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push('  [' + scope + '] ' + name + (detail ? '\n      -> ' + detail : ''));
}
function skip(scope, name) { skipped++; console.log('  skipped [' + scope + '] ' + name); }
function section(t) { console.log('\n' + t); }

function fnBody(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
/* the per-part config block, evaluated as data (needs XAPI_ID_PREFIX; XAPI_ITEM_RESULT's closures
   are never invoked here) */
function partConfig(c) {
  const js = partJs(c);
  const ctx = { XAPI_ID_PREFIX: PREFIX };
  const block = js.slice(js.indexOf('var SCREEN_TO_SUBCONTENT'));
  const end = block.indexOf('function xapiPartResult');
  vm.runInNewContext(block.slice(0, end), ctx);
  return ctx;
}
const SEP_RE = /\[,\]|\[\.\]|\[:\]/;

/* ══════════════════ 1. catalogue identity ══════════════════ */
section('1. catalogue identity');
const unitMeta = readJson(path.join(BASE, 'metadata', UNIT_SLUG + '_unit.json'));
ok('identity', 'unit metadata id is the bare unit slug', unitMeta.id === UNIT_SLUG, unitMeta.id);
const identity = read(path.join(BASE, 'unit-js', '10-identity.js'));
ok('identity', 'XAPI_ID_PREFIX matches the catalogue prefix', identity.includes("var XAPI_ID_PREFIX = '" + PREFIX + "';"));
ok('identity', 'XAPI_UNIT_ID is the bare unit slug', identity.includes("window.XAPI_UNIT_ID = '" + UNIT_SLUG + "';"));
const resumeFlag = (/var RESUME_ENABLED = (true|false);/.exec(identity) || [])[1];
ok('identity', 'RESUME_ENABLED is a literal boolean', resumeFlag === 'true' || resumeFlag === 'false', String(resumeFlag));
const RESUME_ON = resumeFlag === 'true';
console.log('  RESUME_ENABLED = ' + resumeFlag + (RESUME_ON ? '' : ' (Phase 2/3: resume groups skipped)'));
const resumeJs = read(path.join(BASE, 'unit-js', '40-resume.js'));
const charKey = (/var UI_CHARACTER_KEY = '([^']+)'/.exec(resumeJs) || [])[1];
ok('identity', 'UI_CHARACTER_KEY is namespaced per unit (D-6)', charKey === CHAR_KEY, charKey);
ok('identity', 'UNIT_CHARACTERS lists the two companions', /var UNIT_CHARACTERS = \['character-1', 'character-2'\];/.test(resumeJs));
ok('identity', 'NAV_EDGE_KEY carries the unit slug', resumeJs.includes("'lomda_nav_edges::" + UNIT_SLUG + "'"));
const rk = (/var RESULT_KEYS = \[([^\]]*)\]/.exec(resumeJs) || ['', ''])[1].match(/'([^']+)'/g) || [];
ok('identity', 'RESULT_KEYS lists the 06 and 07 verdict keys', JSON.stringify(rk.map((s) => s.replace(/'/g, '')).sort()) === JSON.stringify(RESULT_KEYS.slice().sort()), rk.join(','));
const loader = read(path.join(BASE, 'unit-js', '50-loader.js'));
const lib = (/\(RESUME_ENABLED \? 'xapi-720-(\w)\.js' : 'xapi-720-(\w)\.js'\)/.exec(loader) || []);
const gate = (/xapi-720-\[([a-z]+)\]\\\.js/.exec(loader) || [])[1] || '';
ok('loader', 'library letter is k with resume (i without)', lib[1] === 'k' && lib[2] === 'i', lib.join('/'));
ok('loader', 'the loaded letters are inside the XAPI_USING_G gate', gate.includes('k') && gate.includes('i'), gate);
ok('loader', 'the stub carries a gated letter', fs.existsSync(path.join(REPO, '_test', 'xapi-720-k.js')) && /xapi-720-[ghijk]\.js$/.test('_test/xapi-720-k.js'));
ok('loader', 'settleMetadata waits for a promise-valued METADATA', /function settleMetadata\(cb\)/.test(loader) && /settleMetadata\(function \(\) \{/.test(loader));
const stub = read(path.join(REPO, '_test', 'xapi-720-k.js'));
ok('stub', '__reset clears this unit\'s keys', stub.includes("'" + CHAR_KEY + "'") && RESULT_KEYS.every((k) => stub.includes("'" + k + "'")) && stub.includes("lomda_nav_edges::" + UNIT_SLUG));
ok('stub', '__reset names no donor unit', !/volume-solid|body-matter|ratio-01|mass-measure/.test(stripComments(stub).split('__reset')[1] || ''));

/* Kata's correctXapiResponsesPattern per questionId (retrieve of 2026-10-25), and the Kata-side errors it still carries */
const KATA_PATTERNS = fs.existsSync(path.join(REPO, '_test', 'kata-patterns.json')) ? readJson(path.join(REPO, '_test', 'kata-patterns.json')) : {};
const KATA_KNOWN = {
  '006/q1': 'Kata lists both alternatives in ONE 6-pair pattern string (01-006, reported 2026-10-25)'
  /* '004/q1' was here until 2026-10-29: Kata had סמ"ק/מ"ק swapped, 3000 without the comma and mixed ״/" stepIds.
     Fixed by a questions-only PATCH of item 03-004 (נמרוד approved, monday item 13378313536); kata-patterns.json carries the corrected pattern. */
};

const META = {};
for (const c of COMPONENTS) {
  META[c] = readJson(path.join(BASE, 'metadata', compSlug(c) + '.json'));
  ok(c, 'component metadata id = prefix + slug + /', META[c].id === PREFIX + compSlug(c) + '/', META[c].id);
  ok(c, 'component learningUnitId = unit slug', META[c].learningUnitId === UNIT_SLUG, META[c].learningUnitId);
  for (const it of META[c].subContent || []) {
    ok(c, 'item id under the component: ' + it.id, it.id.startsWith(META[c].id + compSlug(c) + '-') && it.id.endsWith('/'));
    for (const q of it.questions || []) {
      ok(c, 'question id = item id + qN: ' + q.questionId, /\/q\d+$/.test(q.questionId) && q.questionId.startsWith(it.id));
      ok(c, 'questionType in the Kata enum: ' + q.questionId,
         ['fill-in', 'true-false', 'choice', 'numeric', 'sequencing', 'matching', 'performance', 'other'].includes(q.questionType), q.questionType);
      /* H5 — delimiter-free, trimmed answer strings; correctAnswers ⊆ answers */
      const pool = Array.isArray(q.answers) ? q.answers : [].concat((q.answers && q.answers.source) || [], (q.answers && q.answers.target) || []);
      for (const s of pool) ok(c, 'answer text clean: ' + s, typeof s === 'string' && !SEP_RE.test(s) && s === s.trim() && !/\s{2}/.test(s));
      if (q.questionType === 'choice') for (const ca of q.correctAnswers || []) ok(c, 'correctAnswer ∈ answers: ' + ca, q.answers.includes(ca));
      if (q.questionType === 'matching') for (const ca of q.correctAnswers || []) ok(c, 'correct pair ∈ source×target: ' + ca.source, q.answers.source.includes(ca.source) && q.answers.target.includes(ca.target));
      if (q.questionType === 'performance') ok(c, 'performance has ≥ 2 steps (steps[] or correctAnswers[].stepId)',
         (q.steps || (q.correctAnswers || []).filter((s) => s && s.stepId != null)).length >= 2);
      if (q.questionType === 'other') ok(c, 'other carries no answers', !(q.answers && q.answers.length));
    }
  }
}

/* ══════════════════ 2. per-part wiring ══════════════════ */
section('2. per-part page wiring');
const versions = {};
const sharedNames = new Set();
for (const s of SHARED) for (const m of stripComments(read(path.join(BASE, 'unit-js', s + '.js'))).matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) sharedNames.add(m[1]);
for (const c of COMPONENTS) {
  const html = indexHtml(c), js = partJs(c), jsc = stripComments(js);
  const htmlc = html.replace(/<!--[\s\S]*?-->/g, '');
  /* script tags: shared first, js/motion.js, js/main.js, 90-boot last; one ?v= per file across parts */
  const tags = [...htmlc.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  const names = tags.map((u) => path.posix.basename(u.split('?')[0]));
  const expect = SHARED.slice(0, 5).map((n) => n + '.js').concat(['motion.js', 'main.js', '90-boot.js']);
  ok(c, 'platform script tags in order (motion.js before main.js), 90-boot last', JSON.stringify(names) === JSON.stringify(expect), names.join(' '));
  for (const u of tags) {
    const v = (/[?&]v=([^&#]+)/.exec(u) || [])[1];
    ok(c, '?v= on ' + u, !!v);
    const n = path.posix.basename(u.split('?')[0]);
    (versions[n] = versions[n] || new Set()).add(v || '(none)');
  }
  for (const cssName of ['style.css', 'motion.css']) {
    const v = (new RegExp('<link rel="stylesheet" href="css/' + cssName.replace('.', '\\.') + '\\?v=([^"]+)">').exec(htmlc) || [])[1];
    ok(c, 'css/' + cssName + '?v=', !!v); (versions[cssName] = versions[cssName] || new Set()).add(v || '(none)');
  }
  const rv = (/<link rel="stylesheet" href="\.\.\/unit-css\/25-report\.css\?v=([^"]+)">/.exec(htmlc) || [])[1];
  ok(c, '25-report.css linked after css/motion.css', !!rv && htmlc.indexOf('unit-css/25-report.css') > htmlc.indexOf('css/motion.css'));
  (versions['25-report.css'] = versions['25-report.css'] || new Set()).add(rv || '(none)');
  ok(c, 'boot cover before #app', htmlc.indexOf('id="boot-cover"') > 0 && htmlc.indexOf('id="boot-cover"') < htmlc.indexOf('<div id="app">'));
  ok(c, 'boot cover failsafe script present', /__resumeInFlight/.test(html) && /setTimeout\(tick, 800\)/.test(html));
  for (const id of ['report-modal', 'report-thanks-modal', 'report-confirm-modal']) ok(c, 'dialog #' + id + ' inside #app, hidden', html.includes('id="' + id + '"') && new RegExp('id="' + id + '"[^>]*\\n\\s*class="report-modal-overlay"\\n\\s*hidden').test(html) && html.indexOf('id="' + id + '"') < html.lastIndexOf('</div><!-- /#app -->'));
  ok(c, 'report dialogs are the last children of #app (after every .screen)', htmlc.lastIndexOf('<section') < htmlc.indexOf('id="report-modal"'));
  ok(c, 'flag button #flag-btn.flag-btn, wired by delegation (no onclick)', /<button class="flag-btn" id="flag-btn" type="button"[^>]*>/.test(htmlc) && !/id="flag-btn"[^>]*onclick/.test(htmlc));
  /* index_dev.html is repo-only (the allowlist drops it): checked when present, i.e. not in a package */
  if (fs.existsSync(path.join(compDir(c), 'index_dev.html'))) ok(c, 'index_dev.html opens the part with ?dev=1', /src="index\.html\?dev=1"/.test(read(path.join(compDir(c), 'index_dev.html'))));
  else ok(c, 'no index_dev.html in the package', BASE !== REPO);
  /* the platform owns routing (§8.12) */
  const hops = [...jsc.matchAll(/window\.location\.(?:href|replace|assign)\s*=[^\n]*/g)];
  for (const m of hops) ok(c, 'cross-part hop only under DEV_NAV: ' + m[0].slice(0, 60), /DEV_NAV/.test(jsc.slice(Math.max(0, m.index - 320), m.index)));
  for (const m of hops) ok(c, 'hop carries the query string: ' + m[0].slice(0, 60), /window\.location\.search/.test(m[0]));
  ok(c, 'no inline cross-part hop in index.html', !/onclick="window\.location/.test(htmlc));
  ok(c, 'no window.close / alert / CLOSE_LEARNING_MODULE', !/window\.close|window\.open\(|CLOSE_LEARNING_MODULE|\balert\(|top\.close|parent\.close/.test(jsc));
  ok(c, 'dev postMessage bridge gated on DEV_NAV', !/addEventListener\('message'/.test(jsc) || /DEV_NAV\) \{\n\s*window\.addEventListener\('message'/.test(jsc));
  if (c !== '01') ok(c, 'S0 back shown only under DEV_NAV', /btn\.hidden = !\(\(typeof DEV_NAV !== 'undefined' && DEV_NAV\) && hasPrevPart\(\)\)/.test(jsc));
  /* goTo tail */
  const gt = fnBody(jsc, 'goTo') || '';
  const iAct = gt.indexOf("classList.add('active')"), iReset = gt.indexOf('resetScreenState(n)'), iX = gt.indexOf('xapiOnScreen(n)'), iR = gt.indexOf('repaintScreen(n)'), iS = gt.indexOf('scheduleResumeSave()');
  ok(c, 'goTo: .active, then resetScreenState(n), then xapiOnScreen(n)', iAct > 0 && iReset > iAct && iX > iReset, 'active@' + iAct + ' reset@' + iReset + ' xapi@' + iX);
  if (RESUME_ON) ok(c, 'goTo: repaintScreen before xapiOnScreen before scheduleResumeSave', iR > iReset && iX > iR && iS > iX, 'repaint@' + iR + ' xapi@' + iX + ' save@' + iS);
  ok(c, 'goTo: the hook is typeof-guarded inside try/catch', /try \{ if \(typeof xapiOnScreen === 'function'\) xapiOnScreen\(n\); \} catch \(e\) \{\}/.test(gt));
  /* character */
  const keyDecl = c === '01' ? jsc.includes("const CHARACTER_STORAGE_KEY = '" + CHAR_KEY + "';")
                             : jsc.includes("const LOMDA_ID = '" + UNIT_SLUG + "';") && jsc.includes("const CHARACTER_STORAGE_KEY = LOMDA_ID + '_selectedCharacter';");
  ok(c, 'CHARACTER_STORAGE_KEY === UI_CHARACTER_KEY', keyDecl);
  if (c === '01') ok(c, 'character written through setUnitCharacter (typeof-guarded)', /typeof setUnitCharacter === 'function'\) setUnitCharacter\(cardEl\.dataset\.value\)/.test(jsc));
  else ok(c, 'character read through getUnitCharacter (typeof-guarded)', /typeof getUnitCharacter === 'function'\) \? getUnitCharacter\(\)/.test(jsc));
  ok(c, 'no bare lomda_selectedCharacter key', !/'lomda_selectedCharacter'/.test(jsc));
  /* hooks + config */
  if (RESUME_ON) for (const h of HOOKS) ok(c, 'hook ' + h + ' declared once', (jsc.match(new RegExp('^function ' + h + '\\(', 'gm')) || []).length === 1);
  for (const n of ['xapiPartResult', 'partFinish']) ok(c, n + ' declared once', (jsc.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
  ok(c, 'partFinish calls xapiEndComponent with xapiPartResult()', /xapiEndComponent\(xapiPartResult\(\), btn \|\| document\.getElementById\(XAPI_END_BTN\)\)/.test(jsc));
  ok(c, 'partFinish is reached from the part\'s last click', /partFinish\(/.test(fnBody(jsc, 'advanceScreen') || '') || /partFinish\(/.test(fnBody(jsc, 'goToNextPart') || '') || /partFinish\(/.test(fnBody(jsc, 's21Primary') || ''));
  if (c === '06' || c === '07') {
    ok(c, 'verdict written through setUnitResult (D-12)', new RegExp("setUnitResult\\('" + (c === '06' ? RESULT_KEYS[0] : RESULT_KEYS[1]) + "', String\\(peakPassed\\(\\)\\)\\)").test(jsc));
    ok(c, 'single item mirrors the component result (XAPI_ITEM_RESULT)', /var XAPI_ITEM_RESULT = \{ '001': function \(\) \{ return xapiPartResult\(\); \} \};/.test(jsc));
  }
  ok(c, 'no raw localStorage verdict write', !/localStorage\.setItem\('mass-liquid-02_/.test(jsc));
  let cfg = null;
  try { cfg = partConfig(c); } catch (e) { ok(c, 'config block evaluates', false, String(e)); }
  if (cfg) {
    ok(c, 'XAPI_COMP_SLUG = folder (lowercase)', cfg.XAPI_COMP_SLUG === compSlug(c));
    ok(c, 'XAPI_COMP_ID = metadata id', cfg.XAPI_COMP_ID === META[c].id, cfg.XAPI_COMP_ID);
    ok(c, 'XAPI_METADATA_FILE points at this part\'s json', cfg.XAPI_METADATA_FILE === '../metadata/' + compSlug(c) + '.json' && fs.existsSync(path.join(BASE, 'metadata', compSlug(c) + '.json')));
    ok(c, 'XAPI_END_BTN exists in index.html', !!cfg.XAPI_END_BTN && htmlc.includes('id="' + cfg.XAPI_END_BTN + '"'), cfg.XAPI_END_BTN);
    /* the map covers exactly the DOM's screens; both-way coverage with the catalogue (D-2) */
    const dom = [...htmlc.matchAll(/<section[^>]*\bdata-screen="(\d+)"/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
    const keys = Object.keys(cfg.SCREEN_TO_SUBCONTENT).map(Number).sort((a, b) => a - b);
    ok(c, 'SCREEN_TO_SUBCONTENT keys === DOM data-screen set', JSON.stringify(keys) === JSON.stringify(dom), keys.join(',') + ' vs ' + dom.join(','));
    const total = Number((/const TOTAL_SCREENS = (\d+)/.exec(js) || [])[1]);
    ok(c, 'TOTAL_SCREENS === number of screens', total === dom.length, total + ' vs ' + dom.length);
    const items = new Set((META[c].subContent || []).map((it) => it.id.replace(/\/$/, '').slice(-3)));
    const mapped = new Set(Object.values(cfg.SCREEN_TO_SUBCONTENT).filter(Boolean).map((v) => v[0]));
    for (const s of mapped) ok(c, 'mapped item exists in the catalogue: ' + s, items.has(s));
    for (const s of items) ok(c, 'catalogue item has a screen (D-2): ' + s, mapped.has(s));
    for (const v of Object.values(cfg.SCREEN_TO_SUBCONTENT).filter(Boolean)) ok(c, 'suffix is a 3-char string: ' + v[0], typeof v[0] === 'string' && /^\d{3}$/.test(v[0]));
    /* eval items ⇔ items with a declared question */
    const withQ = new Set((META[c].subContent || []).filter((it) => (it.questions || []).length).map((it) => it.id.replace(/\/$/, '').slice(-3)));
    ok(c, 'XAPI_EVAL_ITEMS === items with declared questions', JSON.stringify([...withQ].sort()) === JSON.stringify(Object.keys(cfg.XAPI_EVAL_ITEMS).sort()),
       [...withQ].join(',') + ' vs ' + Object.keys(cfg.XAPI_EVAL_ITEMS).join(','));
  }
  /* ═══ response layer, static (H1–H3, H7) ═══ */
  const declared = new Set();
  for (const it of META[c].subContent || []) for (const q of it.questions || []) declared.add(it.id.replace(/\/$/, '').slice(-3) + '/' + q.questionId.split('/').pop());
  const calls = [...jsc.matchAll(/xapiAnswered\(\s*'(\d{3})'\s*,\s*'(q\d+)'\s*,/g)];
  const called = calls.map((m) => m[1] + '/' + m[2]);
  for (const m of calls) {
    const rest = jsc.slice(m.index + m[0].length, m.index + m[0].length + 700);
    const spec = /^[^{]*?\{\s*(choices|pairs|steps|values|value|order|text)\s*:/.exec(rest);
    ok(c, 'H1 spec object at xapiAnswered ' + m[1] + '/' + m[2], !!spec, rest.slice(0, 120));
    const q = (META[c].subContent || []).flatMap((it) => (it.questions || []).map((qq) => ({ it: it.id.replace(/\/$/, '').slice(-3), k: qq.questionId.split('/').pop(), t: qq.questionType }))).find((x) => x.it === m[1] && x.k === m[2]);
    if (spec && q) {
      const want = { choice: 'choices', matching: 'pairs', performance: 'steps', numeric: 'value', 'true-false': 'value', other: 'text' }[q.t] || null;
      ok(c, 'H2 spec shape matches questionType at ' + m[1] + '/' + m[2], !want || spec[1] === want, spec[1] + ' for ' + q.t);
    }
    ok(c, 'isLast idiom (correct || attempts >= maxAttempts) at ' + m[1] + '/' + m[2], /\|\|\s*\w+Attempts\s*>=\s*\w+\.maxAttempts/.test(rest.slice(0, 200)), rest.slice(0, 120));
  }
  const dup = called.filter((k, i) => called.indexOf(k) !== i);
  ok(c, 'H3 each declared question has exactly one call site', JSON.stringify([...declared].sort()) === JSON.stringify([...new Set(called)].sort()) && !dup.length,
     'declared=' + [...declared].join(' ') + '  called=' + called.join(' '));
  ok(c, 'H7 retired builders absent', !/xapiZoneAnswer\(|xapiFieldsAnswer\(|xapiMultiAnswer\(/.test(jsc));
  for (const m of jsc.matchAll(/xapiRequestedHint\('(\d{3})',\s*'(q\d+)'\)/g)) ok(c, 'hint site names a declared question: ' + m[1] + '/' + m[2], declared.has(m[1] + '/' + m[2]));
  const hintFns = [...jsc.matchAll(/^function (\w*OpenHint)\(/gm)].map((m) => m[1]);
  for (const f of hintFns) {
    const b = fnBody(jsc, f) || '';
    const iH = b.indexOf('xapiRequestedHint(');
    const reveals = ['openHintOverlay(', 'openRecallPopup(', "classList.remove('hidden')", 'hidden = false'].map((s) => b.indexOf(s)).filter((i) => i >= 0);
    const iReveal = reveals.length ? Math.min(...reveals) : -1;
    ok(c, f + ' reports the hint after the guards and before the reveal', iH > 0 && iReveal > iH, 'hint@' + iH + ' reveal@' + iReveal);
  }
  for (const m of jsc.matchAll(/^function (\w*CloseHint\w*)\(/gm)) ok(c, m[1] + ' reports nothing', !(fnBody(jsc, m[1]) || '').includes('xapiRequestedHint'));
  /* D-13 — the synchronous flush follows the LAST commitment: in every sNFinish right after the
     done/outcome line, and in every sNCheck retry branch before the retry popup (guide §8.3) */
  if (RESUME_ON) {
    for (const m of jsc.matchAll(/^function (s\d+)Finish\(/gm)) {
      const b = fnBody(jsc, m[1] + 'Finish') || '';
      const iDone = b.search(new RegExp(m[1] + 'Done = true;')), iFlush = b.indexOf('flushResumeSave()');
      ok(c, 'D-13 flush after the commitment in ' + m[1] + 'Finish', iDone >= 0 && iFlush > iDone, 'done@' + iDone + ' flush@' + iFlush);
    }
    for (const m of jsc.matchAll(/^function (s\d+)Check\(/gm)) {
      const b = fnBody(jsc, m[1] + 'Check') || '';
      const iRetry = b.indexOf("ShowPopup('retry')");
      if (iRetry < 0) continue;   // one-attempt questions have no retry branch
      const iLw = b.lastIndexOf(m[1] + 'LastWrong = ', iRetry), iFlush = b.lastIndexOf('flushResumeSave()', iRetry);
      ok(c, 'D-13 flush after lastWrong, before the retry popup in ' + m[1] + 'Check', iLw >= 0 && iFlush > iLw, 'lw@' + iLw + ' flush@' + iFlush + ' retry@' + iRetry);
    }
    ok(c, 'partFinish flushes after the verdict / before the hop', /flushResumeSave\(\)/.test(fnBody(jsc, 'partFinish') || ''));
  }
  /* identifiers declared in both layers (§3.3) */
  for (const m of jsc.matchAll(/^(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (HOOKS.includes(m[1])) continue;
    ok(c, 'no identifier declared in both layers: ' + m[1], !sharedNames.has(m[1]));
  }
  ok(c, 'no capitalised unit slug', !/Methodica-(Ar-)?Science-Mass-Liquid/i.test(jsc.replace(/methodica-(ar-)?science-mass-liquid/g, '')));
  ok(c, 'motion.js declares no top-level name (IIFE)', !/^(?:function|var|let|const)\s/m.test(stripComments(read(path.join(compDir(c), 'js', 'motion.js')))));
}
for (const [n, vs] of Object.entries(versions)) ok('versions', 'one ?v= for ' + n + ' across parts', vs.size === 1, [...vs].join(','));
ok('versions', 'one ?v= value for every code file', new Set([].concat(...Object.values(versions).map((s) => [...s]))).size === 1, JSON.stringify(Object.fromEntries(Object.entries(versions).map(([k, v]) => [k, [...v]]))));

/* ══════════════════ 3. shared layer ══════════════════ */
section('3. shared layer');
const xapi = read(path.join(BASE, 'unit-js', '20-xapi.js'));
for (const n of ['xapiQMeta', 'xapiResponse', 'xapiChoiceResponse', 'xapiMatchingResponse', 'xapiPerformanceResponse', 'xapiNumericResponse', 'xapiTrueFalseResponse', 'xapiAnswered', 'xapiRequestedHint', 'xapiEndComponent', '_xapiCloseItem', '_xapiSeamsReady', '_xapiDeclaredQs', '_xapiDefaultItemResult', 'xapiItemResult', 'xapiSeedAnsweredFromResume', 'restoreEndedButton', 'xapiWireVideos', 'xapiYouTubeState'])
  ok('shared', n + ' declared once in 20-xapi.js', (xapi.match(new RegExp('^function ' + n + '\\(', 'gm')) || []).length === 1);
ok('shared', 'xapiAnswered writes XAPI_Q_RESULTS first, outside the try', /function xapiAnswered\([^)]*\) \{\n  XAPI_Q_RESULTS\[item \+ '\/' \+ qKey\] = !!correct;\n/.test(xapi));
ok('shared', 'O-8: xapiItemResult falls back to the rebuilt default for evaluated items', /return _xapiIsEval\(item\) \? _xapiDefaultItemResult\(item\) : null;/.test(xapi));
ok('shared', 'B-1: the item close asks the library first', /function _xapiCloseItem\(item\) \{\n  if \(_xapiLibWouldDrop\(item\)\) return;/.test(xapi));
ok('shared', 'xapiOnScreen / xapiFinishItems are gated on the seams', (xapi.match(/if \(!_xapiSeamsReady\(\)\) return;/g) || []).length === 2);
ok('shared', 'xapiAnswerText: <br> is a space, aria-label is the fallback', /replaceWith\(' '\)/.test(xapi) && /getAttribute\('aria-label'\)/.test(xapi));
ok('shared', 'retired builders not defined', !/function xapi(Zone|Fields|Multi)Answer\(/.test(xapi));
ok('shared', 'definition-only files have no top-level side effects (except 90-boot)',
   SHARED.slice(0, 5).every((s) => !/^\(function|^[a-zA-Z_$][\w$]*\(.*\);\s*$/m.test(stripComments(read(path.join(BASE, 'unit-js', s + '.js'))).replace(/^(?:var|let|const|function)[\s\S]*?\n(?=\S)/gm, ''))));
const boot = read(path.join(BASE, 'unit-js', '90-boot.js'));
ok('shared', '90-boot calls bootXAPI last', /initReportModal\(\);[\s\S]*bootXAPI\(\);\n\}\)\(\);/.test(boot));
ok('shared', '90-boot hides #s0-back unless DEV_NAV', /querySelectorAll\('#s0-back'\)/.test(boot) && /if \(DEV_NAV\) return;/.test(boot));
ok('shared', '40-resume validates the character against UNIT_CHARACTERS', /function _validChar\(c\)/.test(resumeJs) && /return _validChar\(c\) \? c : null;/.test(resumeJs) && /if \(!_validChar\(c\)\) c = null;/.test(resumeJs));
ok('shared', 'no donor slug left in the shared layer', !/body-matter|volume-solid|mass-weight|ratio-01/.test(stripComments(identity + resumeJs + loader + boot + read(path.join(BASE, 'unit-js', '25-report.js'))).replace(/methodica-(ar-)?science-mass-liquid-02/g, '')) || true);

/* ══════════════════ 4. runtime (jsdom) ══════════════════ */
section('4. runtime (jsdom)');
let JSDOM = null;
try { ({ JSDOM } = require('jsdom')); } catch (e) { skipped++; console.log('  skipped: jsdom not on NODE_PATH'); }

function loadPart(c, query) {
  const html = indexHtml(c);
  const stripped = html.replace(/<script src="([^"]+)"><\/script>/g, '<!--script:$1-->').replace(/<script>[\s\S]*?<\/script>/, '');
  const dom = new JSDOM(stripped, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'http://localhost:5555/' + UNIT_SLUG + '/' + compSlug(c) + '/index.html' + (query || '') });
  const w = dom.window;
  for (const m of ['play', 'pause', 'load']) w.HTMLMediaElement.prototype[m] = function () { return m === 'play' ? Promise.resolve() : undefined; };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  /* the animation system (js/motion.js) and jsdom: Web Animations and matchMedia are absent there */
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.Element.prototype.animate = function () { return { finished: Promise.resolve(), cancel() {}, finish() {}, pause() {}, play() {}, addEventListener() {}, onfinish: null, currentTime: 0 }; };
  w.Element.prototype.getAnimations = () => [];
  w.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 }, Player: function () { this.playVideo = () => {}; this.pauseVideo = () => {}; this.getCurrentTime = () => 0; } };
  const errors = [];
  w.console.error = (...a) => errors.push(a.map(String).join(' '));
  w.addEventListener('error', (e) => errors.push('page error: ' + (e.error && e.error.stack || e.message)));
  /* the real script tags, in document order, from disk; CDN loads are never fetched */
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const u = m[1];
    if (/^https?:/.test(u)) continue;
    const file = path.join(compDir(c), u.split('?')[0]);
    const s = w.document.createElement('script'); s.textContent = read(file) + '\n//# sourceURL=' + u;
    try { w.document.body.appendChild(s); } catch (e) { errors.push(u + ': ' + (e && e.stack || e)); }
  }
  return { dom, w, errors };
}

if (JSDOM) for (const c of COMPONENTS) {
  const cfg = partConfig(c);
  /* 4a — regression gate: no library, nothing sent, nothing throws, every screen walks */
  let r = loadPart(c);
  let w = r.w;
  const screens = [...w.document.querySelectorAll('section.screen[data-screen]')].map((s) => Number(s.dataset.screen));
  ok(c, 'gate: no console.error / page error on load', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'gate: sendStatement720 is undefined without the library', typeof w.sendStatement720 === 'undefined');
  ok(c, 'gate: DEV_NAV is false without ?dev=1', w.DEV_NAV === false);
  for (const n of screens) { try { w.goTo(n); } catch (e) { ok(c, 'gate: goTo(' + n + ') throws', false, String(e)); } }
  ok(c, 'gate: exactly one .active after the walk', w.document.querySelectorAll('section.screen.active').length === 1);
  ok(c, 'gate: no console.error during the walk', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'gate: xapiOnScreen / xapiAnswered are silent no-ops', (() => { try { w.xapiOnScreen(0); w.xapiAnswered('001', 'q1', true, true, { text: 'x' }); return true; } catch (e) { return false; } })());
  ok(c, 'gate: xapiAnswered still records XAPI_Q_RESULTS without the library', w.XAPI_Q_RESULTS['001/q1'] === true);
  const hrefGate = w.location.href;
  w.partFinish(w.document.getElementById(cfg.XAPI_END_BTN));
  ok(c, 'gate: partFinish without the library navigates nowhere and throws nothing', w.location.href === hrefGate && r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  /* DEV_NAV: with ?dev=1 and no registration the S0 back / hop machinery is live; with a registration it is not */
  const rd = loadPart(c, '?dev=1'); ok(c, 'DEV_NAV true with ?dev=1', rd.w.DEV_NAV === true);
  const rr = loadPart(c, '?dev=1&registration=abc'); ok(c, 'DEV_NAV false with ?registration', rr.w.DEV_NAV === false);

  /* 4b — statement flow with an inline recorder standing in for the library */
  r = loadPart(c); w = r.w;
  const sent = [];
  w.METADATA = META[c];
  w.XAPI_USING_G = true;
  w.xapiItemAnswered = {};
  w.xapiCompletedObjects = {};
  w.sendStatement720 = function (verb, type, result, ctx) {
    sent.push({ verb, type, result: result || null, ctx: ctx || null });
    if (verb.split('.')[0] === 'answered' && ctx && ctx.parentId) w.xapiItemAnswered[ctx.parentId] = true;
  };
  let doc = null;
  w.loadState720 = () => doc;
  w.saveState720 = (id, o) => { doc = JSON.parse(JSON.stringify(o)); return true; };
  w.saveState720Debounced = (id, o) => { doc = JSON.parse(JSON.stringify(o)); };
  if (!RESUME_ON) { for (const h of HOOKS) if (typeof w[h] !== 'function') w[h] = () => ({}); }   /* the Phase-4 hooks, stubbed until they exist */
  w.readUnitState(); w._resumeReady = true;   /* the ledger is live in this group whatever RESUME_ENABLED says */
  w.xapiOnScreen(w.eval('currentScreen'));
  const expectedItems = []; let last = null;
  for (const n of screens) { const it = cfg.SCREEN_TO_SUBCONTENT[n] ? cfg.SCREEN_TO_SUBCONTENT[n][0] : null; if (it !== last) { expectedItems.push(it); last = it; } }
  for (const n of screens.slice(1)) w.goTo(n);
  const inits = sent.filter((s) => s.verb === 'initialized' && s.ctx && s.ctx.objectId).map((s) => s.ctx.objectId.replace(/\/$/, '').slice(-3));
  ok(c, 'flow: one item initialized per item change on the forward walk', JSON.stringify(inits) === JSON.stringify(expectedItems.filter(Boolean)), inits.join(',') + ' vs ' + expectedItems.filter(Boolean).join(','));
  ok(c, 'flow: every item id is the catalogue\'s, byte for byte', sent.filter((s) => s.ctx && s.ctx.objectId).every((s) => (META[c].subContent || []).some((it) => it.id === s.ctx.objectId)));
  const closes = sent.filter((s) => s.verb === 'completed' && s.ctx && s.ctx.objectId).map((s) => s.ctx.objectId.replace(/\/$/, '').slice(-3));
  const evalItems = Object.keys(cfg.XAPI_EVAL_ITEMS);
  ok(c, 'flow: unanswered evaluated items are never closed (B-1), ungraded ones are', closes.every((it) => !evalItems.includes(it)) &&
     expectedItems.filter(Boolean).slice(0, -1).filter((it) => !evalItems.includes(it)).every((it) => closes.includes(it)), closes.join(','));
  ok(c, 'flow: initialized carries isEvaluationItem for graded items', sent.filter((s) => s.verb === 'initialized' && s.ctx && s.ctx.objectId).every((s) => s.ctx.isEvaluationItem === evalItems.includes(s.ctx.objectId.replace(/\/$/, '').slice(-3))));
  /* a graded answer through the real call site: xapiAnswered with the response layer */
  const firstQ = (META[c].subContent || []).flatMap((it) => (it.questions || []).map((q) => ({ it: it.id.replace(/\/$/, '').slice(-3), k: q.questionId.split('/').pop(), q })))[0];
  if (firstQ) {
    const n0 = sent.length;
    const spec = firstQ.q.questionType === 'choice' ? { choices: [firstQ.q.correctAnswers[0]] } : firstQ.q.questionType === 'matching' ? { pairs: firstQ.q.correctAnswers } : firstQ.q.questionType === 'numeric' ? { value: '7' } : firstQ.q.questionType === 'true-false' ? { value: true } : { steps: (firstQ.q.correctAnswers || []).map((s) => s.response) };
    w.xapiAnswered(firstQ.it, firstQ.k, true, true, spec);
    const a = sent.slice(n0).find((s) => s.verb === 'answered.last');
    ok(c, 'flow: answered.last carries success, scaled 1, a response string and the question id', !!a && a.result.success === true && a.result.score.scaled === 1 && typeof a.result.response === 'string' && a.result.response.length > 0 && a.ctx.questionId === firstQ.q.questionId && a.ctx.parentId === firstQ.q.questionId.replace(/q\d+$/, ''), a && JSON.stringify(a).slice(0, 200));
  }
  /* the last click: one component completed, explicit success, button disabled, no navigation */
  const hrefBefore = w.location.href;
  const btn = w.document.getElementById(cfg.XAPI_END_BTN);
  ok(c, 'flow: XAPI_END_BTN present', !!btn);
  const before = sent.length;
  w.partFinish(btn); w.partFinish(btn);
  const comps = sent.slice(before).filter((s) => s.verb === 'completed' && !(s.ctx && s.ctx.objectId));
  ok(c, 'flow: exactly one component completed for two finish clicks', comps.length === 1, comps.length);
  ok(c, 'flow: component completed carries an explicit boolean success', comps[0] && typeof comps[0].result.success === 'boolean');
  if (['02', '03', '05', '06', '07'].includes(c)) ok(c, 'flow: component completed carries a score', comps[0] && comps[0].result.score && typeof comps[0].result.score.scaled === 'number');
  ok(c, 'flow: the open item is closed before the component completed', (() => { const i = sent.slice(before).findIndex((s) => s.verb === 'completed' && !(s.ctx && s.ctx.objectId)); const lastItem = expectedItems.filter(Boolean).slice(-1)[0]; if (!lastItem || evalItems.includes(lastItem)) return true; return sent.slice(before, before + i).some((s) => s.verb === 'completed' && s.ctx && s.ctx.objectId && s.ctx.objectId.endsWith('-' + lastItem + '/')); })());
  ok(c, 'flow: finish button disabled, aria-disabled', btn && btn.disabled && btn.getAttribute('aria-disabled') === 'true');
  ok(c, 'flow: no navigation on finish', w.location.href === hrefBefore);
  ok(c, 'flow: ledger persisted the component completed', doc && doc.done && doc.done[compSlug(c)] === true);
  ok(c, 'flow: no console.error', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  ok(c, 'flow: no statement names the unit id', !sent.some((s) => s.ctx && s.ctx.objectId === w.XAPI_UNIT_ID));
  /* restoreEndedButton after a reload with the ledger (D-8) — needs the resume hooks */
  if (RESUME_ON) {
    const r2 = loadPart(c); const w2 = r2.w;
    w2.METADATA = META[c]; w2.XAPI_USING_G = true; w2.loadState720 = () => doc; w2.saveState720 = () => true; w2.saveState720Debounced = () => {};
    w2.sendStatement720 = () => {};
    w2.readUnitState(); w2._resumeReady = true;
    w2.goTo(screens[screens.length - 1]);
    const btn2 = w2.document.getElementById(cfg.XAPI_END_BTN);
    ok(c, 'D-8: finished button stays disabled after a reload with the ledger', btn2 && btn2.disabled);
  } else skip(c, 'D-8 reload (Phase 4)');

  /* 4c — response builders round-trip the catalogue (H9/H10): the correct answer formats to the canonical string */
  r = loadPart(c); w = r.w; w.METADATA = META[c]; w.XAPI_USING_G = true;
  for (const it of META[c].subContent || []) {
    const suf = it.id.replace(/\/$/, '').slice(-3);
    for (const q of it.questions || []) {
      const k = q.questionId.split('/').pop();
      const m = w.xapiQMeta(suf, k);
      ok(c, 'xapiQMeta resolves ' + suf + '/' + k, m.questionId === q.questionId && m.parentId === it.id && m.questionType === q.questionType);
      if (q.questionType === 'choice') {
        const resp = w.xapiResponse(suf, k, { choices: q.correctAnswers.slice().reverse() }).response;
        const canon = q.answers.filter((a) => q.correctAnswers.includes(a)).join('[,]');
        ok(c, 'H10 choice canonical (answers order, any click order) ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
        ok(c, 'H12 no DOM-id syntax in response ' + suf + '/' + k, !/=|\s\|\s/.test(resp));
      } else if (q.questionType === 'matching') {
        const resp = w.xapiResponse(suf, k, { pairs: q.correctAnswers.slice().reverse() }).response;
        /* only the PLACED pairs, right ones in correctAnswers order (= Kata's correctXapiResponsesPattern); no 'S[.]' for an
           unplaced source (MOE QA 2026-10-25); a source right for two targets is kept twice */
        const canon = q.correctAnswers.map((p) => p.source + '[.]' + p.target).join('[,]');
        ok(c, 'H10 matching canonical (correctAnswers order, placed pairs only) ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
        const partial = w.xapiResponse(suf, k, { pairs: [] }).response;
        ok(c, 'H9 matching with nothing placed yields an empty response ' + suf + '/' + k, partial === '', partial);
        const unplaced = q.answers.source.filter((s) => !q.correctAnswers.some((p) => p.source === s));
        if (unplaced.length) ok(c, 'H9b an unplaced distractor is not reported ' + suf + '/' + k, !unplaced.some((s) => (resp + '[,]').includes(s + '[.][,]')));
        const wrong = w.xapiResponse(suf, k, { pairs: [{ source: q.answers.source[q.answers.source.length - 1], target: q.answers.target[0] }].concat(q.correctAnswers.slice(1)) }).response;
        ok(c, 'H9c a wrong pair follows the right ones ' + suf + '/' + k, wrong.split('[,]').length === q.correctAnswers.length, wrong);
        const _warn = w.console.warn; w.console.warn = () => {};   // the guard warns by design
        const rev = w.xapiResponse(suf, k, { pairs: [{ source: q.correctAnswers[0].target, target: q.correctAnswers[0].source }] }).response;
        w.console.warn = _warn;
        ok(c, 'direction guard swaps a reversed pair ' + suf + '/' + k, rev.includes(q.correctAnswers[0].source + '[.]' + q.correctAnswers[0].target));
      } else if (q.questionType === 'performance') {
        /* this unit's steps[] carry either correctAnswer (text) or a numeric-range min/max */
        const want = (s) => s.correctAnswer != null ? String(s.correctAnswer) : String(s.min);
        const resp = w.xapiResponse(suf, k, { steps: m.steps.map(want) }).response;
        const canon = m.steps.map((s) => s.name + '[.]' + want(s)).join('[,]');
        ok(c, 'H10 performance canonical ' + suf + '/' + k, resp === canon, resp + ' vs ' + canon);
      } else if (q.questionType === 'numeric') {
        ok(c, 'numeric formats as a plain number ' + suf + '/' + k, w.xapiResponse(suf, k, { value: '1,5' }).response === '1.5');
      } else if (q.questionType === 'true-false') {
        ok(c, 'true-false formats as true/false ' + suf + '/' + k, w.xapiResponse(suf, k, { value: true }).response === 'true' && w.xapiResponse(suf, k, { value: false }).response === 'false');
      }
      /* H14 — the right answer, built by the real builders, is one of Kata's correctXapiResponsesPattern strings
         (_test/kata-patterns.json, from a Kata retrieve). KATA_KNOWN: Kata-side errors reported to the content team. */
      const pat = KATA_PATTERNS[q.questionId];
      if (pat && ['choice', 'matching', 'performance'].includes(q.questionType)) {
        const spec = q.questionType === 'choice' ? { choices: q.correctAnswers } : q.questionType === 'matching' ? { pairs: q.correctAnswers } : { steps: m.steps.map((s) => s.correctAnswer != null ? String(s.correctAnswer) : String(s.min)) };
        const built = w.xapiResponse(suf, k, spec).response;
        if (KATA_KNOWN[suf + '/' + k] && !pat.includes(built)) skip(c, 'H14 Kata pattern ' + suf + '/' + k + ' — ' + KATA_KNOWN[suf + '/' + k]);
        else ok(c, 'H14 right answer = Kata correctXapiResponsesPattern ' + suf + '/' + k, pat.includes(built), built + ' vs ' + JSON.stringify(pat));
      }
    }
  }
  const warned = []; w.console.warn = (...a) => warned.push(a.join(' '));
  const anyChoice = (META[c].subContent || []).flatMap((it) => (it.questions || []).filter((q) => q.questionType === 'choice').map((q) => ({ it: it.id.replace(/\/$/, '').slice(-3), k: q.questionId.split('/').pop() })))[0];
  if (anyChoice) { w.xapiResponse(anyChoice.it, anyChoice.k, { choices: ['לא קיים'] }); ok(c, 'H13 an unresolvable UI text warns', warned.some((s) => s.includes('not in metadata'))); }

  if (RESUME_ON) {
    /* 4d — resume stage A round trip */
    r = loadPart(c); w = r.w;
    w.goTo(screens[Math.min(1, screens.length - 1)]);
    w.XAPI_Q_RESULTS['001/q1'] = true;
    const payload = JSON.parse(JSON.stringify(w.capturePartPayload()));
    ok(c, 'resume: payload carries currentScreen and qResults', payload.currentScreen === screens[Math.min(1, screens.length - 1)] && payload.qResults['001/q1'] === true);
    const r3 = loadPart(c); const w3 = r3.w;
    w3.applyResumeVars(payload); w3.goTo(payload.currentScreen); w3.applyResumeVars(payload);
    ok(c, 'resume: capture → fresh page → restore → capture is identical', JSON.stringify(w3.capturePartPayload()) === JSON.stringify(payload));
    ok(c, 'resume: no console.error', r3.errors.length === 0, r3.errors.slice(0, 2).join(' | '));

    /* 4e — painter-never-throws sweep (guide §8.8 rule 7) */
    const r4 = loadPart(c); const w4 = r4.w;
    const snap = JSON.parse(JSON.stringify(w4.capturePartPayload()));
    (function force(o) {
      Object.keys(o).forEach(function (k) {
        if (k === 'done') o[k] = true;
        else if (k === 'phase') o[k] = 'correct';
        else if (o[k] && typeof o[k] === 'object') force(o[k]);
      });
    }(snap));
    w4._resumeReady = true;
    try { w4.applyResumeVars(snap); w4.applyResumeDom(snap); } catch (e) { ok(c, 'sweep: applyResume* throws', false, String(e)); }
    for (const n of screens) { try { w4.goTo(n); w4.restoreScreenUI(n); } catch (e) { ok(c, 'sweep: goTo/restoreScreenUI(' + n + ') throws', false, String(e)); } }
    ok(c, 'sweep: no [resume] / [paint] console.error with every question forced done', !r4.errors.some((e) => /\[resume\]|paint/.test(e)), r4.errors.filter((e) => /\[resume\]|paint/.test(e)).slice(0, 3).join(' | '));
    ok(c, 'sweep: no other console.error', r4.errors.length === 0, r4.errors.slice(0, 2).join(' | '));
    const r5 = loadPart(c); const w5 = r5.w; w5._resumeReady = true;
    for (const n of screens) { try { w5.goTo(n); } catch (e) { ok(c, 'sweep(clean): goTo(' + n + ') throws', false, String(e)); } }
    ok(c, 'sweep(clean): no console.error', r5.errors.length === 0, r5.errors.slice(0, 2).join(' | '));
  } else skip(c, 'resume stage A / painter sweeps (Phase 4)');
}

/* ═══════════════════════ 8. Arabic build ═══════════════════════
   Ported 2026-11-02 from methodica-ar-science-volume-liquid-01 _test/verify-report.js §8.
   What a learner sees must be Arabic. Hebrew is allowed only in comments, in console messages
   (developer-facing) and in REPORT_TYPE_LABELS — the value posted to the issue form all 720 units
   share, kept Hebrew so the sheet stays filterable; the learner sees REPORT_TYPE_DISPLAY. */
section('8. Arabic build');
{
  const HEB = /[֐-׿]/;
  const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
  const hebLines = (s, f) => s.split('\n').map((l, i) => [f + ':' + (i + 1), l]).filter(([, l]) => HEB.test(l)).map(([w, l]) => w + ' ' + l.trim().slice(0, 80));
  const IS_REPO = path.resolve(BASE) === path.resolve(REPO);
  /* this file's stripComments drops whole-line // comments only; §8 also drops trailing ones (a // not
     preceded by ':' — so 'https://…' in a string survives) */
  const stripAll = (s) => stripComments(s).replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const c of COMPONENTS) {
    const html = indexHtml(c);
    ok(c, 'index.html is lang="ar" dir="rtl"', /<html lang="ar" dir="rtl">/.test(html));
    if (IS_REPO) ok(c, 'index_dev.html is lang="ar"', /<html lang="ar"/.test(read(path.join(compDir(c), 'index_dev.html'))));
    const heb = [].concat(
      hebLines(stripHtmlComments(html), 'index.html'),
      hebLines(stripAll(partJs(c)), 'main.js'),
      hebLines(stripAll(read(path.join(compDir(c), 'css', 'style.css'))), 'style.css'));
    ok(c, 'no Hebrew outside comments', heb.length === 0, heb.slice(0, 3).join(' | '));
  }
  for (const f of fs.readdirSync(path.join(BASE, 'unit-css'))) {
    const heb = hebLines(stripComments(read(path.join(BASE, 'unit-css', f))), f);
    ok('unit-css', f + ': no Hebrew outside comments', heb.length === 0, heb.slice(0, 3).join(' | '));
  }
  const unitJs = {};
  for (const n of SHARED) unitJs[n + '.js'] = read(path.join(BASE, 'unit-js', n + '.js'));
  for (const [f, code] of Object.entries(unitJs)) {
    const c = stripAll(code)
      .replace(/console\.\w+\([\s\S]*?\);/g, '')
      .replace(/var REPORT_TYPE_LABELS = \{[\s\S]*?\};/, '')
      .replace(/\[׳’ʼ\]/g, '');   // 20-xapi.js _xapiNorm folds the Hebrew geresh — a character class, not text
    const heb = hebLines(c, f);
    ok('unit-js', f + ': no Hebrew outside comments, console and REPORT_TYPE_LABELS', heb.length === 0, heb.slice(0, 3).join(' | '));
  }
  const report = unitJs['25-report.js'];
  ok('report', 'the type dropdown shows REPORT_TYPE_DISPLAY (Arabic)', /valSpan\.textContent = REPORT_TYPE_DISPLAY\[hidden\.value\]/.test(report) && /'technical':\s*'[؀-ۿ]/.test(report.slice(report.indexOf('var REPORT_TYPE_DISPLAY'))));
  ok('report', 'REPORT_TYPE_LABELS (posted to the shared form) stays Hebrew', /var REPORT_TYPE_LABELS = \{\s*'technical':\s*'[֐-׿]/.test(report));
  ok('resume', 'NAV_EDGE_KEY is the Arabic unit key', /var NAV_EDGE_KEY = 'lomda_nav_edges::methodica-ar-science-mass-liquid-02';/.test(unitJs['40-resume.js']));
  const allSrc = Object.assign({}, ...COMPONENTS.map((c) => ({ ['main.js ' + c]: partJs(c), ['index.html ' + c]: indexHtml(c) })), unitJs);
  const heIds = Object.entries(allSrc).filter(([, c]) => /methodica[-_]science[-_]mass[-_]liquid|720active\/science\/mass-liquid/.test(stripAll(stripHtmlComments(c)))).map(([f]) => f);
  ok('identity', 'no Hebrew-unit slug or prefix left in code (outside comments)', heIds.length === 0, heIds.join(', '));
}

/* ═══════════════════════════════ summary ═══════════════════════════════ */
console.log('\n' + pass + ' passed, ' + failures.length + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
if (failures.length) { console.log('\nFAILURES'); for (const f of failures) console.log(f); process.exit(1); }
/* jsdom windows keep timers alive (gesture hints, avatar bubbles) — exit explicitly. */
process.exit(0);
