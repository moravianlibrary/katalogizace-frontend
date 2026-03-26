import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';

import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type CameraOption = {
  id: string;
  label: string;
};

@Component({
  standalone: true,
  selector: 'app-book-capture',
  imports: [CommonModule],
  templateUrl: './book-capture.component.html',
})
export class BookCaptureComponent implements AfterViewInit {
  private books = inject(BooksService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;
  private viewReady = signal(false);

  bookId = signal<string | null>(null);
  batchId = signal<string>('');

  isCreating = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  isOpeningCamera = signal(false);

  photoCount = signal(0);

  cameraOptions = signal<CameraOption[]>([]);
  selectedCameraId = signal<string | null>(null);

  private didFinish = signal(false);
  private cleanupDone = signal(false);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      this.batchId.set(pm.get('batchId') ?? '');
      this.bookId.set(pm.get('bookId'));

      if (this.bookId() && this.viewReady() && !this.stream) {
        void this.openCamera();
      }
    });
  }

  ngAfterViewInit() {
    this.viewReady.set(true);

    if (this.bookId() && !this.stream) {
      void this.openCamera();
    }
  }

  startNewBook() {
    if (this.isCreating()) return;

    this.isCreating.set(true);
    this.books.createBook(this.batchId()).subscribe({
      next: (res) => {
        this.isCreating.set(false);

        this.router.navigate([
          '/batches',
          this.batchId(),
          'books',
          'capture',
          res.book_id,
        ]);

        this.toast.show(
          this.translate.instant('messages.success.books.create'),
          'success',
        );
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.books.create'),
          'error',
        );
        this.isCreating.set(false);
      },
    });
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

        this.selectedCameraId.set(
          exactBackCamera?.id ?? this.cameraOptions()[0]?.id ?? null,
        );
      }
      return;
    }

    const probe = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
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

    this.selectedCameraId.set(exactBackCamera?.id ?? cameras[0]?.id ?? null);
  }

  private async openSelectedCamera(): Promise<MediaStream> {
    const selectedId = this.selectedCameraId();
    let stream: MediaStream;

    try {
      if (selectedId) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedId },
            width: { ideal: 4608 },
            height: { ideal: 3456 },
            aspectRatio: { ideal: 4 / 3 },
          },
          audio: false,
        });
      } else {
        throw new Error('No selected camera');
      }
    } catch (err) {
      console.warn('deviceId failed, falling back to environment', err);

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 4608 },
          height: { ideal: 3456 },
          aspectRatio: { ideal: 4 / 3 },
        },
        audio: false,
      });
    }

    const track = stream.getVideoTracks()[0];

    try {
      await track.applyConstraints({
        width: { ideal: 4608 },
        height: { ideal: 3456 },
        aspectRatio: { ideal: 4 / 3 },
      });
    } catch (err) {
      console.warn('applyConstraints failed', err);
    }

    return stream;
  }

  async takePhoto() {
    if (!this.bookId() || !this.stream || this.isUploading()) return;

    this.isUploading.set(true);

    try {
      const blob = await this.captureBestPhoto();

      this.books.uploadBookImage(this.bookId()!, blob).subscribe({
        next: () => {
          this.photoCount.update((c) => c + 1);
          this.toast.show(
            this.translate.instant('messages.success.books.photo_upload'),
            'success',
          );
          this.isUploading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            this.translate.instant('messages.error.books.photo_upload'),
            'error',
          );
          this.isUploading.set(false);
        },
      });
    } catch (err) {
      console.error(err);
      this.toast.show(
        this.translate.instant('messages.error.books.photo_capture'),
        'error',
      );
      this.isUploading.set(false);
    }
  }

  private async captureBestPhoto(): Promise<Blob> {
    const track = this.stream?.getVideoTracks?.()[0];
    if (!track) {
      throw new Error('No video track available');
    }

    const ImageCaptureCtor = (
      window as Window & {
        ImageCapture?: new (track: MediaStreamTrack) => {
          takePhoto?: () => Promise<Blob>;
        };
      }
    ).ImageCapture;

    if (ImageCaptureCtor) {
      try {
        const imageCapture = new ImageCaptureCtor(track);
        if (imageCapture.takePhoto) {
          const blob = await imageCapture.takePhoto();
          if (blob) {
            return blob;
          }
        }
      } catch (err) {
        console.warn(
          'ImageCapture.takePhoto failed, falling back to canvas',
          err,
        );
      }
    }

    return this.captureFromCanvas();
  }

  private captureFromCanvas(): Promise<Blob> {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

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
        0.98,
      );
    });
  }

  finish() {
    if (!this.bookId() || this.photoCount() === 0) {
      this.toast.show(
        this.translate.instant('messages.warning.books.no_photo'),
        'warning',
      );
      return;
    }

    this.isFinishing.set(true);
    this.stopCamera();

    this.books.startBookWorkflow(this.bookId()!).subscribe({
      next: () => {
        this.didFinish.set(true);
        this.isFinishing.set(false);
        this.toast.show(
          this.translate.instant('messages.success.books.workflow'),
          'success',
        );
        this.router.navigate(['/batches', this.batchId(), 'books']);
      },
      error: (err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.books.workflow'),
          'error',
        );
        this.isFinishing.set(false);
      },
    });
  }

  cleanupOnExit() {
    if (this.cleanupDone()) return true;
    this.cleanupDone.set(true);

    if (this.isFinishing() || this.didFinish()) return true;

    this.stopCamera();

    const id = this.bookId();
    if (!id) return true;

    return this.books.deleteBookRecord(id).pipe(
      map(() => {
        this.toast.show(
          this.translate.instant('messages.success.books.cancel'),
          'success',
        );
        return true;
      }),
      catchError((err) => {
        console.error(err);
        this.toast.show(
          this.translate.instant('messages.error.books.cancel'),
          'error',
        );
        return of(true);
      }),
    );
  }

  cancel() {
    this.router.navigate(['/batches', this.batchId(), 'books']);
  }

  private stopCamera() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
