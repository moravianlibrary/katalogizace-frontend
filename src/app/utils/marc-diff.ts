import {
  ExistingMarcRecord,
  ExistingMarcRecordNormalField,
  MarcSubfield,
  SubDiffIndex,
  SubDiffKind,
} from '@/app/models';

const SEP = '\u001F';
const KV = '\u001E';
const OCC = '\u001D';

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

export function isDiffableTag015to830(tag: unknown): boolean {
  const t = normStr(tag);
  if (!/^\d{3}$/.test(t)) return false;
  const n = Number(t);
  return n >= 15 && n <= 830;
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

/**
 * Field signature pre normal field. Stabilné aj keď sa zmení poradie podpolí.
 * (Používa multiset podpis subfields.)
 */
export function normalSignature(f: ExistingMarcRecordNormalField): string {
  const tag = normStr(f.tag);
  const ind1 = normInd(f.ind1);
  const ind2 = normInd(f.ind2);
  const subSig = subfieldsSignature(f.subfields ?? []);
  return `N${SEP}${tag}${SEP}${ind1}${SEP}${ind2}${SEP}${subSig}`;
}

function fieldTag(f: ExistingMarcRecordNormalField): string {
  return normStr(f.tag);
}

/**
 * Vytiahne len diffovateľné normal fields (015–830).
 */
function toNormalFields(
  rec: ExistingMarcRecord | null | undefined,
): ExistingMarcRecordNormalField[] {
  if (!rec) return [];
  return (rec.normal_fields ?? []).filter((f) => isDiffableTag015to830(f.tag));
}

/**
 * multiset delta medzi dvoma zoznamami subfields (ignoruje poradie, ráta duplicity).
 * Výstup = počet add/remove operácií.
 */
function subfieldsDeltaCount(
  a: MarcSubfield[] | null | undefined,
  b: MarcSubfield[] | null | undefined,
): number {
  const ca = multisetCounts(a ?? []);
  const cb = multisetCounts(b ?? []);

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
 * Cost na pairing dvoch polí rovnakého tagu:
 * +1 za rozdiel ind1
 * +1 za rozdiel ind2
 * + delta multiset subfields
 */
function matchCost(
  a: ExistingMarcRecordNormalField,
  b: ExistingMarcRecordNormalField,
): number {
  if (fieldTag(a) !== fieldTag(b)) return Number.POSITIVE_INFINITY;

  let cost = 0;
  if (normInd(a.ind1) !== normInd(b.ind1)) cost += 1;
  if (normInd(a.ind2) !== normInd(b.ind2)) cost += 1;

  cost += subfieldsDeltaCount(a.subfields ?? [], b.subfields ?? []);
  return cost;
}

/**
 * Greedy pairing v rámci jedného tagu:
 * - vygeneruje všetky páry, zoradí podľa cost, a greedy vyberie nekolízne páry
 */
function greedyPairing(
  opened: ExistingMarcRecordNormalField[],
  preview: ExistingMarcRecordNormalField[],
) {
  const pairs: Array<{
    o: ExistingMarcRecordNormalField;
    p: ExistingMarcRecordNormalField;
    cost: number;
  }> = [];

  for (const o of opened) {
    for (const p of preview) {
      const c = matchCost(o, p);
      if (Number.isFinite(c)) pairs.push({ o, p, cost: c });
    }
  }

  pairs.sort((a, b) => a.cost - b.cost);

  const usedO = new Set<ExistingMarcRecordNormalField>();
  const usedP = new Set<ExistingMarcRecordNormalField>();
  const chosen: Array<{
    o: ExistingMarcRecordNormalField;
    p: ExistingMarcRecordNormalField;
    cost: number;
  }> = [];

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

export function subfieldOccKey(
  sf: { code: string; value: string },
  occIndex: number,
): string {
  return `${sf.code}${KV}${sf.value}${OCC}${occIndex}`;
}

/**
 * Enumerácia podpolí v pôvodnom poradí (po normalizácii)
 * + ku každému “occKey” (index medzi rovnakými (code,value)).
 */
export function enumerateSubfields(
  subfields?: MarcSubfield[] | null,
): Array<{ sf: { code: string; value: string }; key: string }> {
  const sfs = normalizeSubfields(subfields);

  const seen = new Map<string, number>();
  return sfs.map((sf) => {
    const base = `${sf.code}${KV}${sf.value}`;
    const idx = seen.get(base) ?? 0;
    seen.set(base, idx + 1);
    return { sf, key: subfieldOccKey(sf, idx) };
  });
}

/**
 * Subfield-level diff pre jedno spárované pole:
 * 1) exact match (code+value) => same (green)
 * 2) zvyšok páruj podľa code => changed (red)
 * 3) leftovers => missing_or_extra (orange)
 */
function diffSubfieldsWithinPairedField(
  openedSubfields?: MarcSubfield[] | null,
  previewSubfields?: MarcSubfield[] | null,
): {
  opened: Map<string, SubDiffKind>;
  preview: Map<string, SubDiffKind>;
} {
  const o = enumerateSubfields(openedSubfields);
  const p = enumerateSubfields(previewSubfields);

  const openedKinds = new Map<string, SubDiffKind>();
  const previewKinds = new Map<string, SubDiffKind>();

  const exactKey = (sf: { code: string; value: string }) =>
    `${sf.code}${KV}${sf.value}`;

  // indexy výskytov podľa exact (code,value)
  const oByExact = new Map<string, number[]>();
  const pByExact = new Map<string, number[]>();

  o.forEach(({ sf }, i) => {
    const k = exactKey(sf);
    const arr = oByExact.get(k) ?? [];
    arr.push(i);
    oByExact.set(k, arr);
  });

  p.forEach(({ sf }, i) => {
    const k = exactKey(sf);
    const arr = pByExact.get(k) ?? [];
    arr.push(i);
    pByExact.set(k, arr);
  });

  const usedO = new Set<number>();
  const usedP = new Set<number>();

  // 1) exact matches => same (green)
  const exactKeys = new Set([...oByExact.keys(), ...pByExact.keys()]);
  for (const k of exactKeys) {
    const oi = oByExact.get(k) ?? [];
    const pi = pByExact.get(k) ?? [];
    const m = Math.min(oi.length, pi.length);

    for (let j = 0; j < m; j++) {
      usedO.add(oi[j]);
      usedP.add(pi[j]);
      openedKinds.set(o[oi[j]].key, 'same');
      previewKinds.set(p[pi[j]].key, 'same');
    }
  }

  // 2) remaining => group by code, pair => changed (red)
  const oByCode = new Map<string, number[]>();
  const pByCode = new Map<string, number[]>();

  o.forEach(({ sf }, i) => {
    if (usedO.has(i)) return;
    const arr = oByCode.get(sf.code) ?? [];
    arr.push(i);
    oByCode.set(sf.code, arr);
  });

  p.forEach(({ sf }, i) => {
    if (usedP.has(i)) return;
    const arr = pByCode.get(sf.code) ?? [];
    arr.push(i);
    pByCode.set(sf.code, arr);
  });

  const codes = new Set([...oByCode.keys(), ...pByCode.keys()]);
  for (const code of codes) {
    const oi = oByCode.get(code) ?? [];
    const pi = pByCode.get(code) ?? [];
    const m = Math.min(oi.length, pi.length);

    for (let j = 0; j < m; j++) {
      openedKinds.set(o[oi[j]].key, 'changed');
      previewKinds.set(p[pi[j]].key, 'changed');
      usedO.add(oi[j]);
      usedP.add(pi[j]);
    }

    // 3) leftovers => missing_or_extra (orange)
    for (let j = m; j < oi.length; j++) {
      openedKinds.set(o[oi[j]].key, 'missing_or_extra');
    }
    for (let j = m; j < pi.length; j++) {
      previewKinds.set(p[pi[j]].key, 'missing_or_extra');
    }
  }

  return { opened: openedKinds, preview: previewKinds };
}

/**
 * diff opened vs preview na úrovni podpolí (015–830)
 * - grouping podľa tagu
 * - greedy pairing polí v rámci tagu
 * - potom subfield-level diff v rámci spárovaného poľa
 */
export function diffMarcRecordsSubfields(
  openedRec: ExistingMarcRecord | null,
  previewRec: ExistingMarcRecord | null,
): SubDiffIndex {
  const openedFields = toNormalFields(openedRec);
  const previewFields = toNormalFields(previewRec);

  const openedMap = new Map<string, Map<string, SubDiffKind>>();
  const previewMap = new Map<string, Map<string, SubDiffKind>>();

  const tags = new Set<string>([
    ...openedFields.map((f) => fieldTag(f)),
    ...previewFields.map((f) => fieldTag(f)),
  ]);

  for (const tag of tags) {
    const oGroup = openedFields.filter((f) => fieldTag(f) === tag);
    const pGroup = previewFields.filter((f) => fieldTag(f) === tag);

    const { chosen, unpairedO, unpairedP } = greedyPairing(oGroup, pGroup);

    // paired fields => diff subfields
    for (const { o, p } of chosen) {
      const oKey = normalSignature(o);
      const pKey = normalSignature(p);

      const { opened, preview } = diffSubfieldsWithinPairedField(
        o.subfields ?? [],
        p.subfields ?? [],
      );

      openedMap.set(oKey, opened);
      previewMap.set(pKey, preview);
    }

    // unpaired => všetky subfields orange na tej strane
    for (const o of unpairedO) {
      const oKey = normalSignature(o);

      const m = new Map<string, SubDiffKind>();
      for (const { key } of enumerateSubfields(o.subfields ?? [])) {
        m.set(key, 'missing_or_extra');
      }
      openedMap.set(oKey, m);
    }

    for (const p of unpairedP) {
      const pKey = normalSignature(p);

      const m = new Map<string, SubDiffKind>();
      for (const { key } of enumerateSubfields(p.subfields ?? [])) {
        m.set(key, 'missing_or_extra');
      }
      previewMap.set(pKey, m);
    }
  }

  return { opened: openedMap, preview: previewMap };
}
