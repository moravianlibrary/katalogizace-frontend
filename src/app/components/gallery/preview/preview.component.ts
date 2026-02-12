import { ImgItem } from '@/app/models';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [TranslateModule],
  selector: 'app-image-large-preview',
  templateUrl: './preview.component.html',
})
export class ImageLargePreviewComponent {
  item = input.required<ImgItem>();
}
