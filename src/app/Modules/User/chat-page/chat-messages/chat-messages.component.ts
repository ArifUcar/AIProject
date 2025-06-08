import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, ChangeDetectorRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.isViewInitialized = true;
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    if (this.isViewInitialized && this.shouldScrollToBottom && this.messagesList?.nativeElement) {
      this.scrollToBottom();
    }
  }

  onSendMessage() {
    if (this.newMessage.trim()) {
      this.sendMessage.emit(this.newMessage);
      this.newMessage = '';
      this.shouldScrollToBottom = true;
      // Mesaj gönderildikten sonra aşağı kaydır
      setTimeout(() => this.scrollToBottom(), 100);
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
    
    const element = this.messagesList.nativeElement;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth'
    });
    this.showScrollToBottomButton = false;
  }

  onScroll() {
    if (!this.messagesList?.nativeElement) return;

    const element = this.messagesList.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Kullanıcı en altta mı kontrol et
    const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5;
    this.shouldScrollToBottom = atBottom;
    
    // Scroll to bottom butonunu göster/gizle
    const scrollFromBottom = scrollHeight - scrollTop - clientHeight;
    this.showScrollToBottomButton = scrollFromBottom > 100;
    
    this.lastScrollTop = scrollTop;
  }

  // Yeni mesaj geldiğinde çağırılacak
  onNewMessage() {
    if (this.shouldScrollToBottom) {
      setTimeout(() => this.scrollToBottomSmooth(), 50);
    }
  }

  // Messages input değişikliğini dinle
  ngOnChanges() {
    if (this.messages && this.messages.length > 0) {
      // Eğer kullanıcı en alttaysa yeni mesaj geldiğinde aşağı kaydır
      if (this.shouldScrollToBottom) {
        setTimeout(() => this.scrollToBottomSmooth(), 100);
      }
    }
  }
}
