import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ChatSessionService, ChatSessionListItem, CreateSessionRequest, UpdateSessionRequest, UpdateSessionModelRequest } from '../../../../Core/Services/ChatSessionService/ChatSession.service';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule, Menu } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline?: boolean;
  modelUsed?: string;
}

@Component({
  selector: 'app-chat-session',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    BadgeModule,
    AvatarModule,
    DividerModule,
    TooltipModule,
    RippleModule,
    ScrollPanelModule,
    InputTextModule,
    MenuModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './chat-session.component.html',
  styleUrl: './chat-session.component.scss'
})
export class ChatSessionComponent implements OnInit, OnDestroy {
  @ViewChild('optionsMenu') optionsMenu!: Menu;
  @Input() activeSessionId: string | null = null;
  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newSession = new EventEmitter<void>();
  @Output() sessionOptions = new EventEmitter<string>();

  sessions: ChatSession[] = [];
  showOptionsMenu: boolean = false;
  optionsSessionId: string | null = null;
  searchTerm: string = '';
  isLoading: boolean = false;
  menuItems: any[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private chatSessionService: ChatSessionService,
    private confirmationService: ConfirmationService
  ) {
    this.initializeMenuItems();
  }

  private initializeMenuItems() {
    this.menuItems = [
      {
        label: 'Düzenle',
        icon: 'pi pi-pencil',
        command: () => {
          if (this.optionsSessionId) {
            this.onEditSession(this.optionsSessionId);
          }
        }
      },
      {
        label: 'Kopyala',
        icon: 'pi pi-copy',
        command: () => {
          if (this.optionsSessionId) {
            this.cloneSession(this.optionsSessionId);
          }
        }
      },
      {
        label: 'Sil',
        icon: 'pi pi-trash',
        command: () => {
          if (this.optionsSessionId) {
            this.confirmDelete(this.optionsSessionId);
          }
        }
      }
    ];
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', this.handleDocumentClick.bind(this));
      this.loadSessions();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('click', this.handleDocumentClick.bind(this));
    }
  }

  async loadSessions() {
    try {
      this.isLoading = true;
      const sessions = await firstValueFrom(
        this.chatSessionService.getSessions({ pageNumber: 1, pageSize: 50 })
      );
      
      this.sessions = sessions.map(session => ({
        id: session.id,
        title: session.title,
        lastMessage: '',
        timestamp: new Date(session.lastMessageDate),
        unreadCount: session.unreadCount || 0,
        modelUsed: session.modelUsed
      }));
    } catch (error) {
      console.error('Oturumlar yüklenirken hata:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createNewSession() {
    try {
      this.isLoading = true;
      const request: CreateSessionRequest = {
        title: 'Yeni Sohbet',
        modelUsed: 'gemini-2.0-flash'
      };
      
      const newSession = await firstValueFrom(
        this.chatSessionService.createSession(request)
      );
      
      this.sessions.unshift({
        id: newSession.id,
        title: newSession.title,
        lastMessage: '',
        timestamp: new Date(newSession.createdDate),
        unreadCount: 0,
        modelUsed: newSession.modelUsed
      });
      
      this.newSession.emit();
      this.onSelectSession(newSession.id);
    } catch (error) {
      console.error('Oturum oluşturma hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteSession(sessionId: string) {
    try {
      this.isLoading = true;
      await firstValueFrom(
        this.chatSessionService.softDeleteSession(sessionId)
      );
      
      this.sessions = this.sessions.filter(s => s.id !== sessionId);
      this.onCloseOptions();
    } catch (error) {
      console.error('Oturum silme hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateSession(sessionId: string, newTitle: string) {
    try {
      this.isLoading = true;
      const session = this.sessions.find(s => s.id === sessionId);
      if (!session) return;

      const request: UpdateSessionRequest = {
        sessionId,
        newTitle,
        modelUsed: session.modelUsed || 'gemini-2.0-flash'
      };
      
      const updatedSession = await firstValueFrom(
        this.chatSessionService.updateSession(request)
      );
      
      const index = this.sessions.findIndex(s => s.id === sessionId);
      if (index !== -1) {
        this.sessions[index].title = updatedSession.title;
      }
      
      this.onCloseOptions();
    } catch (error) {
      console.error('Oturum güncelleme hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async searchSessions(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchTerm = input?.value || '';
    
    if (!searchTerm.trim()) {
      await this.loadSessions();
      return;
    }

    try {
      this.isLoading = true;
      const results = await firstValueFrom(
        this.chatSessionService.searchSessions(searchTerm)
      );
      
      this.sessions = results.map(session => ({
        id: session.id,
        title: session.title,
        lastMessage: '',
        timestamp: new Date(session.lastMessageDate),
        unreadCount: 0,
        modelUsed: session.modelUsed
      }));
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async cloneSession(sessionId: string) {
    try {
      this.isLoading = true;
      const clonedSession = await firstValueFrom(
        this.chatSessionService.cloneSession(sessionId)
      );
      
      this.sessions.unshift({
        id: clonedSession.id,
        title: clonedSession.title,
        lastMessage: '',
        timestamp: new Date(clonedSession.createdDate),
        unreadCount: 0,
        modelUsed: clonedSession.modelUsed
      });
      
      this.onCloseOptions();
      this.onSelectSession(clonedSession.id);
    } catch (error) {
      console.error('Oturum klonlama hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateSessionModel(sessionId: string, newModel: string) {
    try {
      this.isLoading = true;
      const request: UpdateSessionModelRequest = {
        sessionId,
        modelUsed: newModel
      };
      
      await firstValueFrom(
        this.chatSessionService.updateSessionModel(request)
      );
      
      const index = this.sessions.findIndex(s => s.id === sessionId);
      if (index !== -1) {
        this.sessions[index].modelUsed = newModel;
      }
      
      this.onCloseOptions();
    } catch (error) {
      console.error('Model güncelleme hatası:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onSelectSession(sessionId: string) {
    this.sessionSelected.emit(sessionId);
  }

  onShowOptions(sessionId: string, event: Event) {
    event.stopPropagation();
    this.optionsSessionId = sessionId;
    this.optionsMenu.show(event);
  }

  onEditSession(sessionId: string) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newTitle = prompt('Yeni başlık:', session.title);
    if (newTitle && newTitle.trim() && newTitle !== session.title) {
      this.updateSession(sessionId, newTitle.trim());
    }
  }

  confirmDelete(sessionId: string) {
    this.confirmationService.confirm({
      message: 'Bu oturumu silmek istediğinizden emin misiniz?',
      accept: () => this.deleteSession(sessionId)
    });
  }

  onCloseOptions() {
    this.optionsMenu.hide();
    this.optionsSessionId = null;
  }

  handleDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const optionsContainer = target.closest('.options-container');
    
    if (!optionsContainer && this.showOptionsMenu) {
      this.showOptionsMenu = false;
      this.optionsSessionId = null;
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}dk önce`;
    if (hours < 24) return `${hours}s önce`;
    if (days < 7) return `${days}g önce`;
    
    return timestamp.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  getSessionInitials(title: string): string {
    return title
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getStatusColor(isOnline: boolean = false): string {
    return isOnline ? '#10b981' : '#6b7280';
  }

  getUserAvatarColor(title: string): string {
    const colors = [
      '#3b82f6', // mavi
      '#10b981', // yeşil
      '#f59e0b', // turuncu
      '#ef4444', // kırmızı
      '#8b5cf6', // mor
      '#ec4899'  // pembe
    ];
    
    // Başlıktan bir sayı üret
    const hash = title.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Sayıyı renk dizisi indeksine dönüştür
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  trackBySessionId(index: number, session: ChatSession): string {
    return session.id;
  }
}
