import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Batch, PaginatedBatchesResponse } from '../../models/book';
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

    return this.http.get<PaginatedBatchesResponse>(
      `${this.apiBaseUrl}/batches/`,
      {
        params,
      },
    );
  }

  getBatch(batch_id: string) {
    return this.http.get<Batch>(`${this.apiBaseUrl}/batches/${batch_id}`);
  }

  createBatch(name: string, description: string | null) {
    let params = new HttpParams().set('name', name);

    if (description !== null) {
      params = params.set('description', description);
    }

    return this.http.post<Batch>(`${this.apiBaseUrl}/batches/`, null, {
      params,
    });
  }

  deleteBatch(batch_id: string) {
    return this.http.delete(`${this.apiBaseUrl}/batches/${batch_id}`);
  }
}
