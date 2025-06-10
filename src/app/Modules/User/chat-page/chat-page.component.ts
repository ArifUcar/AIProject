import { Component, OnInit, HostListener, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
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
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatSessionComponent, ChatMessagesComponent],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss'
})
export class ChatPageComponent implements OnInit, OnDestroy {
  sessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  messages: Message[] = [];
  
  // Mobile properties
  isMobile: boolean = false;
  showSessions: boolean = true;

  // Loading states
  isLoadingSessions: boolean = false;
  isLoadingMessages: boolean = false;
  isSendingMessage: boolean = false;
  isCreatingSession: boolean = false;
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
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
    } else {
      this.isMobile = false;
      this.showSessions = true;
    }
    this.loadSessions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
    }
  }

  private checkScreenSize() {
    if (typeof window === 'undefined') return;
    
    this.isMobile = window.innerWidth <= 640;
    
    if (this.isMobile && this.currentSessionId) {
      this.showSessions = false;
    } else if (!this.isMobile) {
      this.showSessions = true;
    }
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
    
    if (this.isMobile) {
      this.showSessions = false;
    }
    
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onNewSession() {
    this.isCreatingSession = true;
    this.errorMessage = '';

    const request: CreateSessionRequest = {
      title: 'Yeni Sohbet',
      modelUsed: 'gemini-2.0-flash'
    };

    this.chatSessionService.createSession(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isCreatingSession = false)
      )
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
          
          if (this.isMobile) {
            this.showSessions = false;
          }
        },
        error: (error) => {
          console.error('Yeni oturum oluşturulurken hata:', error);
          this.errorMessage = 'Yeni oturum oluşturulamadı.';
          this.createLocalSession();
        }
      });
  }

  private createLocalSession() {
    const newSession: ChatSession = {
      id: 'local-' + Date.now().toString(),
      title: 'Yeni Sohbet (Local)',
      lastMessage: 'Henüz mesaj yok',
      timestamp: new Date(),
      messageCount: 0
    };
    
    this.sessions.unshift(newSession);
    this.currentSessionId = newSession.id;
    this.messages = [];
    
    if (this.isMobile) {
      this.showSessions = false;
    }
  }

  onSendMessage(messageData: string) {
    if (!this.currentSessionId || this.isSendingMessage) return;

    this.isSendingMessage = true;
    this.errorMessage = '';

    try {
      const parsedData = JSON.parse(messageData);
      const message = parsedData.message || '';
      const base64Images = parsedData.images || [];

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
      
      setTimeout(() => this.scrollToBottom(), 100);

      const request: SendMessageRequest = {
        sessionId: this.currentSessionId,
        message: message,
        base64Images: base64Images
      };

      this.chatMessageService.sendMessage(request)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isSendingMessage = false;
            setTimeout(() => this.refreshMessagesAfterSend(), 100);
          })
        )
        .subscribe({
          next: (response: ChatMessageDto) => {
            this.updateSessionLastMessage(this.currentSessionId!, message);
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
      this.sessions[sessionIndex].messageCount = (this.sessions[sessionIndex].messageCount || 0) + 1;
    }
  }

  private refreshMessagesAfterSend() {
    if (!this.currentSessionId) return;

    this.isWaitingForAIResponse = true;
    this.pollForNewMessages(0);
  }

  private pollForNewMessages(attempt: number) {
    if (!this.currentSessionId || attempt >= 5) {
      if (attempt >= 5) {
        this.isWaitingForAIResponse = false;
        this.simulateAIResponse();
      }
      return;
    }

    const delay = attempt === 0 ? 1000 : 2000;
    
    setTimeout(() => {
      this.chatMessageService.getBySessionIdMessages(this.currentSessionId!, {
        pageNumber: 1,
        pageSize: this.pageSize,
        includeDeleted: false
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const newMessages = this.mapMessagesToLocal(response.items || []);
            const currentCount = this.messages.length;
            const newCount = newMessages.length;
            
            if (newCount > currentCount) {
              this.messages = newMessages;
              this.totalMessages = response.totalCount || 0;
              this.hasMoreMessages = (this.currentPage * this.pageSize) < this.totalMessages;
              this.isWaitingForAIResponse = false;
              setTimeout(() => this.scrollToBottom(), 100);
              return;
            } else {
              this.pollForNewMessages(attempt + 1);
            }
          },
          error: (error) => {
            if (attempt < 2) {
              this.pollForNewMessages(attempt + 1);
            } else {
              this.isWaitingForAIResponse = false;
              this.simulateAIResponse();
            }
          }
        });
    }, delay);
  }

  private simulateAIResponse() {
    const aiResponse: Message = {
      id: Date.now(),
      content: 'Özür dilerim, şu anda AI servisiyle bağlantı kuramıyorum. Lütfen daha sonra tekrar deneyin.',
      sender: 'ai',
      timestamp: new Date(),
      hasImage: false,
      imageUrl: [],
      messageStatus: 0,
      isActive: true
    };
    this.messages.push(aiResponse);
    setTimeout(() => this.scrollToBottom(), 100);
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
            setTimeout(() => this.scrollToBottom(), 200);
          }

          this.totalMessages = response.totalCount || 0;
          this.hasMoreMessages = (this.currentPage * this.pageSize) < this.totalMessages;
        },
        error: (error) => {
          console.error('Mesajlar yüklenirken hata:', error);
          this.errorMessage = 'Mesajlar yüklenirken hata oluştu.';
          
          if (!loadMore) {
            this.messages = [];
          }
        }
      });
  }

  onLoadMoreMessages() {
    if (!this.currentSessionId || this.isLoadingMessages || !this.hasMoreMessages) {
      return;
    }

    this.currentPage++;
    this.loadMessages(this.currentSessionId, true);
  }

  onRefreshMessages() {
    if (this.currentSessionId) {
      this.loadMessages(this.currentSessionId);
    }
  }

  private mapMessagesToLocal(messages: ChatMessageDto[]): Message[] {
    return messages
      .sort((a, b) => {
        const dateA = new Date(a.createdDate || a.sentAt).getTime();
        const dateB = new Date(b.createdDate || b.sentAt).getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        
        if (a.senderType !== b.senderType) {
          return a.senderType === 1 ? -1 : 1;
        }
        
        return 0;
      })
      .map((msg, index) => {
        let processedImageUrls: string[] = [];
        
        if (msg.imageUrl && Array.isArray(msg.imageUrl) && msg.imageUrl.length > 0) {
          processedImageUrls = msg.imageUrl
            .filter(url => url && typeof url === 'string' && url.trim() !== '')
            .filter(url => url !== '');
        }

        const hasImage = processedImageUrls.length > 0;

        return {
          id: parseInt(msg.id) || index,
          content: msg.content || 'Mesaj içeriği bulunamadı',
          sender: msg.senderType === 1 ? 'user' : 'ai',
          timestamp: new Date(msg.createdDate || msg.sentAt),
          hasImage: hasImage,
          imageUrl: processedImageUrls,
          messageStatus: msg.messageStatus,
          isActive: msg.isActive
        };
      });
  }

  private scrollToBottom() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const messagesContainer = document.querySelector('.chat-messages-container') || 
                               document.querySelector('.messages-container') ||
                               document.querySelector('[data-messages-container]');
      
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        setTimeout(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
    } catch (error) {
      console.warn('Scroll işlemi başarısız:', error);
    }
  }

  onBackToSessions() {
    this.showSessions = true;
  }

  getCurrentSessionTitle(): string {
    if (!this.currentSessionId) return 'Sohbet';
    const session = this.sessions.find(s => s.id === this.currentSessionId);
    return session?.title || 'Sohbet';
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  get isLoading(): boolean {
    return this.isLoadingSessions || this.isLoadingMessages || this.isCreatingSession;
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
      ai: aiMessages,
      totalInSession: this.totalMessages
    };
  }
}
