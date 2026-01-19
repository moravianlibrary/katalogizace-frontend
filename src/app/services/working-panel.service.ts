import {
  ApplyCandidateEvent,
  MarcCandidate,
  PanelMode,
  PanelState,
  Step,
} from '@/app/models';
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WorkingPanelService {
  readonly state = signal<PanelState>({ mode: 'records' });

  readonly applyCandidate = signal<ApplyCandidateEvent | null>(null);

  setMode(mode: PanelMode, partial: Partial<PanelState> = {}) {
    const cleared: PanelState = {
      mode,
      tag: undefined,
      title: undefined,
      candidates: undefined,
      steps: undefined,
      fieldId: undefined,
      subfields: undefined,
      selectedCandidateId: undefined,
    };
    this.state.set({ ...cleared, ...partial });
  }

  showRecords() {
    this.setMode('records');
  }

  showCandidates(
    tag: string,
    fieldId: string,
    candidates: MarcCandidate[],
    selectedCandidateId: string,
  ) {
    this.setMode('candidates', {
      tag,
      fieldId,
      candidates,
      selectedCandidateId,
    });
  }

  confirmCandidate(candidateId: string) {
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

  showProvenance(title: string, steps: Step[], fieldId: string) {
    this.setMode('provenance', { title, steps, fieldId });
  }
}
