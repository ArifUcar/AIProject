import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // Token'ı localStorage'dan al
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('tokenExpiresAt');
  
  // Debug için token bilgilerini logla
  console.log('Token durumu:', {
    tokenVar: !!token,
    tokenLength: token?.length,
    expiresAt,
    currentTime: new Date().toISOString(),
    requestUrl: request.url
  });

  // Login, Register ve harici API isteklerini kontrol et
  if (request.url.includes('/Auth/login') || 
      request.url.includes('/Auth/register') ||
      request.url.includes('generativelanguage.googleapis.com') ||
      request.url.includes('api.openai.com')) {
    console.log('Yetkilendirme gerektirmeyen istek:', request.url);
    return next(request);
  }

  if (!token) {
    console.error('Token bulunamadı, login sayfasına yönlendiriliyor');
    if (!request.url.includes('/Auth/')) {
      router.navigate(['/login']);
    }
    return next(request);
  }

  // Token'ı decode et ve kontrol et
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Geçersiz token formatı');
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    console.log('Token payload:', {
      exp: new Date(payload.exp * 1000).toISOString(),
      sub: payload.sub,
      roles: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    });

    // Token süresini kontrol et
    const tokenExpiration = new Date(payload.exp * 1000);
    const now = new Date();
    const isTokenExpired = tokenExpiration <= now;

    if (isTokenExpired) {
      console.log('Token süresi dolmuş, yenileme deneniyor...');
      const refreshToken = getCookie('refreshToken');
      
      if (!refreshToken) {
        console.error('Refresh token bulunamadı');
        localStorage.clear();
        deleteCookie('refreshToken');
        router.navigate(['/login']);
        return throwError(() => new Error('Token süresi dolmuş ve refresh token bulunamadı'));
      }

      // Refresh token ile yeni token al
      return http.post<any>(`${environment.apiUrl}/Auth/refresh-token`, { refreshToken }).pipe(
        tap(response => console.log('Token yenileme yanıtı:', response)),
        switchMap(response => {
          if (!response.accessToken) {
            console.error('Geçersiz token yanıtı:', response);
            throw new Error('Geçersiz token yanıtı');
          }

          console.log('Token yenilendi');
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('tokenExpiresAt', response.expiresAt);
          
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
          console.error('Token yenileme hatası:', error);
          // Sadece 401 hatası durumunda token'ı temizle
          if (error.status === 401) {
            localStorage.clear();
            deleteCookie('refreshToken');
            router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
    }

    // Token geçerli, isteği gönder
    const authReq = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return next(authReq).pipe(
      tap(response => console.log('İstek başarılı:', request.url)),
      catchError((error: HttpErrorResponse) => {
        console.error('API isteği hatası:', {
          url: request.url,
          status: error.status,
          error: error.error,
          headers: request.headers.keys()
        });
        
        // Sadece yetkilendirme hatalarında token'ı temizle
        if (error.status === 401) {
          console.error('401 Unauthorized hatası:', error.error);
          // Token'ı temizle ve login sayfasına yönlendir
          localStorage.clear();
          deleteCookie('refreshToken');
          router.navigate(['/login']);
        } else if (error.status === 500) {
          console.error('500 Sunucu hatası:', error.error);
          // Sunucu hatası durumunda token'ı koru
          // Sadece hata mesajını göster
        }
        
        return throwError(() => error);
      })
    );

  } catch (error) {
    console.error('Token işleme hatası:', error);
    // Token formatı geçersizse temizle
    localStorage.clear();
    deleteCookie('refreshToken');
    router.navigate(['/login']);
    return throwError(() => error);
  }
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