export interface GetMessagesRequest {
    pageNumber?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    includeDeleted?: boolean;
  }
  