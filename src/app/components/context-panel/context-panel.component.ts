import { Component, computed, inject } from '@angular/core';
import { ContextPanelService } from '../../services/context-panel.service';
import { CandidatesTableComponent } from '../candidates-table/candidates-table.component';
import { MarcRecordsComponent } from '../marc-records/marc-records.component';
import { ProvenanceTimelineComponent } from '../provenance-timeline/provenance-timeline.component';

@Component({
  standalone: true,
  selector: 'app-context-panel',
  imports: [
    MarcRecordsComponent,
    CandidatesTableComponent,
    ProvenanceTimelineComponent,
  ],
  templateUrl: './context-panel.component.html',
})
export class ContextPanelComponent {
  private cps = inject(ContextPanelService);

  state = computed(() => this.cps.state());
}
