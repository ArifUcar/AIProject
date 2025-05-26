import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiKeyResponse {
  name: string;
  provider: string;
  key: string;
  isActive: boolean;
  lastUsedAt: string | null;
  usages: any[];
  id: string;
  isDeleted: boolean;
  createdDate: string;
  updatedDate: string;
  deleteDate: string | null;
  createdByUser: any | null;
  createdByUserId: string | null;
  updatedByUser: any | null;
  updatedByUserId: string | null;
  deleteByUser: any | null;
  deleteByUserId: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private readonly baseUrl = `${environment.apiUrl}/ApiKey`;

  constructor(private http: HttpClient) {}

  /**
   * API anahtarlarını getir
   * @returns API anahtarlarının listesi
   */
  getApiKeys(): Observable<ApiKeyResponse[]> {
    return this.http.get<ApiKeyResponse[]>(this.baseUrl);
  }

  /**
   * Belirli bir API anahtarını getir
   * @param id API anahtarı ID'si
   * @returns Tek bir API anahtarı
   */
  getApiKeyById(id: string): Observable<ApiKeyResponse> {
    return this.http.get<ApiKeyResponse>(`${this.baseUrl}/${id}`);
  }
}
