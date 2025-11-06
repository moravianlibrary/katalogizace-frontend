import { Component, input } from '@angular/core';
import { ImgItem } from '../../../models/book';

@Component({
  standalone: true,
  selector: 'app-image-large-preview',
  templateUrl: './preview.component.html',
})
export class ImageLargePreviewComponent {
  item = input.required<ImgItem>();
}
