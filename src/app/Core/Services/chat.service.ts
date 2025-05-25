import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatSessionRequest } from '../../Model/Entity/Request/ChatSession.Request';
import { ChatSessionResponse } from '../../Model/Entity/Response/ChatSession.Response';
import { ChatMessageRequest } from '../../Model/Entity/Request/ChatMessage.Request';
import { ChatMessageResponse } from '../../Model/Entity/Response/ChatMessage.Response';
import { CreateMessageResponse } from '../../Model/Entity/Response/CreateMessage.Response';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/Chat`;

  constructor(private http: HttpClient) {}

  // Oturum Yönetimi
  getSessions(): Observable<ChatSessionResponse[]> {
    return this.http.get<ChatSessionResponse[]>(`${this.apiUrl}/user/sessions`).pipe(
      tap({
        next: (response) => console.log('Oturumlar başarıyla yüklendi:', response),
        error: (error) => console.error('Oturumlar yüklenirken hata:', error)
      })
    );
  }

  createSession(sessionData: ChatSessionRequest): Observable<ChatSessionResponse> {
    const requestData = {
      ...sessionData,
      title: sessionData.title || 'Yeni Sohbet',
      description: sessionData.description || 'Yeni bir sohbet başlatıldı',
      modelUsed: sessionData.modelUsed || 'default'
    };
    console.log('Yeni oturum oluşturma isteği:', requestData);
    return this.http.post<ChatSessionResponse>(`${this.apiUrl}/session`, requestData).pipe(
      tap({
        next: (response) => console.log('Yeni oturum oluşturuldu:', response),
        error: (error) => console.error('Oturum oluşturma hatası:', error)
      })
    );
  }

  getSession(sessionId: string): Observable<ChatSessionResponse> {
    return this.http.get<ChatSessionResponse>(`${this.apiUrl}/session/${sessionId}`);
  }

  updateSession(sessionId: string, sessionData: ChatSessionRequest): Observable<ChatSessionResponse> {
    return this.http.put<ChatSessionResponse>(`${this.apiUrl}/session/${sessionId}`, sessionData);
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/session/${sessionId}`);
  }

  // Mesaj Yönetimi
  sendMessage(messageData: ChatMessageRequest): Observable<CreateMessageResponse> {
    const requestData: ChatMessageRequest = {
      chatSessionId: messageData.chatSessionId,
      sender: 1, // user
      messageContent: messageData.messageContent
    };
    console.log('Mesaj gönderme isteği:', requestData);
    return this.http.post<CreateMessageResponse>(`${this.apiUrl}/message`, requestData);
  }

  getMessages(sessionId: string): Observable<ChatMessageResponse[]> {
    return this.http.get<ChatMessageResponse[]>(`${this.apiUrl}/session/${sessionId}/messages`).pipe(
      tap({
        next: (response) => {
          console.log('Mesajlar başarıyla yüklendi:', response);
          response.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
        },
        error: (error) => console.error('Mesajlar yüklenirken hata:', error)
      })
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/message/${messageId}`);
  }
}
