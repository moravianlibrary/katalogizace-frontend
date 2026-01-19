import { ExistingMarcRecord } from '@/app/models/';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { EnvironmentService } from '../environment.service';

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private http = inject(HttpClient);
  private envService = inject(EnvironmentService);

  private get apiBaseUrl(): string {
    return this.envService.get('apiServiceBaseUrl') as string;
  }

  getAutRecord(recordId: string) {
    return this.http
      .get<{
        record: ExistingMarcRecord;
      }>(`${this.apiBaseUrl}/catalogue/AUT/record/${recordId}`)
      .pipe(map((resp) => resp.record));
  }
}
