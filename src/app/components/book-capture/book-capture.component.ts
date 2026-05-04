import { CommonModule, NgClass } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IconComponent } from '../icon/icon.component';

type CameraOption = {
  id: string;
  label: string;
};

@Component({
  standalone: true,
  selector: 'app-book-capture',
  imports: [CommonModule, TranslateModule, NgClass, IconComponent],
  templateUrl: './book-capture.component.html',
})
export class BookCaptureComponent implements AfterViewInit, OnDestroy {
  private readonly books = inject(BooksService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;

  batchId = signal<string>('');
  bookId = signal<string | null>(null);

  isCreating = signal(false);
  isCapturing = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  isOpeningCamera = signal(false);
  isCancelling = signal(false);
  isPreparingNext = signal(false);

  photoCount = signal(0);

  cameraOptions = signal<CameraOption[]>([]);
  selectedCameraId = signal<string | null>(null);

  private didFinish = signal(false);
  private cleanupDone = signal(false);
  private currentBookHasPhotos = signal(false);
  private leavingExplicitly = signal(false);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      this.batchId.set(pm.get('batchId') ?? '');
    });
  }

  async ngAfterViewInit() {
    if (!this.batchId()) {
      this.toast.show(
        this.translate.instant('messages.error.books.create'),
        'error',
      );
      await this.router.navigate(['/batches']);
      return;
    }

    await this.openCamera();
    await this.createAndSetCurrentBook();
  }

  ngOnDestroy() {
    this.stopCamera();

    if (!this.leavingExplicitly() && !this.cleanupDone()) {
      void this.cleanupIfNeededOnDestroy();
    }
  }

  async takePhoto() {
    if (
      !this.bookId() ||
      !this.stream ||
      this.isCapturing() ||
      this.isUploading() ||
      this.isFinishing() ||
      this.isPreparingNext() ||
      this.isCancelling()
    ) {
      return;
    }

    this.isCapturing.set(true);

    try {
      const blob = await this.captureBestPhoto();

      this.isCapturing.set(false);
      this.isUploading.set(true);

      await firstValueFrom(this.books.uploadBookImage(this.bookId()!, blob));

      this.photoCount.update((c) => c + 1);
      this.currentBookHasPhotos.set(true);

      this.toast.show(
        this.translate.instant('messages.success.books.photo_upload'),
        'success',
      );
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : this.translate.instant('messages.error.books.photo_upload');

      this.toast.show(message, 'error');
    } finally {
      this.isCapturing.set(false);
      this.isUploading.set(false);
    }
  }

  async finish() {
    if (
      this.isFinishing() ||
      this.isCapturing() ||
      this.isUploading() ||
      this.isPreparingNext()
    ) {
      return;
    }

    if (!this.bookId() || this.photoCount() === 0) {
      this.toast.show(
        this.translate.instant('messages.warning.books.no_photo'),
        'warning',
      );
      return;
    }

    this.isFinishing.set(true);

    try {
      await firstValueFrom(this.books.startBookWorkflow(this.bookId()!));

      this.didFinish.set(true);
      this.leavingExplicitly.set(true);

      this.toast.show(
        this.translate.instant('messages.success.books.workflow'),
        'success',
      );

      await this.router.navigate(['/batches', this.batchId(), 'books']);
    } catch (err) {
      console.error(err);
      this.toast.show(
        this.translate.instant('messages.error.books.workflow'),
        'error',
      );
    } finally {
      this.isFinishing.set(false);
    }
  }

  async nextBook() {
    if (
      this.isPreparingNext() ||
      this.isCapturing() ||
      this.isUploading() ||
      this.isFinishing()
    ) {
      return;
    }

    if (!this.bookId() || this.photoCount() === 0) {
      this.toast.show(
        this.translate.instant('messages.warning.books.no_photo'),
        'warning',
      );
      return;
    }

    this.isPreparingNext.set(true);

    try {
      await firstValueFrom(this.books.startBookWorkflow(this.bookId()!));

      const res = await firstValueFrom(this.books.createBook(this.batchId()));

      this.bookId.set(String(res.book_id));
      this.photoCount.set(0);
      this.currentBookHasPhotos.set(false);

      this.toast.show(
        this.translate.instant('messages.success.books.workflow'),
        'success',
      );
    } catch (err) {
      console.error(err);
      this.toast.show(
        this.translate.instant('messages.error.books.workflow'),
        'error',
      );
    } finally {
      this.isPreparingNext.set(false);
    }
  }

  async cancel() {
    if (
      this.isCancelling() ||
      this.isCapturing() ||
      this.isUploading() ||
      this.isFinishing()
    ) {
      return;
    }

    this.isCancelling.set(true);
    this.stopCamera();

    try {
      if (this.bookId()) {
        await firstValueFrom(this.books.deleteBookRecord(this.bookId()!));
      }

      this.leavingExplicitly.set(true);

      this.toast.show(
        this.translate.instant('messages.success.books.cancel'),
        'success',
      );

      await this.router.navigate(['/batches', this.batchId(), 'books']);
    } catch (err) {
      console.error(err);
      this.toast.show(
        this.translate.instant('messages.error.books.cancel'),
        'error',
      );
    } finally {
      this.isCancelling.set(false);
    }
  }

  cleanupOnExit() {
    if (this.cleanupDone()) return true;
    this.cleanupDone.set(true);

    if (
      this.leavingExplicitly() ||
      this.isFinishing() ||
      this.didFinish() ||
      this.isCapturing() ||
      this.isUploading()
    ) {
      return true;
    }

    this.stopCamera();

    const id = this.bookId();
    if (!id) return true;

    if (this.currentBookHasPhotos() || this.photoCount() > 0) {
      return true;
    }

    return this.books.deleteBookRecord(id).pipe(
      map(() => true),
      catchError((err) => {
        console.error(err);
        return of(true);
      }),
    );
  }

  private async createAndSetCurrentBook() {
    if (this.isCreating()) return;

    this.isCreating.set(true);

    try {
      const res = await firstValueFrom(this.books.createBook(this.batchId()));
      this.bookId.set(String(res.book_id));
      this.photoCount.set(0);
      this.currentBookHasPhotos.set(false);
    } catch (err) {
      console.error(err);
      this.toast.show(
        this.translate.instant('messages.error.books.create'),
        'error',
      );
      await this.router.navigate(['/batches', this.batchId(), 'books']);
    } finally {
      this.isCreating.set(false);
    }
  }

  private async openCamera() {
    try {
      this.isOpeningCamera.set(true);
      this.stopCamera();

      await this.ensureCameraOptions();

      const stream = await this.openSelectedCamera();
      this.stream = stream;

      const video = this.videoRef.nativeElement;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();

      await this.waitForVideoReady();
    } catch (e) {
      console.error('Camera error', e);
      this.toast.show(this.translate.instant('messages.error.camera'), 'error');
    } finally {
      this.isOpeningCamera.set(false);
    }
  }

  private async ensureCameraOptions() {
    if (this.cameraOptions().length) {
      if (!this.selectedCameraId()) {
        const exactBackCamera = this.cameraOptions().find(
          (camera) => camera.label.toLowerCase() === 'camera 0, facing back',
        );
        this.selectedCameraId.set(exactBackCamera?.id ?? null);
      }
      return;
    }

    const probe = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    probe.getTracks().forEach((t) => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices
      .filter((d) => d.kind === 'videoinput')
      .map<CameraOption>((d, index) => ({
        id: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
      }));

    this.cameraOptions.set(cameras);

    const exactBackCamera = cameras.find(
      (camera) => camera.label.toLowerCase() === 'camera 0, facing back',
    );
    this.selectedCameraId.set(exactBackCamera?.id ?? null);
  }

  private async openSelectedCamera(): Promise<MediaStream> {
    const cameras = this.cameraOptions();
    const selectedId = this.selectedCameraId();

    if (selectedId) {
      try {
        const stream = await this.openCameraByDeviceId(selectedId);
        await this.applyPreferredConstraints(stream);
        return stream;
      } catch (err) {
        console.warn('Exact label camera failed', err);
      }
    }

    const backCamera = this.findAnyBackCamera(cameras);
    if (backCamera) {
      try {
        const stream = await this.openCameraByDeviceId(backCamera.id);
        await this.applyPreferredConstraints(stream);
        return stream;
      } catch (err) {
        console.warn('Exact back camera failed', err);
      }
    }

    const anyCamera = cameras[0];
    if (anyCamera) {
      try {
        const stream = await this.openCameraByDeviceId(anyCamera.id);
        await this.applyPreferredConstraints(stream);
        return stream;
      } catch (err) {
        console.warn('Any camera fallback failed', err);
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    await this.applyPreferredConstraints(stream);
    return stream;
  }

  private findAnyBackCamera(cameras: CameraOption[]): CameraOption | null {
    const normalized = cameras.map((camera) => ({
      ...camera,
      lower: camera.label.toLowerCase(),
    }));

    const backMatch = normalized.find(
      (camera) =>
        camera.lower.includes('facing back') ||
        camera.lower.includes('back') ||
        camera.lower.includes('rear') ||
        camera.lower.includes('environment') ||
        camera.lower.includes('world'),
    );

    return backMatch ? { id: backMatch.id, label: backMatch.label } : null;
  }

  private async openCameraByDeviceId(deviceId: string): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 3456 },
        height: { ideal: 4608 },
        aspectRatio: { ideal: 3 / 4 },
      },
      audio: false,
    });
  }

  private async applyPreferredConstraints(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      await track.applyConstraints({
        width: { ideal: 3456 },
        height: { ideal: 4608 },
        aspectRatio: { ideal: 3 / 4 },
      });
    } catch (err) {
      console.warn('applyConstraints failed', err);
    }
  }

  private async captureBestPhoto(): Promise<Blob> {
    const track = this.stream?.getVideoTracks?.()[0];
    if (!track || track.readyState !== 'live') {
      throw new Error('No live video track available');
    }

    await this.waitForVideoReady();

    return this.captureFromCanvas();
  }

  private async waitForVideoReady(): Promise<void> {
    const video = this.videoRef.nativeElement;

    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('Video was not ready for capture in time'));
      }, 3000);

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('playing', onReady);
      };

      const onReady = () => {
        if (
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          cleanup();
          resolve();
        }
      };

      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('playing', onReady);

      onReady();
    });
  }

  private captureFromCanvas(): Promise<Blob> {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video dimensions unavailable');
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas capture failed'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.2,
      );
    });
  }

  private async cleanupIfNeededOnDestroy() {
    this.stopCamera();

    const id = this.bookId();
    if (!id) return;

    if (this.currentBookHasPhotos() || this.photoCount() > 0) return;
    if (this.didFinish()) return;

    try {
      await firstValueFrom(this.books.deleteBookRecord(id));
    } catch (err) {
      console.error(err);
    }
  }

  private stopCamera() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  cellClass(cell: number): string {
    switch (cell) {
      case 1:
        return 'border-r border-b';
      case 2:
        return 'border-b';
      case 3:
        return 'border-l border-b';
      case 4:
        return 'border-r';
      case 5:
        return '';
      case 6:
        return 'border-l';
      case 7:
        return 'border-t border-r';
      case 8:
        return 'border-t';
      case 9:
        return 'border-t border-l';
      default:
        return '';
    }
  }
}
