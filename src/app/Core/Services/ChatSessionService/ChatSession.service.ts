import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

export interface CreateSessionRequest {
  title: string;
  modelUsed: string;
}

export interface ChatSessionResponse {
  id: string;
  title: string;
  modelUsed: string;
  userId: string;
  status: number;
  isDeleted: boolean;
  createdDate: string;
  updatedDate: string;
  deleteDate: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  deleteByUserId: string | null;
  messages: any[] | null;
}

export interface ChatSessionListItem {
  id: string;
  title: string;
  modelUsed: string;
  status: number;
  createdDate: string;
  updatedDate: string;
  messageCount: number;
  lastMessageDate: string;
  unreadCount?: number;
}

export interface GetSessionsParams {
  pageNumber: number;
  pageSize: number;
}

export interface DateRangeParams {
  startDate: string;  // ISO 8601 formatında tarih (örn: "2025-06-01T00:00:00Z")
  endDate: string;    // ISO 8601 formatında tarih (örn: "2025-06-30T23:59:59Z")
}

export interface UpdateSessionRequest {
  sessionId: string;
  newTitle: string;
  modelUsed: string;
}

export interface UpdateSessionModelRequest {
  sessionId: string;
  modelUsed: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatSessionService {
  private apiUrl = `${environment.apiUrl}/ChatSession`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private handleError(error: any) {
    console.error('ChatSessionService hatası:', error);
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    // SSR-safe localStorage access
    let token = '';
    
    // Check if we're in browser environment
    if (isPlatformBrowser(this.platformId)) {
      try {
        token = localStorage.getItem('accessToken') || '';
      } catch (error) {
        console.warn('localStorage access error:', error);
        token = '';
      }
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token.trim()}` : 'Bearer '
    });
  }

  createSession(request: CreateSessionRequest): Observable<ChatSessionResponse> {
    return this.http.post<ChatSessionResponse>(
      this.apiUrl, 
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getSessions(params: GetSessionsParams): Observable<ChatSessionListItem[]> {
    const httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber.toString())
      .set('pageSize', params.pageSize.toString());

    return this.http.get<ChatSessionListItem[]>(
      this.apiUrl, 
      { 
        params: httpParams,
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mevcut bir sohbet oturumunun kopyasını oluşturur
   * @param sessionId Kopyalanacak oturumun ID'si
   * @returns Observable<ChatSessionResponse> Kopyalanan oturum bilgileri
   * 
   * @example
   * // Bir oturumu klonlama
   * const sessionId = '0c9636e0-2099-4712-a813-247d17cf2bbd';
   * 
   * this.chatSessionService.cloneSession(sessionId).subscribe({
   *   next: (clonedSession) => {
   *     console.log('Klonlanan oturum:', clonedSession);
   *     // Klonlanan oturum bilgileri:
   *     // - id: Yeni oturum ID'si
   *     // - title: "(Kopya)" eklenmiş başlık
   *     // - modelUsed: "(Kopya)" eklenmiş model
   *     // - messages: Boş mesaj listesi
   *   },
   *   error: (error) => {
   *     console.error('Oturum klonlama hatası:', error);
   *   }
   * });
   */
  cloneSession(sessionId: string): Observable<ChatSessionResponse> {
    return this.http.post<ChatSessionResponse>(`${this.apiUrl}/clone/${sessionId}`, {}, { headers: this.getHeaders() });
  }

  /**
   * Belirli bir sohbet oturumunun detaylarını getirir
   * @param sessionId Oturum ID'si
   * @returns Observable<ChatSessionResponse> Oturum detayları
   * 
   * @example
   * // Bir oturumun detaylarını getirme
   * const sessionId = '0c9636e0-2099-4712-a813-247d17cf2bbd';
   * 
   * this.chatSessionService.getSessionById(sessionId).subscribe({
   *   next: (session) => {
   *     console.log('Oturum detayları:', session);
   *     // Oturum bilgileri:
   *     // - id: Oturum ID'si
   *     // - title: Oturum başlığı
   *     // - modelUsed: Kullanılan model
   *     // - userId: Kullanıcı ID'si
   *     // - status: Oturum durumu
   *     // - isDeleted: Silinme durumu
   *     // - createdDate: Oluşturulma tarihi
   *     // - updatedDate: Güncellenme tarihi
   *     // - messages: Oturum mesajları (null veya mesaj listesi)
   *   },
   *   error: (error) => {
   *     console.error('Oturum detaylarını getirme hatası:', error);
   *   }
   * });
   */
  getSessionById(sessionId: string): Observable<ChatSessionResponse> {
    return this.http.get<ChatSessionResponse>(`${this.apiUrl}/${sessionId}`, { headers: this.getHeaders() });
  }

  /**
   * Belirli bir sohbet oturumunu siler
   * @param sessionId Silinecek oturumun ID'si
   * @returns Observable<void> İşlem başarılı olduğunda boş yanıt döner
   * 
   * @example
   * // Bir oturumu silme
   * const sessionId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
   * 
   * this.chatSessionService.deleteSession(sessionId).subscribe({
   *   next: () => {
   *     console.log('Oturum başarıyla silindi');
   *     // Örneğin: Oturum listesini güncelleme
   *     // this.loadSessions();
   *   },
   *   error: (error) => {
   *     console.error('Oturum silme hatası:', error);
   *   }
   * });
   */
  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${sessionId}`, { headers: this.getHeaders() });
  }

