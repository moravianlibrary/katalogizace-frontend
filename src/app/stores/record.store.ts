import {
  ExistingMarcRecord,
  ExistingMarcRecordWithMeta,
  ExtractedMarcRecord,
  LastEditedRecord,
  MarcCandidate,
  Step,
} from '@/app/models';
import { computed, Injectable, signal } from '@angular/core';
import { extractedToExistingWithMeta } from '../utils/marc-transform';

@Injectable()
export class RecordStore {
  readonly extracted = signal<ExtractedMarcRecord | null>(null);
  readonly lastEdited = signal<LastEditedRecord | null>(null);
  readonly existingRecords = signal<ExistingMarcRecord[]>([]);
  readonly provenance = signal<Record<string, Step[]>>({});

  readonly hasLastEdited = computed(() => !!this.lastEdited());

  readonly openedExisting = signal<ExistingMarcRecord | null>(null);
  readonly openedExtractedWithMeta = signal<ExistingMarcRecordWithMeta | null>(
    null,
  );

  setExtracted(rec: ExtractedMarcRecord | null) {
    this.extracted.set(rec);
  }

  setLastEdited(rec: LastEditedRecord | null) {
    this.lastEdited.set(rec);
  }

  setExistingRecords(recs: ExistingMarcRecord[]) {
    this.existingRecords.set(recs ?? []);
  }

  setProvenance(p: Record<string, Step[]>) {
    this.provenance.set(p);
  }

  setOpenedExisting(rec: ExistingMarcRecord | null) {
    this.openedExisting.set(rec);
    if (rec) this.openedExtractedWithMeta.set(null);
  }

  setOpenedExtracted(rec: ExtractedMarcRecord | null) {
    const withMeta = extractedToExistingWithMeta(rec);
    this.openedExtractedWithMeta.set(withMeta);
    if (withMeta) this.openedExisting.set(null);
  }

  readonly openedForDiff = computed<ExistingMarcRecord | null>(() => {
    const ex = this.openedExtractedWithMeta();
    if (ex) {
      return {
        record_id: ex.record_id,
        leader: ex.leader,
        source: ex.source,
        quality_assessment: ex.quality_assessment,
        special_fields: (ex.special_fields ?? []).map((sf) => ({
          tag: sf.tag,
          value: sf.value,
        })),
        normal_fields: (ex.normal_fields ?? []).map((nf) => ({
          tag: nf.tag,
          ind1: nf.ind1 ?? '',
          ind2: nf.ind2 ?? '',
          subfields: nf.subfields ?? [],
        })),
      };
    }

    return this.openedExisting();
  });

  touchOpenedForDiff() {
    const ex = this.openedExtractedWithMeta();
    if (ex) {
      this.openedExtractedWithMeta.set({
        ...ex,
        special_fields: [...(ex.special_fields ?? [])],
        normal_fields: [...(ex.normal_fields ?? [])],
      });
      return;
    }

    const r = this.openedExisting();
    if (!r) return;

    this.openedExisting.set({
      ...r,
      special_fields: [...(r.special_fields ?? [])],
      normal_fields: [...(r.normal_fields ?? [])],
    });
  }

  applyCandidateToOpenedExtracted(fieldId: string, candidate: MarcCandidate) {
    const ex = this.openedExtractedWithMeta();
    if (!ex) return;

    const idx = (ex.normal_fields ?? []).findIndex(
      (f) => f.fieldId === fieldId,
    );
    if (idx < 0) return;

    const rep = candidate.MARC_representation;

    const updatedField = {
      ...ex.normal_fields[idx],
      ind1: rep.ind1 ?? '',
      ind2: rep.ind2 ?? '',
      subfields: rep.subfields ?? [],
      selectedCandidateId: candidate.id,
      score: candidate.score,
    };

    const nextNormal = [...ex.normal_fields];
    nextNormal[idx] = updatedField;

    this.openedExtractedWithMeta.set({
      ...ex,
      normal_fields: nextNormal,
    });
  }
}
