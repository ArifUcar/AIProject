import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { LoginService } from '../Services/AuthService/login.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Sunucu tarafında çalışıyorsa direkt false dön
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    // LoginService üzerinden token kontrolü yap
    if (!this.loginService.isAuthenticated()) {
      this.redirectToLogin(state.url);
      return false;
    }

    return true;
  }

  private redirectToLogin(returnUrl: string): void {
    // Kullanıcıyı login sayfasına yönlendir
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: returnUrl }
    });
  }
} 