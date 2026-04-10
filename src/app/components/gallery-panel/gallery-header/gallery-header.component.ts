import { Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-gallery-header',
  imports: [TranslateModule, IconComponent],
  templateUrl: './gallery-header.component.html',
})
export class GalleryHeaderComponent {
  private translate = inject(TranslateService);

  pageType = input<string | null>(null);
  pageIndex = input<number | null>(null);
  pageCount = input<number | null>(null);

  collapsed = input<boolean>(false);
  toggleCollapse = output<void>();

  orderLabel = computed(() => {
    const index = this.pageIndex();
    const count = this.pageCount();

    if (!index || !count) return null;

    return this.translate.instant('gallery.pageLabel', {
      index,
      count,
    });
  });

  onToggle() {
    this.toggleCollapse.emit();
  }
}
