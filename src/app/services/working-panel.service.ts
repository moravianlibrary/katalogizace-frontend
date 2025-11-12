import { Injectable, signal } from '@angular/core';
import { MarcCandidate } from '../models/book';

export type PanelMode = 'records' | 'candidates' | 'provenance' | 'delete';

export interface PanelState {
  mode: PanelMode;
  tag?: string;
  title?: string;
  candidates?: MarcCandidate[];
  steps?: { kind: string; description: string }[];
  fieldId?: string;
  subfields?: { code: string; value: string }[];
}

@Injectable({ providedIn: 'root' })
export class WorkingPanelService {
  readonly state = signal<PanelState>({ mode: 'records' });

  setMode(mode: PanelMode, partial: Partial<PanelState> = {}) {
    const cleared: PanelState = {
      mode,
      tag: undefined,
      title: undefined,
      candidates: undefined,
      steps: undefined,
      fieldId: undefined,
      subfields: undefined,
    };
    this.state.set({ ...cleared, ...partial });
  }

  showRecords() {
    this.setMode('records');
  }

  showCandidates(tag: string, candidates: MarcCandidate[]) {
    this.setMode('candidates', {
      tag,
      candidates,
    });
  }
}
