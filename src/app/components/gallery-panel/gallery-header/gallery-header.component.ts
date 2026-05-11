import { Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '../../shared/icon/icon.component';

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

  canZoomOut = input<boolean>(false);
  canZoomIn = input<boolean>(true);
  canResetView = input<boolean>(false);

  zoomIn = output<void>();
  zoomOut = output<void>();
  rotateLeft = output<void>();
  resetView = output<void>();
  toggleFullscreen = output<void>();

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

  onZoomIn() {
    this.zoomIn.emit();
  }

  onZoomOut() {
    this.zoomOut.emit();
  }

  onRotateLeft() {
    this.rotateLeft.emit();
  }

  onResetView() {
    this.resetView.emit();
  }

  onToggleFullscreen() {
    this.toggleFullscreen.emit();
  }
}
