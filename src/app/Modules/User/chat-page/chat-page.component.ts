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
import { SendMessageResponse } from '../../../Model/Entity/Message/SentMessage.Response';
import { SenderType } from '../../../Model/Enums/SenderType';

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
  
  // Mobile responsive properties
  isMobile: boolean = false;
  showSessions: boolean = true;
  
  // UI Control properties
  isControlsExpanded: boolean = false;

  // Loading states
  isLoadingSessions: boolean = false;
  isLoadingMessages: boolean = false;
  isSendingMessage: boolean = false;
  isCreatingSession: boolean = false;
  isWaitingForAIResponse: boolean = false;

  // Error handling
  errorMessage: string = '';

  // Component lifecycle
  private destroy$ = new Subject<void>();

  // Pagination and filtering properties
  currentPage: number = 1;
  pageSize: number = 50;
  totalMessages: number = 0;
  hasMoreMessages: boolean = false;
  
  // Date filtering
  startDate?: string;
  endDate?: string;
  includeDeleted: boolean = false;

  constructor(
    private chatSessionService: ChatSessionService,
    private chatMessageService: ChatMessageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only check screen size in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
    } else {
      // Set default values for SSR
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
  onResize(event: any) {
    // Only handle resize in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
    }
  }

  private checkScreenSize() {
    // This method should only be called in browser environment
    if (typeof window === 'undefined') {
      console.warn('checkScreenSize called in non-browser environment');
      return;
    }
    
    this.isMobile = window.innerWidth <= 640;
    
    // Mobilde oturum seçiliyse mesajları göster
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
          console.log('Oturumlar yüklendi:', this.sessions);
        },
        error: (error) => {
          console.error('Oturumlar yüklenirken hata:', error);
          this.errorMessage = 'Oturumlar yüklenirken hata oluştu.';
          // Fallback: Local test data
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
    
    // Use lastMessageDate if available, otherwise fallback to updatedDate or createdDate
    const lastMessageDate = new Date(session.lastMessageDate || session.updatedDate || session.createdDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastMessageDate.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
      return 'Az önce';
    } else if (diffHours < 24) {
      return `${diffHours} saat önce`;
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays <= 7) {
      return `${diffDays} gün önce`;
    } else {
      return lastMessageDate.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: lastMessageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  private loadTestSessions() {
    // Test verisi - API çalışmadığında
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
    
    // Reset filters when switching sessions
    this.startDate = undefined;
    this.endDate = undefined;
    this.includeDeleted = false;
    this.currentPage = 1;
    
    this.loadMessages(sessionId);
    
    // Also get message count
    this.onGetMessageCount();
    
    // Mobilde oturum seçildiğinde mesajlara geç
    if (this.isMobile) {
      this.showSessions = false;
    }
  }

  onNewSession() {
    this.isCreatingSession = true;
    this.errorMessage = '';

    const request: CreateSessionRequest = {
      title: 'Yeni Sohbet',
      modelUsed: 'gemini-2.0-flash' // Default model
    };

    this.chatSessionService.createSession(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isCreatingSession = false)
      )
      .subscribe({
        next: (newSession) => {
          console.log('Yeni oturum oluşturuldu:', newSession);
          
          // Local sessions listesine ekle
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
          
          // Mobilde yeni oturum oluşturulduğunda mesajlara geç
          if (this.isMobile) {
            this.showSessions = false;
          }
        },
        error: (error) => {
          console.error('Yeni oturum oluşturulurken hata:', error);
          this.errorMessage = 'Yeni oturum oluşturulamadı.';
          
          // Fallback: Local session oluştur
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

  onSendMessage(message: string) {
    if (!this.currentSessionId || this.isSendingMessage) return;

    this.isSendingMessage = true;
    this.errorMessage = '';

    // Kullanıcı mesajını hemen ekle (optimistic update)
    const userMessage: Message = {
      id: Date.now(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    this.messages.push(userMessage); // Add to end (oldest first ordering)

    const request: SendMessageRequest = {
      sessionId: this.currentSessionId,
      message: message,
      base64Images: []
    };

    this.chatMessageService.sendMessage(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSendingMessage = false)
      )
      .subscribe({
        next: (response: SendMessageResponse) => {
          console.log('Mesaj gönderildi:', response);
          
          // Yanıt başarılı ise session listesindeki son mesajı güncelle
          this.updateSessionLastMessage(this.currentSessionId!, message);
          
          // Mesaj gönderildikten sonra güncel mesajları getir (AI response dahil)
          this.refreshMessagesAfterSend();
        },
        error: (error) => {
          console.error('Mesaj gönderilirken hata:', error);
          this.errorMessage = 'Mesaj gönderilemedi.';
          
          // Hata durumunda da mesajları yenile (belki mesaj gönderilmiştir)
          this.refreshMessagesAfterSend();
        }
      });
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
       // 5 deneme sonrasında fallback
       if (attempt >= 5) {
         console.log('AI yanıtı için maksimum deneme sayısına ulaşıldı, simulated response gösteriliyor');
         this.isWaitingForAIResponse = false;
         this.simulateAIResponse();
       }
       return;
     }

    const delay = attempt === 0 ? 1000 : 2000; // İlk deneme 1s, sonrakiler 2s
    
    setTimeout(() => {
      console.log(`Mesajlar kontrol ediliyor... Deneme: ${attempt + 1}`);
      
      this.chatMessageService.getBySessionIdMessages(this.currentSessionId!, {
        pageNumber: 1,
        pageSize: this.pageSize,
        includeDeleted: this.includeDeleted
      })
        .pipe(
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (response) => {
            const newMessages = this.mapMessagesToLocal(response.items || []);
            const currentCount = this.messages.length;
            const newCount = newMessages.length;
            
            console.log(`Mesaj sayısı: ${currentCount} → ${newCount}`);
            
                         if (newCount > currentCount) {
               // Yeni mesaj(lar) var, güncelle
               console.log('Yeni mesajlar bulundu, güncelleniyor...');
               this.messages = newMessages;
               
               // Pagination bilgilerini güncelle
               this.totalMessages = response.totalCount || 0;
               this.hasMoreMessages = (this.currentPage * this.pageSize) < this.totalMessages;
               
               // Başarılı, loading'i durdur
               this.isWaitingForAIResponse = false;
               return;
            } else {
              // Henüz yeni mesaj yok, tekrar dene
              console.log('Henüz yeni mesaj yok, tekrar deneniyor...');
              this.pollForNewMessages(attempt + 1);
            }
          },
          error: (error) => {
            console.error('Mesajları kontrol ederken hata:', error);
            
                         if (attempt < 2) {
               // İlk 2 denemede hata varsa tekrar dene
               this.pollForNewMessages(attempt + 1);
             } else {
               // 3. denemede de hata varsa fallback
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
      timestamp: new Date()
    };
    this.messages.push(aiResponse); // Add to end (oldest first ordering)
  }

  private loadMessages(sessionId: string, loadMore: boolean = false) {
    this.isLoadingMessages = true;
    this.errorMessage = '';
    
    // Reset pagination if not loading more
    if (!loadMore) {
      this.currentPage = 1;
      this.messages = [];
    }

    const params = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      startDate: this.startDate,
      endDate: this.endDate,
      includeDeleted: this.includeDeleted
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
            // Older messages'ı başa ekle (oldest first order maintained)
            this.messages = [...newMessages, ...this.messages];
          } else {
            // Yeni mesaj listesi
            this.messages = newMessages;
          }

          // Pagination bilgilerini güncelle
          this.totalMessages = response.totalCount || 0;
          this.hasMoreMessages = (this.currentPage * this.pageSize) < this.totalMessages;
        },
        error: (error) => {
          console.error('Mesajlar yüklenirken hata:', error);
          this.errorMessage = 'Mesajlar yüklenirken hata oluştu.';
          
          if (!loadMore) {
            this.messages = []; // Boş mesaj listesi göster
          }
        }
      });
  }

  // Load more messages (pagination)
  onLoadMoreMessages() {
    if (!this.currentSessionId || this.isLoadingMessages || !this.hasMoreMessages) {
      return;
    }

    this.currentPage++;
    this.loadMessages(this.currentSessionId, true);
  }

  // Filter messages by date range
  onFilterMessagesByDate(startDate: string, endDate: string) {
    if (!this.currentSessionId) return;

    this.startDate = startDate;
    this.endDate = endDate;
    this.loadMessages(this.currentSessionId);
  }

  // Clear date filter
  onClearDateFilter() {
    this.startDate = undefined;
    this.endDate = undefined;
    if (this.currentSessionId) {
      this.loadMessages(this.currentSessionId);
    }
  }

  // Toggle include deleted messages
  onToggleIncludeDeleted() {
    this.includeDeleted = !this.includeDeleted;
    if (this.currentSessionId) {
      this.loadMessages(this.currentSessionId);
    }
  }

  // Get messages count for current session
  onGetMessageCount() {
    if (!this.currentSessionId) return;

    const params = {
      startDate: this.startDate,
      endDate: this.endDate,
      includeDeleted: this.includeDeleted
    };

    this.chatMessageService.getSessionMessageCount(this.currentSessionId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          console.log('Toplam mesaj sayısı:', count);
          this.totalMessages = count;
        },
        error: (error) => {
          console.error('Mesaj sayısı alınırken hata:', error);
        }
      });
  }

  // Search messages in current session
  onSearchMessages(searchTerm: string) {
    if (!this.currentSessionId || !searchTerm.trim()) {
      // Clear search, reload messages
      if (this.currentSessionId) {
        this.loadMessages(this.currentSessionId);
      }
      return;
    }

    this.isLoadingMessages = true;

    this.chatMessageService.searchSessionMessages(this.currentSessionId, searchTerm)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMessages = false)
      )
      .subscribe({
        next: (searchResults) => {
          console.log('Arama sonuçları:', searchResults);
          this.messages = this.mapMessagesToLocal(searchResults);
          this.hasMoreMessages = false; // Search results don't have pagination
        },
        error: (error) => {
          console.error('Mesaj arama hatası:', error);
          this.errorMessage = 'Mesaj arama işlemi başarısız.';
        }
      });
  }

  // Advanced search with more options
  onAdvancedSearchMessages(searchTerm: string, caseSensitive: boolean = false) {
    if (!this.currentSessionId || !searchTerm.trim()) {
      if (this.currentSessionId) {
        this.loadMessages(this.currentSessionId);
      }
      return;
    }

    this.isLoadingMessages = true;

    const params = {
      searchTerm,
      caseSensitive,
      includeDeleted: this.includeDeleted
    };

    this.chatMessageService.searchSessionMessagesAdvanced(this.currentSessionId, params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMessages = false)
      )
      .subscribe({
        next: (searchResults) => {
          console.log('Gelişmiş arama sonuçları:', searchResults);
          this.messages = this.mapMessagesToLocal(searchResults);
          this.hasMoreMessages = false;
        },
        error: (error) => {
          console.error('Gelişmiş arama hatası:', error);
          this.errorMessage = 'Gelişmiş arama işlemi başarısız.';
        }
      });
  }

  // Get messages by sender type (User or AI)
  onFilterMessagesBySender(senderType: 'user' | 'ai') {
    if (!this.currentSessionId) return;

    this.isLoadingMessages = true;
    
    const apiSenderType = senderType === 'user' ? 1 : 2; // SenderType enum values

    this.chatMessageService.getMessagesBySenderType(this.currentSessionId, apiSenderType)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMessages = false)
      )
      .subscribe({
        next: (filteredMessages) => {
          console.log(`${senderType} mesajları:`, filteredMessages);
          this.messages = this.mapMessagesToLocal(filteredMessages);
          this.hasMoreMessages = false;
        },
        error: (error) => {
          console.error('Gönderen tipine göre filtreleme hatası:', error);
          this.errorMessage = 'Mesaj filtreleme işlemi başarısız.';
        }
      });
  }

  // Refresh current session messages
  onRefreshMessages() {
    if (this.currentSessionId) {
      this.loadMessages(this.currentSessionId);
    }
  }

  // Get today's messages
  onGetTodaysMessages() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    this.onFilterMessagesByDate(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
  }

  // Get this week's messages
  onGetThisWeeksMessages() {
    const today = new Date();
    // Reset today to avoid mutation
    const currentDate = new Date();
    const firstDayOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
    const lastDayOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6));

    this.onFilterMessagesByDate(
      firstDayOfWeek.toISOString(),
      lastDayOfWeek.toISOString()
    );
  }

  // Enhanced mapping with better timestamp handling
  private mapMessagesToLocal(messages: SendMessageResponse[]): Message[] {
    return messages
      .sort((a, b) => {
        // Use createdDate first, fallback to sentAt if createdDate is not available
        const dateA = new Date(a.createdDate || a.sentAt).getTime();
        const dateB = new Date(b.createdDate || b.sentAt).getTime();
        return dateA - dateB; // Sort by date (oldest first)
      })
      .map((msg, index) => ({
        id: parseInt(msg.id) || index,
        content: msg.content || 'Mesaj içeriği bulunamadı',
        sender: msg.senderType === 1 ? 'user' : 'ai',
        timestamp: new Date(msg.createdDate || msg.sentAt),
        hasImage: msg.hasImage,
        messageStatus: msg.messageStatus,
        isActive: msg.isActive
      }));
  }

  // Mobilde oturumlara geri dön
  onBackToSessions() {
    this.showSessions = true;
  }

  // Toggle message controls panel
  onToggleControls() {
    this.isControlsExpanded = !this.isControlsExpanded;
  }

  // Mobilde başlık bilgisi al
  getCurrentSessionTitle(): string {
    if (!this.currentSessionId) return 'Sohbet';
    const session = this.sessions.find(s => s.id === this.currentSessionId);
    return session?.title || 'Sohbet';
  }

  // Session işlemleri
  onDeleteSession(sessionId: string) {
    if (!confirm('Bu oturumu silmek istediğinizden emin misiniz?')) {
      return;
    }

    this.chatSessionService.softDeleteSession(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Oturum silindi:', sessionId);
          this.sessions = this.sessions.filter(s => s.id !== sessionId);
          
          if (this.currentSessionId === sessionId) {
            this.currentSessionId = null;
            this.messages = [];
            if (this.isMobile) {
              this.showSessions = true;
            }
          }
        },
        error: (error) => {
          console.error('Oturum silinirken hata:', error);
          this.errorMessage = 'Oturum silinemedi.';
        }
      });
  }

  onCloneSession(sessionId: string) {
    this.chatSessionService.cloneSession(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clonedSession) => {
          console.log('Oturum klonlandı:', clonedSession);
          
          const localSession: ChatSession = {
            id: clonedSession.id,
            title: clonedSession.title,
            lastMessage: 'Henüz mesaj yok',
            timestamp: new Date(clonedSession.createdDate),
            messageCount: 0
          };
          
          this.sessions.unshift(localSession);
        },
        error: (error) => {
          console.error('Oturum klonlanırken hata:', error);
          this.errorMessage = 'Oturum klonlanamadı.';
        }
      });
  }

  onSearchSessions(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.loadSessions();
      return;
    }

    this.isLoadingSessions = true;
    
    this.chatSessionService.searchSessions(searchTerm)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingSessions = false)
      )
      .subscribe({
        next: (sessions) => {
          this.sessions = this.mapSessionsToLocal(sessions);
          console.log('Arama sonuçları:', this.sessions);
        },
        error: (error) => {
          console.error('Arama hatası:', error);
          this.errorMessage = 'Arama işlemi başarısız.';
        }
      });
  }

  // Getter methods for template
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

  get isFiltered(): boolean {
    return !!(this.startDate || this.endDate || this.includeDeleted);
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
