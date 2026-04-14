import {
  BatchDto,
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
    } = {},
  ) {
    const { filter_owned_by_user = false, page = 1, page_size = 20 } = opts;

    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(page_size));

    if (filter_owned_by_user) {
      params = params.set('filter_owned_by_user', 'true');
    }

    return this.http.get<PaginatedBatchesResponseDto>(
      `${this.apiBaseUrl}/batches/`,
      {
        params,
      },
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
