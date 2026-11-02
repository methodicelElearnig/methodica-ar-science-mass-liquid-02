#!/usr/bin/env python3
"""check-metadata.py — validate metadata/*.json against the unit's UI.

Run from anywhere:   python -I -X utf8 docs-and-tools/check-metadata.py

What it checks (see METADATA-AUDIT.md for the rules R1–R8):

  R7  hygiene — every answers / source / target string is NFC, trimmed,
      single-spaced, free of the xAPI separators "[,]" "[.]" "[:]";
      correctAnswers ⊆ answers byte-for-byte; sources / targets / answers unique;
      questionType is one of the Kata enum values; questionId == item id + qKey.
  R8  census — every graded question is REGISTERED by its xapiAnswered call site
      in the part's js/main.js (`xapiAnswered('NNN', 'qK', …)` inside `function
      sNCheck`): the call must sit in a check function whose screen `sN` is
      wired to a check button in index.html (`onclick="sNPrimary()"` /
      `sNCheck()`), that screen's SCREEN_TO_SUBCONTENT row must name the same
      item, and the call sites must correspond 1:1 to the questions declared in
      metadata/. Expected total: EXPECTED_GRADED.

Ported 2026-10-22 from methodica-science-volume-solid-01/docs-and-tools/check-metadata.py
(itself from body-matter-01) and re-pointed at this unit's shapes:
  - the per-part script is js/main.js, screens are `sN` sections (part 01's
    data-screen 1-4 carry ids s2-s5 — the DOM decides, never arithmetic);
  - item suffixes are three digits;
  - the registrations are the xapiAnswered call sites themselves (this unit has
    no scqRegister / ddqRegister / PEAK_CORRECT layer — each screen holds its own
    `SNQ` config), so this script does NOT re-derive the UI option texts: the
    label ↔ metadata fidelity is covered by `_test/verify-report.js` (the
    response builders round-trip the catalogue; an unresolvable UI text warns
    and fails) and was checked label by label on 2026-10-22 (REPORT-XAPI.md).
    The donor's `ui_choice_options` / `cross_check_*` helpers are kept below,
    unused, for a unit that grows a registration layer.

UI text, where it is read, is normalised exactly as unit-js/20-xapi.js
xapiAnswerText() does it: <br> -> space, other tags stripped, entities decoded,
whitespace (incl. U+00A0) collapsed to one space, trimmed.

Exit code 0 when clean, 1 when any ERROR was printed. Only metadata/, the
parts' index.html and js/main.js are read; nothing is written.
"""
import io
import json
import os
import re
import sys
import unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
META = os.path.join(ROOT, 'metadata')
UNIT = 'methodica-ar-science-mass-liquid-02'
IRI_BASE = 'https://lomdot.education.gov.il/metodica/720/ar/science/mass-liquid/02/'
PART_SCRIPT = os.path.join('js', 'main.js')
KATA_TYPES = {'fill-in', 'true-false', 'choice', 'numeric', 'sequencing',
              'matching', 'performance', 'other'}
EXPECTED_GRADED = 32   # 01: 7, 02: 6, 03: 6, 04: 0, 05: 4, 06: 5, 07: 4 (census 2026-10-25: 01-014 split into q1 + q2)
XAPI_SEPS = ('[,]', '[.]', '[:]')

errors = []
warnings = []
notes = []


def err(msg):
    errors.append(msg)
    print('ERROR   ' + msg)


def warn(msg):
    warnings.append(msg)
    print('WARN    ' + msg)


def note(msg):
    notes.append(msg)
    print('NOTE    ' + msg)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


ENTITIES = {'&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
            '&#39;': "'", '&apos;': "'"}


def decode_entities(s):
    for k, v in ENTITIES.items():
        s = s.replace(k, v)
    s = re.sub(r'&#x([0-9a-fA-F]+);', lambda m: chr(int(m.group(1), 16)), s)
    s = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), s)
    return s


def ui_text(s):
    """What xapiAnswerText() returns for an element whose innerHTML is `s`:
    every <br> becomes a space (the runtime replaces them before reading textContent,
    2026-10-20), other tags contribute nothing, entities decoded, \\s+ -> ' ', trimmed."""
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = decode_entities(s)
    return re.sub(r'\s+', ' ', s).strip()


