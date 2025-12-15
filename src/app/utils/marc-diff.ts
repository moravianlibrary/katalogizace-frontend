import {
  ExistingMarcRecord,
  ExistingMarcRecordNormalField,
  ExistingMarcRecordSpecialField,
  MarcSubfield,
} from '../models/book';

export type DiffKind = 'same' | 'added' | 'removed' | 'modified';

export type DiffIndex = {
  opened: Map<string, DiffKind>;
  preview: Map<string, DiffKind>;
};

type AnyField =
  | ({ __kind: 'special' } & ExistingMarcRecordSpecialField)
  | ({ __kind: 'normal' } & ExistingMarcRecordNormalField);

const SEP = '\u001F';
const KV = '\u001E';

function normStr(v: unknown): string {
  return String(v ?? '').trim();
}

function normInd(v: unknown): string {
  return normStr(v);
}

function normalizeSubfields(subfields?: MarcSubfield[] | null): MarcSubfield[] {
  const sfs = subfields ?? [];
  return sfs
    .map((sf) => ({ code: normStr(sf.code), value: normStr(sf.value) }))
    .filter((sf) => sf.code.length === 1 && sf.value.length > 0);
}

export function subfieldsSignature(subfields?: MarcSubfield[] | null): string {
  const sfs = normalizeSubfields(subfields);

  const counts = new Map<string, number>();
  for (const sf of sfs) {
    const key = `${sf.code}${KV}${sf.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const parts = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, c]) => `${k}${KV}${c}`);

  return parts.join(SEP);
}

export function specialSignature(f: ExistingMarcRecordSpecialField): string {
  const tag = normStr(f.tag);
  const value = normStr(f.value);
  return `S${SEP}${tag}${SEP}${value}`;
}

export function normalSignature(f: ExistingMarcRecordNormalField): string {
  const tag = normStr(f.tag);
  const ind1 = normInd(f.ind1);
  const ind2 = normInd(f.ind2);
  const subSig = subfieldsSignature(f.subfields);
  return `N${SEP}${tag}${SEP}${ind1}${SEP}${ind2}${SEP}${subSig}`;
}

function toAnyFields(rec: ExistingMarcRecord | null | undefined): AnyField[] {
  if (!rec) return [];

  //   const special = (rec.special_fields ?? []).map((f) => ({
  //     __kind: 'special' as const,
  //     tag: normStr(f.tag),
  //     value: normStr(f.value),
  //   }));

  const special: AnyField[] = [];

  //   const normal = (rec.normal_fields ?? []).map((f) => ({
  //     __kind: 'normal' as const,
  //     tag: normStr(f.tag),
  //     ind1: normInd(f.ind1),
  //     ind2: normInd(f.ind2),
  //     subfields: normalizeSubfields(f.subfields),
  //   }));

  const normal = (rec.normal_fields ?? [])
    .filter((f) => isDiffableTag015to830(f.tag))
    .map((f) => ({
      __kind: 'normal' as const,
      tag: normStr(f.tag),
      ind1: normInd(f.ind1),
      ind2: normInd(f.ind2),
      subfields: normalizeSubfields(f.subfields),
    }));

  return [...special, ...normal];
}

function fieldTag(f: AnyField): string {
  return normStr(f.tag);
}

function fieldSig(f: AnyField): string {
  return f.__kind === 'special' ? specialSignature(f) : normalSignature(f);
}

/**
 * Cost funkcia pre pairing (nižšie = bližšie).
 * - special: 0 ak value rovnaké, inak 1
 * - normal: +1 za ind1 rozdiel, +1 za ind2 rozdiel, + delta multiset subfields
 */
function matchCost(a: AnyField, b: AnyField): number {
  if (a.__kind !== b.__kind) return Number.POSITIVE_INFINITY;
  if (fieldTag(a) !== fieldTag(b)) return Number.POSITIVE_INFINITY;

  if (a.__kind === 'special' && b.__kind === 'special') {
    return normStr(a.value) === normStr(b.value) ? 0 : 1;
  }

  const an = a as Extract<AnyField, { __kind: 'normal' }>;
  const bn = b as Extract<AnyField, { __kind: 'normal' }>;

  let cost = 0;
  if (normInd(an.ind1) !== normInd(bn.ind1)) cost += 1;
  if (normInd(an.ind2) !== normInd(bn.ind2)) cost += 1;

  cost += subfieldsDeltaCount(an.subfields ?? [], bn.subfields ?? []);
  return cost;
}

/**
 * Počet rozdielov medzi dvoma multisetmi subfields (ignoruje poradie, ráta duplicity).
 * Vráti počet "add/remove" operácií.
 */
function subfieldsDeltaCount(a: MarcSubfield[], b: MarcSubfield[]): number {
  const ca = multisetCounts(a);
  const cb = multisetCounts(b);

  const keys = new Set([...ca.keys(), ...cb.keys()]);
  let delta = 0;
  for (const k of keys) {
    const da = ca.get(k) ?? 0;
    const db = cb.get(k) ?? 0;
    delta += Math.abs(da - db);
  }
  return delta;
}

function multisetCounts(sfs: MarcSubfield[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const sf of normalizeSubfields(sfs)) {
    const key = `${sf.code}${KV}${sf.value}`;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

/**
 * Greedy pairing: v rámci jedného tagu a kind nájde páry s najnižším costom.
 */
function greedyPairing(opened: AnyField[], preview: AnyField[]) {
  const pairs: Array<{ o: AnyField; p: AnyField; cost: number }> = [];

  for (const o of opened) {
    for (const p of preview) {
      const c = matchCost(o, p);
      if (Number.isFinite(c)) {
        pairs.push({ o, p, cost: c });
      }
    }
  }

  pairs.sort((a, b) => a.cost - b.cost);

  const usedO = new Set<AnyField>();
  const usedP = new Set<AnyField>();
  const chosen: Array<{ o: AnyField; p: AnyField; cost: number }> = [];

  for (const pair of pairs) {
    if (usedO.has(pair.o) || usedP.has(pair.p)) continue;
    usedO.add(pair.o);
    usedP.add(pair.p);
    chosen.push(pair);
  }

  const unpairedO = opened.filter((x) => !usedO.has(x));
  const unpairedP = preview.filter((x) => !usedP.has(x));

  return { chosen, unpairedO, unpairedP };
}

/**
 * Hlavná funkcia: diff opened vs preview
 * - pairing podľa najlepšej zhody v rámci tagu a kind
 * - výsledok je map pre highlight: signature -> DiffKind
 */
export function diffMarcRecords(
  openedRec: ExistingMarcRecord | null,
  previewRec: ExistingMarcRecord | null,
): DiffIndex {
  const openedFields = toAnyFields(openedRec);
  const previewFields = toAnyFields(previewRec);

  const openedMap = new Map<string, DiffKind>();
  const previewMap = new Map<string, DiffKind>();

  const tags = new Set<string>([
    ...openedFields.map((f) => `${f.__kind}:${fieldTag(f)}`),
    ...previewFields.map((f) => `${f.__kind}:${fieldTag(f)}`),
  ]);

  for (const key of tags) {
    const [kind, tag] = key.split(':', 2) as ['normal' | 'special', string];

    const oGroup = openedFields.filter(
      (f) => f.__kind === kind && fieldTag(f) === tag,
    );
    const pGroup = previewFields.filter(
      (f) => f.__kind === kind && fieldTag(f) === tag,
    );

    const { chosen, unpairedO, unpairedP } = greedyPairing(oGroup, pGroup);

    for (const { o, p, cost } of chosen) {
      const ok = fieldSig(o);
      const pk = fieldSig(p);
      const kind: DiffKind = cost === 0 ? 'same' : 'modified';
      openedMap.set(ok, kind);
      previewMap.set(pk, kind);
    }

    for (const o of unpairedO) openedMap.set(fieldSig(o), 'removed');
    for (const p of unpairedP) previewMap.set(fieldSig(p), 'added');
  }

  return { opened: openedMap, preview: previewMap };
}

export function isDiffableTag015to830(tag: unknown): boolean {
  const t = normStr(tag);
  if (!/^\d{3}$/.test(t)) return false;
  const n = Number(t);
  return n >= 15 && n <= 830;
}
