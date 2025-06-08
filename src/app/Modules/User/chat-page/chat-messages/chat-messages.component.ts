import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, ChangeDetectorRef, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
  hasImage?: boolean;
  imageUrl?: string[];
  messageStatus?: number;
  isActive?: boolean;
  attachments?: AttachedFile[];
}

interface AttachedFile {
  id?: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
}

interface ParsedContent {
  type: 'text' | 'code';
  content: string;
  language: string | null; // code tipi için dolu, text tipi için null
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
export class ChatMessagesComponent implements AfterViewInit, AfterViewChecked, OnChanges, OnInit {
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

  // Resim yükleme ve önbellekleme için sabitler
  private readonly MAX_IMAGE_WIDTH = 1200; // piksel
  private readonly MAX_IMAGE_HEIGHT = 800; // piksel
  private readonly DEFAULT_ERROR_IMAGE = 'assets/images/image-error-placeholder.png';
  private readonly imageLoadErrors = new Set<string>();
  private readonly imageCache = new Map<string, SafeUrl>();

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

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

  ngOnInit() {
    // Mevcut resimleri yükle
    this.messages.forEach(message => {
      if (message.hasImage && message.imageUrl) {
        message.imageUrl.forEach(url => {
          this.loadImage(url);
        });
      }
    });
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
            content: textContent,
            language: null
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
          content: remainingContent,
          language: null
        });
      }
    }

    // If no code blocks found, return the whole content as text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: content,
        language: null
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

  // Resim yükleme işlemi
  private loadImage(url: string) {
    if (!url || this.imageCache.has(url)) {
      return;
    }

    try {
      // Token al
      const token = this.getToken();
      console.log('Resim yükleme için token durumu:', token ? 'Mevcut' : 'Bulunamadı');

      // URL'yi hazırla
      let finalUrl = url;
      if (token && !url.includes('access_token=')) {
        try {
          const urlObj = new URL(url);
          urlObj.searchParams.set('access_token', token);
          finalUrl = urlObj.toString();
          console.log('Token URL\'ye eklendi');
        } catch (error) {
          console.error('URL düzenlenirken hata:', error);
        }
      }

      // Resmi yükle
      fetch(finalUrl, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => this.processImage(blob, url))
      .catch(error => {
        console.error('Resim yüklenirken hata:', error);
        this.imageLoadErrors.add(url);
      });

    } catch (error) {
      console.error('Resim yükleme işlemi başlatılırken hata:', error);
      this.imageLoadErrors.add(url);
    }
  }

  private processImage(blob: Blob, originalUrl: string) {
    try {
      // Resmi optimize et
      this.optimizeImage(blob).then(optimizedBlob => {
        const objectUrl = URL.createObjectURL(optimizedBlob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        this.imageCache.set(originalUrl, safeUrl);
        console.log('Resim başarıyla yüklendi ve optimize edildi');
      }).catch(error => {
        console.error('Resim optimizasyonu sırasında hata:', error);
        // Optimizasyon başarısız olursa orijinal blobu kullan
        const objectUrl = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        this.imageCache.set(originalUrl, safeUrl);
      });
    } catch (error) {
      console.error('Blob işlenirken hata:', error);
      this.imageLoadErrors.add(originalUrl);
    }
  }

  // Resim optimizasyonu
  private async optimizeImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // En boy oranını koru
          if (width > this.MAX_IMAGE_WIDTH) {
            height *= this.MAX_IMAGE_WIDTH / width;
            width = this.MAX_IMAGE_WIDTH;
          }
          if (height > this.MAX_IMAGE_HEIGHT) {
            width *= this.MAX_IMAGE_HEIGHT / height;
            height = this.MAX_IMAGE_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context oluşturulamadı'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            blob => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Blob oluşturulamadı'));
              }
            },
            'image/jpeg',
            0.85 // Kalite
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Resim yüklenemedi'));
      };

      img.src = URL.createObjectURL(blob);
    });
  }

  // Token alma işlemi
  private getToken(): string {
    try {
      // LocalStorage'dan token'ı al
      let token = localStorage.getItem('token');
      if (!token) {
        token = localStorage.getItem('accessToken');
      }
      if (!token) {
        token = sessionStorage.getItem('token');
      }
      if (!token) {
        token = sessionStorage.getItem('accessToken');
      }
      
      if (!token) {
        console.warn('Token bulunamadı (localStorage ve sessionStorage kontrol edildi)');
        return '';
      }

      // Token formatını kontrol et ve düzenle
      token = token.trim();
      if (token.startsWith('Bearer ')) {
        token = token.substring(7).trim();
      }
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }

      console.log('Token bulundu ve formatlandı');
      return token;
    } catch (error) {
      console.error('Token alınırken hata:', error);
      return '';
    }
  }

  // Resim URL'sini al
  getImageUrl(url: string | undefined): SafeUrl | string {
    if (!url) return this.DEFAULT_ERROR_IMAGE;
    
    if (this.imageLoadErrors.has(url)) {
      return this.DEFAULT_ERROR_IMAGE;
    }

    const cachedUrl = this.imageCache.get(url);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Resim henüz yüklenmediyse yüklemeyi başlat
    this.loadImage(url);
    return this.DEFAULT_ERROR_IMAGE; // Yüklenene kadar default resmi göster
  }

  // Resim tıklama işleyicisi
  onImageClick(url: string): void {
    if (this.imageLoadErrors.has(url)) {
      console.log('Hatalı resme tıklama engellendi:', url);
      return;
    }
    window.open(url, '_blank');
  }

  // Resim yükleme hatası işleyicisi
  onImageError(event: any, url: string): void {
    console.error('Resim yüklenemedi:', url);
    this.imageLoadErrors.add(url);
    
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.DEFAULT_ERROR_IMAGE;
    imgElement.classList.add('error-image');
    imgElement.alt = 'Resim yüklenemedi';
  }

  // Resim yükleme başarılı
  onImageLoad(url: string): void {
    console.log('Resim başarıyla görüntülendi:', url);
    this.imageLoadErrors.delete(url);
  }

  // URL'nin resim URL'si olup olmadığını kontrol et
  isImageUrl(content: string | undefined): boolean {
    if (!content) return false;
    
    try {
      // URL formatını kontrol et
      const url = new URL(content);
      
      // Yaygın resim uzantılarını kontrol et
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const pathname = url.pathname.toLowerCase();
      
      // Uzantı kontrolü
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
      
      // Content-type kontrolü (varsa)
      const contentType = url.searchParams.get('content-type') || url.searchParams.get('type');
      const hasImageContentType = contentType ? contentType.toLowerCase().startsWith('image/') : false;
      
      return hasImageExtension || hasImageContentType;
    } catch {
      // Base64 resim kontrolü
      if (content.startsWith('data:image/')) {
        return true;
      }
      
      // Direkt dosya uzantısı kontrolü
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      return imageExtensions.some(ext => content.toLowerCase().endsWith(ext));
    }
  }
}
