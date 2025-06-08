import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class ChatSessionComponent {
  @Input() sessions: ChatSession[] = [];
  @Input() activeSessionId: string | null = null;
  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newSession = new EventEmitter<void>();

  onSelectSession(sessionId: string) {
    this.sessionSelected.emit(sessionId);
  }

  onCreateNewSession() {
    this.newSession.emit();
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
