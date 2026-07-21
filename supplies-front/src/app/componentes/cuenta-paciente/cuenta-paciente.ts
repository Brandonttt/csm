import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, UpperCasePipe, DecimalPipe, NgIf, NgFor } from '@angular/common';
import { SuministrosService } from '../../servicios/suministros'; // Ajusta la ruta a tu proyecto
import { ActivatedRoute } from '@angular/router'; // 1. Importa ActivatedRoute
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-cuenta-paciente',
  imports: [
    CommonModule,
    FormsModule,
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
  modoEdicion: boolean = false;

toggleModoEdicion(): void {
  this.modoEdicion = !this.modoEdicion;
}
  actualizarImporteFila(item: any): void {
  // Recalculamos el importe del artículo modificado
  const cant = item.cantidad || 0;
  const precio = item.precioUnitario || 0;
  item.importe = cant * precio;
  
  // Detonamos el recálculo general de la cuenta
  this.recalcularTotales();
}

recalcularTotales(): void {
  if (!this.cuentaData || !this.cuentaData.detalles) return;

  let acumSubtotal = 0;
  this.cuentaData.detalles.forEach((item: any) => {
    acumSubtotal += item.importe || 0;
  });

  this.cuentaData.subtotal = acumSubtotal;
  this.cuentaData.iva = this.cuentaData.subtotal * 0.16;
  this.cuentaData.total = this.cuentaData.subtotal + this.cuentaData.iva;
  
  // Forzamos actualización visual por el refresh hook anterior
  this.cdr.detectChanges();
}
copiarColumnasExcel(): void {
  if (!this.cuentaData || !this.cuentaData.detalles.length) {
    alert('No hay datos disponibles para copiar.');
    return;
  }

  // Encabezados de las columnas
  let contenidoTexto = "ARTÍCULO / CONCEPTO\tCANTIDAD\tPRECIO UNITARIO\tIMPORTE\n";

  // Rellenamos con las celdas editadas
  this.cuentaData.detalles.forEach((item: any) => {
    contenidoTexto += `${item.description}\t${item.cantidad}\t${item.precioUnitario}\t${item.importe}\n`;
  });

  // Usamos la API del Navegador para copiar directamente
  navigator.clipboard.writeText(contenidoTexto).then(() => {
    alert('¡Columnas copiadas al portapapeles! Abre Excel y presiona Ctrl + V.');
  }).catch(err => {
    console.error('Error al copiar al portapapeles', err);
    alert('No se pudo copiar automáticamente.');
  });
}
}
