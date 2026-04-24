import {
  BatchDto,
  BatchState,
  BatchWithBooksDto,
  PaginatedBatchesResponseDto,
  UpdateBatchRequest,
} from '@/app/models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EnvironmentService } from '../environment.service';

@Injectable({ providedIn: 'root' })
export class BatchesService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);

  private get apiBaseUrl(): string {
    return this.env.get('apiServiceBaseUrl') as string;
  }

  listBatches(
    opts: {
      filter_owned_by_user?: boolean;
      page?: number;
      page_size?: number;
      search_query?: string;
      sort_by?: 'created_at' | 'modified_at';
      sort_order?: 'asc' | 'desc';
      batch_state?: BatchState | null;
    } = {},
  ) {
    const {
      filter_owned_by_user = false,
      page = 1,
      page_size = 100,
      search_query,
      sort_by = 'modified_at',
      sort_order = 'desc',
      batch_state,
    } = opts;

    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(page_size))
      .set('sort_by', sort_by)
      .set('sort_order', sort_order);

    if (filter_owned_by_user) {
      params = params.set('filter_owned_by_user', 'true');
    }

    if (search_query !== undefined) {
      params = params.set('search_query', search_query.trim());
    }

    if (batch_state) {
      params = params.set('batch_state', batch_state);
    }

    return this.http.get<PaginatedBatchesResponseDto>(
      `${this.apiBaseUrl}/batches/`,
      { params },
    );
  }

  getBatch(batch_id: string) {
    return this.http.get<BatchWithBooksDto>(
      `${this.apiBaseUrl}/batches/${batch_id}`,
    );
  }

  createBatch(name: string, description: string | null) {
    return this.http.post<BatchDto>(`${this.apiBaseUrl}/batches/`, {
      name,
      description,
    });
  }

  updateBatch(batch_id: string, patch: UpdateBatchRequest) {
    return this.http.patch<BatchDto>(
      `${this.apiBaseUrl}/batches/${batch_id}`,
      patch,
    );
  }

  deleteBatch(batch_id: string) {
    return this.http.delete(`${this.apiBaseUrl}/batches/${batch_id}`);
  }
}
