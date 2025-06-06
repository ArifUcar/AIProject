export interface PaginatedResponse<T> {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    items: T[];
  }