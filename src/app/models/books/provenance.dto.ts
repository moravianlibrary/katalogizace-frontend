import { UUID } from '../shared/id.model';
import { StepKind } from '../shared/states.model';

export interface Step {
  kind: StepKind;
  description: string;
}

export interface CandidateProvenanceResponseDto {
  book_id: UUID;
  candidate_id: UUID;
  provenance: Step[];
}
