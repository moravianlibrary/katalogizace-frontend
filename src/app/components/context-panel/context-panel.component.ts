import { Component, computed, inject } from '@angular/core';
import { ContextPanelService } from '../../services/context-panel.service';
import { CandidatesTableComponent } from '../candidates-table/candidates-table.component';
import { MarcRecordsComponent } from '../marc-records/marc-records.component';
import { ProvenanceTimelineComponent } from '../provenance-timeline/provenance-timeline.component';
import { ContextPanelHeaderComponent } from './context-panel-header/context-panel-header.component';

@Component({
  standalone: true,
  selector: 'app-context-panel',
  imports: [
    MarcRecordsComponent,
    CandidatesTableComponent,
    ProvenanceTimelineComponent,
    ContextPanelHeaderComponent,
  ],
  templateUrl: './context-panel.component.html',
})
export class ContextPanelComponent {
  private cps = inject(ContextPanelService);

  state = computed(() => this.cps.state());
}
