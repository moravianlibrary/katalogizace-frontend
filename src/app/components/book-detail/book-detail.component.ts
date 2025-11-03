import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookResultResponse } from '../../models/book';
import { BooksService } from '../../services/books.service';
import { EditingPanelComponent } from '../editing-panel/editing-panel.component';
import { ImagesViewComponent } from '../images-view/images-view.component';
import { WorkingPanelComponent } from '../working-panel/working-panel.component';

@Component({
  standalone: true,
  selector: 'app-book-detail',
  imports: [ImagesViewComponent, EditingPanelComponent, WorkingPanelComponent],
  templateUrl: 'book-detail.component.html',
})
export class BookDetailComponent {
  private route = inject(ActivatedRoute);
  private bookService = inject(BooksService);

  bookId = this.route.snapshot.paramMap.get('bookId') ?? '';

  result = signal<BookResultResponse | null>(null);

  ngOnInit() {
    this.bookService.getBookResult(this.bookId).subscribe({
      next: (data) => {
        this.result.set(data);
      },
      error: (err) => console.error('Error:', err),
    });
  }
}
