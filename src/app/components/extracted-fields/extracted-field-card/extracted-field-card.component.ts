import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiFieldWithMeta } from '../../../models/book';

@Component({
  standalone: true,
  selector: 'app-extracted-field-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './extracted-field-card.component.html',
})
export class ExtractedFieldCardComponent {
  field = input.required<UiFieldWithMeta>();

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

  onShowCandidates() {}
  onAddSubfield() {}
  onDeleteField() {}
}
