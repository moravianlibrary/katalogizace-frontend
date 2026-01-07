import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BooksService } from '../../services/api/books.service';
import { ToastService } from '../../services/toast.service';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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
          'Kniha založena. Klikněte na „Vyfotit stránku“.',
          'success',
        );
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Nepodařilo se založit knihu.', 'error');
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
    if (!file || !this.bookId()) {
      return;
    }

    this.isUploading.set(true);
    this.books.uploadBookImage(this.bookId()!, file).subscribe({
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
  }

  finish() {
    if (!this.bookId() || this.photoCount() === 0) {
      this.toast.show('Nejprve vyfoťte alespoň jednu stránku.', 'warning');
      return;
    }

    this.isFinishing.set(true);
    this.books.startBookWorkflow(this.bookId()!).subscribe({
      next: () => {
        this.didFinish.set(true);
        this.isFinishing.set(false);
        this.toast.show('Workflow spuštěn.', 'success');
        this.router.navigate(['/batches', this.batchId(), 'books']);
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

    if (this.isFinishing() || this.didFinish()) return true;

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
    this.router.navigate(['/batches', this.batchId(), 'books']);
  }
}
