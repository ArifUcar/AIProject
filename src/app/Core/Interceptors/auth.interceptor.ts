import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // Login, Gemini API ve OpenAI API isteklerini kontrol et
  if (request.url.includes('/Auth/login') || 
      request.url.includes('generativelanguage.googleapis.com') ||
      request.url.includes('api.openai.com')) {
    return next(request);
  }

  // Token'ı localStorage'dan al
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('tokenExpiresAt');
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  
  if (!token) {
    if (!request.url.includes('/login')) {
      router.navigate(['/login']);
    }
    return next(request);
  }

  // Token süresini kontrol et
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    // Refresh token'ı cookie'den al
    const refreshToken = getCookie('refreshToken');
    
    if (refreshToken) {
      // Refresh token ile yeni token al
      return http.post<any>('/api/Auth/refresh-token', { refreshToken }).pipe(
        switchMap(response => {
          // Yeni token'ı kaydet
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('tokenExpiresAt', response.expiresAt);
          
          // Beni hatırla seçeneği aktifse refresh token'ı güncelle
          if (rememberMe) {
            setCookie('refreshToken', response.refreshToken, 30); // 30 gün
          }
          
          // Yeni token ile isteği tekrarla
          const authReq = request.clone({
            setHeaders: {
              'Authorization': `Bearer ${response.accessToken.trim()}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          return next(authReq);
        }),
        catchError(error => {
          // Refresh token geçersizse veya süresi dolmuşsa
          localStorage.clear();
          deleteCookie('refreshToken');
          router.navigate(['/login']);
          return throwError(() => error);
        })
      );
    } else {
      localStorage.clear();
      router.navigate(['/login']);
      return throwError(() => new Error('Token süresi dolmuş'));
    }
  }

  // Token'ı header'a ekle
  const authReq = request.clone({
    setHeaders: {
      'Authorization': `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.clear();
        deleteCookie('refreshToken');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};

// Cookie işlemleri için yardımcı fonksiyonlar
function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
}

function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
} 