def js_string(s):
    """Decode a JS single/double-quoted string literal (\\' \\" \\\\ \\n \\uXXXX)."""
    q = s[0]
    body = s[1:-1]
    body = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), body)
    return (body.replace('\\' + q, q).replace('\\n', '\n').replace('\\t', '\t')
                .replace('\\\\', '\\'))


JS_STR = r"""(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")"""


def strip_js_comments(js):
    """Remove /* */ and // comments without touching string literals."""
    out = []
    i, n = 0, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':
            j = i + 1
            while j < n and js[j] != c:
                if js[j] == '\\':
                    j += 1
                j += 1
            out.append(js[i:j + 1]); i = j + 1
        elif js.startswith('/*', i):
            j = js.find('*/', i + 2)
            i = n if j < 0 else j + 2
        elif js.startswith('//', i):
            j = js.find('\n', i)
            i = n if j < 0 else j
        else:
            out.append(c); i += 1
    return ''.join(out)


def balanced(js, start):
    """js[start] is '{' or '['; return the index just past its matching bracket,
    skipping string literals."""
    opener = js[start]
    closer = {'{': '}', '[': ']', '(': ')'}[opener]
    depth = 0
    i, n = start, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':
            j = i + 1
            while j < n and js[j] != c:
                if js[j] == '\\':
                    j += 1
                j += 1
            i = j + 1
            continue
        if c in '{[(':
            depth += 1
        elif c in '}])':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return n


def js_calls(js, name):
    """Every `name(` call: list of (argument-text) with balanced parentheses."""
    out = []
    for m in re.finditer(r'(?<![\w.])' + re.escape(name) + r'\s*\(', js):
        end = balanced(js, m.end() - 1)
        out.append(js[m.end():end - 1])
    return out


def js_prop_str(obj, key):
    m = re.search(r'(?<![\w$])' + re.escape(key) + r'\s*:\s*(' + JS_STR + ')', obj)
    return js_string(m.group(1)) if m else None


def js_prop_list_of_objs(obj, key):
    """key: [ {id:'..', label:'..'}, ... ]  ->  [(id, label), ...]"""
    m = re.search(r'(?<![\w$])' + re.escape(key) + r'\s*:\s*\[', obj)
    if not m:
        return None
    body = obj[m.end() - 1:balanced(obj, m.end() - 1)]
    out = []
    for mm in re.finditer(r'\{', body):
        o = body[mm.start():balanced(body, mm.start())]
        out.append((js_prop_str(o, 'id'), js_prop_str(o, 'label')))
    return out


def js_prop_map(obj, key):
    """key: { 'a': 'b', c: 'd' }  ->  ordered list of (k, v)"""
    m = re.search(r'(?<![\w$])' + re.escape(key) + r'\s*:\s*\{', obj)
    if not m:
        return None
    body = obj[m.end():balanced(obj, m.end() - 1) - 1]
    out = []
    for k, v in re.findall(r'(' + JS_STR + r'|[\w$-]+)\s*:\s*(' + JS_STR + r')', body):
        k = js_string(k) if k[0] in '\'"' else k
        out.append((k, js_string(v)))
    return out


def screens_of(html):
    """id -> (data-screen index, body) for every <section class="screen ..."> ."""
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    out = {}
    for m in re.finditer(r'<section class="screen[^"]*"[^>]*?data-screen="(\d+)"[^>]*?id="([\w-]+)"[^>]*>(.*?)</section>', html, re.S):
        idx, sid, body = int(m.group(1)), m.group(2), m.group(3)
        body = re.sub(r'<svg.*?</svg>', '', body, flags=re.S)
        out[sid] = (idx, body)
    return out


