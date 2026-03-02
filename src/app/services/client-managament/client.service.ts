import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}`;
  constructor(private http: HttpClient) {}

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllClients(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}?action=listVentas`)
      .pipe(catchError(this.handleError));
  }

  getClientsByStatus(status: boolean): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/status/${status}`, { headers })
      .pipe(catchError(this.handleError));
  }

  searchClients(query?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.http.get<any>(`${this.apiUrl}/search${params}`, { headers })
      .pipe(catchError(this.handleError));
  }

  filterClientsByLetter(letter: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/filter?letter=${letter}`, { headers })
      .pipe(catchError(this.handleError));
  }

  getClientById(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  createClient(client: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(this.apiUrl, client, { headers })
      .pipe(catchError(this.handleError));
  }

  updateClient(id: number, client: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/${id}`, client, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteClient(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  getClientHistory(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${id}/history`, { headers })
      .pipe(catchError(this.handleError));
  }


  // Manejo de errores
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 400 && error.error && error.error.error === 'Número de teléfono duplicado') {
        return throwError(() => ({
          status: error.status,
          message: error.error.message || 'Ya existe otro cliente con este número de teléfono'
        }));
      }

      errorMessage = `Código: ${error.status}, Mensaje: ${error.message}`;
    }

    return throwError(() => ({
      status: error.status,
      message: errorMessage
    }));
  }
}
