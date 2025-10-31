import { Component, input } from '@angular/core';

@Component({
  selector: 'app-images-view',
  imports: [],
  templateUrl: './images-view.component.html',
})
export class ImagesViewComponent {
  bookId = input<string | null>(null);
}
