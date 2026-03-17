import {
  ApplyCandidateEvent,
  MarcCandidate,
  MarcSubfield,
  PanelMode,
  PanelState,
  Step,
  UUID,
} from '@/app/models';
import { Injectable, signal } from '@angular/core';

export type EditSnapshot =
  | { kind: 'control'; fieldId: UUID; tag: string; value: string }
  | {
      kind: 'data';
      fieldId: UUID;
      tag: string;
      ind1: string;
      ind2: string;
      subfields: MarcSubfield[];
    };

@Injectable({ providedIn: 'root' })
export class ContextPanelService {
  readonly state = signal<PanelState>({ mode: 'records' });

  readonly applyCandidate = signal<ApplyCandidateEvent | null>(null);

  readonly editSnapshot = signal<EditSnapshot | null>(null);
  readonly editResetNonce = signal(0);

  setMode(mode: PanelMode, partial: Partial<PanelState> = {}) {
    const prev = this.state();

    const cleared: PanelState = {
      mode,
      tag: undefined,
      candidates: undefined,
      steps: undefined,
      fieldId: undefined,
      subfields: undefined,
      selectedCandidateId: undefined,
    };
    this.state.set({ ...cleared, ...partial });

    if (prev.mode === 'edit' && mode !== 'edit') {
      this.editSnapshot.set(null);
    }
  }

  reset() {
    this.state.set({ mode: 'records' });
    this.applyCandidate.set(null);
    this.editSnapshot.set(null);
    this.editResetNonce.set(0);
  }

  enterEdit(snapshot: EditSnapshot) {
    const clone =
      typeof structuredClone === 'function'
        ? structuredClone(snapshot)
        : JSON.parse(JSON.stringify(snapshot));

    this.editSnapshot.set(clone);
    this.setMode('edit', { tag: snapshot.tag, fieldId: snapshot.fieldId });
  }

  requestEditReset() {
    if (!this.editSnapshot()) return;
    this.editResetNonce.update((x) => x + 1);
  }

  showRecords() {
    this.setMode('records');
  }

  showCandidates(
    mode: PanelMode,
    tag: string,
    fieldId: UUID,
    candidates: MarcCandidate[],
    selectedCandidateId: UUID,
  ) {
    this.setMode(mode, {
      tag,
      fieldId,
      candidates,
      selectedCandidateId,
    });
  }

  confirmCandidate(candidateId: UUID) {
    const s = this.state();
    if (
      s.mode !== 'candidates' ||
      !s.fieldId ||
      !s.tag ||
      !s.candidates?.length
    ) {
      return;
    }

    const cand = s.candidates.find((c) => c.id === candidateId);
    if (!cand) {
      return;
    }

    this.applyCandidate.set({
      fieldId: s.fieldId,
      tag: s.tag,
      candidate: cand,
    });

    this.showRecords();
  }

  setSelectedCandidateId(id: UUID) {
    this.state.update((s) => ({ ...s, selectedCandidateId: id }));
  }

  showProvenance(tag: string, steps: Step[], fieldId: UUID) {
    this.setMode('provenance', { tag, steps, fieldId });
  }
}
