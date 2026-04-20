import { ImgItem } from '@/app/models';
import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [TranslateModule],
  selector: 'app-image-large-preview',
  templateUrl: './preview.component.html',
})
export class ImageLargePreviewComponent {
  item = input.required<ImgItem>();

  scale = input<number>(1);
  rotation = input<0 | 90 | 180 | 270>(0);
  rawRotation = input<number>(0);
  panX = input<number>(0);
  panY = input<number>(0);

  minScale = input<number>(1);
  maxScale = input<number>(8);
  scaleStep = input<number>(0.5);

  panChange = output<{ x: number; y: number }>();
  viewChange = output<{ scale: number; x: number; y: number }>();

  private viewportEl = viewChild<ElementRef<HTMLDivElement>>('viewportEl');
  private imageEl = viewChild<ElementRef<HTMLImageElement>>('imageEl');

  private dragging = signal(false);
  private dragStartClient = signal<{ x: number; y: number } | null>(null);
  private dragStartPan = signal<{ x: number; y: number } | null>(null);

  private rotationFitScaleSig = signal(1);
  private suppressTransitions = signal(false);

  private enableTransitionsRaf1 = 0;
  private enableTransitionsRaf2 = 0;

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

  rotationFitScale = computed(() => this.rotationFitScaleSig());
  totalScale = computed(() => this.scale() * this.rotationFitScale());

  outerTransform = computed(() => {
    return `translate(-50%, -50%) translate(${this.panX()}px, ${this.panY()}px) scale(${this.totalScale()})`;
  });

  innerTransform = computed(() => {
    return `rotate(${this.rawRotation()}deg)`;
  });

