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
  photoCount = signal(0);

  private didFinish = signal(false);
  private cleanupDone = signal(false);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      this.batchId.set(pm.get('batchId') ?? '');
      this.bookId.set(pm.get('bookId'));

      if (this.bookId() && this.viewReady() && !this.stream) {
        this.openCamera();
      }
    });
  }

  ngAfterViewInit() {
    this.viewReady.set(true);

    if (this.bookId() && !this.stream) {
      this.openCamera();
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
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
    } catch (e) {
      console.error('Camera error', e);
      this.toast.show(this.translate.instant('messages.error.camera'), 'error');
    }
  }

  takePhoto() {
    if (!this.bookId() || !this.stream) return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.isUploading.set(true);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.isUploading.set(false);
          this.toast.show(
            this.translate.instant('messages.error.books.photo_capture'),
            'error',
          );
          return;
        }

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
      },
      'image/jpeg',
      0.9,
    );
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
