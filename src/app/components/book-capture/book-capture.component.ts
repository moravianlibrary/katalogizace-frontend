import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { BooksService } from '../../services/books.service';
import { ToastService } from '../../services/toast.service';

@Component({
  standalone: true,
  selector: 'app-book-capture',
  imports: [CommonModule],
  templateUrl: './book-capture.component.html',
})
export class BookCaptureComponent implements AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private books = inject(BooksService);
  private router = inject(Router);
  private toast = inject(ToastService);

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;

  bookId = signal<string | null>(null);
  isCreating = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  photoCount = signal(0);

  ngAfterViewInit() {
    // kameru spúšťame až po createBook()
  }

  startNewBook() {
    this.isCreating.set(true);
    this.books
      .createBook()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.bookId.set(res.book_id);
          this.isCreating.set(false);
          this.openCamera();
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Nepodařilo se založit knihu.', 'error');
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

      console.log('Stream size:', video.videoWidth, 'x', video.videoHeight);
    } catch (e) {
      console.error('Camera error', e);
      this.toast.show('Nepodařilo se otevřít kameru.', 'error');
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
          this.toast.show('Nepodařilo se spracovat fotku.', 'error');
          return;
        }

        this.books
          .uploadBookImage(this.bookId()!, blob)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.photoCount.update((c) => c + 1);
              this.toast.show('Stránka úspěšně odfocená', 'success');
              this.isUploading.set(false);
            },
            error: (err) => {
              console.error(err);
              this.toast.show('Upload fotky zlyhal.', 'error');
              this.isUploading.set(false);
            },
          });
      },
      'image/jpeg',
      0.9,
    );
  }

  finish() {
    if (!this.bookId()) return;

    this.isFinishing.set(true);
    this.stopCamera();

    this.books
      .startBookWorkflow(this.bookId()!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isFinishing.set(false);
          this.toast.show('Workflow spuštěn.', 'success');
          this.router.navigate(['/books']);
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Spuštění workflow zlyhalo.', 'error');
          this.isFinishing.set(false);
        },
      });
  }

  cancel() {
    this.stopCamera();
    this.router.navigate(['/books']);
  }

  private stopCamera() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
