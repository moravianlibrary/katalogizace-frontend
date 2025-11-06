import { Component, input } from '@angular/core';
import { ExistingMarcRecord, ExtractedMarcRecord } from '../../models/book';
import { MarcRecordsComponent } from '../marc-records/marc-records.component';

@Component({
  standalone: true,
  selector: 'app-working-panel',
  imports: [MarcRecordsComponent],
  templateUrl: './working-panel.component.html',
})
export class WorkingPanelComponent {
  existingRecords = input<ExistingMarcRecord[]>([]);
  extractedRecord = input<ExtractedMarcRecord | null>(null);
}
