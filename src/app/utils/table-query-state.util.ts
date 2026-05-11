import {
  computed,
  DestroyRef,
  Injector,
  Signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';

import { TablePaginationItem } from '../components/shared/table/table-pagination/table-pagination.component';

type QueryParamValue = string | number | boolean | null | undefined;

type PaginatedTableData = {
  total: number;
  page: number;
  page_size: number;
  has_prev: boolean;
  has_next: boolean;
};

export type TableSortDirection = 'asc' | 'desc';

type CommonTableQueryParams<TSort extends string> = {
  page: number;
  page_size: number;
  search: string | null;
  sort_by: TSort;
  sort_order: TableSortDirection;
};

type TableQueryParams<TSort extends string> = Partial<
  CommonTableQueryParams<TSort>
> &
  Record<string, QueryParamValue>;

type ParsedRouteState<TSort extends string, TExtraState> = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: TSort;
  sortDir: TableSortDirection;
  extraState: TExtraState;
};

export function createQuerySyncedTableState<
  TData extends PaginatedTableData | null,
  TSort extends string,
  TExtraState,
  TExtraQueryParams extends Record<string, QueryParamValue>,
>(config: {
  route: ActivatedRoute;
  router: Router;
  destroyRef: DestroyRef;
  injector: Injector;
  data: Signal<TData>;
  page: WritableSignal<number>;
  pageSize: WritableSignal<number>;
  searchInput: WritableSignal<string>;
  searchQuery: WritableSignal<string>;
  sortBy: WritableSignal<TSort>;
  sortDir: WritableSignal<TableSortDirection>;
  parseRouteState: (
    paramMap: ParamMap,
    queryParamMap: ParamMap,
  ) => ParsedRouteState<TSort, TExtraState>;
  applyExtraState: (extraState: TExtraState) => void;
  currentExtraQueryParams: () => TExtraQueryParams;
  load: () => void;
  searchDebounceMs?: number;
}) {
  const totalPages = computed(() => {
    const data = config.data();
    return data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  });

  const from = computed(() => {
    const data = config.data();
    if (!data || data.total === 0) return 0;
    return (data.page - 1) * data.page_size + 1;
  });

  const to = computed(() => {
    const data = config.data();
    if (!data || data.total === 0) return 0;
    return Math.min(data.page * data.page_size, data.total);
  });

  const hasPrev = computed(() => !!config.data()?.has_prev);
  const hasNext = computed(() => !!config.data()?.has_next);

  const visiblePages = computed<TablePaginationItem[]>(() => {
    const total = totalPages();
    const current = config.page();

    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, 'ellipsis-right', total];
    }

    if (current >= total - 2) {
      return [1, 'ellipsis-left', total - 3, total - 2, total - 1, total];
    }

    return [
      1,
      'ellipsis-left',
      current - 1,
      current,
      current + 1,
      'ellipsis-right',
      total,
    ];
  });

  const navigateWithQuery = (partial: TableQueryParams<TSort>) => {
    const current: CommonTableQueryParams<TSort> & TExtraQueryParams = {
      page: config.page(),
      page_size: config.pageSize(),
      search: config.searchQuery() || null,
      sort_by: config.sortBy(),
      sort_order: config.sortDir(),
      ...config.currentExtraQueryParams(),
    };

    const queryParams = {
      ...current,
      ...partial,
      search: (partial.search ?? current.search) || null,
    };

    config.router.navigate([], {
      relativeTo: config.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  };

  const setSort = (column: TSort) => {
    const nextDir =
      config.sortBy() === column
        ? config.sortDir() === 'asc'
          ? 'desc'
          : 'asc'
        : 'desc';

    navigateWithQuery({
      page: 1,
      sort_by: column,
      sort_order: nextDir,
    });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages() || page === config.page()) return;
    navigateWithQuery({ page });
  };

  const goPrevPage = () => {
    if (!hasPrev()) return;
    navigateWithQuery({ page: config.page() - 1 });
  };

  const goNextPage = () => {
    if (!hasNext()) return;
    navigateWithQuery({ page: config.page() + 1 });
  };

  const connect = () => {
    combineLatest([config.route.paramMap, config.route.queryParamMap])
      .pipe(takeUntilDestroyed(config.destroyRef))
      .subscribe(([paramMap, queryParamMap]) => {
        const parsed = config.parseRouteState(paramMap, queryParamMap);

        config.page.set(parsed.page);
        config.pageSize.set(parsed.pageSize);
        config.searchQuery.set(parsed.search);
        config.sortBy.set(parsed.sortBy);
        config.sortDir.set(parsed.sortDir);
        config.applyExtraState(parsed.extraState);

        if (config.searchInput() !== parsed.search) {
          config.searchInput.set(parsed.search);
        }

        config.load();
      });

    toObservable(config.searchInput, { injector: config.injector })
      .pipe(
        debounceTime(config.searchDebounceMs ?? 300),
        distinctUntilChanged(),
        takeUntilDestroyed(config.destroyRef),
      )
      .subscribe((value) => {
        const normalized = value.trim();

        if (normalized === config.searchQuery()) return;

        navigateWithQuery({
          page: 1,
          search: normalized || null,
        });
      });
  };

  return {
    connect,
    from,
    goNextPage,
    goPrevPage,
    goToPage,
    hasNext,
    hasPrev,
    navigateWithQuery,
    setSort,
    to,
    totalPages,
    visiblePages,
  };
}
