import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount?: number;
  isOnline?: boolean;
}

@Component({
  selector: 'app-chat-session',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    BadgeModule,
    AvatarModule,
    DividerModule,
    TooltipModule,
    RippleModule,
    ScrollPanelModule
  ],
  templateUrl: './chat-session.component.html',
  styleUrl: './chat-session.component.scss'
})
export class ChatSessionComponent implements OnInit, OnDestroy {
  @Input() sessions: ChatSession[] = [];
  @Input() activeSessionId: string | null = null;
  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newSession = new EventEmitter<void>();
  @Output() sessionOptions = new EventEmitter<string>();

  showOptionsMenu: boolean = false;
  optionsSessionId: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', this.handleDocumentClick.bind(this));
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('click', this.handleDocumentClick.bind(this));
    }
  }

  onSelectSession(sessionId: string) {
    this.sessionSelected.emit(sessionId);
  }

  onCreateNewSession() {
    this.newSession.emit();
  }

  onShowOptions(sessionId: string, event: Event) {
    event.stopPropagation();
    this.optionsSessionId = sessionId;
    this.showOptionsMenu = true;
    this.sessionOptions.emit(sessionId);
    console.log('Options menu açıldı:', sessionId);
  }

  onEditSession(sessionId: string, event: Event) {
    event.stopPropagation();
    console.log('Session düzenleme:', sessionId);
    // Burada düzenleme modal'ı açılabilir
  }

  onDeleteSession(sessionId: string, event: Event) {
    event.stopPropagation();
    console.log('Session silme:', sessionId);
    // Burada silme onayı modal'ı açılabilir
  }

  onCloseOptions() {
    this.showOptionsMenu = false;
    this.optionsSessionId = null;
  }

  closeOptionsMenu(event: Event) {
    if (this.showOptionsMenu) {
      event.stopPropagation();
      this.showOptionsMenu = false;
      this.optionsSessionId = null;
    }
  }

  handleDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const optionsContainer = target.closest('.options-container');
    
    if (!optionsContainer && this.showOptionsMenu) {
      this.showOptionsMenu = false;
      this.optionsSessionId = null;
    }
  }

  // Format timestamp for display
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

  // Get session avatar initials
  getSessionInitials(title: string): string {
    return title
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  // Get session status color
  getStatusColor(isOnline: boolean = false): string {
    return isOnline ? '#10b981' : '#6b7280';
  }

  // TrackBy function for performance
  trackBySessionId(index: number, session: ChatSession): string {
    return session.id;
  }
}
