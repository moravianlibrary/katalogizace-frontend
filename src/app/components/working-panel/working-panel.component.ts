import { Component, computed, inject, input } from '@angular/core';
import { ExistingMarcRecord, ExtractedMarcRecord } from '../../models/book';
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

  existingRecords = input<ExistingMarcRecord[]>([]);
  extractedRecord = input<ExtractedMarcRecord | null>(null);

  state = computed(() => this.wps.state());
}
