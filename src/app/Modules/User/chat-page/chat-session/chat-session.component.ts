import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-session',
  standalone: true,
  imports: [CommonModule],
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
}
