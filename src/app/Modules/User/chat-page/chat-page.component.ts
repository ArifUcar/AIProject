import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { CodeBlockComponent } from '../../../Shared/Components/code-block/code-block.component';

interface ChatSession {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  sender: number;
  messageContent: string;
  hasImage: boolean;
  imageUrl?: string;
  sentAt: string;
}

interface CodeBlock {
  code: string;
  language: string;
}

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    InputTextarea,
    ButtonModule,
    RippleModule,
    ToastModule,
    CodeBlockComponent
  ],
  providers: [
    MessageService
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss'
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  sessions: ChatSession[] = [];
  currentSession: ChatSession | null = null;
  messages: ChatMessage[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  searchTerm: string = '';
  private destroy$ = new Subject<void>();

  selectedImageBase64: string | undefined = undefined;
  selectedImageMimeType: string | null = null;
  selectedImagePreview: string | null = null;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('Component başlatılıyor...');
    this.loadSessions();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const element = this.chatMessagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {}
  }

  loadSessions(): void {
    this.isLoading = true;
    // Örnek veri
    this.sessions = [
      {
        id: '1',
        title: 'Yeni Sohbet',
        description: 'Yeni bir sohbet başlatıldı',
        createdAt: new Date().toISOString()
      }
    ];
    this.isLoading = false;
  }

  selectSession(session: ChatSession): void {
    console.log('Session seçiliyor:', session);
    this.isLoading = true;
    this.currentSession = session;
    this.messages = [];
    
    // Örnek mesajlar
    this.messages = [
      {
        id: '1',
        sessionId: session.id,
        sender: 1,
        messageContent: 'Merhaba!',
        hasImage: false,
        sentAt: new Date().toISOString()
      },
      {
        id: '2',
        sessionId: session.id,
        sender: 2,
        messageContent: 'Merhaba, nasıl yardımcı olabilirim?',
        hasImage: false,
        sentAt: new Date().toISOString()
      }
    ];
    
    this.isLoading = false;
    this.changeDetectorRef.detectChanges();
  }

  createNewSession(): void {
    this.isLoading = true;
    const newSessionTitle = 'Yeni Sohbet ' + new Date().toLocaleString('tr-TR', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: newSessionTitle,
      description: 'Yeni bir sohbet başlatıldı',
      createdAt: new Date().toISOString()
    };

    this.sessions = [newSession, ...this.sessions];
    this.selectSession(newSession);
    this.isLoading = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedImageMimeType = file.type;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImageBase64 = e.target.result.split(',')[1];
        this.selectedImagePreview = e.target.result;
        this.changeDetectorRef.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage(): void {
    this.selectedImageBase64 = undefined;
    this.selectedImageMimeType = null;
    this.selectedImagePreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
    this.changeDetectorRef.detectChanges();
  }

  sendMessage(): void {
    if (!this.currentSession?.id) {
      console.error('Session ID bulunamadı:', this.currentSession);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Hata', 
        detail: 'Geçerli bir sohbet oturumu bulunamadı. Lütfen yeni bir sohbet başlatın.' 
      });
      return;
    }

    if ((!this.newMessage.trim() && !this.selectedImageBase64) || this.isSending) {
      console.log('Mesaj gönderme iptal edildi - boş mesaj veya gönderim devam ediyor');
      return;
    }

    this.isSending = true;
    console.log('Mesaj gönderiliyor, session ID:', this.currentSession.id);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sessionId: this.currentSession.id,
      sender: 1,
      messageContent: this.newMessage.trim(),
      hasImage: !!this.selectedImageBase64,
      imageUrl: this.selectedImagePreview || undefined,
      sentAt: new Date().toISOString()
    };

    this.messages = [...this.messages, newMessage];
    this.changeDetectorRef.detectChanges();
    this.isSending = false;

    this.newMessage = '';
    this.removeSelectedImage();
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
      this.sessions = this.sessions.filter(s => s.id !== sessionId);
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
        this.messages = [];
        if (this.sessions.length > 0) {
          this.selectSession(this.sessions[0]);
        }
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Başarılı',
        detail: 'Sohbet oturumu silindi.'
      });
    }
  }

  deleteMessage(messageId: string): void {
    if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      this.messages = this.messages.filter(m => m.id !== messageId);
    }
  }

  updateSessionTitle(session: ChatSession, newTitle: string): void {
    if (!newTitle.trim() || newTitle === session.title) return;
    
    const index = this.sessions.findIndex(s => s.id === session.id);
    if (index !== -1) {
      const updatedSession = { ...session, title: newTitle };
      this.sessions[index] = updatedSession;
      if (this.currentSession?.id === session.id) {
        this.currentSession = updatedSession;
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Başarılı',
        detail: 'Sohbet başlığı güncellendi.'
      });
    }
  }

  searchChats(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm = searchTerm;
  }

  get filteredSessions(): ChatSession[] {
    if (!this.searchTerm) return this.sessions;
    return this.sessions.filter(session => 
      session.title.toLowerCase().includes(this.searchTerm)
    );
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  parseMessageContent(content: string): (string | CodeBlock)[] {
    if (!content) return [];

    const parts: (string | CodeBlock)[] = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push({
        code: match[2].trim(),
        language: match[1] || 'text'
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  }

  isCodeBlock(part: string | CodeBlock): part is CodeBlock {
    return typeof part !== 'string';
  }

  getCodeBlockCode(part: CodeBlock): string {
    return part.code;
  }

  getCodeBlockLanguage(part: CodeBlock): string {
    return part.language;
  }
}
