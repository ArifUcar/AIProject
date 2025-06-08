import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { SendMessageRequest } from '../../../Model/Entity/Message/SentMessage.Request';

import { GetMessagesRequest } from '../../../Model/Entity/Message/GetMessage.Request';
import { PaginatedResponse } from '../../../Model/Entity/Message/Paginated.Response';
import { SenderType } from '../../../Model/Enums/SenderType';
import { DateRangeRequest } from '../../../Model/Entity/Message/DateRange.Request';
import { BulkDeleteRequest } from '../../../Model/Entity/Message/BulkDelete.Request';
import { UserMessageStats } from '../../../Model/Entity/Message/UserMessageStats';
import { AdvancedSearchParams } from '../../../Model/Entity/Message/AdvancedSearchParams';
import { ChatMessageDto } from '../../../Model/Entity/Message/ChatMessageDto';


@Injectable({
  providedIn: 'root'
})
export class ChatMessageService {
  private apiUrl = `${environment.apiUrl}/ChatMessage`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private handleError(error: HttpErrorResponse) {
    console.error('ChatMessageService hatası:', error);
    
    if (error.error instanceof ErrorEvent) {
      // İstemci tarafı hatası
      console.error('İstemci hatası:', error.error.message);
    } else {
      // Sunucu tarafı hatası
      console.error(`Sunucu hatası: ${error.status}`, error.error);
    }

    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    // SSR-safe localStorage access
    let token = '';
    
    // Check if we're in browser environment
    if (isPlatformBrowser(this.platformId)) {
      try {
        token = localStorage.getItem('accessToken') || '';
        if (!token) {
          console.warn('Access token bulunamadı, boş token ile devam ediliyor');
        }
      } catch (error) {
        console.warn('localStorage access error:', error);
        token = '';
      }
    } else {
      console.warn('SSR ortamında, token olmadan devam ediliyor');
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token.trim()}` : 'Bearer '
    });
  }

  sendMessage(request: SendMessageRequest): Observable<ChatMessageDto> {
    try {
      const headers = this.getHeaders();
      return this.http.post<ChatMessageDto>(
        `${this.apiUrl}/send`, 
        request,
        { headers }
      ).pipe(
        retry(1), // Bir kez yeniden dene
        catchError(this.handleError)
      );
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      return throwError(() => error);
    }
  }

  getBySessionIdMessages(sessionId: string, params: GetMessagesRequest = {}): Observable<PaginatedResponse<ChatMessageDto>> {
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

    return this.http.get<PaginatedResponse<ChatMessageDto>>(
      `${this.apiUrl}/session/${sessionId}`,
      { 
        params: httpParams,
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${messageId}`);
  }

  getMessageById(messageId: string): Observable<ChatMessageDto> {
    return this.http.get<ChatMessageDto>(`${this.apiUrl}/${messageId}`);
  }

  deleteSessionMessages(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/session/${sessionId}`);
  }

  deleteUserMessages(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user/userId`);
  }

  getMessagesByDateRange(sessionId: string, dateRange: DateRangeRequest): Observable<ChatMessageDto[]> {
    let httpParams = new HttpParams()
      .set('startDate', dateRange.startDate)
      .set('endDate', dateRange.endDate);

    return this.http.get<ChatMessageDto[]>(
      `${this.apiUrl}/session/${sessionId}/date-range`,
      { params: httpParams }
    );
  }

  getMessagesBySenderType(sessionId: string, senderType: SenderType): Observable<ChatMessageDto[]> {
    return this.http.get<ChatMessageDto[]>(
      `${this.apiUrl}/session/${sessionId}/sender/${senderType}`
    );
  }

  deleteMessagesBulk(messageIds: string[]): Observable<void> {
    const request: BulkDeleteRequest = { messageIds };
    return this.http.delete<void>(`${this.apiUrl}/bulk`, { body: request });
  }

  searchAdminMessages(searchTerm: string): Observable<ChatMessageDto[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<ChatMessageDto[]>(`${this.apiUrl}/search`, { params });
  }

  searchUserMessages(searchTerm: string): Observable<ChatMessageDto[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<ChatMessageDto[]>(`${this.apiUrl}/search/user`, { params });
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

    return this.http.get<number>(`${this.apiUrl}/user/userId/count`, { params: httpParams });
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

    return this.http.get<UserMessageStats>(`${this.apiUrl}/user/userId/stats`, { params: httpParams });
  }

  validateMessageAccess(messageId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/validate-access/${messageId}`);
  }

  validateSessionAccess(sessionId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/validate-session-access/${sessionId}`);
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
      `${this.apiUrl}/session/${sessionId}/count`,
      { params: httpParams }
    );
  }

  searchSessionMessages(sessionId: string, searchTerm: string): Observable<ChatMessageDto[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<ChatMessageDto[]>(
      `${this.apiUrl}/session/${sessionId}/search`,
      { params }
    );
  }

  searchSessionMessagesAdvanced(
    sessionId: string,
    params: AdvancedSearchParams
  ): Observable<ChatMessageDto[]> {
    let httpParams = new HttpParams()
      .set('searchTerm', params.searchTerm);
    
    if (params.caseSensitive !== undefined) {
      httpParams = httpParams.set('caseSensitive', params.caseSensitive.toString());
    }
    if (params.includeDeleted !== undefined) {
      httpParams = httpParams.set('includeDeleted', params.includeDeleted.toString());
    }

    return this.http.get<ChatMessageDto[]>(
      `${this.apiUrl}/session/${sessionId}/search/advanced`,
      { params: httpParams }
    );
  }
}
