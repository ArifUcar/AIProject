import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  template: `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-language">{{ language }}</span>
        <button pButton 
                class="p-button-text p-button-rounded" 
                icon="pi pi-copy" 
                (click)="copyCode()"
                [pTooltip]="copyTooltip"
                tooltipPosition="top">
        </button>
      </div>
      <pre class="code-block"><code>{{ code }}</code></pre>
    </div>
  `,
  styles: [`
    .code-block-wrapper {
      background-color: #1e293b;
      border-radius: 0.5rem;
      margin: 0.5rem 0;
      overflow: hidden;
      width: 100%;
      max-width: 100%;
    }

    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1rem;
      background-color: #334155;
      border-bottom: 1px solid #475569;
    }

    .code-language {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 500;
    }

    .code-block {
      margin: 0;
      padding: 1rem;
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      overflow-x: auto;
      color: #e2e8f0;
      white-space: pre;
    }

    @media (max-width: 768px) {
      .code-block-wrapper {
        margin: 0.25rem 0 !important;
        width: 100% !important;
        max-width: calc(100vw - 2rem) !important;
        box-sizing: border-box !important;
      }
      
      .code-block {
        font-size: 1.1rem !important;
        padding: 0.75rem !important;
        line-height: 1.6 !important;
        overflow-x: auto !important;
        word-break: break-all !important;
        white-space: pre-wrap !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      .code-language {
        font-size: 0.8rem !important;
      }
      
      .code-block-header {
        padding: 0.4rem 0.75rem !important;
        box-sizing: border-box !important;
      }
    }

    :host ::ng-deep {
      .p-button.p-button-text {
        color: #94a3b8;
        padding: 0.25rem;
        
        &:hover {
          background-color: #475569;
          color: #e2e8f0;
        }

        .p-button-icon {
          font-size: 0.875rem;
        }
      }
    }
  `]
})
export class CodeBlockComponent implements OnInit {
  @Input() code: string = '';
  @Input() language: string = 'text';
  
  copyTooltip: string = 'Kodu Kopyala';
  private copyTimeout: any;

  ngOnInit() {
    // Kod içeriğini temizle
    this.code = this.code.trim();
  }

  copyCode() {
    navigator.clipboard.writeText(this.code).then(() => {
      // Kopyalama başarılı olduğunda tooltip'i güncelle
      this.copyTooltip = 'Kopyalandı!';
      
      // 2 saniye sonra tooltip'i eski haline getir
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copyTimeout = setTimeout(() => {
        this.copyTooltip = 'Kodu Kopyala';
      }, 2000);
    }).catch(err => {
      console.error('Kod kopyalanırken hata oluştu:', err);
      this.copyTooltip = 'Kopyalama başarısız!';
    });
  }
} 