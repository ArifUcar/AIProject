import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { LoginResponse } from '../../../Model/Entity/Response/Login.Response';
import { LoginRequest } from '../../../Model/Entity/Request/Login.Request';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly apiUrl = `${environment.apiUrl}/Auth/login`;

  constructor(private http: HttpClient) {
    this.checkCurrentToken();
  }

  private checkCurrentToken(): void {
    const token = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (token && expiresAt) {
      console.log('Mevcut token durumu:', {
        token: token.substring(0, 20) + '...',
        expiresAt: new Date(expiresAt).toLocaleString('tr-TR')
      });

      if (new Date(expiresAt) <= new Date()) {
        console.warn('Token süresi dolmuş, temizleniyor...');
        this.clearAuthData();
      }
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
    console.log('Auth verileri temizlendi');
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.clearAuthData();

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
          
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('tokenExpiresAt', response.expiresAt);
          localStorage.setItem('user', JSON.stringify(response.user));

          const savedToken = localStorage.getItem('accessToken');
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
          this.clearAuthData();
        }
      }),
      catchError((error) => {
        console.error('Login işlemi başarısız:', error);
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.clearAuthData();
    console.log('Çıkış yapıldı, auth verileri temizlendi');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) {
      return false;
    }

    return new Date(expiresAt) > new Date();
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}
