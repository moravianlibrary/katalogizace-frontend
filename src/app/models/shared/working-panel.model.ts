import { MarcCandidate } from '../books/marc.dto';
import { Step } from '../books/provenance.dto';

export type PanelMode = 'records' | 'candidates' | 'provenance' | 'delete';

export interface PanelState {
  mode: PanelMode;
  tag?: string;
  title?: string;
  candidates?: MarcCandidate[];
  steps?: Step[];
  fieldId?: string;
  subfields?: { code: string; value: string }[];
  selectedCandidateId?: string;
}

export type ApplyCandidateEvent = {
  fieldId: string;
  tag: string;
  candidate: MarcCandidate;
};
