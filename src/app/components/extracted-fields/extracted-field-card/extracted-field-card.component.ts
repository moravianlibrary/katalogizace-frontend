import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MarcSubfield,
  UiFieldWithMeta,
  UiSubfield,
} from '../../../models/book';
import { RecordStateService } from '../../../services/record-state.service';
import { WorkingPanelService } from '../../../services/working-panel.service';

@Component({
  standalone: true,
  selector: 'app-extracted-field-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './extracted-field-card.component.html',
})
export class ExtractedFieldCardComponent {
  wps = inject(WorkingPanelService);
  recordState = inject(RecordStateService);

  field = input.required<UiFieldWithMeta>();

  private lastAppliedCandidateId: string | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  private applyFx = effect(() => {
    const evt = this.wps.applyCandidate();
    if (!evt) return;

    const f = this.field();
    if (evt.fieldId !== f.fieldId) return;

    if (this.lastAppliedCandidateId === evt.candidate.id) return;

    const rep = evt.candidate.MARC_representation;
    f.ind1 = rep.ind1 ?? '';
    f.ind2 = rep.ind2 ?? '';
    f.subfields = rep.subfields ?? [];

    this.lastAppliedCandidateId = evt.candidate.id;

    this.notifyChange();
  });

  notifyChange() {
    this.recordState.touch();
  }

  onAddSubfield() {
    const f = this.field();
    if (!f.subfields) {
      f.subfields = [];
    }

    const sf = { code: '', value: '', isManual: true };
    f.subfields.push(sf);
    this.notifyChange();

    this.focusNewSubfieldCode();
  }

  onDeleteField() {
    this.recordState.removeField(this.field().fieldId);
  }

  isCodeEditable(sf: UiSubfield): boolean {
    return !!sf.isManual;
  }

  hasCodeCollision(sf: UiSubfield, f: UiFieldWithMeta): boolean {
    if (
      (f.tag === '100' || f.tag === '700') &&
      (sf.code === 'a' || sf.code === 'd')
    ) {
      const subfields = f.subfields ?? [];
      let count = 0;
      for (const other of subfields) {
        if ((other.code ?? '').trim() === sf.code) {
          count++;
        }
      }
      return count > 1;
    }
    return false;
  }

  get isActive() {
    return (
      this.wps.state().mode !== 'records' &&
      this.wps.state().fieldId === this.field().fieldId
    );
  }

  isValueDisabled(sf: MarcSubfield, f: UiFieldWithMeta) {
    return (
      sf.code === '7' &&
      (f.tag === '100' ||
        f.tag === '700' ||
        f.tag === '600' ||
        f.tag === '650' ||
        f.tag === '655')
    );
  }

  onInputAutoAdvance(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const max = input.maxLength;
    if (max > 0 && input.value.length >= max) {
      this.focusNextEditableInput(input);
    }
  }

  private focusNextEditableInput(current: HTMLInputElement): void {
    const all = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLInputElement>(
        'input[data-editable="true"]',
      ),
    );

    const idx = all.indexOf(current);
    if (idx === -1) return;

    const next = all[idx + 1];
    if (next && !next.disabled) {
      next.focus();
      const len = next.value.length;
      try {
        next.setSelectionRange(len, len);
      } catch {
        // ignore selection errors
      }
    }
  }

  private focusNewSubfieldCode(): void {
    setTimeout(() => {
      const codes = this.host.nativeElement.querySelectorAll<HTMLInputElement>(
        'input[data-role="subfield-code"][data-editable="true"]',
      );
      const last = codes[codes.length - 1];
      if (last) {
        last.focus();
        last.select();
      }
    });
  }

  onEnterSubfieldValue(index: number, event: Event): void {
    const e = event as KeyboardEvent;
    const f = this.field();
    const subfields = f.subfields ?? [];

    if (!(index === subfields.length - 1)) {
      return;
    }

    e.preventDefault();
    this.onAddSubfield();
  }
}
