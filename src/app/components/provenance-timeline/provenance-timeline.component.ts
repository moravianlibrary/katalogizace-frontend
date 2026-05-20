import { Step } from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { StepKindLabelPipe } from '../../pipes/step-kind-label.pipe';

@Component({
  standalone: true,
  selector: 'app-provenance-timeline',
  imports: [CommonModule, StepKindLabelPipe, TranslateModule],
  templateUrl: './provenance-timeline.component.html',
})
export class ProvenanceTimelineComponent {
  steps = input.required<Step[]>();
}
