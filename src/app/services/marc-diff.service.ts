import { Injectable, computed, inject, signal } from '@angular/core';
import { RecordStore } from '../stores/record.store';
import { DiffIndex, diffMarcRecords } from '../utils/marc-diff';
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

  readonly diffIndex = computed<DiffIndex | null>(() => {
    if (!this.diffEnabled()) return null;

    const opened = this.store.openedRecord();
    const preview = this.recordState.recordPreview();

    if (!opened || !preview) return null;

    return diffMarcRecords(opened, preview);
  });
}
