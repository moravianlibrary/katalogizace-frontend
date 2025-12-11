import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BookImageUploadResponse,
  BookResultResponse,
  BookStatusResponse,
  BookUploadResponse,
  LastEditedRecord,
  PaginatedBooksResponse,
  ProcessState,
  RecordState,
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
      process_state?: ProcessState | null;
      record_state?: RecordState | null;
      batch_id?: string | null;
    } = {},
  ) {
    const {
      page = 1,
      page_size = 20,
      process_state,
      record_state,
      batch_id,
    } = opts;
    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(page_size));

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
    return this.http.post<LastEditedRecord>(
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

  uploadImages(files: File[], batchId?: string) {
    const formData = new FormData();
    files.forEach((file) => formData.append('image_files', file));

    let params = new HttpParams();
    if (batchId) {
      params = params.set('batch_id', batchId);
    }

    const apiKey = this.envService.get('apiServiceKey');

    return this.http.post<BookUploadResponse>(
      `${this.apiBaseUrl}/books/upload-images`,
      formData,
      {
        params,
        headers: {
          'KATALOGIZACE-API-KEY': apiKey,
        },
      },
    );
  }

  createBook(batchId?: string) {
    let params = new HttpParams();
    if (batchId) {
      params = params.set('batch_id', batchId);
    }

    return this.http.post<BookUploadResponse>(
      `${this.apiBaseUrl}/books/create`,
      null,
    );
  }

  uploadBookImage(bookId: string, file: Blob | File) {
    const formData = new FormData();
    formData.append('image_file', file);

    return this.http.post<BookImageUploadResponse>(
      `${this.apiBaseUrl}/books/${bookId}/upload-image`,
      formData,
    );
  }

  startBookWorkflow(bookId: string) {
    return this.http.post<BookUploadResponse>(
      `${this.apiBaseUrl}/books/${bookId}/start-workflow`,
      null,
    );
  }

  deleteBookRecord(bookId: string) {
    return this.http.delete<string>(`${this.apiBaseUrl}/books/${bookId}`);
  }
}