  /**
   * Aktif sohbet oturumlarını getirir
   * @returns Observable<ChatSessionListItem[]> Aktif oturumların listesi
   * 
   * @example
   * // Aktif oturumları getirme
   * this.chatSessionService.getActiveSessions().subscribe({
   *   next: (sessions) => {
   *     console.log('Aktif oturumlar:', sessions);
   *     // Her bir oturum için:
   *     // - id: Oturum ID'si
   *     // - title: Oturum başlığı
   *     // - modelUsed: Kullanılan model
   *     // - status: Oturum durumu (1 = aktif)
   *     // - createdDate: Oluşturulma tarihi
   *     // - updatedDate: Güncellenme tarihi
   *     // - messageCount: Mesaj sayısı
   *     // - lastMessageDate: Son mesaj tarihi
   *   },
   *   error: (error) => {
   *     console.error('Aktif oturumları getirme hatası:', error);
   *   }
   * });
   */
  getActiveSessions(): Observable<ChatSessionListItem[]> {
    return this.http.get<ChatSessionListItem[]>(`${this.apiUrl}/active`, { headers: this.getHeaders() });
  }

  /**
   * Belirli bir tarih aralığındaki sohbet oturumlarını getirir
   * @param params Tarih aralığı parametreleri
   * @returns Observable<ChatSessionListItem[]> Tarih aralığındaki oturumların listesi
   * 
   * @example
   * // Haziran 2025 ayındaki oturumları getirme
   * const params: DateRangeParams = {
   *   startDate: '2025-06-01T00:00:00Z',
   *   endDate: '2025-06-30T23:59:59Z'
   * };
   * 
   * this.chatSessionService.getSessionsByDateRange(params).subscribe({
   *   next: (sessions) => {
   *     console.log('Tarih aralığındaki oturumlar:', sessions);
   *     // Her bir oturum için:
   *     // - id: Oturum ID'si
   *     // - title: Oturum başlığı
   *     // - modelUsed: Kullanılan model
   *     // - createdDate: Oluşturulma tarihi
   *     // - messageCount: Mesaj sayısı
   *     // - lastMessageDate: Son mesaj tarihi
   *   },
   *   error: (error) => {
   *     console.error('Tarih aralığındaki oturumları getirme hatası:', error);
   *   }
   * });
   */
  getSessionsByDateRange(params: DateRangeParams): Observable<ChatSessionListItem[]> {
    const httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate);

