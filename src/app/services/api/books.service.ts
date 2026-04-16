import {
  BookImageUploadResponseDto,
  BookImageUrlResponse,
  BookResultResponseDto,
  BookStatusResponseDto,
  BookUploadResponseDto,
  LastEditedRecord,
  PaginatedBooksResponseDto,
  ProcessState,
  RecordState,
} from '@/app/models/';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EnvironmentService } from '../environment.service';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private http = inject(HttpClient);
  private envService = inject(EnvironmentService);

  private get apiBaseUrl(): string {
    return this.envService.get('apiServiceBaseUrl') as string;
  }

  listBooks(
    opts: {
      page?: number;
      page_size?: number;
      process_state?: ProcessState | null;
      record_state?: RecordState | null;
      batch_id?: string;
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

    return this.http.get<PaginatedBooksResponseDto>(
      `${this.apiBaseUrl}/books/`,
      {
        params,
      },
    );
  }

  getBookStatus(bookId: string) {
    return this.http.get<BookStatusResponseDto>(
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
    return this.http.get<BookResultResponseDto>(
      `${this.apiBaseUrl}/books/${bookId}/result`,
    );
  }

  getBookImage(bookId: string, imageId: string, thumbnail: boolean) {
    const url = `${this.apiBaseUrl}/books/${bookId}/images/${imageId}`;
    let params = new HttpParams();
    params = params.set('thumbnail', String(thumbnail));
    return this.http.get(url, { params, responseType: 'blob' });
  }

  getBookImageUrl(bookId: string, imageId: string, thumbnail = false) {
    return this.http.get<BookImageUrlResponse>(
      `${this.apiBaseUrl}/books/${bookId}/images/${imageId}/url`,
      {
        params: { thumbnail },
      },
    );
  }

  uploadImages(files: File[], batchId: string) {
    const formData = new FormData();
    files.forEach((file) => formData.append('image_files', file));

    const params = new HttpParams().set('batch_id', batchId);

    return this.http.post<BookUploadResponseDto>(
      `${this.apiBaseUrl}/books/images`,
      formData,
      {
        params,
      },
    );
  }

  createBook(batchId: string) {
    const params = new HttpParams().set('batch_id', batchId);

    return this.http.post<BookUploadResponseDto>(
      `${this.apiBaseUrl}/books/`,
      null,
      { params },
    );
  }

  uploadBookImage(bookId: string, file: Blob | File) {
    const formData = new FormData();
    formData.append('image_file', file);

    return this.http.post<BookImageUploadResponseDto>(
      `${this.apiBaseUrl}/books/${bookId}/image`,
      formData,
    );
  }

  startBookWorkflow(bookId: string) {
    return this.http.post<BookUploadResponseDto>(
      `${this.apiBaseUrl}/books/${bookId}/workflow`,
      null,
    );
  }

  deleteBookRecord(bookId: string) {
    return this.http.delete<string>(`${this.apiBaseUrl}/books/${bookId}`);
  }

  rerunBookWorkflow(bookId: string) {
    return this.http.post<BookUploadResponseDto>(
      `${this.apiBaseUrl}/books/${bookId}/rerun`,
      null,
    );
  }
}
