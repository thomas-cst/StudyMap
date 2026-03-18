import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Inscription
   */
  signup(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, { email, password });
  }

  /**
   * Connexion
   */
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  /**
   * Get all villes
   */
  getVilles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/villes`);
  }

  /**
   * Search villes
   */
  searchVilles(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/villes/search`, { params: { q: query } });
  }
}
