import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { LoginResponse } from '../../../Model/Entity/Response/Login.Response';
import { LoginRequest } from '../../../Model/Entity/Request/Login.Request';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly apiUrl = `${environment.apiUrl}/Auth/login`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.checkCurrentToken();
  }

  private checkCurrentToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      
      if (token && expiresAt) {
        console.log('Mevcut token durumu:', {
          token: token.substring(0, 20) + '...',
          expiresAt: new Date(expiresAt).toLocaleString('tr-TR')
        });

        if (new Date(expiresAt) <= new Date()) {
          console.warn('Token süresi dolmuş, temizleniyor...');
          this.removeTokens();
        }
      }
    }
  }

  private getStorage(): Storage | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage;
    }
    return null;
  }

  setToken(token: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    const storage = this.getStorage();
    return storage ? storage.getItem(this.TOKEN_KEY) : null;
  }

  setRefreshToken(token: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(this.REFRESH_TOKEN_KEY, token);
    }
  }

  getRefreshToken(): string | null {
    const storage = this.getStorage();
    return storage ? storage.getItem(this.REFRESH_TOKEN_KEY) : null;
  }

  removeTokens(): void {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(this.TOKEN_KEY);
      storage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('user');
      console.log('Auth verileri temizlendi');
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.removeTokens();

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    console.log('Login isteği gönderiliyor:', {
      url: this.apiUrl,
      credentials: { ...credentials, password: '***' }
    });

    return this.http.post<LoginResponse>(this.apiUrl, credentials, { headers }).pipe(
      tap({
        next: (response) => {
          console.log('Login başarılı, token kaydediliyor...');
          
          this.setToken(response.accessToken);
          this.setRefreshToken(response.refreshToken);
          localStorage.setItem('tokenExpiresAt', response.expiresAt);
          localStorage.setItem('user', JSON.stringify(response.user));

          const savedToken = this.getToken();
          if (!savedToken) {
            throw new Error('Token kaydedilemedi');
          }

          console.log('Token başarıyla kaydedildi:', {
            token: savedToken.substring(0, 20) + '...',
            expiresAt: new Date(response.expiresAt).toLocaleString('tr-TR')
          });
        },
        error: (error) => {
          console.error('Login hatası:', error);
          this.removeTokens();
        }
      }),
      catchError((error) => {
        console.error('Login işlemi başarısız:', error);
        this.removeTokens();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.removeTokens();
    console.log('Çıkış yapıldı, auth verileri temizlendi');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) {
      return false;
    }

    return new Date(expiresAt) > new Date();
  }
}