# ---------------------------------------------------------------------------
# per-part JS: SCREEN_TO_SUBCONTENT, practice screen list, registrations
# ---------------------------------------------------------------------------
def parse_screen_map(js_raw):
    """var SCREEN_TO_SUBCONTENT = { 0: null, 1: ['01', 1], ... };
    -> {idx: (item|None, page|None, trailing-comment)}  (comments kept as labels)"""
    m = re.search(r'var SCREEN_TO_SUBCONTENT\s*=\s*\{', js_raw)
    if not m:
        return None
    body = js_raw[m.end():balanced(js_raw, m.end() - 1) - 1]
    out = {}
    for line in body.split('\n'):
        # several rows may share a line ("2: ['003', 1], 3: ['003', 2],   // …"); the trailing
        # comment is the label of every row on that line
        label = (re.search(r'//\s*(.*)$', line) or re.search(r'$', line)).group(1) if '//' in line else ''
        for mm in re.finditer(r"(\d+)\s*:\s*(null|\[\s*'(\d{2,3})'\s*,\s*(\d+)\s*\])", line.split('//')[0]):
            idx = int(mm.group(1))
            if mm.group(2) == 'null':
                out[idx] = (None, None, label.strip())
            else:
                out[idx] = (mm.group(3), int(mm.group(4)), label.strip())
    return out


def parse_practice_screens(js):
    """practiceProgress.questions[idx].screen, in index order."""
    m = re.search(r'var practiceProgress\s*=\s*\{', js)
    if m:
        body = js[m.end():balanced(js, m.end() - 1)]
        screens = [int(x) for x in re.findall(r'screen\s*:\s*(\d+)', body)]
        if screens:
            return screens
    m = re.search(r'for \(let i = 1; i <= (\d+); i\+\+\)\s*practiceProgress\.questions\.push\(\{[^}]*screen:\s*i', js)
    if m:
        return list(range(1, int(m.group(1)) + 1))
    return []


def parse_registrations(js, part):
    """-> list of dicts {screen, item, qKey, src}: one per xapiAnswered('NNN', 'qK', …) call site,
    the screen being the `function sNCheck(` the call sits in."""
    regs = []
    for m in re.finditer(r"xapiAnswered\(\s*'(\d{3})'\s*,\s*'(q\d+)'\s*,", js):
        fn = None
        for f in re.finditer(r'function\s+([A-Za-z_$][\w$]*)\s*\(', js[:m.start()]):
            fn = f.group(1)
        mm = re.match(r'(s\d+)Check$', fn or '')
        if not mm:
            err(f'part {part}: xapiAnswered({m.group(1)}, {m.group(2)}) is not inside a sNCheck function (found in {fn!r})')
            continue
        regs.append({'screen': mm.group(1), 'item': m.group(1), 'qKey': m.group(2), 'src': fn})
    return regs


def wired_checks(scr):
    """screen id -> the check button's onclick, for every sNPrimary() / sNCheck() button on its own screen."""
    out = {}
    for sid, (idx, body) in scr.items():
        for fn in re.findall(r'onclick="((?:s\d+)(?:Primary|Check))\(\)"', body):
            target = re.match(r's\d+', fn).group(0)
            if target != sid:
                err(f'screen {sid}: {fn}() targets {target}, not its own screen')
            out[sid] = fn + '()'
    return out


# ---------------------------------------------------------------------------
# UI extraction
# ---------------------------------------------------------------------------
def ui_choice_options(body, where=''):
    """[(id, text)] in DOM order for `.scq-opt[data-id]` buttons: text = .scq-opt-text,
    else the button's own text (dropdown-opt), else aria-label (hotspot area).
    An id that occurs twice (hotspot ring + bubble) keeps its first non-empty text."""
    opts = []
    seen = {}
    for m in re.finditer(r'<button\b([^>]*\bclass="[^"]*\bscq-opt\b[^"]*"[^>]*)>', body):
        attrs = m.group(1)
        mid = re.search(r'data-id="([^"]+)"', attrs)
        if not mid:
            continue
        oid = mid.group(1)
        end = body.find('</button>', m.end())
        inner = body[m.end():end]
        t = re.search(r'<span class="scq-opt-text[^"]*">(.*?)</span>\s*(?:<span class="scq-radio|$)', inner, re.S)
        if t:
            text = ui_text(t.group(1))
        else:
            text = ui_text(inner)
        if not text:
            ma = re.search(r'aria-label="([^"]*)"', attrs)
            text = ui_text(ma.group(1)) if ma else ''
        if not text:
            continue
        # A <br> with no whitespace on either side relies on xapiAnswerText() turning it into a
        # space (it does, since 2026-10-20; plain textContent would glue the words). Noted so the
        # dependency is visible if that runtime rule ever changes.
        for mj in re.finditer(r'(\S{1,12})<br\s*/?>(\S{1,12})', inner):
            note(f'{where}: option data-id={oid!r}: <br /> with no adjacent whitespace between {ui_text(mj.group(1))!r} and '
                 f'{ui_text(mj.group(2))!r} — equal to the metadata only because xapiAnswerText() replaces <br> with a space')
        if oid in seen:
            if seen[oid] != text:
                err(f'{where}: option data-id={oid!r} has two different texts on one screen: {seen[oid]!r} / {text!r}')
            continue
        seen[oid] = text
        opts.append((oid, text))
    return opts


