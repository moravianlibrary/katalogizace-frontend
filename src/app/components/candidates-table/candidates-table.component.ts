import {
  ExistingMarcRecord,
  MarcCandidate,
  MarcSubfield,
  UUID,
} from '@/app/models';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CatalogueService } from '../../services/api/catalogue.service';
import { WorkingPanelService } from '../../services/working-panel.service';
import { ExistingMarcRecordTableComponent } from '../marc-record-table/existing-marc-record-table/existing-marc-record-table.component';

@Component({
  standalone: true,
  selector: 'app-candidates-table',
  imports: [CommonModule, ExistingMarcRecordTableComponent],
  templateUrl: './candidates-table.component.html',
})
export class CandidatesTableComponent {
  private translate = inject(TranslateService);

  title = input.required<string>();
  candidates = input.required<MarcCandidate[]>();

  selectedCandidateId = input<UUID | null>(null);

  tag = input<string>();

  private wps = inject(WorkingPanelService);
  private catalogue = inject(CatalogueService);

  sortedCandidates = computed<MarcCandidate[]>(() => {
    const list = [...this.candidates()];
    const norm = (s?: number | null) =>
      Number.isFinite(s as number) ? (s as number) : -1;
    return list.sort((a, b) => norm(b.score) - norm(a.score));
  });

  selectedId = signal<UUID | null>(null);

  private autoSelectOnChange = effect(() => {
    const list = this.sortedCandidates();
    const preferred = this.selectedCandidateId();

    if (preferred) {
      this.selectedId.set(preferred);
    } else {
      this.selectedId.set(list[0]?.id ?? null);
    }
  });

  showAutPreview = computed(() => this.tag() === '100' || this.tag() === '700');

  selectedAutRecordId = computed<string | null>(() => {
    if (!this.showAutPreview()) return null;

    const id = this.selectedId();
    if (!id) return null;

    const cand = this.sortedCandidates().find((c) => c.id === id);
    const sfs = cand?.MARC_representation?.subfields ?? [];
    const sf7 = sfs.find((sf: MarcSubfield) => sf.code === '7')?.value?.trim();

    return sf7 && sf7.length > 0 ? sf7 : null;
  });

  autLoading = signal(false);
  autError = signal<string | null>(null);
  autRecord = signal<ExistingMarcRecord | null>(null);

  private getDocNumberFromRecord(
    rec: ExistingMarcRecord | null,
  ): string | null {
    if (!rec) return null;

    const f998 = rec.data_fields.find((f) => f.tag === '998');
    const sfA = f998?.subfields?.find((sf) => sf.code === 'a');
    const value = sfA?.value?.trim();

    return value ?? null;
  }

  catalogueUrl = computed<string | null>(() => {
    const rec = this.autRecord();
    const docNumber = this.getDocNumberFromRecord(rec);

    if (!docNumber) return null;

    return `https://aleph.nkp.cz/F/?func=direct&doc_number=${encodeURIComponent(
      docNumber,
    )}&local_base=AUT`;
  });

  private autCache = new Map<string, ExistingMarcRecord>();

  private autFetchEffect = effect(() => {
    const recordId = this.selectedAutRecordId();

    this.autError.set(null);
    this.autRecord.set(null);
    this.autLoading.set(false);

    if (!recordId) return;

    const cached = this.autCache.get(recordId);
    if (cached) {
      this.autRecord.set(cached);
      return;
    }

    this.autLoading.set(true);
    this.catalogue.getAutRecord(recordId).subscribe({
      next: (rec) => {
        this.autCache.set(recordId, rec);
        this.autRecord.set(rec);
        this.autLoading.set(false);
      },
      error: (err) => {
        console.error(err);

        this.autError.set(
          this.translate.instant('messages.error.aut_record_load'),
        );
        this.autLoading.set(false);
      },
    });
  });

  private readonly SCORE_CLASS: Record<number, string> = {
    0: 'bg-main-success-rate-0-10',
    10: 'bg-main-success-rate-10-20',
    20: 'bg-main-success-rate-20-30',
    30: 'bg-main-success-rate-30-40',
    40: 'bg-main-success-rate-40-50',
    50: 'bg-main-success-rate-50-60',
    60: 'bg-main-success-rate-60-70',
    70: 'bg-main-success-rate-70-80',
    80: 'bg-main-success-rate-80-90',
    90: 'bg-main-success-rate-90-100',
  };

  scoreClass(score?: number | null): string {
    const pct = Math.max(0, Math.min(100, Math.round((score ?? 0) * 100)));
    const bucket = pct === 100 ? 90 : Math.floor(pct / 10) * 10;
    return this.SCORE_CLASS[
      bucket as 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90
    ];
  }

  onRowClick(id: UUID) {
    this.selectedId.set(id);
  }

  onConfirm() {
    const id = this.selectedId();
    if (!id) return;
    this.wps.confirmCandidate(id);
  }

  onClose() {
    this.wps.showRecords();
  }
}
