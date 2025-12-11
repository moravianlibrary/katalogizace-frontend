import { Component, inject } from '@angular/core';
import { RecordStateService } from '../../../services/record-state.service';
import { ExtractedFieldCardComponent } from '../extracted-field-card/extracted-field-card.component';

@Component({
  standalone: true,
  selector: 'app-extracted-fields',
  imports: [ExtractedFieldCardComponent],
  templateUrl: './extracted-fields.component.html',
})
export class ExtractedFieldsComponent {
  recordState = inject(RecordStateService);
}
