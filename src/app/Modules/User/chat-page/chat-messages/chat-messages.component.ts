import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { ImageModule } from 'primeng/image';
import { BadgeModule } from 'primeng/badge';

// Shared Components
import { CodeBlockComponent } from '../../../../Shared/Components/code-block/code-block.component';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  hasImage?: boolean;
  imageUrl?: string[];
  messageStatus?: number;
  isActive?: boolean;
}

interface AttachedFile {
  id?: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface ParsedContent {
  type: 'text' | 'code';
  content: string;
  language: string | null;
}

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, CardModule,
    AvatarModule, TooltipModule, CodeBlockComponent, ImageModule, BadgeModule
  ],
  templateUrl: './chat-messages.component.html',
  styleUrl: './chat-messages.component.scss'
})
export class ChatMessagesComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() messages: Message[] = [];
  @Input() currentSessionId: string | null = null;
  @Input() isLoading: boolean = false;
  @Output() sendMessage = new EventEmitter<string>();
  @ViewChild('messagesList') private messagesList!: ElementRef;

  newMessage: string = '';
  selectedFiles: AttachedFile[] = [];
  maxFiles: number = 5;
  maxFileSize: number = 2 * 1024 * 1024; // 2MB
  
  private shouldScrollToBottom = true;
  private isViewInitialized = false;
  showScrollToBottomButton = false;
  private previousMessageCount = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    this.shouldScrollToBottom = true;
    this.scrollToBottom();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentSessionId']) {
      this.shouldScrollToBottom = true;
      setTimeout(() => this.scrollToBottom(), 100);
    }

    if (changes['messages'] && this.messages) {
      const currentCount = this.messages.length;
      if (currentCount > this.previousMessageCount && this.shouldScrollToBottom) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
      this.previousMessageCount = currentCount;
    }

    if (changes['isLoading'] && !this.isLoading && this.shouldScrollToBottom) {
      setTimeout(() => this.scrollToBottom(), 200);
    }
  }

  onSendMessage() {
    if (this.newMessage.trim() || this.selectedFiles.length > 0) {
      const processFiles = async () => {
        const base64Images: string[] = [];
        
        for (const file of this.selectedFiles) {
          if (file.preview) {
            base64Images.push(file.preview);
          }
        }
        
        this.sendMessage.emit(JSON.stringify({
          message: this.newMessage,
          images: base64Images
        }));
      };

      processFiles().then(() => {
        this.newMessage = '';
        this.selectedFiles = [];
        this.shouldScrollToBottom = true;
        setTimeout(() => this.scrollToBottom(), 100);
      });
    }
  }

  scrollToBottom(): void {
    if (!this.messagesList?.nativeElement) return;
    
    try {
      const element = this.messagesList.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Scroll hatası:', err);
    }
  }

  scrollToBottomSmooth() {
    if (!this.messagesList?.nativeElement) return;
    
    try {
      const element = this.messagesList.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
      this.showScrollToBottomButton = false;
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
      
      const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      this.shouldScrollToBottom = atBottom;
      this.showScrollToBottomButton = scrollHeight - scrollTop - clientHeight > 200;
    } catch (err) {
      console.error('Scroll event hatası:', err);
    }
  }

  // Avatar methods
  getUserAvatarIcon(sender: string): string {
    return sender === 'user' ? 'pi pi-user' : 'pi pi-android';
  }

  getUserAvatarColor(sender: string): string {
    return sender === 'user' ? '#3b82f6' : '#10b981';
  }

  // Content parsing
  parseMessageContent(content: string): ParsedContent[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: ParsedContent[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textContent = content.substring(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({ type: 'text', content: textContent, language: null });
        }
      }

      parts.push({
        type: 'code',
        content: match[2].trim(),
        language: match[1] || 'text'
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex).trim();
      if (remainingContent) {
        parts.push({ type: 'text', content: remainingContent, language: null });
      }
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content: content, language: null });
    }

    return parts;
  }

  hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }

  // File upload methods
  onFileSelect(event: any) {
    const files = event.files || event.target.files;
    
    for (let file of files) {
      if (this.selectedFiles.length >= this.maxFiles) break;
      if (file.size > this.maxFileSize) continue;
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFiles.push({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          preview: e.target.result
        });
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

  getFileSizeText(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Image methods
  getImageUrl(url: string | undefined): SafeUrl | string {
    if (!url) return 'assets/images/placeholder.png';
    
    if (url.startsWith('data:image/')) {
      return this.sanitizer.bypassSecurityTrustUrl(url);
    }
    
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onImageError(event: any, url: string): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/placeholder.png';
  }

  onImageLoad(url: string): void {
    // Basit yükleme başarılı callback
  }

  isImageUrl(content: string | undefined): boolean {
    if (!content) return false;
    return content.startsWith('data:image/') || 
           /\.(jpg|jpeg|png|gif|webp)$/i.test(content);
  }

  // Public methods
  public forceScrollToBottom() {
    this.shouldScrollToBottom = true;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  public onSessionChanged() {
    this.shouldScrollToBottom = true;
    setTimeout(() => this.scrollToBottom(), 150);
  }

  ngOnDestroy() {
    // Cleanup
  }
}
