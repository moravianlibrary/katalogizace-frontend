import { SubDiffIndex } from '@/app/models';
import { ContextPanelService } from '@/app/services/context-panel.service';
import { FieldEditService } from '@/app/services/edit.service';
import { MarcDiffService } from '@/app/services/marc-diff.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { isDiffableTag015to830 } from '@/app/utils/marc-diff';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MarcRowControlComponent } from '../../marc-row/marc-row-control/marc-row-control.component';
import { MarcRowDataComponent } from '../../marc-row/marc-row-data/marc-row-data.component';
import { MarcRowLeaderComponent } from '../../marc-row/marc-row-leader/marc-row-leader.component';

import { computed, signal } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-editable-marc-record-table',
  imports: [
    MarcRowControlComponent,
    MarcRowDataComponent,
    MarcRowLeaderComponent,
    CommonModule,
  ],
  templateUrl: './editable-marc-record-table.component.html',
})
export class EditableMarcRecordTableComponent {
  cps = inject(ContextPanelService);
  edit = inject(FieldEditService);

  ds = inject(MarcDiffService);
  recordState = inject(RecordStateService);

  isDiffableTag015to830 = isDiffableTag015to830;

  diffIndex = input<SubDiffIndex | null>(null);
  diffSide = input<'opened' | 'preview'>('opened');

  readonly hoveredRowId = signal<string | null>(null);

  setHoveredRow(rowId: string | null) {
    this.hoveredRowId.set(rowId);
  }

  readonly visibleRowIds = computed<string[]>(() => {
    const record = this.recordState.editableRecord();
    if (!record) return [];

    const ids: string[] = [];

    if (record.leader) {
      ids.push('__leader');
    }

    for (const cf of record.control_fields ?? []) {
      ids.push(cf.fieldId);
    }

    for (const df of record.data_fields ?? []) {
      if (df.tag !== '910') {
        ids.push(df.fieldId);
      }
    }

    return ids;
  });

  private getRowIndex(rowId: string): number {
    return this.visibleRowIds().indexOf(rowId);
  }

  private isEvenVisualRow(rowId: string): boolean {
    const index = this.getRowIndex(rowId);
    return index % 2 === 0;
  }

  private isHovered(rowId: string): boolean {
    return this.hoveredRowId() === rowId;
  }

  // private isNeighborAbove(rowId: string): boolean {
  //   const hovered = this.hoveredRowId();
  //   if (!hovered) return false;

  //   return this.getRowIndex(rowId) === this.getRowIndex(hovered) - 1;
  // }

  // private isNeighborBelow(rowId: string): boolean {
  //   const hovered = this.hoveredRowId();
  //   if (!hovered) return false;

  //   return this.getRowIndex(rowId) === this.getRowIndex(hovered) + 1;
  // }

  getLeaderRowClasses(): string[] {
    const disabled =
      this.ds.enabledByUser() && this.recordState.viewMode() === 'table';

    return [
      ...this.baseRowClasses('__leader'),
      disabled ? 'opacity-60' : '',
    ].filter((cls): cls is string => Boolean(cls));
  }

  getControlRowClasses(fieldId: string, tag: string): string[] {
    const disabled =
      this.ds.enabledByUser() &&
      !this.isDiffableTag015to830(tag) &&
      this.recordState.viewMode() === 'table';

    return [
      ...this.baseRowClasses(fieldId),
      disabled ? 'opacity-60' : '',
    ].filter((cls): cls is string => Boolean(cls));
  }

  getDataRowClasses(fieldId: string, tag: string): string[] {
    const disabled =
      this.ds.enabledByUser() &&
      !this.isDiffableTag015to830(tag) &&
      this.recordState.viewMode() === 'table';

    return [
      ...this.baseRowClasses(fieldId),
      disabled ? 'opacity-60' : '',
    ].filter((cls): cls is string => Boolean(cls));
  }

  // private isGrayVisualRow(rowId: string): boolean {
  //   return this.getRowIndex(rowId) % 2 === 0;
  // }

  private isWhiteVisualRow(rowId: string): boolean {
    return !this.isGrayVisualRow(rowId);
  }

  //og
  // private baseRowClasses(rowId: string): string[] {
  //   return [
  //     this.isEvenVisualRow(rowId) ? 'bg-gray-500/5' : 'bg-main-base',
  //     this.isHovered(rowId) ? 'marc-row-hovered relative z-10' : '',
  //     this.isNeighborAbove(rowId) ? 'marc-row-neighbor-above' : '',
  //     this.isNeighborBelow(rowId) ? 'marc-row-neighbor-below' : '',
  //   ].filter((cls): cls is string => Boolean(cls));
  // }

  isActiveRow(rowId: string): boolean {
    return this.recordState.selectedField()?.fieldId === rowId;
  }

  private getFocusRowId(): string | null {
    return (
      this.hoveredRowId() ?? this.recordState.selectedField()?.fieldId ?? null
    );
  }

  private isNeighborAbove(rowId: string): boolean {
    const focused = this.getFocusRowId();
    if (!focused) return false;

    return this.getRowIndex(rowId) === this.getRowIndex(focused) - 1;
  }

  private isNeighborBelow(rowId: string): boolean {
    const focused = this.getFocusRowId();
    if (!focused) return false;

    return this.getRowIndex(rowId) === this.getRowIndex(focused) + 1;
  }

  // private baseRowClasses(rowId: string): string[] {
  //   return [
  //     this.isHovered(rowId) ? 'marc-row-hovered relative z-10' : '',
  //     this.isActiveRow(rowId) ? 'marc-row-active relative z-20' : '',
  //     this.isNeighborAbove(rowId) ? 'marc-row-neighbor-above' : '',
  //     this.isNeighborBelow(rowId) ? 'marc-row-neighbor-below' : '',
  //   ].filter((cls): cls is string => Boolean(cls));
  // }

  private isGrayVisualRow(rowId: string): boolean {
    return this.getRowIndex(rowId) % 2 === 0;
  }

  private baseRowClasses(rowId: string): string[] {
    return [
      this.isGrayVisualRow(rowId) ? 'bg-gray-500/5' : 'bg-main-base',
      this.isHovered(rowId) ? 'marc-row-hovered relative z-10' : '',
      this.isActiveRow(rowId) ? 'marc-row-active relative z-20' : '',
      this.isNeighborAbove(rowId) ? 'marc-row-neighbor-above' : '',
      this.isNeighborBelow(rowId) ? 'marc-row-neighbor-below' : '',
    ].filter((cls): cls is string => Boolean(cls));
  }
}
