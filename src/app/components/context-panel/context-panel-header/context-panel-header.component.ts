import { ContextPanelService } from '@/app/services/context-panel.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, computed, inject } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-context-panel-header',
  imports: [],
  templateUrl: './context-panel-header.component.html',
})
export class ContextPanelHeaderComponent {
  private recordState = inject(RecordStateService);
  private cps = inject(ContextPanelService);
  diff = inject(MarcDiffService);

  diffEnabled = this.diff.enabledByUser;
  viewMode = this.recordState.viewMode;

  showDiffToggle = computed(() => {
    return this.viewMode() === 'table' && this.cps.state().mode === 'records';
  });
}
