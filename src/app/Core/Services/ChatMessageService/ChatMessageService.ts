import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SendMessageRequest } from '../../../Model/Entity/Message/SentMessage.Request';
import { SendMessageResponse } from '../../../Model/Entity/Message/SentMessage.Response';
import { GetMessagesRequest } from '../../../Model/Entity/Message/GetMessage.Request';
import { PaginatedResponse } from '../../../Model/Entity/Message/Paginated.Response';
import { SenderType } from '../../../Model/Enums/SenderType';
import { DateRangeRequest } from '../../../Model/Entity/Message/DateRange.Request';
import { BulkDeleteRequest } from '../../../Model/Entity/Message/BulkDelete.Request';

interface UserMessageStats {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  systemMessages: number;
  averageMessageLength: number;
  messagesWithImages: number;
  dailyMessageDistribution: { [key: string]: number } | null;
  weeklyMessageDistribution: { [key: string]: number } | null;
  monthlyMessageDistribution: { [key: string]: number } | null;
  firstMessageDate: string | null;
  lastMessageDate: string | null;
}

interface AdvancedSearchParams {
  searchTerm: string;
  caseSensitive?: boolean;
  includeDeleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatMessageService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  sendMessage(request: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http.post<SendMessageResponse>(`${this.apiUrl}/ChatMessage/send`, request);
  }

  getBySessionIdMessages(sessionId: string, params: GetMessagesRequest = {}): Observable<PaginatedResponse<SendMessageResponse>> {
    let httpParams = new HttpParams();
    
    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<PaginatedResponse<SendMessageResponse>>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}`,
      { params: httpParams }
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ChatMessage/${messageId}`);
  }

  getMessageById(messageId: string): Observable<SendMessageResponse> {
    return this.http.get<SendMessageResponse>(`${this.apiUrl}/ChatMessage/${messageId}`);
  }

  deleteSessionMessages(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ChatMessage/session/${sessionId}`);
  }

  deleteUserMessages(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ChatMessage/user/userId`);
  }

  getMessagesByDateRange(sessionId: string, dateRange: DateRangeRequest): Observable<SendMessageResponse[]> {
    let httpParams = new HttpParams()
      .set('startDate', dateRange.startDate)
      .set('endDate', dateRange.endDate);

    return this.http.get<SendMessageResponse[]>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}/date-range`,
      { params: httpParams }
    );
  }

  getMessagesBySenderType(sessionId: string, senderType: SenderType): Observable<SendMessageResponse[]> {
    return this.http.get<SendMessageResponse[]>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}/sender/${senderType}`
    );
  }

  deleteMessagesBulk(messageIds: string[]): Observable<void> {
    const request: BulkDeleteRequest = { messageIds };
    return this.http.delete<void>(`${this.apiUrl}/ChatMessage/bulk`, { body: request });
  }

  searchAdminMessages(searchTerm: string): Observable<SendMessageResponse[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<SendMessageResponse[]>(`${this.apiUrl}/ChatMessage/search`, { params });
  }

  searchUserMessages(searchTerm: string): Observable<SendMessageResponse[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<SendMessageResponse[]>(`${this.apiUrl}/ChatMessage/search/user`, { params });
  }

  getUserMessageCount(params?: {
    startDate?: string;
    endDate?: string;
    includeDeleted?: boolean;
  }): Observable<number> {
    let httpParams = new HttpParams();
    
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<number>(`${this.apiUrl}/ChatMessage/user/userId/count`, { params: httpParams });
  }

  getUserMessageStats(params?: {
    startDate?: string;
    endDate?: string;
    includeDeleted?: boolean;
  }): Observable<UserMessageStats> {
    let httpParams = new HttpParams();
    
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<UserMessageStats>(`${this.apiUrl}/ChatMessage/user/userId/stats`, { params: httpParams });
  }

  getSessionMessageStats(
    sessionId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      includeDeleted?: boolean;
    }
  ): Observable<UserMessageStats> {
    let httpParams = new HttpParams();
    
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<UserMessageStats>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}/stats`,
      { params: httpParams }
    );
  }

  validateMessageAccess(messageId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/ChatMessage/validate-access/${messageId}`);
  }

  validateSessionAccess(sessionId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/ChatMessage/validate-session-access/${sessionId}`);
  }

  getSessionMessageCount(
    sessionId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      includeDeleted?: boolean;
    }
  ): Observable<number> {
    let httpParams = new HttpParams();
    
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<number>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}/count`,
      { params: httpParams }
    );
  }

  searchSessionMessages(sessionId: string, searchTerm: string): Observable<SendMessageResponse[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<SendMessageResponse[]>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}/search`,
      { params }
    );
  }

  searchSessionMessagesAdvanced(
    sessionId: string,
    params: AdvancedSearchParams
  ): Observable<SendMessageResponse[]> {
    let httpParams = new HttpParams()
      .set('searchTerm', params.searchTerm);
    
    if (params.caseSensitive !== undefined) {
      httpParams = httpParams.set('caseSensitive', params.caseSensitive.toString());
    }
    if (params.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<SendMessageResponse[]>(
      `${this.apiUrl}/ChatMessage/session/${sessionId}/search/advanced`,
      { params: httpParams }
    );
  }
}
