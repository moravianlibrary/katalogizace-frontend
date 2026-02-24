import { UUID } from '@/app/models';
import { RecordStateService } from '@/app/services/record-state.service';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { InputStaticAutocompleteComponent } from '@/app/components/input-static-autocomplete/input-static-autocomplete.component';
import { MarcTranslateService } from '@/app/services/marc-translate.service';

type SliceDef = {
  key: string;
  labelKey: string;
  start: number;
  end: number;
  len: number;
};

@Component({
  standalone: true,
  selector: 'app-field-008-editor',
  imports: [TranslateModule, InputStaticAutocompleteComponent],
  templateUrl: './field-008-editor.component.html',
})
export class Field008EditorComponent {
  private readonly rs = inject(RecordStateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly marcT = inject(MarcTranslateService);

  readonly typeOfDateItems = computed(() =>
    this.marcT.getMarcStaticValueItems('008.6'),
  );

  readonly placeItems = computed(() =>
    this.marcT.getMarcStaticValueItems('008.15-17'),
  );

  readonly langItems = computed(() =>
    this.marcT.getMarcStaticValueItems('008.35-37'),
  );

  private readonly segInputs =
    viewChildren<ElementRef<HTMLInputElement>>('segInput');

  fieldId = input.required<UUID>();

  readonly slices: SliceDef[] = [
    {
      key: 'dateEntered',
      labelKey: 'field_edit.008.date_entered',
      start: 0,
      end: 6,
      len: 6,
    },
    {
      key: 'typeOfDate',
      labelKey: 'field_edit.008.type_of_date',
      start: 6,
      end: 7,
      len: 1,
    },
    {
      key: 'date1',
      labelKey: 'field_edit.008.date1',
      start: 7,
      end: 11,
      len: 4,
    },
    {
      key: 'date2',
      labelKey: 'field_edit.008.date2',
      start: 11,
      end: 15,
      len: 4,
    },
    {
      key: 'place',
      labelKey: 'field_edit.008.place',
      start: 15,
      end: 18,
      len: 3,
    },
    {
      key: 'spec',
      labelKey: 'field_edit.008.spec',
      start: 18,
      end: 35,
      len: 17,
    },
    {
      key: 'lang',
      labelKey: 'field_edit.008.lang',
      start: 35,
      end: 38,
      len: 3,
    },
    {
      key: 'modified',
      labelKey: 'field_edit.008.modified',
      start: 38,
      end: 39,
      len: 1,
    },
    {
      key: 'catalogingSource',
      labelKey: 'field_edit.008.cataloging_source',
      start: 39,
      end: 40,
      len: 1,
    },
  ];

  readonly field = computed(() => {
    const rec = this.rs.editableRecord();
    if (!rec) return null;
    return rec.control_fields.find((f) => f.fieldId === this.fieldId()) ?? null;
  });

  readonly seg = signal<string[]>([]);
  private initialized = false;

  private lastValue = '';

  constructor() {
    effect(() => {
      const f = this.field();
      const v = f?.value ?? '';

      if (v === this.lastValue) return;
      this.lastValue = v;

      const next = this.slices.map((s) => v.slice(s.start, s.end) ?? '');
      this.seg.set(next);
      this.initialized = true;
    });

    this.destroyRef.onDestroy(() => {
      this.commitFixed40();
    });
  }

  getSeg(i: number): string {
    return this.seg()[i] ?? '';
  }

  setSeg(i: number, raw: string) {
    const s = this.slices[i];
    const v = (raw ?? '').slice(0, s.len);

    const next = [...this.seg()];
    next[i] = v;
    this.seg.set(next);

    const composed = this.composeFixed(next);

    this.lastValue = composed;

    this.rs.patchControlField(this.fieldId(), {
      value: composed,
    });
  }

  private composeFixed(segs: string[]): string {
    let out = '';
    for (let i = 0; i < this.slices.length; i++) {
      const s = this.slices[i];
      out += (segs[i] ?? '').slice(0, s.len).padEnd(s.len, ' ');
    }
    return out.slice(0, 40).padEnd(40, ' ');
  }

  private commitFixed40() {
    if (!this.initialized) return;
    const fixed = this.composeFixed(this.seg());
    this.lastValue = fixed;
    this.rs.patchControlField(this.fieldId(), { value: fixed });
  }

  clearSeg(i: number) {
    this.setSeg(i, '');
  }

  onSegInput(i: number, raw: string, evt: Event) {
    this.setSeg(i, raw);

    const ie = evt as InputEvent;
    const inputType = (ie as any)?.inputType as string | undefined;
    if (inputType && inputType.startsWith('delete')) return;

    const len = this.slices[i]?.len ?? 0;
    const v = (raw ?? '').slice(0, len);

    if (v.length < len) return;

    queueMicrotask(() => {
      const nextEl = this.segInputs()?.[i + 1]?.nativeElement;
      if (!nextEl) return;

      nextEl.focus();
      const l = nextEl.value?.length ?? 0;
      nextEl.setSelectionRange?.(l, l);
    });
  }
}
