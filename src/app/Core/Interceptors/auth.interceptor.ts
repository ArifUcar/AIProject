import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);

  // Login isteğini kontrol et
  if (request.url.includes('/Auth/login')) {
    return next(request);
  }

  // Token'ı localStorage'dan al
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('tokenExpiresAt');
  
  if (!token) {
    if (!request.url.includes('/login')) {
      router.navigate(['/login']);
    }
    return next(request);
  }

  // Token süresini kontrol et
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    localStorage.clear();
    router.navigate(['/login']);
    return throwError(() => new Error('Token süresi dolmuş'));
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
        // Local storage'ı temizle
        localStorage.clear();
        
        // Login sayfasına yönlendir
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
}; 