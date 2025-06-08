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

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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
    RippleModule
  ],
  templateUrl: './chat-messages.component.html',
  styleUrl: './chat-messages.component.scss'
})
export class ChatMessagesComponent implements AfterViewInit, AfterViewChecked, OnChanges {
  @Input() messages: Message[] = [];
  @Input() currentSessionId: string | null = null;
  @Output() sendMessage = new EventEmitter<string>();
  @ViewChild('messagesList') private messagesList!: ElementRef;

  newMessage: string = '';
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
    if (this.newMessage.trim()) {
      this.sendMessage.emit(this.newMessage);
      this.newMessage = '';
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
  }

  // Get user avatar icon
  getUserAvatarIcon(sender: string): string {
    return sender === 'user' ? 'pi pi-user' : 'pi pi-android';
  }

  // Get user avatar background color
  getUserAvatarColor(sender: string): string {
    return sender === 'user' ? '#3b82f6' : '#10b981';
  }
}
