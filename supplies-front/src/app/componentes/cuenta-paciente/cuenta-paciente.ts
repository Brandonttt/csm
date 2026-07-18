import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, UpperCasePipe, DecimalPipe, NgIf, NgFor } from '@angular/common';
import { SuministrosService } from '../../servicios/suministros'; // Ajusta la ruta a tu proyecto
import { ActivatedRoute } from '@angular/router'; // 1. Importa ActivatedRoute
@Component({
  selector: 'app-cuenta-paciente',
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    UpperCasePipe,
    DecimalPipe
  ],
  templateUrl: './cuenta-paciente.html',
  styleUrl: './cuenta-paciente.scss',
})
export class CuentaPacienteComponent implements OnInit {
  cuentaData: any = null;
  loading: boolean = true;
  errorMsg: string = '';

  constructor(private suministrosService: SuministrosService, private route: ActivatedRoute, private cdr: ChangeDetectorRef) { }
 
ngOnInit(): void {
    // 3. Método ultra seguro para recuperar el ID en F5 o navegación directa
    this.route.paramMap.subscribe({
      next: (params) => {
        const idParam = params.get('id');
        if (idParam) {
          this.cargarCuenta(Number(idParam));
        } else {
          this.errorMsg = 'ID de evento no válido.';
          this.loading = false;
          this.cdr.detectChanges(); // Forzamos actualización si falla el ID
        }
      }
    });
  }
cargarCuenta(eventoId: number): void {
    this.loading = true;
    this.errorMsg = '';
    
    this.suministrosService.obtenerCuenta(eventoId).subscribe({
      next: (data) => {
        console.log('Datos cargados con éxito:', data);
        this.cuentaData = data;
        this.loading = false;
        
        // 🚀 LA LÍNEA MÁGICA: Obliga a Angular a redibujar la pantalla AHORA MISMO
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error en la petición HTTP:', err);
        this.errorMsg = 'No se pudo obtener el estado de cuenta del paciente.';
        this.loading = false;
        
        // También forzamos el redibujado en caso de error para quitar la pantalla de carga
        this.cdr.detectChanges(); 
      }
    });
  }
   imprimirCuenta(): void {
    window.print();
  }
}
