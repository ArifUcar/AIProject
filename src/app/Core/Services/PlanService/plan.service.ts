import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlanResponse } from '../../../Model/Entity/Response/Plan.Response';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private readonly apiUrl = `${environment.apiUrl}/Plan`;

  constructor(private http: HttpClient) {}

  getActivePlans(): Observable<PlanResponse[]> {
    return this.http.get<PlanResponse[]>(`${this.apiUrl}?onlyActive=true`);
  }

  getPlanById(id: string): Observable<PlanResponse> {
    return this.http.get<PlanResponse>(`${this.apiUrl}/${id}`);
  }
} 