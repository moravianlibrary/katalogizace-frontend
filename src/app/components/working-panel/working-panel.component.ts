import { Component, computed, inject } from '@angular/core';
import { WorkingPanelService } from '../../services/working-panel.service';
import { CandidatesTableComponent } from '../candidates-table/candidates-table.component';
import { MarcRecordsComponent } from '../marc-records/marc-records.component';
import { ProvenanceTimelineComponent } from '../provenance-timeline/provenance-timeline.component';

@Component({
  standalone: true,
  selector: 'app-working-panel',
  imports: [
    MarcRecordsComponent,
    CandidatesTableComponent,
    ProvenanceTimelineComponent,
  ],
  templateUrl: './working-panel.component.html',
})
export class WorkingPanelComponent {
  private wps = inject(WorkingPanelService);

  state = computed(() => this.wps.state());
}
