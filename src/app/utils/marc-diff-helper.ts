import { MarcSubfield } from '../models/book';
import {
  DiffIndex,
  DiffKind,
  normalSignature,
  specialSignature,
} from './marc-diff';

export type DiffSide = 'opened' | 'preview';

export class MarcDiffHelper {
  constructor(private readonly diffIndex: DiffIndex | null) {}

  diffKindForSpecial(
    tag: string,
    value: string,
    side: DiffSide,
  ): DiffKind | null {
    if (!this.diffIndex) return null;

    const key = specialSignature({ tag, value });
    return (
      (side === 'opened' ? this.diffIndex.opened : this.diffIndex.preview).get(
        key,
      ) ?? null
    );
  }

  diffKindForNormal(
    tag: string,
    ind1: string,
    ind2: string,
    subfields: MarcSubfield[],
    side: DiffSide,
  ): DiffKind | null {
    if (!this.diffIndex) return null;

    const key = normalSignature({ tag, ind1, ind2, subfields });
    return (
      (side === 'opened' ? this.diffIndex.opened : this.diffIndex.preview).get(
        key,
      ) ?? null
    );
  }

  rowClass(kind: DiffKind | null): string {
    switch (kind) {
      case 'added':
        return 'bg-green-100';
      case 'removed':
        return 'bg-red-100';
      case 'modified':
        return 'bg-amber-100';
      default:
        return '';
    }
  }
}
