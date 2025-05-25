import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { RegisterRequest } from '../../../Model/Entity/Request/Register.Request';
import { RegisterResponse } from '../../../Model/Entity/Response/Register.Response';




@Injectable({
  providedIn: 'root'
})
export class RegisterService {
  private readonly apiUrl = `${environment.apiUrl}/Auth/register`;

  constructor(private http: HttpClient) {}

  register(userData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(this.apiUrl, userData);
  }
}
