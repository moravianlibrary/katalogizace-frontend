import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ExtractedMarcRecord, UiFieldWithMeta } from '../../../models/book';
import { extractedToUiFields } from '../../../utils/marc-transform';
import { ExtractedFieldCardComponent } from '../extracted-field-card/extracted-field-card.component';

@Component({
  standalone: true,
  selector: 'app-extracted-fields',
  imports: [CommonModule, ExtractedFieldCardComponent],
  templateUrl: './extracted-fields.component.html',
})
export class ExtractedFieldsComponent {
  extracted = input<ExtractedMarcRecord | null>(null);

  fields = computed<UiFieldWithMeta[]>(() => {
    const src = this.extracted();
    if (!src) return [];
    // ! zatial bez special fields
    return extractedToUiFields(src, false);
  });
}
