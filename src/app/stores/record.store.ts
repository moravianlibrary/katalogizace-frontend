import {
  ExistingMarcRecord,
  ExistingMarcRecordWithMeta,
  ExtractedMarcRecord,
  LastEditedRecord,
  MarcCandidate,
  Step,
  UUID,
} from '@/app/models';
import { computed, Injectable, signal } from '@angular/core';
import { extractedToExistingWithMeta } from '../utils/marc-transform';

@Injectable()
export class RecordStore {
  readonly extracted = signal<ExtractedMarcRecord | null>(null);
  readonly lastEdited = signal<LastEditedRecord | null>(null);
  readonly existingRecords = signal<ExistingMarcRecord[]>([]);
  readonly provenance = signal<Record<string, Step[]>>({});

  readonly title = signal<string | null>(null);
  readonly author = signal<string | null>(null);
  readonly yearOfPublication = signal<number | null>(null);

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

  setTitle(t: string) {
    this.title.set(t);
  }

  setAuthor(a: string) {
    this.author.set(a);
  }

  setYearOfPublication(year: number) {
    this.yearOfPublication.set(year);
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
        control_fields: (ex.control_fields ?? []).map((sf) => ({
          tag: sf.tag,
          value: sf.value,
        })),
        data_fields: (ex.data_fields ?? []).map((df) => ({
          tag: df.tag,
          ind1: df.ind1 ?? '',
          ind2: df.ind2 ?? '',
          subfields: df.subfields ?? [],
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
        control_fields: [...(ex.control_fields ?? [])],
        data_fields: [...(ex.data_fields ?? [])],
      });
      return;
    }

    const r = this.openedExisting();
    if (!r) return;

    this.openedExisting.set({
      ...r,
      control_fields: [...(r.control_fields ?? [])],
      data_fields: [...(r.data_fields ?? [])],
    });
  }

  applyCandidateToOpenedExtracted(fieldId: UUID, candidate: MarcCandidate) {
    const ex = this.openedExtractedWithMeta();
    if (!ex) return;

    const idx = (ex.data_fields ?? []).findIndex((f) => f.fieldId === fieldId);
    if (idx < 0) return;

    const rep = candidate.MARC_representation;

    const updatedField = {
      ...ex.data_fields[idx],
      ind1: rep.ind1 ?? '',
      ind2: rep.ind2 ?? '',
      subfields: rep.subfields ?? [],
      selectedCandidateId: candidate.id,
      score: candidate.score,
    };

    const nextData = [...ex.data_fields];
    nextData[idx] = updatedField;

    this.openedExtractedWithMeta.set({
      ...ex,
      data_fields: nextData,
    });
  }
}
