import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
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
  private books = inject(BooksService);
  private router = inject(Router);
  private toast = inject(ToastService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  bookId = signal<string | null>(null);
  isCreating = signal(false);
  isUploading = signal(false);
  isFinishing = signal(false);
  photoCount = signal(0);

  ngOnInit() {
    this.ensureBookCreated();
  }

  private ensureBookCreated() {
    if (this.bookId() || this.isCreating()) return;

    this.isCreating.set(true);
    this.books.createBook().subscribe({
      next: (res) => {
        this.bookId.set(res.book_id);
        this.isCreating.set(false);
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Nepodařilo se založit knihu.', 'error');
        this.isCreating.set(false);
        this.router.navigate(['/books']);
      },
    });
  }

  captureClick() {
    if (this.isUploading() || this.isFinishing()) return;

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
      this.toast.show('Nejprve vyfoťte alespoň jednu stránku.', 'error');
      return;
    }

    this.isFinishing.set(true);
    this.books.startBookWorkflow(this.bookId()!).subscribe({
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
    this.router.navigate(['/books']);
  }
}
