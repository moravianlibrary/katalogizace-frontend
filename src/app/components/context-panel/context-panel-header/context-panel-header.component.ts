import { ContextPanelService } from '@/app/services/context-panel.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { RecordStore } from '@/app/stores/record.store';
import { filterExistingRecord015to830 } from '@/app/utils/marc-filter';
import { NgClass } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-context-panel-header',
  imports: [TranslateModule, NgClass],
  templateUrl: './context-panel-header.component.html',
})
export class ContextPanelHeaderComponent {
  private recordState = inject(RecordStateService);
  private translate = inject(TranslateService);
  cps = inject(ContextPanelService);
  diff = inject(MarcDiffService);
  private store = inject(RecordStore);

  headerTitle = input.required<string>();

  toggleDisabled = computed(() => false);

  diffEnabled = this.diff.enabledByUser;
  viewMode = this.recordState.viewMode;

  showDiffToggle = computed(() => {
    return this.viewMode() === 'table' && this.cps.state().mode === 'records';
  });

  canTakeRecord = computed(() => !!this.store.openedForDiff());

  canResetRecord = computed(() => !!this.store.extracted());

  onBack() {
    this.cps.setMode('records');
  }

  onCandidateConfirm() {
    const id = this.cps.state().selectedCandidateId;
    if (!id) return;
    this.cps.confirmCandidate(id);
  }

  onReset() {
    this.recordState.loadFromExtracted(this.store.extracted());
  }

  onTakeRecord() {
    const opened = this.store.openedForDiff();
    if (!opened) return;

    const isExtractedOpened = !!this.store.openedExtractedWithMeta();
    const rec = isExtractedOpened
      ? opened
      : filterExistingRecord015to830(opened);

    this.recordState.loadFromExistingOrLastEdited(rec);
  }

  setEdit() {
    this.cps.setMode('edit');
  }
}
