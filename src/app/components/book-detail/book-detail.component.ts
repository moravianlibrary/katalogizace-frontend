import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiImageItem } from '../../models/book';
import { BooksService } from '../../services/books.service';
import { ToastService } from '../../services/toast.service';
import { RecordStore } from '../../stores/record.store';
import { EditingPanelComponent } from '../editing-panel/editing-panel.component';
import { ImagesViewComponent } from '../images-view/images-view.component';
import { WorkingPanelComponent } from '../working-panel/working-panel.component';

@Component({
  standalone: true,
  selector: 'app-book-detail',
  providers: [RecordStore],
  imports: [ImagesViewComponent, EditingPanelComponent, WorkingPanelComponent],
  templateUrl: 'book-detail.component.html',
})
export class BookDetailComponent {
  private route = inject(ActivatedRoute);
  private bookService = inject(BooksService);
  private store = inject(RecordStore);
  private toast = inject(ToastService);

  bookId = this.route.snapshot.paramMap.get('bookId') ?? '';

  images = signal<ApiImageItem[]>([]);

  ngOnInit() {
    this.bookService.getBookResult(this.bookId).subscribe({
      next: (data) => {
        this.images.set(data.images);

        this.store.setExtracted(data.extracted_MARC_record);
        this.store.setProvenance(data.provenance ?? {});
        this.store.setLastEdited(data.last_edited_record);
        this.store.setExistingRecords(data.existing_MARC_records);
      },
      error: (err) => {
        this.toast.show(
          'Nepodařilo se načíst detaily knihy. Zkuste to prosím později.',
          'error',
        );
        console.error('Error:', err);
      },
    });
  }
}
