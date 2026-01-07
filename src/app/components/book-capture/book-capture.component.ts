import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';

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

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;

  bookId = signal<string | null>(null);
  batchId = this.route.snapshot.paramMap.get('batchId') ?? '';
  isCreating = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  photoCount = signal(0);

  private didFinish = signal(false);
  private cleanupDone = signal(false);

  ngAfterViewInit() {
    // kameru spúšťame až po createBook()
  }

  startNewBook() {
    this.isCreating.set(true);
    this.books.createBook(this.batchId).subscribe({
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

        this.books.uploadBookImage(this.bookId()!, blob).subscribe({
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
    if (!this.bookId() || this.photoCount() === 0) {
      this.toast.show('Nejprve vyfoťte alespoň jednu stránku.', 'warning');
      return;
    }

    this.isFinishing.set(true);
    this.stopCamera();

    this.books.startBookWorkflow(this.bookId()!).subscribe({
      next: () => {
        this.didFinish.set(true);
        this.isFinishing.set(false);
        this.toast.show('Workflow spuštěn.', 'success');
        this.router.navigate(['/batches', this.batchId, 'books']);
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Spuštění workflow zlyhalo.', 'error');
        this.isFinishing.set(false);
      },
    });
  }

  cleanupOnExit() {
    if (this.cleanupDone()) return true;
    this.cleanupDone.set(true);

    if (this.isFinishing() || this.didFinish()) {
      return true;
    }

    this.stopCamera();

    const id = this.bookId();
    if (!id) return true;

    return this.books.deleteBookRecord(id).pipe(
      map(() => {
        this.toast.show('Naskenování knihy bylo zrušeno.', 'success');
        return true;
      }),
      catchError((err) => {
        console.error(err);
        this.toast.show('Nepodařilo se zrušit naskenování knihy.', 'error');
        return of(true);
      }),
    );
  }

  cancel() {
    this.router.navigate(['/batches', this.batchId, 'books']);
  }

  private stopCamera() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
