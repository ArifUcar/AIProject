import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private platformId = inject(PLATFORM_ID);

  constructor(private router: Router) {}

  private getLocalStorage(): Storage | null {
    if (isPlatformBrowser(this.platformId)) {
      return window.localStorage;
    }
    return null;
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Sunucu tarafında çalışıyorsa direkt false dön
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const storage = this.getLocalStorage();
    if (!storage) {
      return false;
    }

    // Token ve kullanıcı bilgilerini kontrol et
    const token = storage.getItem('accessToken');
    const tokenExpiresAt = storage.getItem('tokenExpiresAt');
    const user = storage.getItem('user');

    // Token, süre ve kullanıcı bilgisi yoksa direkt login'e yönlendir
    if (!token || !tokenExpiresAt || !user) {
      this.clearAuthData(storage);
      this.redirectToLogin(state.url);
      return false;
    }

    try {
      // Token'ın süresi dolmuş mu kontrol et
      const expirationDate = new Date(tokenExpiresAt);
      const now = new Date();

      if (expirationDate <= now) {
        // Token'ın süresi dolmuş
        this.clearAuthData(storage);
        this.redirectToLogin(state.url);
        return false;
      }

      // Kullanıcı bilgilerini parse et ve kontrol et
      const userData = JSON.parse(user);
      if (!userData || !userData.id) {
        // Geçersiz kullanıcı bilgisi
        this.clearAuthData(storage);
        this.redirectToLogin(state.url);
        return false;
      }

      // Tüm kontroller başarılı
      return true;
    } catch (error) {
      console.error('Auth kontrol hatası:', error);
      this.clearAuthData(storage);
      this.redirectToLogin(state.url);
      return false;
    }
  }

  private clearAuthData(storage: Storage): void {
    // Tüm auth verilerini temizle
    storage.removeItem('accessToken');
    storage.removeItem('refreshToken');
    storage.removeItem('tokenExpiresAt');
    storage.removeItem('user');
  }

  private redirectToLogin(returnUrl: string): void {
    // Kullanıcıyı login sayfasına yönlendir
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: returnUrl }
    });
  }
} 