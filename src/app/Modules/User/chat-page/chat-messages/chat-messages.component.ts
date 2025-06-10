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
import { DropdownModule } from 'primeng/dropdown';

// Shared Components
import { CodeBlockComponent } from '../../../../Shared/Components/code-block/code-block.component';

// Services
import { PlanUserService } from '../../../../Core/Services/PlanUserService/PlanUser.service';
import { ChatSessionService } from '../../../../Core/Services/ChatSessionService/ChatSession.service';

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
    AvatarModule, TooltipModule, CodeBlockComponent, ImageModule, BadgeModule, DropdownModule
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
  
  // Model selection
  models: any[] = [];
  selectedModel: any = null;
  isLoadingModels: boolean = false;
  
  // Image URL cache
  private imageUrlCache = new Map<string, SafeUrl | string>();
  
  private shouldScrollToBottom = true;
  private isViewInitialized = false;
  showScrollToBottomButton = false;
  private previousMessageCount = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private planUserService: PlanUserService,
    private chatSessionService: ChatSessionService
  ) {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    this.shouldScrollToBottom = true;
    this.scrollToBottom();
    this.loadModels();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentSessionId']) {
      this.shouldScrollToBottom = true;
      // Session değiştiğinde biraz daha bekle
      setTimeout(() => {
        if (this.isViewInitialized) {
          this.scrollToBottom();
        }
      }, 150);
      
      // Session değiştiğinde modeli sıfırla
      if (this.currentSessionId) {
        this.loadSessionModel();
      }
    }

    if (changes['messages'] && this.messages) {
      // Mesajları createdDate'e göre sırala (eskiden yeniye)
      this.sortMessagesByDate();
      
      const currentCount = this.messages.length;
      if (currentCount > this.previousMessageCount && this.shouldScrollToBottom) {
        // Yeni mesaj geldiğinde scroll için biraz bekle
        setTimeout(() => {
          if (this.isViewInitialized) {
            this.scrollToBottom();
          }
        }, 100);
      }
      this.previousMessageCount = currentCount;
    }

    if (changes['isLoading'] && !this.isLoading && this.shouldScrollToBottom) {
      // Loading bittiğinde daha uzun bekle
      setTimeout(() => {
        if (this.isViewInitialized) {
          this.scrollToBottom();
        }
      }, 250);
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
    if (!this.messagesList?.nativeElement || !this.isViewInitialized) return;
    
    try {
      const element = this.messagesList.nativeElement;
      
      // Scroll işlemini gerçekleştir
      element.scrollTop = element.scrollHeight;
      
      // Scroll başarılı olup olmadığını kontrol et
      setTimeout(() => {
        if (element.scrollTop < element.scrollHeight - element.clientHeight - 10) {
          // Eğer scroll tam olarak en alta gitmemişse tekrar dene
          element.scrollTop = element.scrollHeight;
        }
      }, 50);
      
    } catch (err) {
      console.error('Scroll hatası:', err);
    }
  }

  scrollToBottomSmooth() {
    if (!this.messagesList?.nativeElement || !this.isViewInitialized) return;
    
    try {
      const element = this.messagesList.nativeElement;
      
      // Smooth scroll ile en alta git
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
      
      // Scroll butonunu gizle
      this.showScrollToBottomButton = false;
      
      // Scroll işlemi tamamlandıktan sonra pozisyonu kontrol et
      setTimeout(() => {
        if (element.scrollTop < element.scrollHeight - element.clientHeight - 10) {
          // Smooth scroll başarısız olmuşsa normal scroll yap
          element.scrollTop = element.scrollHeight;
        }
        this.shouldScrollToBottom = true;
      }, 500); // Smooth scroll için daha uzun süre bekle
      
    } catch (err) {
      console.error('Smooth scroll hatası:', err);
      // Hata durumunda normal scroll yap
      this.scrollToBottom();
    }
  }

  onScroll(event: any) {
    try {
      const element = event.target;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      // Scroll pozisyonunu kontrol et - daha basit ve güvenilir mantık
      const scrollBottom = scrollTop + clientHeight;
      const tolerance = 5; // 5px tolerance
      
      // Kullanıcı en altta mı?
      const atBottom = scrollBottom >= scrollHeight - tolerance;
      
      // Scroll davranışını ayarla
      this.shouldScrollToBottom = atBottom;
      
      // Scroll butonunu göster/gizle - kullanıcı yukarıda ise göster
      this.showScrollToBottomButton = !atBottom && scrollHeight > clientHeight + 100;
      
    } catch (err) {
      console.error('Scroll event hatası:', err);
      // Hata durumunda varsayılan değerleri ayarla
      this.shouldScrollToBottom = true;
      this.showScrollToBottomButton = false;
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
    
    // Cache'den kontrol et
    if (this.imageUrlCache.has(url)) {
      return this.imageUrlCache.get(url)!;
    }
    
    let safeUrl: SafeUrl | string;
    
    if (url.startsWith('data:image/')) {
      safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    } else {
      safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    
    // Cache'e kaydet
    this.imageUrlCache.set(url, safeUrl);
    return safeUrl;
  }

  onImageError(event: any, url: string): void {
    const imgElement = event.target as HTMLImageElement;
    
    // Eğer zaten placeholder gösteriyorsa döngüyü önle
    if (imgElement.src.includes('placeholder.png')) {
      return;
    }
    
    // Hatalı URL'yi cache'den kaldır
    if (this.imageUrlCache.has(url)) {
      this.imageUrlCache.delete(url);
    }
    
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

  // Track by functions for better performance
  trackByImageUrl(index: number, imageUrl: string): string {
    return imageUrl;
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

  // Model selection methods
  loadModels() {
    this.isLoadingModels = true;
    console.log('Modeller yükleniyor...');
    
    this.planUserService.getPlanModels().subscribe({
      next: (response) => {
        console.log('API yanıtı:', response);
        
        try {
          if (response && response.models) {
            // Modelleri virgülle ayrıştır ve dropdown için formatla
            const modelList = response.models.split(', ').map(model => ({
              label: model.trim(),
              value: model.trim()
            }));
            
            console.log('Formatlanmış modeller:', modelList);
            this.models = modelList;
            
            // Modeller yüklendikten sonra session modelini kontrol et
            if (this.models.length > 0) {
              if (this.currentSessionId) {
                this.loadSessionModel();
              } else {
                // Session yoksa ilk modeli seç
                this.selectedModel = this.models[0];
                console.log('Varsayılan model seçildi:', this.selectedModel);
              }
            }
          } else {
            console.warn('API yanıtında models alanı bulunamadı');
            // Fallback: Varsayılan modeller
            this.models = [
              { label: 'GPT-4', value: 'gpt-4' },
              { label: 'GPT-3.5', value: 'gpt-3.5-turbo' }
            ];
            this.selectedModel = this.models[0];
          }
        } catch (error) {
          console.error('Model parsing hatası:', error);
          // Fallback: Varsayılan modeller
          this.models = [
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5', value: 'gpt-3.5-turbo' }
          ];
          this.selectedModel = this.models[0];
        }
        
        this.isLoadingModels = false;
        this.cdr.detectChanges(); // Force change detection
        console.log('Model yüklendi, loading durumu:', this.isLoadingModels);
      },
      error: (error) => {
        console.error('Model yükleme hatası:', error);
        
        // Hata durumunda varsayılan modeller
        this.models = [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-3.5', value: 'gpt-3.5-turbo' },
          { label: 'Claude', value: 'claude-3-sonnet' }
        ];
        this.selectedModel = this.models[0];
        
        this.isLoadingModels = false;
        this.cdr.detectChanges(); // Force change detection
        console.log('Hata sonrası loading durumu:', this.isLoadingModels);
      }
    });
  }

  onModelChange(event: any) {
    this.selectedModel = event.value;
    console.log('Model değişti:', this.selectedModel);
    
    // Eğer aktif bir session varsa, modeli güncelle
    if (this.currentSessionId && this.selectedModel) {
      const modelValue = this.selectedModel.value || this.selectedModel;
      console.log('Session modeli güncelleniyor:', modelValue);
      this.updateSessionModel(this.currentSessionId, modelValue);
    }
  }

  updateSessionModel(sessionId: string, modelUsed: string) {
    const request = {
      sessionId: sessionId,
      modelUsed: modelUsed
    };

    this.chatSessionService.updateSessionModel(request).subscribe({
      next: (response) => {
        console.log('Session modeli başarıyla güncellendi:', response);
        // Başarılı güncelleme mesajı gösterilebilir
      },
      error: (error) => {
        console.error('Session modeli güncelleme hatası:', error);
        // Hata durumunda kullanıcıya bilgi verilebilir
      }
    });
  }

  loadSessionModel() {
    if (!this.currentSessionId) {
      console.log('Session ID yok, model yüklenmeyecek');
      return;
    }
    
    console.log('Session modeli yükleniyor:', this.currentSessionId);
    
    this.chatSessionService.getSessionById(this.currentSessionId).subscribe({
      next: (session) => {
        console.log('Session detayları:', session);
        
        if (session.modelUsed && this.models.length > 0) {
          // Session'ın mevcut modelini dropdown'da seç
          const currentModel = this.models.find(model => model.value === session.modelUsed);
          if (currentModel) {
            this.selectedModel = currentModel;
            console.log('Session modeli bulundu ve seçildi:', currentModel);
          } else {
            // Eğer session'ın modeli dropdown'da yoksa, ilk modeli seç
            this.selectedModel = this.models[0];
            console.log('Session modeli bulunamadı, varsayılan seçildi:', this.selectedModel);
          }
        } else {
          console.log('Session modelUsed bilgisi yok veya models listesi boş');
          if (this.models.length > 0) {
            this.selectedModel = this.models[0];
          }
        }
      },
      error: (error) => {
        console.error('Session model yükleme hatası:', error);
        // Hata durumunda ilk modeli seç
        if (this.models.length > 0) {
          this.selectedModel = this.models[0];
          console.log('Hata sonrası varsayılan model seçildi:', this.selectedModel);
        }
      }
    });
  }

  ngOnDestroy() {
    // Image URL cache'ini temizle
    this.imageUrlCache.clear();
  }

  sortMessagesByDate() {
    this.messages.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      
      // Önce tarihe göre sırala
      if (dateA !== dateB) {
        return dateA - dateB; // Eskiden yeniye
      }
      
      // Aynı tarihte ise user mesajları önce gelsin
      if (a.sender === 'user' && b.sender === 'ai') {
        return -1; // user önce
      }
      if (a.sender === 'ai' && b.sender === 'user') {
        return 1; // user önce
      }
      
      // Aynı sender ise ID'ye göre sırala
      return a.id - b.id;
    });
  }
}
