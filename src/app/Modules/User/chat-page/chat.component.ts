import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSessionComponent } from './chat-session/chat-session.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { Subject, takeUntil, finalize } from 'rxjs';

// Services
import { ChatSessionService, ChatSessionListItem, CreateSessionRequest } from '../../../Core/Services/ChatSessionService/ChatSession.service';
import { PlanUserService } from '../../../Core/Services/PlanUserService/PlanUser.service';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount?: number;
  modelUsed?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatSessionComponent, ChatMessagesComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild(ChatMessagesComponent) chatMessagesComponent!: ChatMessagesComponent;
  
  sessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  
  // Loading states
  isLoadingSessions: boolean = false;
  isLoadingMessages: boolean = false;

  // Error handling
  errorMessage: string = '';

  // Model selection
  models: any[] = [];
  selectedModel: any = null;
  isLoadingModels: boolean = false;
  isDropdownOpen: boolean = false;

  // Mobile navigation
  showSessions: boolean = true;
  showMessages: boolean = false;
  isMobile: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private chatSessionService: ChatSessionService,
    private planUserService: PlanUserService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadSessions();
    this.loadModels();
    this.setupDocumentClickListener();
    this.checkIfMobile();
    this.setupWindowResizeListener();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.removeDocumentClickListener();
    this.removeWindowResizeListener();
  }

  // Document click listener for dropdown
  private documentClickListener: (event: Event) => void = (event: Event) => {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.custom-dropdown');
    if (!dropdown && this.isDropdownOpen) {
      this.isDropdownOpen = false;
      this.cdr.detectChanges();
    }
  };

  private setupDocumentClickListener() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', this.documentClickListener);
    }
  }

  private removeDocumentClickListener() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('click', this.documentClickListener);
    }
  }

  // Custom dropdown methods
  toggleDropdown() {
    if (!this.isLoadingModels) {
      this.isDropdownOpen = !this.isDropdownOpen;
    }
  }

  selectModel(model: any) {
    this.selectedModel = model;
    this.isDropdownOpen = false;
    console.log('Model değişti:', this.selectedModel);
    
    // Eğer aktif bir session varsa, modeli güncelle
    if (this.currentSessionId && this.selectedModel) {
      const modelValue = this.selectedModel.value || this.selectedModel;
      console.log('Session modeli güncelleniyor:', modelValue);
      this.updateSessionModel(this.currentSessionId, modelValue);
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
      messageCount: session.messageCount,
      modelUsed: session.modelUsed
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
        messageCount: 1,
        modelUsed: 'gpt-4'
      }
    ];
  }

  onSessionSelected(sessionId: string) {
    this.currentSessionId = sessionId;
    
    // Seçilen session'ı bul
    const selectedSession = this.sessions.find(s => s.id === sessionId);
    if (selectedSession && selectedSession.modelUsed) {
      // Session'ın modelini bul ve seç
      const sessionModel = this.models.find(m => m.value === selectedSession.modelUsed);
      if (sessionModel) {
        console.log('Session modeli bulundu ve seçildi:', sessionModel);
        this.selectedModel = sessionModel;
      } else {
        console.log('Session modeli bulunamadı, varsayılan model kullanılıyor');
        // Eğer session'ın modeli listede yoksa ilk modeli seç
        if (this.models.length > 0) {
          this.selectedModel = this.models[0];
        }
      }
    }
    
    // Mobile'da messages sayfasına geç
    if (this.isMobile) {
      this.showSessions = false;
      this.showMessages = true;
    }
  }

  onNewSession() {
    const request: CreateSessionRequest = {
      title: 'Yeni Sohbet',
      modelUsed: this.selectedModel?.value || 'gpt-4'
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
            messageCount: 0,
            modelUsed: newSession.modelUsed
          };
          
          this.sessions.unshift(localSession);
          this.currentSessionId = newSession.id;
        },
        error: (error) => {
          console.error('Yeni oturum oluşturulurken hata:', error);
          this.errorMessage = 'Yeni oturum oluşturulamadı.';
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
    }
  }

  onSendMessage(messageData: string) {
    // Bu metod artık chat-messages component'inde
    // Sadece session'ın son mesajını güncelle
    try {
      const parsedData = JSON.parse(messageData);
      const message = parsedData.message || '';
      if (this.currentSessionId) {
        this.updateSessionLastMessage(this.currentSessionId, message);
      }
    } catch (error) {
      console.error('Mesaj verisi işlenirken hata:', error);
    }
  }

  onCheckAiResponse() {
    // Bu metod artık chat-messages component'inde
  }

  // Model selection methods
  loadModels() {
    this.isLoadingModels = true;
    console.log('Modeller yükleniyor...');
    
    this.planUserService.getPlanModels().subscribe({
      next: (response) => {
        console.log('API yanıtı:', response);
        
        try {
          if (response && response.models) {
            // Modelleri virgülle ayrıştır ve dropdown için formatla
            const modelList = response.models.split(', ').map(model => ({
              label: model.trim(),
              value: model.trim()
            }));
            
            console.log('Formatlanmış modeller:', modelList);
            this.models = modelList;
            
            // İlk modeli seç
            if (this.models.length > 0) {
              this.selectedModel = this.models[0];
              console.log('Varsayılan model seçildi:', this.selectedModel);
            }
          } else {
            console.warn('API yanıtında models alanı bulunamadı');
            // Fallback: Varsayılan modeller
            this.models = [
              { label: 'GPT-4', value: 'gpt-4' },
              { label: 'GPT-3.5', value: 'gpt-3.5-turbo' }
            ];
            this.selectedModel = this.models[0];
          }
        } catch (error) {
          console.error('Model parsing hatası:', error);
          // Fallback: Varsayılan modeller
          this.models = [
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5', value: 'gpt-3.5-turbo' }
          ];
          this.selectedModel = this.models[0];
        }
        
        this.isLoadingModels = false;
        this.cdr.detectChanges(); // Force change detection
        console.log('Model yüklendi, loading durumu:', this.isLoadingModels);
      },
      error: (error) => {
        console.error('Model yükleme hatası:', error);
        
        // Hata durumunda varsayılan modeller
        this.models = [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-3.5', value: 'gpt-3.5-turbo' },
          { label: 'Claude', value: 'claude-3-sonnet' }
        ];
        this.selectedModel = this.models[0];
        
        this.isLoadingModels = false;
        this.cdr.detectChanges(); // Force change detection
        console.log('Hata sonrası loading durumu:', this.isLoadingModels);
      }
    });
  }

  updateSessionModel(sessionId: string, modelUsed: string) {
    const request = {
      sessionId: sessionId,
      modelUsed: modelUsed
    };

    this.chatSessionService.updateSessionModel(request).subscribe({
      next: (response) => {
        console.log('Session modeli başarıyla güncellendi:', response);
        // Başarılı güncelleme mesajı gösterilebilir
      },
      error: (error) => {
        console.error('Session modeli güncelleme hatası:', error);
        // Hata durumunda kullanıcıya bilgi verilebilir
      }
    });
  }

  private checkIfMobile() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth <= 768;
      this.updateMobileNavigation();
    }
  }

  private setupWindowResizeListener() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', this.onWindowResize.bind(this));
    }
  }

  private removeWindowResizeListener() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onWindowResize.bind(this));
    }
  }

  private onWindowResize() {
    this.checkIfMobile();
  }

  private updateMobileNavigation() {
    if (this.isMobile) {
      // Mobile'da eğer session seçili ise messages göster
      if (this.currentSessionId) {
        this.showSessions = false;
        this.showMessages = true;
      } else {
        this.showSessions = true;
        this.showMessages = false;
      }
    } else {
      // Desktop'ta her ikisini de göster
      this.showSessions = true;
      this.showMessages = true;
    }
  }

  // Mobile navigation methods
  goBackToSessions() {
    if (this.isMobile) {
      this.showSessions = true;
      this.showMessages = false;
    }
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
} 
