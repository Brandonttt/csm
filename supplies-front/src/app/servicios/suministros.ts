import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SuministrosService {

  // Apuntamos al puerto 8082 que configuramos en el application.properties
  private API_URL = 'http://localhost:8082/api'; 

  constructor(private http: HttpClient) { }

  // 1. Obtener el catálogo de medicamentos/materiales para el dropdown de enfermería
  obtenerCatalogoInsumos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/consumos/catalogo`); // Opcional si creas el endpoint, o usas el mock local
  }

  // 2. Guardar la lista de insumos que la enfermera registró en la hoja física
  guardarHojaConsumos(listaConsumos: any[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.API_URL}/consumos/lista`, listaConsumos);
  }

  // 3. Jalar la cuenta armada con Subtotal, IVA y Total para Recepción
  obtenerCuentaFiniquitada(eventoId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/cuentas/evento/${eventoId}`);
  }
}