import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiKeyService } from './ApiKey.service';

export interface GeminiRequest {
  contents: {
    parts: {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }[];
  }[];
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  promptFeedback: {
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly model = 'gemini-pro';
  private apiKey: string | null = null;

  constructor(
    private http: HttpClient,
    private apiKeyService: ApiKeyService
  ) {
    this.initializeApiKey();
  }

  private initializeApiKey(): void {
    this.apiKeyService.getApiKeys().subscribe({
      next: (keys) => {
        const geminiKey = keys.find(k => k.provider === 'Google' && k.name === 'Gemini' && k.isActive);
        if (geminiKey) {
          this.apiKey = geminiKey.key;
        } else {
          console.error('Aktif Gemini API anahtarı bulunamadı');
        }
      },
      error: (error) => {
        console.error('API anahtarları alınırken hata oluştu:', error);
      }
    });
  }

  /**
   * Gemini API'sine metin tabanlı istek gönderir
   * @param prompt Kullanıcının gönderdiği metin
   * @param config Opsiyonel yapılandırma parametreleri
   * @returns API yanıtı
   */
  generateText(
    prompt: string,
    config?: {
      temperature?: number;
      maxOutputTokens?: number;
    }
  ): Observable<string> {
    if (!this.apiKey) {
      return new Observable(subscriber => {
        subscriber.error('API anahtarı bulunamadı');
      });
    }

    const request: GeminiRequest = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        maxOutputTokens: config?.maxOutputTokens ?? 2048
      }
    };

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
    
    return this.http.post<GeminiResponse>(url, request).pipe(
      map(response => {
        if (response.candidates && response.candidates.length > 0) {
          return response.candidates[0].content.parts[0].text;
        }
        throw new Error('API yanıtı boş');
      }),
      catchError(error => {
        console.error('Gemini API hatası:', error);
        throw error;
      })
    );
  }

  /**
   * Gemini API'sine görsel ve metin içeren istek gönderir
   * @param prompt Kullanıcının gönderdiği metin
   * @param imageBase64 Base64 formatında görsel
   * @param mimeType Görselin MIME tipi
   * @returns API yanıtı
   */
  generateTextWithImage(
    prompt: string,
    imageBase64: string,
    mimeType: string
  ): Observable<string> {
    if (!this.apiKey) {
      return new Observable(subscriber => {
        subscriber.error('API anahtarı bulunamadı');
      });
    }

    const request: GeminiRequest = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          {
            text: prompt
          }
        ]
      }]
    };

    const url = `${this.baseUrl}/${this.model}-vision:generateContent?key=${this.apiKey}`;

    return this.http.post<GeminiResponse>(url, request).pipe(
      map(response => {
        if (response.candidates && response.candidates.length > 0) {
          return response.candidates[0].content.parts[0].text;
        }
        throw new Error('API yanıtı boş');
      }),
      catchError(error => {
        console.error('Gemini Vision API hatası:', error);
        throw error;
      })
    );
  }
}
