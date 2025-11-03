import { JsonPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { BookResultResponse } from '../../models/book';
import { NavigationButtonsComponent } from '../navigation-buttons/navigation-buttons.component';

@Component({
  standalone: true,
  selector: 'app-editing-panel',
  imports: [JsonPipe, NavigationButtonsComponent],
  templateUrl: './editing-panel.component.html',
})
export class EditingPanelComponent {
  result = input<BookResultResponse | null>(null);
}
