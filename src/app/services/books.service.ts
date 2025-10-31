import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  BookResultResponse,
  BookStatusResponse,
  PaginatedBooksResponse,
  TaskState,
} from '../models/book';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private http = inject(HttpClient);
  private baseUrl = environment.API_BASE_URL;

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

    return this.http.get<PaginatedBooksResponse>(`${this.baseUrl}/books/`, {
      params,
    });
  }

  getBookStatus(bookId: string) {
    return this.http.get<BookStatusResponse>(
      `${this.baseUrl}/books/${bookId}/status`,
    );
  }

  getBookResult(bookId: string) {
    return this.http.get<BookResultResponse>(
      `${this.baseUrl}/books/${bookId}/result`,
    );
  }

  getBookImage(
    bookId: string,
    imageId: string,
    opts?: { thumbnail?: boolean },
  ) {
    const url = `${this.baseUrl}/books/${bookId}/images/${imageId}`;
    let params = new HttpParams();
    if (opts?.thumbnail) params = params.set('thumbnail', 'false');
    return this.http.get(url, { params, responseType: 'blob' });
  }
}
