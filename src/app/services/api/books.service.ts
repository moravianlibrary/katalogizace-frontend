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
import { catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { EnvironmentService } from '../environment.service';

type PresignedPostUploadResponse = {
  method: 'POST';
  upload_url: string;
  fields: Record<string, string>;
  image_id: number;
  object_key: string;
  expires_in_seconds: number;
};

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
      search_query?: string;
      sort_by?: 'created_at' | 'modified_at';
      sort_order?: 'asc' | 'desc';
      process_state?: ProcessState | null;
      record_state?: RecordState | null;
      batch_id?: string;
    } = {},
  ) {
    const {
      page = 1,
      page_size = 100,
      search_query,
      sort_by = 'created_at',
      sort_order = 'desc',
      process_state,
      record_state,
      batch_id,
    } = opts;

    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(page_size))
      .set('sort_by', sort_by)
      .set('sort_order', sort_order);

    if (batch_id) {
      params = params.set('batch_id', batch_id);
    }

    if (search_query !== undefined) {
      params = params.set('search_query', search_query.trim());
    }

    if (process_state) {
      params = params.set('process_state', process_state);
    }

    if (record_state) {
      params = params.set('record_state', record_state);
    }

    return this.http.get<PaginatedBooksResponseDto>(
      `${this.apiBaseUrl}/books/`,
      { params },
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

  // uploadBookImage(bookId: string, file: Blob | File) {
  //   const formData = new FormData();
  //   formData.append('image_file', file);

  //   return this.http.post<BookImageUploadResponseDto>(
  //     `${this.apiBaseUrl}/books/${bookId}/image`,
  //     formData,
  //   );
  // }

  uploadBookImage(bookId: string, file: Blob | File) {
    return this.http
      .post<PresignedPostUploadResponse>(
        `${this.apiBaseUrl}/books/${bookId}/image/presign-upload`,
        null,
      )
      .pipe(
        switchMap((presign) =>
          from(this.uploadToPresignedPost(presign, file)).pipe(
            map(
              (): BookImageUploadResponseDto => ({
                book_id: Number(bookId),
                image_id: presign.image_id,
              }),
            ),
            catchError((uploadErr) =>
              this.cleanupFailedPresignedImage(bookId, presign.image_id).pipe(
                switchMap(() => throwError(() => uploadErr)),
              ),
            ),
          ),
        ),
      );
  }

  private async uploadToPresignedPost(
    presign: PresignedPostUploadResponse,
    file: Blob | File,
  ): Promise<void> {
    const formData = new FormData();

    Object.entries(presign.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    formData.append('file', file, this.getUploadFilename(file));

    const response = await fetch(presign.upload_url, {
      method: presign.method,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `Presigned image upload failed with status ${response.status}`,
      );
    }
  }

  private cleanupFailedPresignedImage(
    bookId: string,
    imageId: string | number,
  ) {
    return this.deleteBookImage(bookId, imageId).pipe(
      catchError((err) => {
        console.warn('Failed to clean up presigned image record', err);
        return of(null);
      }),
    );
  }

  deleteBookImage(bookId: string, imageId: string | number) {
    return this.http.delete(`${this.apiBaseUrl}/books/${bookId}/${imageId}`);
  }

  private getUploadFilename(file: Blob | File): string {
    if (file instanceof File && file.name) {
      return file.name;
    }

    return `capture-${Date.now()}.jpg`;
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
