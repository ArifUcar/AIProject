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
import { ChatService } from '../../../Core/Services/chat.service';
import { ChatSessionResponse } from '../../../Model/Entity/Response/ChatSession.Response';
import { ChatMessageResponse } from '../../../Model/Entity/Response/ChatMessage.Response';
import { ChatMessageRequest } from '../../../Model/Entity/Request/ChatMessage.Request';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { CreateMessageResponse } from '../../../Model/Entity/Response/CreateMessage.Response';

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
    ToastModule
  ],
  providers: [
    MessageService,
    ChatService
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss'
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  
  sessions: ChatSessionResponse[] = [];
  currentSession: ChatSessionResponse | null = null;
  messages: ChatMessageResponse[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  searchTerm: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private messageService: MessageService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Doğrudan oturumları yükle
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
    this.chatService.getSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          console.log('Oturumlar başarıyla yüklendi:', sessions);
          this.sessions = sessions;
          if (sessions.length > 0 && !this.currentSession) {
            this.selectSession(sessions[0]);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Sohbet oturumları yüklenirken hata:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: 'Sohbet oturumları yüklenirken bir hata oluştu. Lütfen tekrar giriş yapın.'
          });
          // Hata durumunda login sayfasına yönlendir
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
          this.isLoading = false;
        }
      });
  }

  selectSession(session: ChatSessionResponse): void {
    this.isLoading = true;
    this.currentSession = session; // Önce mevcut session'ı ayarla
    this.loadMessages(session.id); // Hemen mesajları yüklemeye başla

    // Arka planda oturum detaylarını güncelle
    this.chatService.getSession(session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedSession) => {
          // Oturum listesini güncelle
          const index = this.sessions.findIndex(s => s.id === updatedSession.id);
          if (index !== -1) {
            this.sessions[index] = updatedSession;
          }
          // Eğer bu oturum seçili ise güncelle
          if (this.currentSession?.id === updatedSession.id) {
            this.currentSession = updatedSession;
          }
        },
        error: (error) => {
          console.error('Oturum detayları yüklenirken hata:', error);
          // Hata durumunda sessizce devam et, mevcut session bilgilerini kullan
          if (error.status === 500) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Uyarı',
              detail: 'Oturum detayları güncellenemedi. Bazı bilgiler güncel olmayabilir.'
            });
          }
        }
      });
  }

  loadMessages(sessionId: string): void {
    this.messages = []; // Önce mevcut mesajları temizle
    this.chatService.getMessages(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Mesajlar yüklenirken hata:', error);
          let errorMessage = 'Mesajlar yüklenirken bir hata oluştu.';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 500) {
            errorMessage = 'Sunucu hatası nedeniyle mesajlar yüklenemedi. Lütfen daha sonra tekrar deneyin.';
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: errorMessage
          });
          this.isLoading = false;
        }
      });
  }

  createNewSession(): void {
    this.isLoading = true;
    const newSession = {
      title: 'Yeni Sohbet ' + new Date().toLocaleString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      description: 'Yeni bir sohbet başlatıldı'
    };

    this.chatService.createSession(newSession)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          // Yeni oturumu listenin başına ekle
          this.sessions = [session, ...this.sessions];
          // Mevcut session'ı güncelle ve mesajları yükle
          this.currentSession = session;
          this.messages = []; // Mesajları temizle
          this.loadMessages(session.id);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Yeni oturum oluşturulurken hata:', error);
          let errorMessage = 'Yeni sohbet oturumu oluşturulurken bir hata oluştu.';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 500) {
            errorMessage = 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: errorMessage
          });
          this.isLoading = false;
        }
      });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentSession || this.isSending) return;

    this.isSending = true;
    const messageData: ChatMessageRequest = {
      chatSessionId: this.currentSession.id,
      sender: 1, // user
      messageContent: this.newMessage
    };

    // Geçici mesaj oluştur (optimistic update)
    const tempMessage: ChatMessageResponse = {
      id: 'temp-' + Date.now(),
      chatSessionId: this.currentSession.id,
      sender: 1,
      messageContent: this.newMessage,
      sentAt: new Date().toISOString(),
      createdDate: new Date().toISOString(),
      inputTokens: 0,
      outputTokens: 0
    };

    // Önce geçici mesajı ekle ve view'ı güncelle
    this.messages = [...this.messages, tempMessage];
    this.changeDetectorRef.detectChanges(); // View'ı hemen güncelle
    const tempMessageContent = this.newMessage;
    this.newMessage = '';

    // Sonra mesajı gönder
    this.chatService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: CreateMessageResponse) => {
          if (response.isSuccess) {
            // Geçici mesajı gerçek mesajla değiştir
            const updatedMessage: ChatMessageResponse = {
              ...tempMessage,
              id: response.id
            };
            this.messages = this.messages.map(msg => 
              msg.id === tempMessage.id ? updatedMessage : msg
            );
            this.changeDetectorRef.detectChanges(); // View'ı hemen güncelle
          } else {
            // Hata durumunda geçici mesajı kaldır
            this.messages = this.messages.filter(msg => msg.id !== tempMessage.id);
            this.newMessage = tempMessageContent;
            this.messageService.add({
              severity: 'error',
              summary: 'Hata',
              detail: response.message || 'Mesaj gönderilirken bir hata oluştu.'
            });
            this.changeDetectorRef.detectChanges(); // View'ı hemen güncelle
          }
          this.isSending = false;
        },
        error: (error) => {
          console.error('Mesaj gönderilirken hata:', error);
          // Hata durumunda geçici mesajı kaldır
          this.messages = this.messages.filter(msg => msg.id !== tempMessage.id);
          // Mesajı geri yükle
          this.newMessage = tempMessageContent;
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: 'Mesaj gönderilirken bir hata oluştu.'
          });
          this.changeDetectorRef.detectChanges(); // View'ı hemen güncelle
          this.isSending = false;
        }
      });
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
      this.isLoading = true;
      this.chatService.deleteSession(sessionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
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
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Oturum silinirken hata:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Hata',
              detail: 'Sohbet oturumu silinirken bir hata oluştu.'
            });
            this.isLoading = false;
          }
        });
    }
  }

  deleteMessage(messageId: string): void {
    if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      this.chatService.deleteMessage(messageId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messages = this.messages.filter(m => m.id !== messageId);
          },
          error: (error) => {
            console.error('Mesaj silinirken hata:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Hata',
              detail: 'Mesaj silinirken bir hata oluştu.'
            });
          }
        });
    }
  }

  updateSessionTitle(session: ChatSessionResponse, newTitle: string): void {
    if (!newTitle.trim() || newTitle === session.title) return;

    this.isLoading = true;
    const updatedSession = {
      title: newTitle,
      description: 'Sohbet oturumu',
      modelUsed: session.modelUsed
    };

    this.chatService.updateSession(session.id, updatedSession)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.sessions.findIndex(s => s.id === session.id);
          if (index !== -1) {
            this.sessions[index] = updated;
            if (this.currentSession?.id === session.id) {
              this.currentSession = updated;
            }
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Sohbet başlığı güncellendi.'
          });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Başlık güncelleme hatası:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: 'Sohbet başlığı güncellenirken bir hata oluştu.'
          });
          this.isLoading = false;
        }
      });
  }

  searchChats(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm = searchTerm;
    // Arama işlemi client-side yapılıyor, gerekirse API'ye taşınabilir
  }

  get filteredSessions(): ChatSessionResponse[] {
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
}
