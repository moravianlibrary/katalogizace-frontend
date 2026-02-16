import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs/operators';
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
  private translate = inject(TranslateService);

  state = computed(() => this.cps.state());
  private state$ = toObservable(this.state);

  title = toSignal(
    this.state$.pipe(
      switchMap((st) => {
        const tag = st.tag;

        switch (st.mode) {
          case 'provenance':
            return this.translate.stream('context_panel.provenance', { tag });
          case 'candidates':
            return this.translate.stream('context_panel.candidate_selection', {
              tag,
            });
          case 'edit':
            return this.translate.stream('context_panel.edit', { tag });
          default:
            return this.translate.stream('context_panel.records');
        }
      }),
    ),
    { initialValue: '' },
  );
}
