import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="code-block">
      <div class="code-header">
        <span class="language">{{ language }}</span>
      </div>
      <pre><code>{{ code }}</code></pre>
    </div>
  `,
  styles: [`
    .code-block {
      margin: 0.5rem 0;
      border-radius: 0.5rem;
      overflow: hidden;
      background-color: #1e293b;
      font-family: 'Fira Code', monospace;
    }

    .code-header {
      padding: 0.5rem 1rem;
      background-color: #334155;
      border-bottom: 1px solid #475569;
    }

    .language {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
    }

    pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
    }

    code {
      color: #e2e8f0;
      font-size: 0.875rem;
      line-height: 1.5;
      white-space: pre;
    }
  `]
})
export class CodeBlockComponent {
  @Input() code: string = '';
  @Input() language: string = 'text';
} 