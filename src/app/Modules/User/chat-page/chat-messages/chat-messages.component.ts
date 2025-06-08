import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanel } from 'primeng/scrollpanel';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { BadgeModule } from 'primeng/badge';
import { OverlayPanelModule } from 'primeng/overlaypanel';

// Shared Components
import { CodeBlockComponent } from '../../../../Shared/Components/code-block/code-block.component';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: AttachedFile[];
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

interface ParsedContent {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ButtonModule,
    InputTextModule,
    ScrollPanelModule,
    CardModule,
    AvatarModule,
    TooltipModule,
    RippleModule,
    CodeBlockComponent,
    FileUploadModule,
    ImageModule,
    BadgeModule,
    OverlayPanelModule
  ],
  templateUrl: './chat-messages.component.html',
  styleUrl: './chat-messages.component.scss'
})
export class ChatMessagesComponent implements AfterViewInit, AfterViewChecked, OnChanges {
  @Input() messages: Message[] = [];
  @Input() currentSessionId: string | null = null;
  @Input() isLoading: boolean = false; // AI yanıt beklerken true olacak
  @Output() sendMessage = new EventEmitter<string>();
  @Output() sendMessageWithFiles = new EventEmitter<{message: string, files: AttachedFile[]}>();
  @ViewChild('messagesList') private messagesList!: ElementRef;

  newMessage: string = '';
  selectedFiles: AttachedFile[] = [];
  maxFiles: number = 10;
  maxFileSize: number = 5 * 1024 * 1024; // 5MB
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  private shouldScrollToBottom = true;
  private isViewInitialized = false;
  
  // Scroll to bottom buton kontrolü
  showScrollToBottomButton = false;
  private lastScrollTop = 0;
  private previousMessageCount = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    this.cdr.detectChanges();
    // İlk yüklemede bir kez scroll to bottom
    setTimeout(() => {
      this.scrollToBottom();
      this.shouldScrollToBottom = false; // Sonrasında manuel scroll'a izin ver
    }, 100);
  }

  ngAfterViewChecked() {
    // Sadece yeni mesaj geldiğinde ve kullanıcı en alttaysa scroll yap
    // Sürekli scroll etmeyi durdur
  }

  onSendMessage() {
    if (this.newMessage.trim() || this.selectedFiles.length > 0) {
      if (this.selectedFiles.length > 0) {
        // Fotoğraf varsa özel event emit et
        this.sendMessageWithFiles.emit({
          message: this.newMessage,
          files: this.selectedFiles
        });
      } else {
        // Sadece metin varsa normal event emit et
        this.sendMessage.emit(this.newMessage);
      }
      
      this.newMessage = '';
      this.selectedFiles = [];
      // Kullanıcı mesaj gönderdiğinde kesinlikle en alta git
      this.shouldScrollToBottom = true;
      setTimeout(() => this.scrollToBottom(), 200);
    }
  }

  // Manual scroll to bottom
  scrollToBottomManual() {
    this.shouldScrollToBottom = true;
    this.scrollToBottom();
    this.showScrollToBottomButton = false;
  }

  private scrollToBottom(): void {
    if (!this.messagesList?.nativeElement) return;
    
    try {
      const element = this.messagesList.nativeElement;
      element.scrollTop = element.scrollHeight;
      this.lastScrollTop = element.scrollTop;
    } catch (err) {
      console.error('Scroll hatası:', err);
    }
  }

  // Scroll smooth to bottom with animation
  scrollToBottomSmooth() {
    if (!this.messagesList?.nativeElement) return;
    
    try {
      const element = this.messagesList.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
      this.showScrollToBottomButton = false;
      this.shouldScrollToBottom = false; // Manuel scroll sonrası otomatik scroll'u durdur
    } catch (err) {
      console.error('Smooth scroll hatası:', err);
    }
  }

  onScroll(event: any) {
    try {
      const element = event.target;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      // Kullanıcı en altta mı kontrol et (tolerance 10px)
      const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      
      // Kullanıcı yukarı scroll yaptıysa otomatik scroll'u durdur
      if (scrollTop < this.lastScrollTop) {
        this.shouldScrollToBottom = false;
      }
      
      // Kullanıcı en alttaysa otomatik scroll'u etkinleştir
      if (atBottom) {
        this.shouldScrollToBottom = true;
      }
      
      // Scroll to bottom butonunu göster/gizle
      const scrollFromBottom = scrollHeight - scrollTop - clientHeight;
      this.showScrollToBottomButton = scrollFromBottom > 100;
      
      this.lastScrollTop = scrollTop;
    } catch (err) {
      console.error('Scroll event hatası:', err);
    }
  }

  // Yeni mesaj geldiğinde çağırılacak
  onNewMessage() {
    // Sadece kullanıcı en alttaysa yeni mesaj için scroll yap
    if (this.shouldScrollToBottom) {
      setTimeout(() => this.scrollToBottomSmooth(), 100);
    }
  }

  // Messages input değişikliğini dinle
  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages'] && this.messages) {
      const currentMessageCount = this.messages.length;
      
      // Yeni mesaj eklendiyse ve kullanıcı en alttaysa scroll yap
      if (currentMessageCount > this.previousMessageCount && this.shouldScrollToBottom) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
      
      this.previousMessageCount = currentMessageCount;
    }

    // Loading state değişikliğinde scroll yap
    if (changes['isLoading']) {
      if (this.isLoading && this.shouldScrollToBottom) {
        // AI yanıtlamaya başladığında scroll yap
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    }
  }

  // Get user avatar icon
  getUserAvatarIcon(sender: string): string {
    return sender === 'user' ? 'pi pi-user' : 'pi pi-android';
  }

  // Get user avatar background color
  getUserAvatarColor(sender: string): string {
    return sender === 'user' ? '#3b82f6' : '#10b981';
  }

  // Parse message content to detect code blocks
  parseMessageContent(content: string): ParsedContent[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: ParsedContent[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.substring(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({
            type: 'text',
            content: textContent
          });
        }
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[2].trim(),
        language: match[1] || 'text'
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex).trim();
      if (remainingContent) {
        parts.push({
          type: 'text',
          content: remainingContent
        });
      }
    }

    // If no code blocks found, return the whole content as text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: content
      });
    }

    return parts;
  }

  // Check if message has code blocks
  hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }

  // File Upload Methods
  onFileSelect(event: any) {
    const files = event.files || event.target.files;
    
    for (let file of files) {
      if (this.selectedFiles.length >= this.maxFiles) {
        break;
      }
      
      if (!this.allowedTypes.includes(file.type)) {
        continue;
      }
      
      if (file.size > this.maxFileSize) {
        continue;
      }
      
      const fileId = this.generateFileId();
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const attachedFile: AttachedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target.result,
          preview: e.target.result
        };
        
        this.selectedFiles.push(attachedFile);
      };
      
      reader.readAsDataURL(file);
    }
  }

  onFileRemove(fileId: string) {
    this.selectedFiles = this.selectedFiles.filter(file => file.id !== fileId);
  }

  clearAllFiles() {
    this.selectedFiles = [];
  }

  private generateFileId(): string {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getFileSizeText(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getRemainingFileSlots(): number {
    return this.maxFiles - this.selectedFiles.length;
  }
}
