import {useEffect} from 'react';
import {useLanguage, type AppLanguage} from '../context/LanguageContext';
import {translateText as baseTranslate} from './UiText';
import extraMessages from './messagesV1066.json';

type Pair = {en: string; hi: string};
const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
const extra = new Map<string, Pair>();
for (const [key, pair] of Object.entries(extraMessages as Record<string, Pair>)) {
  for (const k of [key, pair.en, pair.hi]) if (!extra.has(norm(k))) extra.set(norm(k), pair);
}
function translateText(value: string, language: AppLanguage): string {
  const hit = extra.get(norm(value));
  if (hit) return hit[language];
  const base = baseTranslate(value, language);
  return typeof base === 'string' ? base : value;
}

/**
 * Whole-app language switch (v1.0.66).
 * Many screens still carry fixed Hindi, English or Hinglish copy. This keeps the
 * React source untouched and swaps only DISPLAYED UI copy that is in the reviewed
 * dictionary (messages.json): text nodes plus placeholder/title/aria-label/alt.
 * Input values, textareas, editable areas and anything inside [data-no-translate]
 * or [translate="no"] are never touched, so stored business values stay as typed.
 * The original React text is remembered per node, so switching back is exact.
 */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'svg']);
const HAS_WORD = /[A-Za-z\u0900-\u097F]{2}/;
type Rec = {src: string; out: string};
const textRecs = new WeakMap<Text, Rec>();
const attrRecs = new WeakMap<Element, Map<string, Rec>>();

function skipped(el: Element | null): boolean {
  for (let cur = el; cur; cur = cur.parentElement) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if ((cur as HTMLElement).isContentEditable) return true;
    if (cur.hasAttribute('data-no-translate') || cur.getAttribute('translate') === 'no') return true;
  }
  return false;
}

/** Translate one string, keeping surrounding spaces and simple leading/trailing punctuation. */
export function translateCopy(raw: string, language: AppLanguage): string {
  const lead = raw.match(/^\s*/)?.[0] ?? '';
  const trail = raw.match(/\s*$/)?.[0] ?? '';
  const core = raw.trim().replace(/\s+/g, ' ');
  if (!core || !HAS_WORD.test(core)) return raw;
  const direct = translateText(core, language);
  if (typeof direct === 'string' && direct !== core) return lead + direct + trail;
  // "स्थिति:" / "· Last:" / "Orders (" — try the words without edge punctuation.
  const m = core.match(/^([·•|:–—(\-\s]*)(.*?)([\s:：·•|()\-–—?!.,।]*)$/u);
  if (m && m[2] && m[2] !== core && HAS_WORD.test(m[2])) {
    const inner = translateText(m[2], language);
    if (typeof inner === 'string' && inner !== m[2]) return lead + m[1] + inner + m[3] + trail;
  }
  return raw;
}

function doText(node: Text, language: AppLanguage) {
  const current = node.nodeValue ?? '';
  let rec = textRecs.get(node);
  if (!rec || current !== rec.out) rec = {src: current, out: current};
  if (!HAS_WORD.test(rec.src) || skipped(node.parentElement)) { textRecs.set(node, rec); return; }
  const out = translateCopy(rec.src, language);
  rec.out = out;
  textRecs.set(node, rec);
  if (out !== current) node.nodeValue = out;
}

function doAttrs(el: Element, language: AppLanguage) {
  let recs = attrRecs.get(el);
  for (const name of ATTRS) {
    const current = el.getAttribute(name);
    if (current === null) continue;
    if (!recs) { recs = new Map(); attrRecs.set(el, recs); }
    let rec = recs.get(name);
    if (!rec || current !== rec.out) rec = {src: current, out: current};
    const out = HAS_WORD.test(rec.src) ? translateCopy(rec.src, language) : rec.src;
    rec.out = out;
    recs.set(name, rec);
    if (out !== current) el.setAttribute(name, out);
  }
}

function walk(root: Node, language: AppLanguage) {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text, language); return; }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (skipped(el)) { if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') doAttrs(el, language); return; }
    doAttrs(el, language);
  }
  const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text, language);
    else {
      const el = n as Element;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') doAttrs(el, language);
      else if (!skipped(el)) doAttrs(el, language);
    }
  }
}

export function AutoTranslate() {
  const {language} = useLanguage();
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const body = document.body;
    walk(body, language);
    let pending = new Set<Node>();
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      const batch = pending; pending = new Set();
      observer.disconnect();
      try { batch.forEach(n => { if (n.isConnected) walk(n, language); }); }
      finally { observer.observe(body, OPTIONS); }
    };
    const observer = new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(n => pending.add(n));
        else pending.add(m.target);
      }
      if (!scheduled) { scheduled = true; queueMicrotask(flush); }
    });
    const OPTIONS: MutationObserverInit = {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS]};
    observer.observe(body, OPTIONS);
    return () => observer.disconnect();
  }, [language]);
  return null;
}
