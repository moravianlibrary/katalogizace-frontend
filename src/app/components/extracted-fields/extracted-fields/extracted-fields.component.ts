import { Component, computed, effect, inject, input } from '@angular/core';
import {
  ExtractedMarcRecord,
  LastEditedRecord,
  Step,
  UiFieldWithMeta,
} from '../../../models/book';
import { RecordStateService } from '../../../services/record-state.service';
import { ExtractedFieldCardComponent } from '../extracted-field-card/extracted-field-card.component';

@Component({
  standalone: true,
  selector: 'app-extracted-fields',
  imports: [ExtractedFieldCardComponent],
  templateUrl: './extracted-fields.component.html',
})
export class ExtractedFieldsComponent {
  extracted = input<ExtractedMarcRecord | null>(null);
  lastEdited = input<LastEditedRecord | null>(null);
  provenance = input<Record<string, Step[]>>({});

  private recordState = inject(RecordStateService);

  fields = computed<UiFieldWithMeta[]>(() => this.recordState.uiFields());

  private _ = effect(() => {
    this.recordState.loadFromExtractedAndLast(
      this.extracted(),
      this.lastEdited(),
    );
  });
}
