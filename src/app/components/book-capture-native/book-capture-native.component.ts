import { CommonModule } from '@angular/common';
import {
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
  selector: 'app-book-capture-native',
  imports: [CommonModule],
  templateUrl: './book-capture-native.component.html',
})
export class BookCaptureNativeComponent {
  private destroyRef = inject(DestroyRef);
  private books = inject(BooksService);
  private router = inject(Router);
  private toast = inject(ToastService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  bookId = signal<string | null>(null);
  isCreating = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  photoCount = signal(0);

  // klik na "Odfotiť stránku"
  captureClick() {
    if (this.isUploading() || this.isFinishing()) return;

    if (!this.bookId()) {
      // ešte nemáme knihu -> najprv createBook
      this.isCreating.set(true);
      this.books
        .createBook()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.bookId.set(res.book_id);
            this.isCreating.set(false);
            this.openNativeCamera();
          },
          error: (err) => {
            console.error(err);
            this.toast.show('Nepodarilo sa založiť knihu.', 'error');
            this.isCreating.set(false);
          },
        });
    } else {
      this.openNativeCamera();
    }
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
    this.books
      .uploadBookImage(this.bookId()!, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.photoCount.update((c) => c + 1);
          this.toast.show('Stránka úspešne odfotená', 'success');
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
      this.toast.show('Najprv odfoť aspoň jednu stránku.', 'error');
      return;
    }

    this.isFinishing.set(true);
    this.books
      .startBookWorkflow(this.bookId()!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isFinishing.set(false);
          this.toast.show('Workflow spustený.', 'success');
          this.router.navigate(['/books']);
        },
        error: (err) => {
          console.error(err);
          this.toast.show('Spustenie workflowu zlyhalo.', 'error');
          this.isFinishing.set(false);
        },
      });
  }

  cancel() {
    this.router.navigate(['/books']);
  }
}
