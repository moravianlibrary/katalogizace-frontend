import { ImgItem } from '@/app/models';
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-image-large-preview',
  templateUrl: './preview.component.html',
})
export class ImageLargePreviewComponent {
  item = input.required<ImgItem>();
}
