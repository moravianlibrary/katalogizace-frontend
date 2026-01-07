import { Injectable, computed, inject, signal } from '@angular/core';
import { RecordStore } from '../stores/record.store';
import { SubDiffIndex, diffMarcRecordsSubfields } from '../utils/marc-diff';
import { RecordStateService } from './record-state.service';
import { WorkingPanelService } from './working-panel.service';

@Injectable()
export class MarcDiffService {
  private recordState = inject(RecordStateService);
  private wps = inject(WorkingPanelService);
  private store = inject(RecordStore);

  readonly enabledByUser = signal(false);

  toggle() {
    this.enabledByUser.update((v) => !v);
  }

  setEnabled(v: boolean) {
    this.enabledByUser.set(v);
  }

  private diffEnabled = computed(() => {
    if (!this.enabledByUser()) return false;

    const editingIsTable = this.recordState.viewMode() === 'table';
    const workingIsRecords = this.wps.state().mode === 'records';

    return editingIsTable && workingIsRecords;
  });

  readonly diffIndex = computed<SubDiffIndex | null>(() => {
    if (!this.diffEnabled()) return null;

    const opened = this.store.openedForDiff();
    const preview = this.recordState.recordPreview();

    if (!opened || !preview) return null;

    return diffMarcRecordsSubfields(opened, preview);
  });
}
