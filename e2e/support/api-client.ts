import {
  APIRequestContext,
  APIResponse,
  PlaywrightWorkerArgs,
} from '@playwright/test';
import { e2eEnv } from './env';

type UserRole = 'admin' | 'user';

type AccountCredentials = {
  email: string;
  password: string;
};

type CurrentUserInfo = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

type BatchListResponse = {
  batches: BatchListItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

type BatchListItem = {
  batch_id: number;
  name: string;
};

type BatchDetail = {
  batch_id: number;
  name: string;
  description: string | null;
  state: string;
  num_books: number;
  created_by: string;
  created_at: string;
  modified_at: string;
  book_ids: number[];
};

type BookListResponse = {
  books: BookListItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

type BookListItem = {
  book_id: number;
  title: string;
  process_state: string;
  record_state: string;
  created_at?: string | null;
  modified_at?: string | null;
};

type MarcSubfield = {
  code: string;
  value: string;
};

type ExistingMarcRecordControlField = {
  tag: string;
  value: string;
};

type ExistingMarcRecordDataField = {
  tag: string;
  ind1: string;
  ind2: string;
  subfields: MarcSubfield[];
};

type ExistingMarcRecord = {
  record_id: string;
  leader: string;
  source: string;
  quality_assessment: unknown;
  control_fields: ExistingMarcRecordControlField[];
  data_fields: ExistingMarcRecordDataField[];
};

type BookResultResponse = {
  batch_id: number | null;
  batch_name: string;
  book_id: number;
  title: string;
  images: unknown[];
  extracted_MARC_record: Record<string, unknown[]> | null;
  existing_MARC_records: ExistingMarcRecord[];
  last_edited_record: ExistingMarcRecord | null;
  provenance?: Record<string, unknown[]>;
};

type BookCandidate = {
  batch: BatchListItem;
  book: BookListItem;
  result: BookResultResponse;
  editableFieldTag: string;
  textEditableFieldTag: string | null;
};

type UserListItem = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

export type SmokeScenario = {
  batchId: number;
  batchName: string;
  batchSearchQuery: string;
  bookId: number;
  bookTitle: string;
  bookSearchQuery: string;
  bookRecordState: string;
  editableFieldTag: string;
};

export type EditingScenario = SmokeScenario & {
  textEditableFieldTag: string;
  originalLastEditedRecord: ExistingMarcRecord;
};

export type TakeRecordScenario = SmokeScenario;

export class AppApiClient {
  private batchesCache: BatchListResponse | null = null;
  private currentUserCache: CurrentUserInfo | null = null;
  private readonly booksCache = new Map<string, BookListResponse>();
  private readonly resultCache = new Map<number, BookResultResponse>();
  private readonly batchDetailCache = new Map<number, BatchDetail>();
  private readonly usersCache = new Map<'basic' | 'detail', UserListItem[]>();

  private constructor(private readonly requestContext: APIRequestContext) {}

  static async create(
    playwright: PlaywrightWorkerArgs['playwright'],
    credentials: AccountCredentials = {
      email: e2eEnv.email,
      password: e2eEnv.password,
    },
  ): Promise<AppApiClient> {
    const loginContext = await playwright.request.newContext({
      baseURL: e2eEnv.apiUrl,
    });

    const loginResponse = await loginContext.post('/users/login', {
      form: {
        username: credentials.email,
        password: credentials.password,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    await assertOk(loginResponse, 'Login for Playwright API helper failed');
    const token = (await loginResponse.json()) as { access_token: string };

    await loginContext.dispose();

    const requestContext = await playwright.request.newContext({
      baseURL: e2eEnv.apiUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    return new AppApiClient(requestContext);
  }

  async dispose(): Promise<void> {
    await this.requestContext.dispose();
  }

  async getCurrentUser(): Promise<CurrentUserInfo> {
    if (this.currentUserCache) {
      return this.currentUserCache;
    }

    const response = await this.requestContext.get('/users/current-user');
    await assertOk(response, 'Loading current user for Playwright failed');

    const user = (await response.json()) as CurrentUserInfo;
    this.currentUserCache = user;

    return user;
  }

  async listUsers(
    view: 'basic' | 'detail' = 'basic',
    options: { forceRefresh?: boolean } = {},
  ): Promise<UserListItem[]> {
    const { forceRefresh = false } = options;
    const cached = this.usersCache.get(view);
    if (cached && !forceRefresh) {
      return cached;
    }

    const response = await this.requestContext.get('/users/', {
      params: { view },
    });

    await assertOk(response, `Listing users in ${view} view failed`);

    const users = (await response.json()) as UserListItem[];
    this.usersCache.set(view, users);

    return users;
  }

  async findUserByEmail(
    email: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<UserListItem | null> {
    const normalized = email.trim().toLowerCase();
    const users = await this.listUsers('detail', options);

    return (
      users.find((user) => user.email.trim().toLowerCase() === normalized) ??
      null
    );
  }

  async deleteUser(userId: number): Promise<void> {
    const response = await this.requestContext.delete(`/users/${userId}`);
    await assertOk(response, `Deleting user ${userId} failed`);
    this.usersCache.clear();
  }

  async getBatch(batchId: number): Promise<BatchDetail> {
    const cached = this.batchDetailCache.get(batchId);
    if (cached) {
      return cached;
    }

    const response = await this.requestContext.get(`/batches/${batchId}`);
    await assertOk(response, `Loading batch ${batchId} failed`);

    const batch = (await response.json()) as BatchDetail;
    this.batchDetailCache.set(batchId, batch);

    return batch;
  }

  async updateBatch(
    batchId: number,
    patch: { name: string; description: string | null; state: string },
  ): Promise<void> {
    const response = await this.requestContext.patch(`/batches/${batchId}`, {
      data: patch,
    });

    await assertOk(response, `Updating batch ${batchId} failed`);
    this.batchDetailCache.delete(batchId);
    this.batchesCache = null;
  }

  async deleteBatch(batchId: number): Promise<void> {
    const response = await this.requestContext.delete(`/batches/${batchId}`);
    await assertOk(response, `Deleting batch ${batchId} failed`);

    this.batchesCache = null;
    this.batchDetailCache.delete(batchId);
    for (const key of [...this.booksCache.keys()]) {
      if (key.startsWith(`${batchId}:`)) {
        this.booksCache.delete(key);
      }
    }
  }

  async listBooks(
    batchId: number,
    options: {
      processState?: string | null;
      pageSize?: number;
      sortBy?: 'created_at' | 'modified_at';
      sortOrder?: 'asc' | 'desc';
      forceRefresh?: boolean;
    } = {},
  ): Promise<BookListResponse> {
    const {
      processState = null,
      pageSize = 100,
      sortBy = 'modified_at',
      sortOrder = 'desc',
      forceRefresh = false,
    } = options;

    const cacheKey = `${batchId}:${processState ?? 'all'}:${pageSize}:${sortBy}:${sortOrder}`;
    const cached = this.booksCache.get(cacheKey);
    if (cached && !forceRefresh) {
      return cached;
    }

    const params: Record<string, string> = {
      batch_id: String(batchId),
      page: '1',
      page_size: String(pageSize),
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    if (processState) {
      params['process_state'] = processState;
    }

    const response = await this.requestContext.get('/books/', { params });
    await assertOk(response, `Listing books for batch ${batchId} failed`);

    const books = (await response.json()) as BookListResponse;
    this.booksCache.set(cacheKey, books);

    return books;
  }

  async getBookResult(bookId: number): Promise<BookResultResponse> {
    const cached = this.resultCache.get(bookId);
    if (cached) {
      return cached;
    }

    const response = await this.requestContext.get(`/books/${bookId}/result`);

    await assertOk(response, `Loading result for book ${bookId} failed`);

    const result = (await response.json()) as BookResultResponse;
    this.resultCache.set(bookId, result);

    return result;
  }

  async deleteBook(bookId: number): Promise<void> {
    const response = await this.requestContext.delete(`/books/${bookId}`);
    await assertOk(response, `Deleting book ${bookId} failed`);
    this.resultCache.delete(bookId);
    this.booksCache.clear();
  }

  async resolveSmokeScenario(): Promise<SmokeScenario> {
    const candidate = await this.findBookCandidate({
      requireExistingRecords: false,
      requireLastEditedRecord: false,
      requireTextEditableField: false,
      requireNoLastEditedRecord: false,
      requireExtractedRecord: false,
      preferredBatchIds: null,
      preferredBookIds: null,
    });

    return buildSmokeScenario(candidate);
  }

  async resolveEditingScenario(): Promise<EditingScenario> {
    const candidate = await this.findBookCandidate({
      requireExistingRecords: false,
      requireLastEditedRecord: false,
      requireTextEditableField: true,
      requireNoLastEditedRecord: false,
      requireExtractedRecord: false,
      preferredBatchIds: null,
      preferredBookIds: null,
    });

    const originalRecord =
      candidate.result.last_edited_record ??
      extractedToExisting(candidate.result.extracted_MARC_record);

    if (!candidate.textEditableFieldTag || !originalRecord) {
      throw new Error(
        'Editing scenario resolution failed: selected book is missing a text-editable MARC field or a restorable baseline record.',
      );
    }

    return {
      ...buildSmokeScenario(candidate),
      textEditableFieldTag: candidate.textEditableFieldTag,
      originalLastEditedRecord: originalRecord,
    };
  }

  async resolveTakeRecordScenario(): Promise<TakeRecordScenario> {
    const candidate = await this.findBookCandidate({
      requireExistingRecords: true,
      requireLastEditedRecord: false,
      requireTextEditableField: false,
      requireNoLastEditedRecord: false,
      requireExtractedRecord: true,
      preferredBatchIds: null,
      preferredBookIds: null,
    });

    return buildSmokeScenario(candidate);
  }

  async resolveFixtureSmokeScenario(): Promise<SmokeScenario> {
    const candidate = await this.findBookCandidate({
      requireExistingRecords: false,
      requireLastEditedRecord: false,
      requireTextEditableField: false,
      requireNoLastEditedRecord: false,
      requireExtractedRecord: false,
      preferredBatchIds: [e2eEnv.fixtures.batchId],
      preferredBookIds: e2eEnv.fixtures.bookIds,
    });

    return buildSmokeScenario(candidate);
  }

  async resolveFixtureEditingScenario(): Promise<EditingScenario> {
    const candidate = await this.findBookCandidate({
      requireExistingRecords: false,
      requireLastEditedRecord: false,
      requireTextEditableField: true,
      requireNoLastEditedRecord: false,
      requireExtractedRecord: false,
      preferredBatchIds: [e2eEnv.fixtures.batchId],
      preferredBookIds: e2eEnv.fixtures.bookIds,
    });

    const originalRecord =
      candidate.result.last_edited_record ??
      extractedToExisting(candidate.result.extracted_MARC_record);

    if (!candidate.textEditableFieldTag || !originalRecord) {
      throw new Error(
        'Fixture editing scenario resolution failed: no configured fixture book has a text-editable MARC field and a restorable baseline record.',
      );
    }

    return {
      ...buildSmokeScenario(candidate),
      textEditableFieldTag: candidate.textEditableFieldTag,
      originalLastEditedRecord: originalRecord,
    };
  }

  async resolveFixtureTakeRecordScenario(): Promise<TakeRecordScenario> {
    const candidate = await this.findBookCandidate({
      requireExistingRecords: true,
      requireLastEditedRecord: false,
      requireTextEditableField: false,
      requireNoLastEditedRecord: false,
      requireExtractedRecord: true,
      preferredBatchIds: [e2eEnv.fixtures.batchId],
      preferredBookIds: e2eEnv.fixtures.bookIds,
    });

    return buildSmokeScenario(candidate);
  }

  async restoreRevision(
    bookId: number,
    record: ExistingMarcRecord,
  ): Promise<void> {
    const payload = {
      ...record,
      record_id: `frontend-${bookId}`,
      source: 'user_edit',
    };

    const response = await this.requestContext.post(
      `/books/${bookId}/revision`,
      {
        data: payload,
      },
    );

    await assertOk(response, `Restoring revision for book ${bookId} failed`);
    this.resultCache.delete(bookId);
  }

  private async findBookCandidate(requirements: {
    requireExistingRecords: boolean;
    requireLastEditedRecord: boolean;
    requireTextEditableField: boolean;
    requireNoLastEditedRecord: boolean;
    requireExtractedRecord: boolean;
    preferredBatchIds: number[] | null;
    preferredBookIds: number[] | null;
  }): Promise<BookCandidate> {
    const batches = await this.listBatches();
    const orderedBatches = orderBatches(
      batches.batches,
      requirements.preferredBatchIds,
    );

    for (const batch of orderedBatches) {
      const books = await this.listCompletedBooks(batch.batch_id);
      const orderedBooks = orderBooks(
        books.books,
        requirements.preferredBookIds,
      );

      for (const book of orderedBooks) {
        const result = await this.getBookResult(book.book_id);
        const editableFieldTag = pickEditableFieldTag(result);
        const textEditableFieldTag = pickTextEditableFieldTag(result);

        if (!editableFieldTag || result.images.length === 0) {
          continue;
        }

        if (
          requirements.requireExistingRecords &&
          result.existing_MARC_records.length === 0
        ) {
          continue;
        }

        if (
          requirements.requireExtractedRecord &&
          !hasExtractedRecord(result.extracted_MARC_record)
        ) {
          continue;
        }

        if (
          requirements.requireLastEditedRecord &&
          !result.last_edited_record
        ) {
          continue;
        }

        if (
          requirements.requireNoLastEditedRecord &&
          result.last_edited_record !== null
        ) {
          continue;
        }

        if (requirements.requireTextEditableField && !textEditableFieldTag) {
          continue;
        }

        return {
          batch,
          book,
          result,
          editableFieldTag,
          textEditableFieldTag,
        };
      }
    }

    throw new Error(buildScenarioErrorMessage(requirements));
  }

  private async listBatches(): Promise<BatchListResponse> {
    if (this.batchesCache) {
      return this.batchesCache;
    }

    const response = await this.requestContext.get('/batches/', {
      params: {
        page: '1',
        page_size: '100',
        sort_by: 'modified_at',
        sort_order: 'desc',
      },
    });

    await assertOk(response, 'Listing batches for Playwright failed');

    const batches = (await response.json()) as BatchListResponse;
    this.batchesCache = batches;

    return batches;
  }

  private async listCompletedBooks(batchId: number): Promise<BookListResponse> {
    return this.listBooks(batchId, { processState: 'completed' });
  }
}

async function assertOk(response: APIResponse, message: string): Promise<void> {
  if (response.ok()) {
    return;
  }

  throw new Error(`${message}: ${response.status()} ${await response.text()}`);
}

function buildSmokeScenario(candidate: BookCandidate): SmokeScenario {
  return {
    batchId: candidate.batch.batch_id,
    batchName: candidate.batch.name,
    batchSearchQuery: buildSearchQuery(candidate.batch.name),
    bookId: candidate.book.book_id,
    bookTitle: candidate.result.title,
    bookSearchQuery: buildSearchQuery(candidate.result.title),
    bookRecordState: candidate.book.record_state,
    editableFieldTag: candidate.editableFieldTag,
  };
}

function extractedToExisting(
  extracted: Record<string, unknown[]> | null,
): ExistingMarcRecord | null {
  if (!extracted) {
    return null;
  }

  const control_fields: ExistingMarcRecordControlField[] = [];
  const data_fields: ExistingMarcRecordDataField[] = [];

  for (const [tag, fields] of Object.entries(extracted)) {
    if (!Array.isArray(fields) || fields.length === 0) {
      continue;
    }

    for (const field of fields) {
      if (isControlTag(tag)) {
        const value =
          typeof (field as { value?: unknown }).value === 'string'
            ? (field as { value: string }).value
            : '';

        control_fields.push({ tag, value });
        continue;
      }

      const candidates = (field as { candidates?: unknown[] }).candidates;
      const selectedCandidateId = (field as { selected_candidate_id?: unknown })
        .selected_candidate_id;

      if (!Array.isArray(candidates) || candidates.length === 0) {
        continue;
      }

      const selectedCandidate =
        candidates.find(
          (candidate) =>
            (candidate as { id?: unknown }).id === selectedCandidateId,
        ) ?? candidates[0];

      const representation = (
        selectedCandidate as {
          MARC_representation?: {
            ind1?: string;
            ind2?: string;
            subfields?: MarcSubfield[];
          };
        }
      ).MARC_representation;

      if (!representation) {
        continue;
      }

      data_fields.push({
        tag,
        ind1: representation.ind1 ?? '',
        ind2: representation.ind2 ?? '',
        subfields: representation.subfields ?? [],
      });
    }
  }

  control_fields.sort((left, right) => left.tag.localeCompare(right.tag));
  data_fields.sort((left, right) => left.tag.localeCompare(right.tag));

  return {
    record_id: 'extracted-synthetic',
    leader: '',
    source: 'user_edit',
    quality_assessment: {
      required_present: 0,
      required_total: 0,
      required_if_applicable_present: 0,
      required_if_applicable_total: 0,
    },
    control_fields,
    data_fields,
  };
}

function buildScenarioErrorMessage(requirements: {
  requireExistingRecords: boolean;
  requireLastEditedRecord: boolean;
  requireTextEditableField: boolean;
  requireNoLastEditedRecord: boolean;
  requireExtractedRecord: boolean;
  preferredBatchIds: number[] | null;
  preferredBookIds: number[] | null;
}): string {
  const constraints: string[] = [
    'accessible batch',
    'completed book',
    'book images',
    'MARC data',
  ];

  if (requirements.requireExistingRecords) {
    constraints.push('at least one external MARC record');
  }

  if (requirements.requireExtractedRecord) {
    constraints.push('an extracted MARC record');
  }

  if (requirements.requireLastEditedRecord) {
    constraints.push('saved user revision');
  }

  if (requirements.requireNoLastEditedRecord) {
    constraints.push('no saved user revision');
  }

  if (requirements.requireTextEditableField) {
    constraints.push('a text-editable MARC data field');
  }

  if (requirements.preferredBatchIds?.length) {
    constraints.push(
      `preferred batch ids ${requirements.preferredBatchIds.join(', ')}`,
    );
  }

  if (requirements.preferredBookIds?.length) {
    constraints.push(
      `preferred book ids ${requirements.preferredBookIds.join(', ')}`,
    );
  }

  return `No suitable book was found for the Playwright suite. The test account needs at least one ${constraints.join(', ')}.`;
}

function buildSearchQuery(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const firstWord = normalized
    .split(' ')
    .find((part) => stripForSearch(part).length >= 3);

  if (firstWord) {
    return stripForSearch(firstWord);
  }

  const stripped = stripForSearch(normalized);
  return stripped.slice(0, Math.max(3, Math.min(12, stripped.length)));
}

function stripForSearch(value: string): string {
  return value.replace(/[^0-9A-Za-zÀ-ž-]/g, '');
}

function pickEditableFieldTag(result: BookResultResponse): string | null {
  const editedTag = result.last_edited_record?.data_fields
    .map((field) => field.tag)
    .find(isDataFieldTag);

  if (editedTag) {
    return editedTag;
  }

  const extractedTag = Object.keys(result.extracted_MARC_record ?? {})
    .sort((left, right) => left.localeCompare(right))
    .find(isDataFieldTag);

  return extractedTag ?? null;
}

function pickTextEditableFieldTag(result: BookResultResponse): string | null {
  const fromLastEdited = pickTextEditableFieldTagFromExisting(
    result.last_edited_record,
  );
  if (fromLastEdited) {
    return fromLastEdited;
  }

  return pickTextEditableFieldTagFromExisting(
    extractedToExisting(result.extracted_MARC_record),
  );
}

function pickTextEditableFieldTagFromExisting(
  record: ExistingMarcRecord | null,
): string | null {
  if (!record) {
    return null;
  }

  const preferredTags = ['245', '264', '300', '500'];

  for (const tag of preferredTags) {
    const field = record.data_fields.find((item) => item.tag === tag);
    if (
      field &&
      field.subfields.some((subfield) => subfield.value.trim().length)
    ) {
      return tag;
    }
  }

  const fallback = record.data_fields.find(
    (field) =>
      isDataFieldTag(field.tag) &&
      field.tag !== '910' &&
      field.subfields.some((subfield) => subfield.value.trim().length),
  );

  return fallback?.tag ?? null;
}

function isControlTag(tag: string): boolean {
  return ['001', '003', '005', '006', '007', '008'].includes(tag);
}

function isDataFieldTag(tag: string): boolean {
  const parsed = Number(tag);
  return Number.isInteger(parsed) && parsed >= 10 && tag !== '910';
}

function hasExtractedRecord(
  extractedRecord: Record<string, unknown[]> | null,
): boolean {
  if (!extractedRecord) {
    return false;
  }

  return Object.values(extractedRecord).some((fields) => fields.length > 0);
}

function orderBatches(
  batches: BatchListItem[],
  preferredBatchIds: number[] | null,
): BatchListItem[] {
  if (!preferredBatchIds?.length) {
    return batches;
  }

  const preferredIndex = new Map(
    preferredBatchIds.map((batchId, index) => [batchId, index]),
  );

  return [...batches].sort((left, right) => {
    const leftIndex = preferredIndex.get(left.batch_id);
    const rightIndex = preferredIndex.get(right.batch_id);

    if (leftIndex == null && rightIndex == null) return 0;
    if (leftIndex == null) return 1;
    if (rightIndex == null) return -1;
    return leftIndex - rightIndex;
  });
}

function orderBooks(
  books: BookListItem[],
  preferredBookIds: number[] | null,
): BookListItem[] {
  if (!preferredBookIds?.length) {
    return books;
  }

  const preferredIndex = new Map(
    preferredBookIds.map((bookId, index) => [bookId, index]),
  );

  return [...books].sort((left, right) => {
    const leftIndex = preferredIndex.get(left.book_id);
    const rightIndex = preferredIndex.get(right.book_id);

    if (leftIndex == null && rightIndex == null) return 0;
    if (leftIndex == null) return 1;
    if (rightIndex == null) return -1;
    return leftIndex - rightIndex;
  });
}
