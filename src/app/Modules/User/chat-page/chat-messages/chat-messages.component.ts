import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, Input, AfterViewChecked, ChangeDetectorRef, inject } from '@angular/core';
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
import { GetMessagesRequest } from '../../../../Model/Entity/Message/GetMessage.Request';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string[];
}

interface FilePreview {
  id: string;
  file: File;
  preview: string;
  size: number;
  name: string;
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
export class ChatMessagesComponent implements OnInit, AfterViewInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesList') private messagesList!: ElementRef;
  @Input() isLoading: boolean = false;
  @Input() set currentSessionId(value: string | null) {
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
  private readonly cdr = inject(ChangeDetectorRef);
  private shouldScrollToBottom: boolean = true;
  
  messages: Message[] = [];
  newMessage: string = '';
  showScrollToBottomButton: boolean = false;
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

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.messagesList) {
      this.scrollToBottomSmooth();
      this.shouldScrollToBottom = false;
    }
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;
    this.showScrollToBottomButton = scrollPosition > 100;
    
    // Kullanıcı yukarı scroll yaptığında otomatik scroll'u devre dışı bırak
    if (scrollPosition > 200) {
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom(): void {
    if (this.messagesList) {
      this.messagesList.nativeElement.scrollTop = this.messagesList.nativeElement.scrollHeight;
    }
  }

  scrollToBottomSmooth(): void {
    if (this.messagesList) {
      const element = this.messagesList.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
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
      const params: GetMessagesRequest = {
        pageSize: 100,
        pageNumber: 1,
        includeDeleted: false
      };

      const response = await firstValueFrom(this.chatMessageService.getBySessionIdMessages(sessionId, params));
      console.log('API yanıtı:', response);
      
      if (response?.items) {
        console.log('Gelen mesaj sayısı:', response.items.length);
        
        // Mesajları createdDate'e göre milisaniye hassasiyetinde sırala
        const sortedMessages = response.items
          .map(msg => ({
            id: msg.id,
            content: msg.content || '',
            sender: msg.senderType === SenderType.User ? 'user' : 'ai' as 'user' | 'ai',
            timestamp: new Date(msg.createdDate),
            createdDate: msg.createdDate, // Orijinal createdDate'i sakla
            imageUrl: msg.imageUrl || []
          }))
          .sort((a, b) => {
            // ISO string formatındaki tarihleri direkt karşılaştır
            return a.createdDate.localeCompare(b.createdDate);
          });

        console.log('Sıralanmış mesajlar (ilk 3):', sortedMessages.slice(0, 3).map(m => ({
          id: m.id,
          createdDate: m.createdDate,
          timestamp: m.timestamp
        })));
        
        this.messages = sortedMessages;
        
        await this.waitForImagesToLoad();
        
        setTimeout(() => {
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        }, 100);
      } else {
        console.warn('API yanıtında mesaj bulunamadı:', response);
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata oluştu:', error);
      if (error instanceof Error) {
        console.error('Hata detayı:', error.message);
        console.error('Hata stack:', error.stack);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private waitForImagesToLoad(): Promise<void> {
    return new Promise((resolve) => {
      const images = Array.from(document.querySelectorAll('.message-img')) as HTMLImageElement[];
      if (images.length === 0) {
        resolve();
        return;
      }

      let loadedImages = 0;
      const totalImages = images.length;

      const checkAllLoaded = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          resolve();
        }
      };

      images.forEach(img => {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.onload = checkAllLoaded;
          img.onerror = checkAllLoaded; // Hata durumunda da devam et
        }
      });
    });
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
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();

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
      
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      this.messages = this.messages.filter(msg => msg.id !== userMessage.id);
      alert('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      this.isLoading = false;
      this.clearAllFiles();
    }
  }

  // Dosya işleme metodları
  async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const remainingSlots = this.maxFiles - this.selectedFiles.length;

    if (remainingSlots <= 0) {
      alert(`En fazla ${this.maxFiles} dosya yükleyebilirsiniz.`);
      return;
    }

    const validFiles = files.slice(0, remainingSlots).filter(file => {
      if (file.size > this.maxFileSize) {
        alert(`${file.name} dosyası çok büyük. Maksimum dosya boyutu: ${this.getFileSizeText(this.maxFileSize)}`);
        return false;
      }
      return true;
    });

    for (const file of validFiles) {
      try {
        const base64 = await this.fileToBase64(file);
        this.selectedFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: base64,
          size: file.size,
          name: file.name
        });
      } catch (error) {
        console.error('Dosya dönüştürme hatası:', error);
        alert(`${file.name} dosyası yüklenirken bir hata oluştu.`);
      }
    }

    input.value = ''; // Input'u temizle
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
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
    // Eğer URL blob: ile başlıyorsa ve geçerli bir blob URL'si değilse
    if (url.startsWith('blob:') && !this.isValidBlobUrl(url)) {
      console.warn('Geçersiz blob URL:', url);
      return 'assets/images/image-error.png'; // Varsayılan hata resmi
    }
    return url;
  }

  private isValidBlobUrl(url: string): boolean {
    try {
      // Blob URL'sinin geçerli olup olmadığını kontrol et
      const blobUrl = new URL(url);
      return blobUrl.protocol === 'blob:';
    } catch {
      return false;
    }
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn('Resim yüklenemedi:', imgElement.src);
    
    // Hata durumunda varsayılan resmi göster
    imgElement.src = 'assets/images/image-error.png';
    imgElement.onerror = null; // Sonsuz döngüyü önle
    
    // Hata durumunda resmi mesajdan kaldır
    const messageId = imgElement.getAttribute('data-message-id');
    if (messageId) {
      this.messages = this.messages.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            imageUrl: message.imageUrl?.filter(url => url !== imgElement.src) || []
          };
        }
        return message;
      });
    }
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