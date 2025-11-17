import { Component, input } from '@angular/core';
import { Step, UiFieldWithMeta } from '../../../models/book';
import { ExtractedFieldCardComponent } from '../extracted-field-card/extracted-field-card.component';

@Component({
  standalone: true,
  selector: 'app-extracted-fields',
  imports: [ExtractedFieldCardComponent],
  templateUrl: './extracted-fields.component.html',
})
export class ExtractedFieldsComponent {
  provenance = input<Record<string, Step[]>>({});
  fields = input.required<UiFieldWithMeta[]>();
}
