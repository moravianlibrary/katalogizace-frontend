import { RecordStore } from '@/app/stores/record.store';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ContextPanelService } from '../../services/context-panel.service';
import { CandidatesTableComponent } from '../candidates-table/candidates-table.component';
import { MarcRecordsComponent } from '../marc-records/marc-records.component';
import { ProvenanceTimelineComponent } from '../provenance-timeline/provenance-timeline.component';
import { ContextEditComponent } from './context-edit/context-edit.component';
import { ContextPanelHeaderComponent } from './context-panel-header/context-panel-header.component';

@Component({
  standalone: true,
  selector: 'app-context-panel',
  imports: [
    MarcRecordsComponent,
    CandidatesTableComponent,
    ProvenanceTimelineComponent,
    ContextPanelHeaderComponent,
    ContextEditComponent,
    TranslateModule,
  ],
  templateUrl: './context-panel.component.html',
})
export class ContextPanelComponent {
  private cps = inject(ContextPanelService);
  private store = inject(RecordStore);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cps.reset();
    });
  }

  hasSingleRecord = computed(() => {
    const extracted = this.store.extracted();
    const existing = this.store.existingRecords();

    const count = (extracted ? 1 : 0) + existing.length;
    return count === 1;
  });

  state = computed(() => this.cps.state());

  titleKey = computed(() => {
    const st = this.state();

    switch (st.mode) {
      case 'provenance':
        return 'context_panel.provenance';

      case 'candidates':
      case 'candidates_edit':
        return 'context_panel.candidate_selection';

      case 'edit':
        return 'context_panel.edit';

      default:
        return this.hasSingleRecord()
          ? 'context_panel.extracted_record'
          : 'context_panel.records';
    }
  });

  titleParams = computed(() => {
    const st = this.state();
    return { tag: st.tag };
  });
}
