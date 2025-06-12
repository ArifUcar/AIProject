import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ImageModule } from 'primeng/image';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { CodeBlockComponent } from '../../../../Shared/Components/code-block/code-block.component';
import { ChatMessageService } from '../../../../Core/Services/ChatMessageService/ChatMessageService';
import { ChatMessageDto } from '../../../../Model/Entity/Message/ChatMessageDto';
import { SenderType } from '../../../../Model/Enums/SenderType';
import { SendMessageRequest } from '../../../../Model/Entity/Message/SentMessage.Request';
import { finalize } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string[];
}

interface FilePreview {
  id: string;
  name: string;
  size: number;
  preview: string;
}

@Component({
  selector: 'app-chat-messages',
  templateUrl: './chat-messages.component.html',
  styleUrls: ['./chat-messages.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    AvatarModule,
    BadgeModule,
    ImageModule,
    TooltipModule,
    InputTextModule,
    CodeBlockComponent
  ]
})
export class ChatMessagesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesList') private messagesList!: ElementRef;
  @Input() isLoading: boolean = false;
  @Input() set currentSessionId(value: string | null) {
    console.log('currentSessionId değişti:', value); // Debug log
    if (value !== this._currentSessionId) {
      this._currentSessionId = value;
      if (value) {
        this.loadMessages(value);
      }
    }
  }
  get currentSessionId(): string | null {
    return this._currentSessionId;
  }
  private _currentSessionId: string | null = null;
  
  messages: Message[] = [];
  newMessage: string = '';
  showScrollToBottomButton: boolean = false;
  
  // Dosya yükleme ile ilgili değişkenler
  selectedFiles: FilePreview[] = [];
  maxFiles: number = 5;
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB

  constructor(private chatMessageService: ChatMessageService) {}

  ngOnInit(): void {
    // Artık otomatik session oluşturmuyoruz
    console.log('ChatMessagesComponent başlatıldı, currentSessionId:', this.currentSessionId);
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    // Temizlik işlemleri
    this.selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;
    this.showScrollToBottomButton = scrollPosition > 100;
  }

  scrollToBottom(): void {
    if (this.messagesList) {
      this.messagesList.nativeElement.scrollTop = this.messagesList.nativeElement.scrollHeight;
    }
  }

  scrollToBottomSmooth(): void {
    if (this.messagesList) {
      this.messagesList.nativeElement.scrollTo({
        top: this.messagesList.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  private async loadMessages(sessionId: string): Promise<void> {
    if (!sessionId) {
      console.log('loadMessages: sessionId boş');
      return;
    }

    console.log('loadMessages başladı, sessionId:', sessionId);
    this.isLoading = true;
    try {
      const response = await firstValueFrom(this.chatMessageService.getBySessionIdMessages(sessionId));
      console.log('API yanıtı (tam):', JSON.stringify(response, null, 2));
      
      if (response?.items) {
        console.log('Gelen mesajlar (tam):', JSON.stringify(response.items, null, 2));
        console.log('Mesajlar array mi?', Array.isArray(response.items));
        console.log('Mesaj sayısı:', response.items.length);
        
        this.messages = response.items.map(msg => {
          console.log('Mesaj dönüştürülüyor (ham):', JSON.stringify(msg, null, 2));
          const transformedMsg: Message = {
            id: msg.id,
            content: msg.content || '',
            sender: msg.senderType === SenderType.User ? 'user' : 'ai' as 'user' | 'ai',
            timestamp: new Date(msg.createdDate || Date.now()),
            imageUrl: msg.imageUrl || []
          };
          console.log('Dönüştürülmüş mesaj:', transformedMsg);
          return transformedMsg;
        });
        
        console.log('Tüm dönüştürülmüş mesajlar:', this.messages);
      } else {
        console.log('Session mesajları boş veya null. Response:', response);
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata oluştu:', error);
      if (error instanceof Error) {
        console.error('Hata detayı:', error.message);
        console.error('Hata stack:', error.stack);
      }
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  async onSendMessage(): Promise<void> {
    if ((!this.newMessage.trim() && this.selectedFiles.length === 0) || this.isLoading || !this.currentSessionId) return;

    const messageContent = this.newMessage.trim();
    this.newMessage = '';

    // Kullanıcı mesajını ekle
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date(),
      imageUrl: this.selectedFiles.map(file => file.preview)
    };

    this.messages.push(userMessage);
    this.scrollToBottom();
    this.clearAllFiles();

    // AI yanıtını al
    this.isLoading = true;
    try {
      const request: SendMessageRequest = {
        sessionId: this.currentSessionId,
        message: messageContent,
        base64Images: this.selectedFiles.map(file => file.preview)
      };

      const response = await firstValueFrom(this.chatMessageService.sendMessage(request));
      
      // Kullanıcı mesajını güncelle
      const updatedUserMessage: Message = {
        id: response.userMessage.id,
        content: response.userMessage.content,
        sender: 'user',
        timestamp: new Date(response.userMessage.createdDate),
        imageUrl: response.userMessage.imageUrl
      };
      
      // AI yanıtını ekle
      const aiMessage: Message = {
        id: response.aiResponse.id,
        content: response.aiResponse.content,
        sender: 'ai',
        timestamp: new Date(response.aiResponse.createdDate),
        imageUrl: response.aiResponse.imageUrl
      };

      // Mesajları güncelle
      this.messages = this.messages.map(msg => 
        msg.id === userMessage.id ? updatedUserMessage : msg
      );
      this.messages.push(aiMessage);
      
      this.scrollToBottom();
    } catch (error) {
      console.error('Mesaj gönderilirken hata oluştu:', error);
      if (error instanceof Error) {
        console.error('Hata detayı:', error.message);
        console.error('Hata stack:', error.stack);
      }
      // Hata durumunda kullanıcı mesajını kaldır
      this.messages = this.messages.filter(msg => msg.id !== userMessage.id);
    } finally {
      this.isLoading = false;
    }
  }

  // Dosya işleme metodları
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const validFiles = files.filter(file => this.validateFile(file));

    validFiles.forEach(file => {
      if (this.selectedFiles.length < this.maxFiles) {
        const preview = URL.createObjectURL(file);
        this.selectedFiles.push({
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          preview
        });
      }
    });

    input.value = '';
  }

  private validateFile(file: File): boolean {
    if (file.size > this.maxFileSize) {
      alert('Dosya boyutu 5MB\'dan büyük olamaz!');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      alert('Sadece resim dosyaları yüklenebilir!');
      return false;
    }
    return true;
  }

  onFileRemove(fileId: string): void {
    const file = this.selectedFiles.find(f => f.id === fileId);
    if (file) {
      URL.revokeObjectURL(file.preview);
      this.selectedFiles = this.selectedFiles.filter(f => f.id !== fileId);
    }
  }

  clearAllFiles(): void {
    this.selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
    this.selectedFiles = [];
  }

  // Yardımcı metodlar
  getUserAvatarIcon(sender: string): string {
    return sender === 'user' ? 'pi pi-user' : 'pi pi-android';
  }

  getUserAvatarColor(sender: string): string {
    return sender === 'user' ? '#3b82f6' : '#10b981';
  }

  getFileSizeText(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getImageUrl(url: string): string {
    return url;
  }

  onImageError(event: any, url: string): void {
    console.error('Resim yüklenemedi:', url);
  }

  onImageLoad(url: string): void {
    console.log('Resim yüklendi:', url);
  }

  trackByImageUrl(index: number, url: string): string {
    return url;
  }

  isImageUrl(content: string): boolean {
    return content.startsWith('data:image') || content.startsWith('http');
  }

  hasCodeBlocks(content: string): boolean {
    return content.includes('```');
  }

  parseMessageContent(content: string): Array<{ type: 'text' | 'code', content: string, language?: string }> {
    const parts: Array<{ type: 'text' | 'code', content: string, language?: string }> = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text' as const,
          content: content.slice(lastIndex, match.index)
        });
      }

      parts.push({
        type: 'code' as const,
        language: match[1] || 'text',
        content: match[2]
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text' as const,
        content: content.slice(lastIndex)
      });
    }

    return parts;
  }

  onAvatarHover(event: MouseEvent, isHovering: boolean): void {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      target.style.transform = isHovering ? 'scale(1.1)' : 'scale(1)';
    }
  }

  onButtonHover(event: MouseEvent, isHovering: boolean): void {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      if (target.classList.contains('scroll-to-bottom-btn')) {
        target.style.transform = isHovering ? 'translateY(-2px)' : 'translateY(0)';
      } else {
        target.style.transform = isHovering ? 'scale(1.1)' : 'scale(1)';
      }
    }
  }
}
