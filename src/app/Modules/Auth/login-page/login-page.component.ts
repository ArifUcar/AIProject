import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { LoginService } from '../../../Core/Services/AuthService/login.service';
import { LoginRequest } from '../../../Model/Entity/Request/Login.Request';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule
  ],
  providers: [
    MessageService,
    LoginService
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      login: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // returnUrl kontrolünü kaldırıyoruz
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  isFieldDirty(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.dirty : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) {
      return 'Bu alan zorunludur';
    }

    if (fieldName === 'login') {
      if (field.hasError('minlength')) {
        return 'En az 3 karakter giriniz';
      }
      // E-posta formatı kontrolü
      const value = field.value;
      if (value && value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Geçerli bir e-posta adresi giriniz';
      }
    }

    if (fieldName === 'password' && field.hasError('minlength')) {
      return 'Şifre en az 6 karakter olmalıdır';
    }

    return '';
  }

  isFormValid(): boolean {
    const loginField = this.loginForm.get('login');
    const passwordField = this.loginForm.get('password');
    
    if (!loginField?.valid || !passwordField?.valid) {
      return false;
    }

    // E-posta formatı kontrolü
    const loginValue = loginField.value;
    if (loginValue && loginValue.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginValue);
    }

    return true;
  }

  onSubmit() {
    if (this.isFormValid()) {
      this.isLoading = true;
      const formValue = this.loginForm.getRawValue();
      
      const loginRequest: LoginRequest = {
        emailOrUsername: formValue.login,
        password: formValue.password
      };

      this.loginService.login(loginRequest).subscribe({
        next: (response) => {
          console.log('Login başarılı, yönlendiriliyor...');
          
          // Chat sayfasına yönlendir
          this.router.navigate(['/chat']).then(success => {
            if (!success) {
              console.error('Chat sayfasına yönlendirme başarısız');
              this.messageService.add({
                severity: 'error',
                summary: 'Hata',
                detail: 'Chat sayfasına yönlendirme başarısız oldu'
              });
            } else {
              this.messageService.add({
                severity: 'success',
                summary: 'Başarılı',
                detail: 'Giriş başarılı! Chat sayfasına yönlendiriliyorsunuz...'
              });
            }
          }).catch(error => {
            console.error('Yönlendirme hatası:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Hata',
              detail: 'Yönlendirme sırasında bir hata oluştu'
            });
          });
        },
        error: (error) => {
          console.error('Login hatası:', error);
          this.isLoading = false;
          
          let errorMessage = 'Giriş yapılırken bir hata oluştu.';
          if (error.status === 401) {
            errorMessage = 'Kullanıcı adı veya şifre hatalı.';
          } else if (error.status === 0) {
            errorMessage = 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: errorMessage
          });
        }
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Hata',
        detail: 'Lütfen tüm alanları doğru şekilde doldurun!'
      });
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('user');
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