def cross_check_choice(where, body, reg, q):
    opts = ui_choice_options(body, where)
    if not opts:
        err(f'{where}: no .scq-opt[data-id] options found in the HTML'); return
    ids = dict(opts)
    cid = reg.get('correctId')
    if cid not in ids:
        err(f'{where}: correctId {cid!r} is not one of the option ids {list(ids)}'); return
    ui_answers = [t for _, t in opts]
    ui_correct = [ids[cid]]
    if ui_answers != q['answers']:
        err(f'{where}: answers differ\n   UI   {ui_answers}\n   META {q["answers"]}')
        explain_near_miss(where, ui_answers, q['answers'])
    if ui_correct != q['correctAnswers']:
        err(f'{where}: correctAnswers differ\n   UI   {ui_correct}\n   META {q["correctAnswers"]}')


def cross_check_matching(where, reg, q):
    items, targets, cmap = reg.get('items'), reg.get('targets'), reg.get('correctMap')
    if not items or not targets or not cmap:
        err(f'{where}: could not read items / targets / correctMap from {reg["src"]}'); return
    src = [ui_text(l) for _, l in items]           # pills render via textContent = label
    tgt = [ui_text(l) for _, l in targets]
    for _, l in items + targets:
        if l != ui_text(l):
            note(f'{where}: JS label {l!r} carries whitespace the runtime collapses (xapiAnswerText \\s+ -> " "); compared as {ui_text(l)!r}')
    item_label = {i: ui_text(l) for i, l in items}
    target_label = {i: ui_text(l) for i, l in targets}
    by_source = {}
    for t_id, i_id in cmap:
        if t_id not in target_label or i_id not in item_label:
            err(f'{where}: correctMap {t_id!r}: {i_id!r} names an unknown target or item'); continue
        by_source[item_label[i_id]] = target_label[t_id]
    pairs = [(s, by_source.get(s)) for s in src]   # answers.source order == runtime emit order
    a = q['answers']
    ca = [(p['source'], p['target']) for p in q['correctAnswers']]
    if src != a['source']:
        err(f'{where}: answers.source differs from the drag items (JS `items` order = bank DOM order)\n   UI   {src}\n   META {a["source"]}')
        explain_near_miss(where, src, a['source'])
    if tgt != a['target']:
        err(f'{where}: answers.target differs from the drop targets (JS `targets` order = DOM order)\n   UI   {tgt}\n   META {a["target"]}')
        explain_near_miss(where, tgt, a['target'])
    if pairs != ca:
        if sorted(pairs) == sorted(ca):
            warn(f'{where}: correctAnswers hold the right pairs but not in answers.source order '
                 f'(the runtime emits S[.]T pairs in answers.source order; Kata compares the strings)\n'
                 f'   UI   {pairs}\n   META {ca}')
        else:
            err(f'{where}: correct pairs differ\n   UI   {pairs}\n   META {ca}')


def explain_near_miss(where, ui, meta):
    """When two lists differ, say whether it is order only, or normalisation only."""
    if sorted(ui) == sorted(meta):
        note(f'{where}: same strings, different ORDER')
        return
    def norm(s):
        s = unicodedata.normalize('NFC', s)
        return re.sub(r'\s+', ' ', re.sub(r'[׳’ʼ]', "'", s)).strip()
    if [norm(x) for x in ui] == [norm(x) for x in meta]:
        note(f'{where}: differs only by NFC / geresh / whitespace — resolves at runtime through _xapiNorm, but is not byte-identical')


