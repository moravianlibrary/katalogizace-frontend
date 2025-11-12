import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MarcCandidate } from '../../models/book';
import { WorkingPanelService } from '../../services/working-panel.service';

@Component({
  standalone: true,
  selector: 'app-candidates-table',
  imports: [CommonModule],
  templateUrl: './candidates-table.component.html',
})
export class CandidatesTableComponent {
  title = input.required<string>();
  candidates = input.required<MarcCandidate[]>();

  selectedCandidateId = input<string | null>(null);

  private wps = inject(WorkingPanelService);

  sortedCandidates = computed<MarcCandidate[]>(() => {
    const list = [...this.candidates()];
    const norm = (s?: number | null) =>
      Number.isFinite(s as number) ? (s as number) : -1;
    return list.sort((a, b) => norm(b.score) - norm(a.score));
  });

  selectedId = signal<string | null>(null);

  private autoSelectOnChange = effect(() => {
    const list = this.sortedCandidates();
    const preferred = this.selectedCandidateId();

    if (preferred) {
      this.selectedId.set(preferred);
    } else {
      this.selectedId.set(list[0]?.id ?? null);
    }
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

  onRowClick(id: string) {
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
