import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BookResultResponse,
  BookStatusResponse,
  BookUploadResponse,
  LastEditedRecord,
  PaginatedBooksResponse,
  TaskState,
} from '../models/book';
import { EnvironmentService } from './environment.service';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private http = inject(HttpClient);
  private envService = inject(EnvironmentService);
  private apiBaseUrl = this.envService.get('apiServiceBaseUrl');

  listBooks(
    opts: {
      page?: number;
      page_size?: number;
      state?: TaskState | null;
      batch_id?: string | null;
    } = {},
  ) {
    const { page = 1, page_size = 20, state, batch_id } = opts;
    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(page_size));

    if (state) params = params.set('state', state);
    if (batch_id) params = params.set('batch_id', batch_id);

    return this.http.get<PaginatedBooksResponse>(`${this.apiBaseUrl}/books/`, {
      params,
    });
  }

  getBookStatus(bookId: string) {
    return this.http.get<BookStatusResponse>(
      `${this.apiBaseUrl}/books/${bookId}/status`,
    );
  }

  submitRevision(bookId: string, record: LastEditedRecord) {
    return this.http.post<BookUploadResponse>(
      `${this.apiBaseUrl}/books/${bookId}/revision`,
      record,
    );
  }

  getBookResult(bookId: string) {
    return this.http.get<BookResultResponse>(
      `${this.apiBaseUrl}/books/${bookId}/result`,
    );
  }

  getBookImage(bookId: string, imageId: string, thumbnail: boolean) {
    const url = `${this.apiBaseUrl}/books/${bookId}/images/${imageId}`;
    let params = new HttpParams();
    params = params.set('thumbnail', String(thumbnail));
    return this.http.get(url, { params, responseType: 'blob' });
  }
}