# ---------------------------------------------------------------------------
# R7 hygiene
# ---------------------------------------------------------------------------
def check_string(where, s, level=err):
    if not isinstance(s, str):
        err(f'{where}: not a string: {s!r}'); return
    if unicodedata.normalize('NFC', s) != s:
        level(f'{where}: not NFC: {s!r}')
    if s != s.strip():
        level(f'{where}: not trimmed: {s!r}')
    if re.search(r'\s\s|[\t\n\r ]', s):
        level(f'{where}: not single-spaced: {s!r}')
    for sep in XAPI_SEPS:
        if sep in s:
            level(f'{where}: contains xAPI separator {sep}: {s!r}')
    if s == '':
        level(f'{where}: empty string')


def check_unique(where, lst):
    seen = set()
    for s in lst:
        if s in seen:
            err(f'{where}: duplicate {s!r}')
        seen.add(s)


def check_question(where, q):
    qt = q.get('questionType')
    if qt not in KATA_TYPES:
        err(f'{where}: questionType {qt!r} not in Kata enum'); return
    if qt == 'performance':
        warn(f'{where}: performance — MOE v2.7 allows it only for 2+ typed inputs forming one answer; verify')
    qtext = q.get('questionText')
    if isinstance(qtext, str):
        for sep in XAPI_SEPS:
            if sep in qtext:
                warn(f'{where}.questionText contains xAPI separator {sep} (not compared by Kata, but reserved)')
    if qt == 'matching':
        a = q.get('answers')
        if not isinstance(a, dict) or set(a) != {'source', 'target'}:
            err(f'{where}: matching answers must be {{source,target}}'); return
        for k in ('source', 'target'):
            for s in a[k]:
                check_string(f'{where}.answers.{k}', s)
            check_unique(f'{where}.answers.{k}', a[k])
        ca = q.get('correctAnswers', [])
        for i, p in enumerate(ca):
            if not isinstance(p, dict) or set(p) != {'source', 'target'}:
                err(f'{where}.correctAnswers[{i}]: must be {{source,target}}'); continue
            for k in ('source', 'target'):
                check_string(f'{where}.correctAnswers[{i}].{k}', p[k])
                if p[k] not in a[k]:
                    err(f'{where}.correctAnswers[{i}].{k} {p[k]!r} not in answers.{k}')
        # This unit's catalogue is not one-to-one by design: a word bank / a dropdown's value list
        # carries DISTRACTOR sources with no correct pair (02/001, 06/q2, 06/q4), and one value can
        # be right for two targets (02/005 "ליטר"). Both are legal (Kata compares the response to
        # correctXapiResponsesPattern, built from correctAnswers; unit-js/20-xapi.js emits only the
        # placed pairs, in correctAnswers order). Reported as notes, so a genuinely wrong catalogue still stands out.
        srcs = [p.get('source') for p in ca if isinstance(p, dict)]
        dup = sorted({s for s in srcs if srcs.count(s) > 1})
        if dup:
            note(f'{where}: source(s) correct in more than one slot: {dup}')
        if len({s for s in srcs}) < len(a['source']):
            note(f'{where}: {len(a["source"]) - len(set(srcs))} distractor source(s) with no correct pair')
        pairs = [(p.get('source'), p.get('target')) for p in ca if isinstance(p, dict)]
        check_unique(f'{where}.correctAnswers', pairs)
    elif qt in ('choice', 'true-false', 'sequencing'):
        a = q.get('answers')
        if not isinstance(a, list):
            err(f'{where}: answers must be a list'); return
        for s in a:
            check_string(f'{where}.answers', s)
        check_unique(f'{where}.answers', a)
        ca = q.get('correctAnswers', [])
        for s in ca:
            check_string(f'{where}.correctAnswers', s)
            if s not in a:
                err(f'{where}.correctAnswers {s!r} not in answers')
        check_unique(f'{where}.correctAnswers', ca)
        if not ca:
            err(f'{where}: no correctAnswers')
    else:
        for s in q.get('answers', []) if isinstance(q.get('answers'), list) else []:
            check_string(f'{where}.answers', s)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    # unit file
    unit_path = os.path.join(META, UNIT + '_unit.json')
    if not os.path.exists(unit_path):
        err(f'missing {unit_path}')
    else:
        u = json.loads(read(unit_path))
        if u.get('id') != UNIT:
            err(f'{UNIT}_unit.json: unit id {u.get("id")!r} is not the bare slug {UNIT!r} (v2.7 §2.7); '
                f'the last path segment must never degrade to the folder number')
        if not isinstance(u.get('targetSectors'), list) or not u['targetSectors']:
            err(f'{UNIT}_unit.json: targetSectors must be a non-empty list (v2.5 §2.4)')
        if isinstance(u.get('targetAudience'), list):
            err(f'{UNIT}_unit.json: targetAudience must be a single value (v2.5 §2.5)')
        if 'manufacturer' not in u:
            warn(f'{UNIT}_unit.json: no manufacturer (v2.5 §2.6)')

    parts = sorted(p for p in os.listdir(META) if re.fullmatch(UNIT + r'-\d\d\.json', p))
    meta = {}
    for fn in parts:
        d = json.loads(read(os.path.join(META, fn)))
        part = fn[-7:-5]
        meta[part] = d
        comp_id = IRI_BASE + UNIT + '-' + part + '/'
        if d['id'] != comp_id:
            err(f'{fn}: component id {d["id"]!r} is not {comp_id!r}')
        if d.get('learningUnitId') != UNIT:
            err(f'{fn}: learningUnitId {d.get("learningUnitId")!r} is not {UNIT!r}')
        if 'masteryLevel' not in d:
            warn(f'{fn}: no masteryLevel key — send-metadata.ps1 then leaves whatever Kata holds')
        if not isinstance(d.get('cognitiveLevels'), list) or not d['cognitiveLevels']:
            err(f'{fn}: cognitiveLevels must be a non-empty list (v2.5 §2.1)')
        for ref in d.get('recommendedAfterFail', []):
            if not re.fullmatch(re.escape(IRI_BASE + UNIT) + r'-\d\d/', ref):
                err(f'{fn}: recommendedAfterFail {ref!r} is not a full component IRI of this unit')
            elif not os.path.exists(os.path.join(META, ref.rstrip('/').rsplit('/', 1)[-1] + '.json')):
                err(f'{fn}: recommendedAfterFail {ref!r} names a component without a metadata file')
        for item in d['subContent']:
            suffix = item['id'].rstrip('/').rsplit('-', 1)[-1]
            exp_item = comp_id + UNIT + '-' + part + '-' + suffix + '/'
            if item['id'] != exp_item:
                err(f'{fn}: item id {item["id"]!r} is not {exp_item!r}')

    # R7 + question index
    questions = {}  # (part, item, qKey) -> question
    for part, d in meta.items():
        for item in d['subContent']:
            suffix = item['id'].rstrip('/').rsplit('-', 1)[-1]
            for q in item.get('questions', []):
                qkey = q['questionId'].rstrip('/').rsplit('/', 1)[-1]
                exp = item['id'] + qkey
                if q['questionId'] != exp:
                    err(f'{part}-{suffix}/{qkey}: questionId {q["questionId"]!r} != {exp!r}')
                check_question(f'{part}-{suffix}/{qkey}', q)
                questions[(part, suffix, qkey)] = q

    # R8 census + UI cross-check, per part
    table = []          # rows for the SCREEN_MAP table
    ui_graded = 0
    graded_rows = {}    # part -> [(sid, check)]
    for part in meta:
        pdir = os.path.join(ROOT, UNIT + '-' + part)
        html = read(os.path.join(pdir, 'index.html'))
        js_raw = read(os.path.join(pdir, PART_SCRIPT))
        js = strip_js_comments(js_raw)
        scr = screens_of(html)
        smap = parse_screen_map(js_raw)
        if smap is None:
            err(f'part {part}: no `var SCREEN_TO_SUBCONTENT = {{...}}` in {PART_SCRIPT}'); continue
        idx_to_sid = {i: s for s, (i, _) in scr.items()}
        if set(smap) != set(idx_to_sid):
            err(f'part {part}: SCREEN_TO_SUBCONTENT keys {sorted(smap)} != index.html data-screen {sorted(idx_to_sid)}')
        items_in_meta = {it['id'].rstrip('/').rsplit('-', 1)[-1] for it in meta[part]['subContent']}
        for idx, (item, page, _) in sorted(smap.items()):
            if item is not None and item not in items_in_meta:
                err(f'part {part} screen {idx_to_sid.get(idx, idx)}: SCREEN_TO_SUBCONTENT names item {item}, not in metadata')

        regs = parse_registrations(js, part)
        wired = wired_checks(scr)
        by_screen = {}      # sid -> [registrations]  (03 s3 carries two questions on one screen)
        seen = set()
        for r in regs:
            key = (r['item'], r['qKey'])
            if key in seen:
                err(f'part {part}: question {r["item"]}/{r["qKey"]} registered twice')
            seen.add(key)
            by_screen.setdefault(r['screen'], []).append(r)
        for sid in by_screen:
            if sid not in wired:
                err(f'part {part}: screen {sid} registers a question ({by_screen[sid][0]["src"]}) but no check button is wired on it')
            if sid not in scr:
                err(f'part {part}: registration names screen {sid}, which is not in index.html')

        graded_rows[part] = []
        for idx in sorted(smap):
            sid = idx_to_sid.get(idx)
            item, page, label = smap[idx]
            rs = by_screen.get(sid)
            if not rs:
                table.append((part, idx, sid, item, page, None, None, False, None, label))
                continue
            graded_rows[part].append((sid, wired.get(sid, '?')))
            qkeys, qtypes = [], []
            for r in rs:
                ui_graded += 1
                q = questions.get((part, r['item'], r['qKey']))
                qkeys.append(r['qKey']); qtypes.append(q['questionType'] if q else '?')
                where = f'part {part} {sid}'
                if r['item'] != item:
                    err(f'{where}: xapiAnswered names item {r["item"]!r} but SCREEN_TO_SUBCONTENT[{idx}] names item {item!r}')
                if q is None:
                    err(f'{where}: graded ({r["src"]}, item {r["item"]} {r["qKey"]}) but metadata has no question {part}-{r["item"]}/{r["qKey"]}')
            table.append((part, idx, sid, item, page, '+'.join(qkeys), '+'.join(qtypes), True, wired.get(sid, '?'), label))

    # every metadata question must be a graded screen
    mapped_q = set()
    for row in table:
        if row[7]:
            for k in row[5].split('+'):
                mapped_q.add((row[0], row[3], k))
    for key in questions:
        if key not in mapped_q:
            err(f'metadata question {key} is not registered on any graded screen')

    # SCREEN_MAP table (the table in METADATA-AUDIT.md §2)
    print()
    print('SCREEN_MAP (built from SCREEN_TO_SUBCONTENT + the xapiAnswered call sites)')
    print('| part | data-screen | screen id | item | page | qKey | questionType | graded? | check | screen |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for part, idx, sid, item, page, qkey, qtype, graded, check, label in table:
        print('| %s | %d | %s | %s | %s | %s | %s | %s | %s | %s |' % (
            part, idx, sid, item or 'null', page if page is not None else '—', qkey or '—', qtype or '—',
            'yes' if graded else 'no', check or '—', label.replace('|', '\\|')))

    n_meta = len(questions)
    print()
    print('CENSUS  graded screens (UI): %d   declared questions (metadata): %d   expected: %d'
          % (ui_graded, n_meta, EXPECTED_GRADED))
    for part in meta:
        g = graded_rows.get(part, [])
        m = [k for k in questions if k[0] == part]
        print('        part %s: %d graded screens [%s]  /  %d metadata questions' % (
            part, len(g), ', '.join(s + ':' + c for s, c in g), len(m)))
    if ui_graded != EXPECTED_GRADED or n_meta != EXPECTED_GRADED:
        err('census mismatch')
    print()
    print('RESULT  %d error(s), %d warning(s), %d note(s)' % (len(errors), len(warnings), len(notes)))
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
