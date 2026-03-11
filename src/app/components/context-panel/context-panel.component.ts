import { RecordStore } from '@/app/stores/record.store';
import { Component, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
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
  ],
  templateUrl: './context-panel.component.html',
})
export class ContextPanelComponent {
  private cps = inject(ContextPanelService);
  private translate = inject(TranslateService);
  private store = inject(RecordStore);

  hasSingleRecord = computed(() => {
    const extracted = this.store.extracted();
    const existing = this.store.existingRecords();

    const count = (extracted ? 1 : 0) + existing.length;
    return count === 1;
  });

  state = computed(() => this.cps.state());

  title = computed(() => {
    const st = this.state();
    const tag = st.tag;

    switch (st.mode) {
      case 'provenance':
        return this.translate.instant('context_panel.provenance', { tag });

      case 'candidates':
        return this.translate.instant('context_panel.candidate_selection', {
          tag,
        });

      case 'candidates_edit':
        return this.translate.instant('context_panel.candidate_selection', {
          tag,
        });

      case 'edit':
        return this.translate.instant('context_panel.edit', { tag });

      default:
        return this.translate.instant(
          this.hasSingleRecord()
            ? 'context_panel.extracted_record'
            : 'context_panel.records',
        );
    }
  });
}
