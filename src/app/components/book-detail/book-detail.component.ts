import { ApiImageItem, ID } from '@/app/models';
import { BreadcrumbsService } from '@/app/services/breadcrumbs.service';
import { RecordStateService } from '@/app/services/record-state.service';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BooksService } from '../../services/api/books.service';
import { MarcDiffService } from '../../services/marc-diff.service';
import { ToastService } from '../../services/toast.service';
import { RecordStore } from '../../stores/record.store';
import { EditingPanelComponent } from '../editing-panel/editing-panel.component';
import { GalleryComponent } from '../gallery/gallery.component';
import { WorkingPanelComponent } from '../working-panel/working-panel.component';

@Component({
  standalone: true,
  selector: 'app-book-detail',
  providers: [RecordStore, MarcDiffService],
  imports: [GalleryComponent, EditingPanelComponent, WorkingPanelComponent],
  templateUrl: 'book-detail.component.html',
})
export class BookDetailComponent {
  private route = inject(ActivatedRoute);
  private bookService = inject(BooksService);
  private store = inject(RecordStore);
  private toast = inject(ToastService);
  private recordState = inject(RecordStateService);
  private breadcrumbs = inject(BreadcrumbsService);
  private translate = inject(TranslateService);

  bookId: ID | null = (() => {
    const id = this.route.snapshot.paramMap.get('bookId');
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  })();

  images = signal<ApiImageItem[]>([]);

  ngOnInit() {
    if (this.bookId === null) {
      this.toast.show(
        this.translate.instant('messages.error.books.incorrect_id'),
        'error',
      );
      return;
    }

    this.bookService.getBookResult(this.bookId.toString()).subscribe({
      next: (data) => {
        this.images.set(data.images);

        this.store.setExtracted(data.extracted_MARC_record);
        this.store.setProvenance(data.provenance ?? {});
        this.store.setLastEdited(data.last_edited_record);
        this.store.setExistingRecords(data.existing_MARC_records);
        this.store.setTitle(data.title);
        this.store.setAuthor(data.author);
        this.store.setYearOfPublication(data.year_of_publishing);

        if (data.batch_id != null) {
          this.breadcrumbs.setBatch(data.batch_id, data.batch_name ?? null);
        }

        this.breadcrumbs.setBook(this.bookId!, data.title);
      },
      error: (err) => {
        this.toast.show(
          this.translate.instant('messages.error.books.detail_load'),
          'error',
        );
        console.error('Error:', err);

        this.breadcrumbs.setBook(this.bookId!, String(this.bookId));
      },
    });

    this.recordState.resetViewMode();
  }

  ngOnDestroy() {
    this.breadcrumbs.clearBook();
  }
}
