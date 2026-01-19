import { Step } from '@/app/models';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { StepKindLabelPipe } from '../../pipes/step-kind-label.pipe';
import { WorkingPanelService } from '../../services/working-panel.service';

@Component({
  standalone: true,
  selector: 'app-provenance-timeline',
  imports: [CommonModule, StepKindLabelPipe],
  templateUrl: './provenance-timeline.component.html',
})
export class ProvenanceTimelineComponent {
  title = input.required<string>();
  steps = input.required<Step[]>();

  private wps = inject(WorkingPanelService);

  onClose() {
    this.wps.showRecords();
  }
}
