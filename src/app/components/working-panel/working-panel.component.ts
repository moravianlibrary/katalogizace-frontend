import { Component, input } from '@angular/core';
import { ExistingMarcRecord } from '../../models/book';
import { MarcRecordsTabsComponent } from '../marc-records/marc-records.component';

@Component({
  standalone: true,
  selector: 'app-working-panel',
  imports: [MarcRecordsTabsComponent],
  templateUrl: './working-panel.component.html',
})
export class WorkingPanelComponent {
  existingRecords = input<ExistingMarcRecord[]>([]);
}
