import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-user-batches-cell',
  templateUrl: './user-batches-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0 w-full',
  },
})
export class UserBatchesCellComponent implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  readonly groupNames = input.required<string[]>();
  readonly emptyLabel = input.required<string>();

  readonly visibleCount = signal(0);

  readonly visibleGroups = computed(() =>
    this.groupNames().slice(0, this.visibleCount()),
  );

  readonly hiddenCount = computed(() =>
    Math.max(0, this.groupNames().length - this.visibleCount()),
  );

  readonly title = computed(() => this.groupNames().join(', '));

  @ViewChild('container')
  private container?: ElementRef<HTMLElement>;

  @ViewChild('moreMeasure')
  private moreMeasure?: ElementRef<HTMLElement>;

  @ViewChildren('groupMeasure')
  private groupMeasureEls?: QueryList<ElementRef<HTMLElement>>;

  private resizeObserver?: ResizeObserver;
  private rafId: number | null = null;

  constructor() {
    effect(() => {
      this.groupNames();
      this.scheduleMeasure();
    });
  }

  ngAfterViewInit() {
    const container = this.container?.nativeElement;

    if (container) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
      this.resizeObserver.observe(container);
    }

    this.groupMeasureEls?.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scheduleMeasure());

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();

      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }
    });

    this.scheduleMeasure();
  }

  private scheduleMeasure() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.measure();
    });
  }

  private measure() {
    const container = this.container?.nativeElement;
    const groupEls = this.groupMeasureEls?.toArray() ?? [];
    const names = this.groupNames();

    if (!container || names.length === 0 || groupEls.length === 0) {
      this.visibleCount.set(0);
      return;
    }

    const availableWidth = container.clientWidth;

    if (availableWidth <= 0) {
      this.visibleCount.set(0);
      return;
    }

    const gap = this.readGap(container);
    const groupWidths = groupEls.map((el) => el.nativeElement.offsetWidth);
    const moreWidth = this.moreMeasure?.nativeElement.offsetWidth ?? 0;

    let usedWidth = 0;
    let count = 0;

    for (let i = 0; i < groupWidths.length; i++) {
      const groupWidth = groupWidths[i];
      const hasHiddenGroupsAfterThis = names.length - (i + 1) > 0;

      const widthWithGroup = usedWidth + (count > 0 ? gap : 0) + groupWidth;

      const widthWithMore = hasHiddenGroupsAfterThis
        ? widthWithGroup + gap + moreWidth
        : widthWithGroup;

      if (widthWithMore > availableWidth) {
        break;
      }

      usedWidth = widthWithGroup;
      count++;
    }

    this.visibleCount.set(count);
  }

  private readGap(container: HTMLElement): number {
    const style = getComputedStyle(container);
    const gap = Number.parseFloat(style.columnGap || style.gap || '0');

    return Number.isFinite(gap) ? gap : 0;
  }
}
