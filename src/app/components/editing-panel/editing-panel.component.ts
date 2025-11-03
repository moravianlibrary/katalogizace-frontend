import { JsonPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { BookResultResponse } from '../../models/book';

@Component({
  standalone: true,
  selector: 'app-editing-panel',
  imports: [JsonPipe],
  templateUrl: './editing-panel.component.html',
})
export class EditingPanelComponent {
  result = input<BookResultResponse | null>(null);
}
