import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // L'adresse de ton serveur Node.js (Back-end)
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) { }

  // Cette fonction va appeler la route de test du Back-end
  getTestData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/test`);
  }

  // Inscription
  signup(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, { email, password });
  }

  // Connexion
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  // Connexion Google
  googleLogin(googleToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/google-login`, { googleToken });
  }

  
}