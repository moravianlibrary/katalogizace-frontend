import { ID } from '@/app/models';
import { RecordStore } from '@/app/stores/record.store';
import { Component, computed, DestroyRef, inject, input } from '@angular/core';
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
  private readonly cps = inject(ContextPanelService);
  private readonly store = inject(RecordStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly bookId = input<ID | null>(null);
  readonly canWrite = input<boolean>(false);

  protected readonly hasSingleRecord = computed(() => {
    const extracted = this.store.extracted();
    const existing = this.store.existingRecords();

    const count = (extracted ? 1 : 0) + existing.length;
    return count === 1;
  });

  protected readonly state = computed(() => this.cps.state());

  protected readonly titleKey = computed(() => {
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
        return 'context_panel.records';
    }
  });

  protected readonly titleParams = computed(() => {
    const st = this.state();
    return { tag: st.tag };
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cps.reset();
    });
  }
}
