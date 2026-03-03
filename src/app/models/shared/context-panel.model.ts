import { MarcCandidate } from '../books/marc.dto';
import { Step } from '../books/provenance.dto';
import { UUID } from './id.model';

export type PanelMode =
  | 'records'
  | 'candidates'
  | 'provenance'
  | 'edit'
  | 'candidates_edit';

export interface PanelState {
  mode: PanelMode;
  tag?: string;
  title?: string;
  candidates?: MarcCandidate[];
  steps?: Step[];
  fieldId?: UUID;
  subfields?: { code: string; value: string }[];
  selectedCandidateId?: UUID;
}

export type ApplyCandidateEvent = {
  fieldId: UUID;
  tag: string;
  candidate: MarcCandidate;
};