    return this.http.get<ChatSessionListItem[]>(`${this.apiUrl}/date-range`, { params: httpParams, headers: this.getHeaders() });
  }

  /**
   * Sohbet oturumunu günceller
   * @param request Güncelleme isteği parametreleri
   * @returns Observable<ChatSessionResponse> Güncellenmiş oturum bilgileri
   * 
   * @example
   * // Bir oturumu güncelleme
   * const request: UpdateSessionRequest = {
   *   sessionId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
   *   newTitle: 'Yeni Başlık',
   *   modelUsed: 'gemini-2.0-flash'
   * };
   * 
   * this.chatSessionService.updateSession(request).subscribe({
   *   next: (updatedSession) => {
   *     console.log('Oturum güncellendi:', updatedSession);
   *     // Güncellenmiş oturum bilgileri:
   *     // - id: Oturum ID'si
   *     // - title: Yeni başlık
   *     // - modelUsed: Yeni model
   *     // - updatedDate: Güncelleme tarihi
   *   },
   *   error: (error) => {
   *     console.error('Oturum güncelleme hatası:', error);
   *   }
   * });
   */
  updateSession(request: UpdateSessionRequest): Observable<ChatSessionResponse> {
    return this.http.put<ChatSessionResponse>(`${this.apiUrl}/Session/Update`, request, { headers: this.getHeaders() });
  }

  /**
   * Sohbet oturumunun modelini günceller
   * @param request Model güncelleme isteği parametreleri
   * @returns Observable<ChatSessionResponse> Güncellenmiş oturum bilgileri
   * 
   * @example
   * // Bir oturumun modelini güncelleme
   * const request: UpdateSessionModelRequest = {
   *   sessionId: '0bdbb901-44d1-46b7-bf41-fad03c350983',
   *   modelUsed: 'gemini-2.0-flash'
   * };
   * 
   * this.chatSessionService.updateSessionModel(request).subscribe({
   *   next: (updatedSession) => {
   *     console.log('Oturum modeli güncellendi:', updatedSession);
   *     // Güncellenmiş oturum bilgileri:
   *     // - id: Oturum ID'si
   *     // - modelUsed: Yeni model
   *     // - updatedDate: Güncelleme tarihi
   *     // - updatedByUserId: Güncelleyen kullanıcı ID'si
   *   },
   *   error: (error) => {
   *     console.error('Oturum modeli güncelleme hatası:', error);
   *   }
   * });
   */
  updateSessionModel(request: UpdateSessionModelRequest): Observable<ChatSessionResponse> {
    return this.http.put<ChatSessionResponse>(`${this.apiUrl}/Session/Model/Update`, request, { headers: this.getHeaders() });
  }

  /**
   * Sohbet oturumunu yumuşak silme (soft delete) işlemi yapar
   * @param sessionId Silinecek oturumun ID'si
   * @returns Observable<void> İşlem başarılı olduğunda boş yanıt döner
   * 
   * @example
   * // Bir oturumu yumuşak silme
   * const sessionId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
   * 
   * this.chatSessionService.softDeleteSession(sessionId).subscribe({
   *   next: () => {
   *     console.log('Oturum yumuşak silme işlemi başarılı');
   *     // Oturum veritabanından tamamen silinmez,
   *     // sadece isDeleted flag'i true olarak işaretlenir
   *   },
   *   error: (error) => {
   *     console.error('Oturum yumuşak silme hatası:', error);
   *   }
   * });
   */
  softDeleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${sessionId}/soft`, { headers: this.getHeaders() });
  }

  /**
   * Sohbet oturumlarında başlığa göre arama yapar
   * @param searchTerm Aranacak metin
   * @returns Observable<ChatSessionListItem[]> Arama sonuçlarını içeren oturum listesi
   * 
   * @example
   * // Oturumlarda arama yapma
   * const searchTerm = 'ilk';
   * 
   * this.chatSessionService.searchSessions(searchTerm).subscribe({
   *   next: (sessions) => {
   *     console.log('Bulunan oturumlar:', sessions);
   *     // Her bir oturum için:
   *     // - id: Oturum ID'si
   *     // - title: Oturum başlığı
   *     // - modelUsed: Kullanılan model
   *     // - status: Oturum durumu
   *     // - createdDate: Oluşturulma tarihi
   *     // - updatedDate: Güncellenme tarihi
   *     // - messageCount: Mesaj sayısı
   *     // - lastMessageDate: Son mesaj tarihi
   *   },
   *   error: (error) => {
   *     console.error('Arama hatası:', error);
   *   }
   * });
   */
  searchSessions(searchTerm: string): Observable<ChatSessionListItem[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<ChatSessionListItem[]>(`${this.apiUrl}/search`, { params: params, headers: this.getHeaders() });
  }
}
