import {
  AutocompletAuthorityResponse,
  AutocompletDictionaryResponse,
  AutocompleteResponse,
  CatalogueBase,
  ExistingMarcRecord,
} from '@/app/models/';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getAutRecord(recordId: string, provider: 'aut') {
    return this.http
      .get<{
        record: ExistingMarcRecord;
      }>(
        `${this.apiBaseUrl}/catalogue/providers/${provider}/authorities/${recordId}`,
      )
      .pipe(map((resp) => resp.record));
  }

  autocompleteAnakon(opts: {
    query: string;
    field: string;
    subfield: string;
    limit?: number;
    bases: CatalogueBase[];
  }) {
    const { query, field, subfield, limit = 20, bases } = opts;

    let params = new HttpParams()
      .set('query', query)
      .set('field', field)
      .set('subfield', subfield)
      .set('limit', String(limit));

    for (const b of bases) params = params.append('bases', b);

    return this.http.get<AutocompleteResponse>(
      `${this.apiBaseUrl}/catalogue/providers/anakon/autocomplete`,
      { params },
    );
  }

  autocompleteAnakonDictionary(opts: {
    query: string;
    limit?: number;
    dictionary: 'czenas' | 'eczenas';
    field: 'df_650' | 'df_651' | 'df_655';
  }) {
    const { query, limit = 20, dictionary, field } = opts;

    let params = new HttpParams()
      .set('query', query)
      .set('limit', String(limit))
      .set('dictionary', dictionary)
      .set('field', field);

    return this.http.get<AutocompletDictionaryResponse[]>(
      `${this.apiBaseUrl}/catalogue/providers/anakon/autocomplete/dictionary`,
      { params },
    );
  }

  autocompleteAnakonAuthority(opts: { query: string; limit?: number }) {
    const { query, limit = 20 } = opts;

    let params = new HttpParams()
      .set('query', query)
      .set('limit', String(limit));

    return this.http.get<AutocompletAuthorityResponse[]>(
      `${this.apiBaseUrl}/catalogue/providers/anakon/autocomplete/authority-names`,
      { params },
    );
  }
}