  outerTransitionStyle = computed(() => {
    if (this.dragging() || this.suppressTransitions()) return 'none';
    return 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)';
  });

  innerTransitionStyle = computed(() => {
    if (this.suppressTransitions()) return 'none';
    return 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)';
  });

  cursor = computed(() => {
    if (this.scale() <= 1) return 'default';
    return this.dragging() ? 'grabbing' : 'grab';
  });

  constructor() {
    effect(() => {
      this.displayUrl();
      this.scale();
      this.rotation();
      this.panX();
      this.panY();

      queueMicrotask(() => {
        this.recomputeRotationFitScale();
        this.emitClampedPanIfNeeded();
      });
    });

    effect(() => {
      this.item().id;
      this.displayUrl();

      this.cancelEnableTransitions();
      this.suppressTransitions.set(true);
    });
  }

  ngOnDestroy() {
    this.cancelEnableTransitions();
  }

  private cancelEnableTransitions() {
    if (this.enableTransitionsRaf1) {
      cancelAnimationFrame(this.enableTransitionsRaf1);
      this.enableTransitionsRaf1 = 0;
    }

    if (this.enableTransitionsRaf2) {
      cancelAnimationFrame(this.enableTransitionsRaf2);
      this.enableTransitionsRaf2 = 0;
    }
  }

  private scheduleEnableTransitions() {
    this.cancelEnableTransitions();

    this.enableTransitionsRaf1 = requestAnimationFrame(() => {
      this.enableTransitionsRaf2 = requestAnimationFrame(() => {
        this.suppressTransitions.set(false);
        this.enableTransitionsRaf1 = 0;
        this.enableTransitionsRaf2 = 0;
      });
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.recomputeRotationFitScale();
    this.emitClampedPanIfNeeded();
  }

  onImageLoad() {
    this.suppressTransitions.set(true);

    this.recomputeRotationFitScale();
    this.emitClampedPanIfNeeded();

    this.scheduleEnableTransitions();
  }

  onWheel(event: WheelEvent) {
    if (!this.displayUrl()) return;
    event.preventDefault();

    const point = this.getViewportPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    const delta = event.deltaY < 0 ? this.scaleStep() : -this.scaleStep();
    const nextScale = this.clampScale(this.scale() + delta);

    this.emitZoomAroundPoint(nextScale, point);
  }

  onDoubleClick(event: MouseEvent) {
    const point = this.getViewportPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    const nextScale = this.scale() > 1 ? this.minScale() : 2;
    this.emitZoomAroundPoint(nextScale, point);
  }

  onPointerDown(event: PointerEvent) {
    if (this.scale() <= 1) return;

    this.dragging.set(true);
    this.dragStartClient.set({ x: event.clientX, y: event.clientY });
    this.dragStartPan.set({ x: this.panX(), y: this.panY() });

    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragging()) return;

    const startClient = this.dragStartClient();
    const startPan = this.dragStartPan();
    if (!startClient || !startPan) return;

    const dx = event.clientX - startClient.x;
    const dy = event.clientY - startClient.y;

    const clamped = this.clampPan(
      startPan.x + dx,
      startPan.y + dy,
      this.scale(),
    );

    this.panChange.emit(clamped);
  }

  onPointerUp(event?: PointerEvent) {
    if (event) {
      (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(
        event.pointerId,
      );
    }

    this.dragging.set(false);
    this.dragStartClient.set(null);
    this.dragStartPan.set(null);
  }

  private emitClampedPanIfNeeded() {
    const clamped = this.clampPan(this.panX(), this.panY(), this.scale());

    if (clamped.x !== this.panX() || clamped.y !== this.panY()) {
      this.panChange.emit(clamped);
    }
  }

  private emitZoomAroundPoint(
    nextScale: number,
    point: { x: number; y: number },
  ) {
    const currentScale = this.scale();

    if (nextScale <= this.minScale()) {
      this.viewChange.emit({
        scale: this.minScale(),
        x: 0,
        y: 0,
      });
      return;
    }

    const k = nextScale / currentScale;

    const nextX = k * this.panX() + (1 - k) * point.x;
    const nextY = k * this.panY() + (1 - k) * point.y;

    const clamped = this.clampPan(nextX, nextY, nextScale);

    this.viewChange.emit({
      scale: nextScale,
      x: clamped.x,
      y: clamped.y,
    });
  }

  private getViewportPointFromClient(clientX: number, clientY: number) {
    const viewport = this.viewportEl()?.nativeElement;
    if (!viewport) return null;

    const rect = viewport.getBoundingClientRect();

    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }

  private recomputeRotationFitScale() {
    const viewport = this.viewportEl()?.nativeElement;
    const image = this.imageEl()?.nativeElement;

    if (!viewport || !image) {
      this.rotationFitScaleSig.set(1);
      return;
    }

    const containerWidth = viewport.clientWidth;
    const containerHeight = viewport.clientHeight;
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (
      !containerWidth ||
      !containerHeight ||
      !naturalWidth ||
      !naturalHeight
    ) {
      this.rotationFitScaleSig.set(1);
      return;
    }

    if (this.rotation() === 0 || this.rotation() === 180) {
      this.rotationFitScaleSig.set(1);
      return;
    }

    const fitScale = Math.min(
      containerWidth / naturalWidth,
      containerHeight / naturalHeight,
    );

    const baseWidth = naturalWidth * fitScale;
    const baseHeight = naturalHeight * fitScale;

    const rotatedFitScale = Math.min(
      containerWidth / baseHeight,
      containerHeight / baseWidth,
    );

    this.rotationFitScaleSig.set(rotatedFitScale);
  }

  private clampScale(scale: number): number {
    return Math.min(this.maxScale(), Math.max(this.minScale(), scale));
  }

  private clampPan(
    x: number,
    y: number,
    userScale: number,
  ): { x: number; y: number } {
    const viewport = this.viewportEl()?.nativeElement;
    const image = this.imageEl()?.nativeElement;

    const effectiveScale = userScale * this.rotationFitScale();

    if (!viewport || !image || userScale <= 1) {
      return { x: 0, y: 0 };
    }

    const containerWidth = viewport.clientWidth;
    const containerHeight = viewport.clientHeight;
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (
      !containerWidth ||
      !containerHeight ||
      !naturalWidth ||
      !naturalHeight
    ) {
      return { x, y };
    }

    const fitScale = Math.min(
      containerWidth / naturalWidth,
      containerHeight / naturalHeight,
    );

    const baseWidth = naturalWidth * fitScale;
    const baseHeight = naturalHeight * fitScale;

    let scaledWidth = baseWidth * effectiveScale;
    let scaledHeight = baseHeight * effectiveScale;

    if (this.rotation() === 90 || this.rotation() === 270) {
      [scaledWidth, scaledHeight] = [scaledHeight, scaledWidth];
    }

    const maxPanX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerHeight) / 2);

    return {
      x: this.clamp(x, -maxPanX, maxPanX),
      y: this.clamp(y, -maxPanY, maxPanY),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
