import { Step } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { StepKindLabelPipe } from '../../pipes/step-kind-label.pipe';

@Component({
  standalone: true,
  selector: 'app-provenance-timeline',
  imports: [CommonModule, StepKindLabelPipe],
  templateUrl: './provenance-timeline.component.html',
})
export class ProvenanceTimelineComponent {
  title = input.required<string>();
  steps = input.required<Step[]>();

  private cps = inject(ContextPanelService);

  onClose() {
    this.cps.showRecords();
  }
}
