import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-book-capture-native',
  imports: [CommonModule],
  templateUrl: './book-capture-native.component.html',
})
export class BookCaptureNativeComponent {
  private books = inject(BooksService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  bookId = signal<string | null>(null);
  batchId = signal<string>('');
  isCreating = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  photoCount = signal(0);

  private didFinish = signal(false);
  private cleanupDone = signal(false);

  private pendingFile = signal<File | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((pm) => {
      this.batchId.set(pm.get('batchId') ?? '');
      this.bookId.set(pm.get('bookId'));
    });

    effect(() => {
      this.bookId();
      this.pendingFile();
      this.tryUploadPending();
    });
  }

  private tryUploadPending() {
    const file = this.pendingFile();
    const id = this.bookId();

    if (!file || !id) return;
    if (this.isUploading() || this.isFinishing()) return;

    this.isUploading.set(true);

    this.books.uploadBookImage(id, file).subscribe({
      next: () => {
        this.pendingFile.set(null);
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
          'capture-native',
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

  captureClick() {
    if (!this.bookId() || this.isUploading() || this.isFinishing()) return;

    this.openNativeCamera();
  }

  private openNativeCamera() {
    const input = this.fileInputRef?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    this.pendingFile.set(file);
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
}
