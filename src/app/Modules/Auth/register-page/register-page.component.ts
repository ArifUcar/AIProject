import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RegisterService } from '../../../Core/Services/AuthService/register.service';
import { RegisterRequest } from '../../../Model/Entity/Register/Register.Request';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule
  ],
  providers: [
    MessageService,
    RegisterService
  ],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
})
export class RegisterPageComponent implements OnInit {
  registerForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  countries: { id: string; name: string }[] = [];
  regions: { [key: string]: { id: string; name: string }[] } = {};

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router,
    private registerService: RegisterService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      region: ['', [Validators.required]],
      country: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      userName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      roleName: ['FreeUser'] // Varsayılan rol
    });
  }

  ngOnInit() {
    // Ülke ve bölge verilerini yükle
    this.loadCountries();
  }

  loadCountries() {
    // Örnek ülke verileri
    this.countries = [
      { id: 'tr', name: 'Türkiye' },
      { id: 'us', name: 'Amerika Birleşik Devletleri' },
      { id: 'gb', name: 'Birleşik Krallık' }
    ];

    // Örnek bölge verileri
    this.regions = {
      'tr': [
        { id: '34', name: 'İstanbul' },
        { id: '06', name: 'Ankara' },
        { id: '35', name: 'İzmir' }
      ],
      'us': [
        { id: 'ny', name: 'New York' },
        { id: 'ca', name: 'California' },
        { id: 'tx', name: 'Texas' }
      ],
      'gb': [
        { id: 'lon', name: 'Londra' },
        { id: 'man', name: 'Manchester' },
        { id: 'bir', name: 'Birmingham' }
      ]
    };
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) {
      return 'Bu alan zorunludur';
    }

    if (field.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `En az ${minLength} karakter giriniz`;
    }

    if (field.hasError('email')) {
      return 'Geçerli bir e-posta adresi giriniz';
    }

    if (field.hasError('pattern')) {
      if (fieldName === 'postalCode') {
        return 'Posta kodu 5 haneli olmalıdır';
      }
      if (fieldName === 'phoneNumber') {
        return 'Telefon numarası 10 haneli olmalıdır';
      }
    }

    return '';
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const formValue = this.registerForm.getRawValue();

      const registerRequest: RegisterRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        address: formValue.address,
        city: formValue.city,
        region: formValue.region,
        country: formValue.country,
        postalCode: formValue.postalCode,
        userName: formValue.userName,
        email: formValue.email,
        password: formValue.password,
        phoneNumber: formValue.phoneNumber,
        roleName: formValue.roleName
      };

      this.registerService.register(registerRequest).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Başarılı',
            detail: 'Kayıt işlemi başarılı! Giriş sayfasına yönlendiriliyorsunuz...'
          });

          // Başarılı kayıt sonrası login sayfasına yönlendir
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (error) => {
          console.error('Kayıt hatası:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Hata',
            detail: error.error?.message || 'Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
          });
        },
        complete: () => {
          this.isLoading = false;
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

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
