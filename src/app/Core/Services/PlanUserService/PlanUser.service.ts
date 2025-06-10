import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PlanModelsResponse {
  models: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanUserService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Plan modellerini getirir
   * @returns Observable<PlanModelsResponse>
   */
  getPlanModels(): Observable<PlanModelsResponse> {
    return this.http.get<PlanModelsResponse>(`${this.baseUrl}/PlanUser/plan-models`);
  }
}
