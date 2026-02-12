import { ID, ImgItem } from '@/app/models';
import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';

type ThumbsMode = 'horizontal' | 'vertical';

@Component({
  standalone: true,
  selector: 'app-image-thumbnails',
  templateUrl: './thumbnails.component.html',
  imports: [CommonModule],
})
export class ImageThumbnailsComponent {
  items = input.required<ImgItem[]>();
  selectedId = input<ID | null>(null);
  mode = input<ThumbsMode>('horizontal');

  select = output<ID>();
  canScrollRight = signal(false);
  canScrollDown = signal(false);

  @ViewChild('scroller', { static: false })
  scroller?: ElementRef<HTMLElement>;

  @HostListener('window:resize')
  onResize() {
    this.scheduleRecalc();
  }

  constructor() {
    effect(() => {
      this.items();
      this.mode();
      this.scheduleRecalc();
    });
  }

  ngAfterViewInit() {
    this.scheduleRecalc();
  }

  onScroll() {
    this.scheduleRecalc();
  }

  private recalc() {
    const el = this.scroller?.nativeElement;
    if (!el) {
      this.canScrollRight.set(false);
      this.canScrollDown.set(false);
      return;
    }

    if (this.mode() === 'horizontal') {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const atRight = el.scrollLeft >= maxScrollLeft - 1;
      this.canScrollRight.set(maxScrollLeft > 0 && !atRight);
      this.canScrollDown.set(false);
      return;
    }

    const maxScrollTop = el.scrollHeight - el.clientHeight;
    const atBottom = el.scrollTop >= maxScrollTop - 1;
    this.canScrollDown.set(maxScrollTop > 0 && !atBottom);
    this.canScrollRight.set(false);
  }

  private scheduled = false;

  private scheduleRecalc() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.scheduled = false;
        this.recalc();
      });
    });
  }

  onPick(id: ID) {
    this.select.emit(id);
  }
}
