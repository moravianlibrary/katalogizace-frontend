import { ExistingMarcRecord, MarcRecordsItem } from '@/app/models';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ContextPanelService } from '../../services/context-panel.service';
import { MarcDiffService } from '../../services/marc-diff.service';
import { RecordStateService } from '../../services/record-state.service';
import { RecordStore } from '../../stores/record.store';
import { extractedToExisting } from '../../utils/marc-transform';
import { ExistingMarcRecordTableComponent } from '../marc-record-table/existing-marc-record-table/existing-marc-record-table.component';
import { ExtractedMarcRecordTableComponent } from '../marc-record-table/extracted-marc-record-table/extracted-marc-record-table.component';

@Component({
  standalone: true,
  selector: 'app-marc-records',
  imports: [
    ExistingMarcRecordTableComponent,
    CommonModule,
    ExtractedMarcRecordTableComponent,
    TranslateModule,
  ],
  templateUrl: './marc-records.component.html',
})
export class MarcRecordsComponent {
  store = inject(RecordStore);
  private recordState = inject(RecordStateService);

  private cps = inject(ContextPanelService);

  existingRecords = this.store.existingRecords;
  extractedRecord = this.store.extracted;

  transformed = computed(() => {
    return extractedToExisting(this.extractedRecord());
  });

  diff = inject(MarcDiffService);
  diffIndex = this.diff.diffIndex;

  records = computed<MarcRecordsItem[]>(() => {
    const list: MarcRecordsItem[] = [];
    const extracted = this.extractedRecord();

    if (extracted) {
      list.push({
        extracted: extracted,
        existing: null,
      });
    }

    for (const rec of this.existingRecords()) {
      list.push({
        extracted: null,
        existing: rec,
      });
    }

    return list;
  });

  expandedIndex = signal<number | null>(0);

  private lastAppliedKey: string | null = null;

  private hostEl = inject(ElementRef<HTMLElement>);

  private ro: ResizeObserver | null = null;

  private hostHeightPx = signal<number>(0);
  detailMaxHeightPx = computed(() => Math.floor(this.hostHeightPx() * 0.7));

  ngAfterViewInit(): void {
    const el = this.hostEl.nativeElement;

    const update = () => {
      this.hostHeightPx.set(el.getBoundingClientRect().height || 0);
    };

    update();

    this.ro = new ResizeObserver(() => update());
    this.ro.observe(el);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.ro = null;
  }

  constructor() {
    effect(() => {
      const idx = this.expandedIndex();
      const list = this.records();

      if (idx == null || !list[idx]) {
        this.store.setOpenedExisting(null);
        this.store.setOpenedExtracted(null);
        return;
      }

      const item = list[idx];
      if (item.existing) {
        this.store.setOpenedExisting(item.existing);
        return;
      }

      if (item.extracted) {
        this.store.setOpenedExtracted(item.extracted);
        return;
      }

      this.store.setOpenedExisting(null);
      this.store.setOpenedExtracted(null);
    });

    effect(() => {
      const evt = this.cps.applyCandidate();
      if (!evt) return;

      const key = `${evt.fieldId}:${evt.candidate.id}`;
      if (this.lastAppliedKey === key) return;
      this.lastAppliedKey = key;

      this.recordState.applyCandidateToField({
        fieldId: evt.fieldId,
        candidate: evt.candidate,
      });

      this.store.applyCandidateToOpenedExtracted(evt.fieldId, evt.candidate);

      this.cps.applyCandidate.set(null);
    });
  }

  toggleRow(index: number) {
    this.expandedIndex.update((current) => (current === index ? null : index));
  }

  getTitle(idx: number, rec?: ExistingMarcRecord | null): string | null {
    if (idx === 0) {
      return this.store.title();
    }

    if (!rec) {
      return null;
    }

    const f245 = rec.data_fields?.find((f) => f.tag === '245');
    if (!f245) return '';
    return f245.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getAuthorName(idx: number, rec?: ExistingMarcRecord | null): string | null {
    if (idx === 0) {
      return this.store.author();
    }

    if (!rec) {
      return null;
    }

    const f100 = rec.data_fields?.find((f) => f.tag === '100');
    if (!f100) return '';
    return f100.subfields?.find((sf) => sf.code === 'a')?.value ?? '';
  }

  getPublicationYear(
    idx: number,
    rec?: ExistingMarcRecord | null,
  ): string | null {
    if (idx === 0) {
      const year = this.store.yearOfPublication();
      return year ? year.toString() : null;
    }

    if (!rec) {
      return null;
    }

    const f264 = rec.data_fields?.find((f) => f.tag === '264');
    if (f264) {
      const sf264 = f264.subfields?.find((sf) => sf.code === 'c')?.value ?? '';
      if (sf264 !== '') {
        return sf264;
      }
    }

    const f260 = rec.data_fields?.find((f) => f.tag === '260');
    if (f260) {
      const sf260 = f260.subfields?.find((sf) => sf.code === 'c')?.value ?? '';
      if (sf260 !== '') {
        return sf260;
      }
    }

    return '';
  }
}
