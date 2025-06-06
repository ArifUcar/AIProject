import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { LoginResponse } from '../../../Model/Entity/Login/Login.Response';
import { LoginRequest } from '../../../Model/Entity/Login/Login.Request';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly apiUrl = `${environment.apiUrl}/Auth`;
  private readonly TOKEN_KEY = 'accessToken';
  private readonly EXPIRES_AT_KEY = 'tokenExpiresAt';
  private readonly USER_KEY = 'user';
  private readonly REMEMBER_ME_KEY = 'rememberMe';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.checkCurrentToken();
  }

  private checkCurrentToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getToken();
      const expiresAt = this.getStorage()?.getItem(this.EXPIRES_AT_KEY);
      
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

  private setCookie(name: string, value: string, days: number) {
    if (isPlatformBrowser(this.platformId)) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = `expires=${date.toUTCString()}`;
      document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
    }
  }

  private getCookie(name: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  private deleteCookie(name: string) {
    if (isPlatformBrowser(this.platformId)) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.removeTokens();

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    const rememberMe = credentials.rememberMe || false;

    console.log('Login isteği gönderiliyor:', {
      url: `${this.apiUrl}/login`,
      credentials: { ...credentials, password: '***' }
    });

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials, { headers }).pipe(
      tap({
        next: (response) => {
          console.log('Login başarılı, token kaydediliyor...');
          
          const storage = this.getStorage();
          if (storage) {
            storage.setItem(this.TOKEN_KEY, response.accessToken);
            storage.setItem(this.EXPIRES_AT_KEY, response.expiresAt);
            storage.setItem(this.USER_KEY, JSON.stringify(response.user));
            storage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());
          }

          // Refresh token'ı cookie'ye kaydet
          if (rememberMe) {
            this.setCookie('refreshToken', response.refreshToken, 30); // 30 gün
          } else {
            this.setCookie('refreshToken', response.refreshToken, 1); // 1 gün
          }

          const savedToken = this.getToken();
          if (!savedToken) {
            throw new Error('Token kaydedilemedi');
          }

          console.log('Token başarıyla kaydedildi:', {
            token: savedToken.substring(0, 20) + '...',
            expiresAt: new Date(response.expiresAt).toLocaleString('tr-TR'),
            rememberMe
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

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getCookie('refreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token bulunamadı'));
    }

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap(response => {
        const storage = this.getStorage();
        if (storage) {
          storage.setItem(this.TOKEN_KEY, response.accessToken);
          storage.setItem(this.EXPIRES_AT_KEY, response.expiresAt);
          
          const rememberMe = storage.getItem(this.REMEMBER_ME_KEY) === 'true';
          if (rememberMe) {
            this.setCookie('refreshToken', response.refreshToken, 30);
          } else {
            this.setCookie('refreshToken', response.refreshToken, 1);
          }
        }
      })
    );
  }

  removeTokens(): void {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(this.TOKEN_KEY);
      storage.removeItem(this.EXPIRES_AT_KEY);
      storage.removeItem(this.USER_KEY);
      storage.removeItem(this.REMEMBER_ME_KEY);
    }
    this.deleteCookie('refreshToken');
    console.log('Auth verileri temizlendi');
  }

  logout(): void {
    this.removeTokens();
    console.log('Çıkış yapıldı, auth verileri temizlendi');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const storage = this.getStorage();
    const expiresAt = storage?.getItem(this.EXPIRES_AT_KEY);
    
    if (!token || !expiresAt) {
      console.log('Token veya süre bilgisi bulunamadı:', { token: !!token, expiresAt: !!expiresAt });
      return false;
    }

    const isValid = new Date(expiresAt) > new Date();
    console.log('Token durumu:', {
      token: token.substring(0, 20) + '...',
      expiresAt: new Date(expiresAt).toLocaleString('tr-TR'),
      isValid
    });

    return isValid;
  }
}
