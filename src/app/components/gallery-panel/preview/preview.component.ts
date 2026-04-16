import { ImgItem } from '@/app/models';
import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [TranslateModule],
  selector: 'app-image-large-preview',
  templateUrl: './preview.component.html',
})
export class ImageLargePreviewComponent {
  item = input.required<ImgItem>();

  displayUrl = computed(() => this.item().fullUrl ?? this.item().thumbUrl);

  isLoading = computed(() => {
    const item = this.item();
    return item.fullLoading && !item.fullUrl && !item.thumbUrl;
  });

  errorMessage = computed(() => {
    const item = this.item();
    const hasDisplayUrl = !!(item.fullUrl ?? item.thumbUrl);
    if (hasDisplayUrl) return null;
    return item.fullError ?? item.thumbError;
  });
}
