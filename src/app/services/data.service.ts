import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // L'adresse de ton serveur Node.js (Back-end)
  private apiUrl = 'http://localhost:3000/api/test'; 

  constructor(private http: HttpClient) { }

  // Cette fonction va appeler la route de test du Back-end
  getTestData(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}