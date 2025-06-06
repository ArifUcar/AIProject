import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { LoginService } from '../../../Core/Services/AuthService/login.service';

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
  rememberMe = false;
  returnUrl: string = '/chat';

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService
  ) {
    this.loginForm = this.fb.group({
      login: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit() {
    // URL'den returnUrl parametresini al
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/chat';
    
    this.loginForm.get('rememberMe')?.valueChanges.subscribe(value => {
      this.rememberMe = value;
    });
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

    const loginValue = loginField.value;
    if (loginValue && loginValue.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginValue);
    }

    return true;
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      
      const loginData = {
        EmailOrUsername: this.loginForm.get('login')?.value,
        password: this.loginForm.get('password')?.value,
        rememberMe: this.loginForm.get('rememberMe')?.value
      };

      this.loginService.login(loginData).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Giriş başarıyla tamamlandı'
          });
          
          // Chat sayfasına yönlendir
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          console.error('Giriş hatası:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: error.error?.message || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.'
          });
          this.isLoading = false;
        }
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Uyarı',
        detail: 'Lütfen tüm alanları doğru şekilde doldurun'
      });
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
