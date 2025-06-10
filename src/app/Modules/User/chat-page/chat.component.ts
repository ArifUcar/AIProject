import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChatSessionComponent } from './chat-session/chat-session.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { Subject, takeUntil, finalize } from 'rxjs';

// Services
import { ChatSessionService, ChatSessionListItem, CreateSessionRequest } from '../../../Core/Services/ChatSessionService/ChatSession.service';
import { ChatMessageService } from '../../../Core/Services/ChatMessageService/ChatMessageService';

// Models
import { SendMessageRequest } from '../../../Model/Entity/Message/SentMessage.Request';
import { ChatMessageDto } from '../../../Model/Entity/Message/ChatMessageDto';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount?: number;
}

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  hasImage: boolean;
  imageUrl?: string[];
  messageStatus: number;
  isActive: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatSessionComponent, ChatMessagesComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild(ChatMessagesComponent) chatMessagesComponent!: ChatMessagesComponent;
  
  sessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  messages: Message[] = [];
  
  // Loading states
  isLoadingSessions: boolean = false;
  isLoadingMessages: boolean = false;
  isSendingMessage: boolean = false;
  isWaitingForAIResponse: boolean = false;

  // Error handling
  errorMessage: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalMessages: number = 0;
  hasMoreMessages: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private chatSessionService: ChatSessionService,
    private chatMessageService: ChatMessageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadSessions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSessions() {
    this.isLoadingSessions = true;
    this.errorMessage = '';

    this.chatSessionService.getActiveSessions()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingSessions = false)
      )
      .subscribe({
        next: (sessions: ChatSessionListItem[]) => {
          this.sessions = this.mapSessionsToLocal(sessions);
        },
        error: (error) => {
          console.error('Oturumlar yüklenirken hata:', error);
          this.errorMessage = 'Oturumlar yüklenirken hata oluştu.';
          this.loadTestSessions();
        }
      });
  }

  private mapSessionsToLocal(sessions: ChatSessionListItem[]): ChatSession[] {
    return sessions.map(session => ({
      id: session.id,
      title: session.title,
      lastMessage: this.formatLastMessage(session),
      timestamp: new Date(session.updatedDate || session.createdDate),
      messageCount: session.messageCount
    }));
  }

  private formatLastMessage(session: ChatSessionListItem): string {
    if (session.messageCount === 0) {
      return 'Henüz mesaj yok';
    }
    
    const lastMessageDate = new Date(session.lastMessageDate || session.updatedDate || session.createdDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastMessageDate.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Az önce';
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays <= 7) return `${diffDays} gün önce`;
    
    return lastMessageDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: lastMessageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  private loadTestSessions() {
    this.sessions = [
      {
        id: 'test-1',
        title: 'Genel Sohbet',
        lastMessage: 'Merhaba, nasıl yardımcı olabilirim?',
        timestamp: new Date(),
        messageCount: 1
      }
    ];
  }

  onSessionSelected(sessionId: string) {
    this.currentSessionId = sessionId;
    this.currentPage = 1;
    this.loadMessages(sessionId);
    this.scrollToBottom();
  }

  onNewSession() {
    const request: CreateSessionRequest = {
      title: 'Yeni Sohbet',
      modelUsed: 'gemini-2.0-flash'
    };

    this.chatSessionService.createSession(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newSession) => {
          const localSession: ChatSession = {
            id: newSession.id,
            title: newSession.title,
            lastMessage: 'Henüz mesaj yok',
            timestamp: new Date(newSession.createdDate),
            messageCount: 0
          };
          
          this.sessions.unshift(localSession);
          this.currentSessionId = newSession.id;
          this.messages = [];
        },
        error: (error) => {
          console.error('Yeni oturum oluşturulurken hata:', error);
          this.errorMessage = 'Yeni oturum oluşturulamadı.';
        }
      });
  }

  onSendMessage(messageData: string) {
    if (!this.currentSessionId || this.isSendingMessage) return;

    this.isSendingMessage = true;
    this.errorMessage = '';

    try {
      const parsedData = JSON.parse(messageData);
      const message = parsedData.message || '';
      const base64Images = parsedData.images || [];

      // Kullanıcı mesajını ekle
      const userMessage: Message = {
        id: Date.now(),
        content: message,
        sender: 'user',
        timestamp: new Date(),
        hasImage: base64Images.length > 0,
        imageUrl: base64Images,
        messageStatus: 0,
        isActive: true
      };
      
      this.messages = [...this.messages, userMessage];
      this.updateSessionLastMessage(this.currentSessionId!, message);
      this.scrollToBottom();

      const request: SendMessageRequest = {
        sessionId: this.currentSessionId,
        message: message,
        base64Images: base64Images
      };

      this.chatMessageService.sendMessage(request)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isSendingMessage = false)
        )
        .subscribe({
          next: (response: ChatMessageDto) => {
            this.refreshMessages();
          },
          error: (error) => {
            console.error('Mesaj gönderilirken hata:', error);
            this.errorMessage = 'Mesaj gönderilemedi.';
          }
        });
    } catch (error) {
      console.error('Mesaj verisi işlenirken hata:', error);
      this.isSendingMessage = false;
      this.errorMessage = 'Mesaj formatı hatalı.';
    }
  }

  private updateSessionLastMessage(sessionId: string, lastMessage: string) {
    const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      this.sessions[sessionIndex].lastMessage = lastMessage.length > 50 
        ? lastMessage.substring(0, 50) + '...' 
        : lastMessage;
      this.sessions[sessionIndex].timestamp = new Date();
    }
  }

  private refreshMessages() {
    if (!this.currentSessionId) return;

    setTimeout(() => {
      this.loadMessages(this.currentSessionId!, false);
    }, 1000);
  }

  private loadMessages(sessionId: string, loadMore: boolean = false) {
    this.isLoadingMessages = true;
    this.errorMessage = '';
    
    if (!loadMore) {
      this.currentPage = 1;
      this.messages = [];
    }

    const params = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      includeDeleted: false
    };

    this.chatMessageService.getBySessionIdMessages(sessionId, params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMessages = false)
      )
      .subscribe({
        next: (response) => {
          const newMessages = this.mapMessagesToLocal(response.items || []);
          
          if (loadMore) {
            this.messages = [...newMessages, ...this.messages];
          } else {
            this.messages = newMessages;
            this.scrollToBottom();
          }

          this.totalMessages = response.totalCount || 0;
          this.hasMoreMessages = (this.currentPage * this.pageSize) < this.totalMessages;
        },
        error: (error) => {
          console.error('Mesajlar yüklenirken hata:', error);
          this.errorMessage = 'Mesajlar yüklenirken hata oluştu.';
        }
      });
  }

  onLoadMoreMessages() {
    if (!this.currentSessionId || this.isLoadingMessages || !this.hasMoreMessages) return;

    this.currentPage++;
    this.loadMessages(this.currentSessionId, true);
  }

  private mapMessagesToLocal(messages: ChatMessageDto[]): Message[] {
    return messages
      .sort((a, b) => {
        const dateA = new Date(a.createdDate || a.sentAt).getTime();
        const dateB = new Date(b.createdDate || b.sentAt).getTime();
        return dateA - dateB;
      })
      .map((msg, index) => {
        let processedImageUrls: string[] = [];
        
        if (msg.imageUrl && Array.isArray(msg.imageUrl)) {
          processedImageUrls = msg.imageUrl.filter(url => url && url.trim() !== '');
        }

        return {
          id: parseInt(msg.id) || index,
          content: msg.content || 'Mesaj içeriği bulunamadı',
          sender: msg.senderType === 1 ? 'user' : 'ai',
          timestamp: new Date(msg.createdDate || msg.sentAt),
          hasImage: processedImageUrls.length > 0,
          imageUrl: processedImageUrls,
          messageStatus: msg.messageStatus,
          isActive: msg.isActive
        };
      });
  }

  private scrollToBottom() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    setTimeout(() => {
      if (this.chatMessagesComponent) {
        this.chatMessagesComponent.forceScrollToBottom();
      }
    }, 100);
  }

  getCurrentSessionTitle(): string {
    if (!this.currentSessionId) return 'Sohbet';
    const session = this.sessions.find(s => s.id === this.currentSessionId);
    return session?.title || 'Sohbet';
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  get hasActiveSessions(): boolean {
    return this.sessions.length > 0;
  }

  get hasMessages(): boolean {
    return this.messages.length > 0;
  }

  get canLoadMore(): boolean {
    return this.hasMoreMessages && !this.isLoadingMessages;
  }

  get messageStats() {
    const userMessages = this.messages.filter(m => m.sender === 'user').length;
    const aiMessages = this.messages.filter(m => m.sender === 'ai').length;
    
    return {
      total: this.messages.length,
      user: userMessages,
      ai: aiMessages
    };
  }
} 