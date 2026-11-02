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
    next: (data: any) => {
      if (data) {
        // 1. Normalizar médico y paciente
        data.nombreMedico = data.nombreMedico || data.medicoTratante || data.medico || '';
        data.nombrePaciente = data.nombrePaciente || data.paciente || '';

        // 2. Asegurar que los detalles tengan valores numéricos
        let subtotalCalculado = 0;
        if (data.detalles && Array.isArray(data.detalles)) {
          data.detalles.forEach((item: any) => {
            item.cantidad = Number(item.cantidad) || 0;
            item.precioUnitario = Number(item.precioUnitario) || 0;
            item.importe = Number(item.importe != null ? item.importe : (item.cantidad * item.precioUnitario)) || 0;
            subtotalCalculado += item.importe;
          });
        }

        // 3. Forzar valores numéricos en los totales
        data.subtotal = Number(data.subtotal) || subtotalCalculado;
        data.iva = Number(data.iva) || (data.subtotal * 0.16);
        data.total = Number(data.total) || (data.subtotal + data.iva);

        this.cuentaData = data;
        this.loading = false;

        // 🚀 Fuerza a Angular a pintar médico y totales de inmediato
        this.cdr.detectChanges();
      }
    },
    error: (err) => {
      console.error('Error al cargar la cuenta:', err);
      this.errorMsg = 'No se pudo obtener el estado de cuenta del paciente.';
      this.loading = false;
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
  if (!this.cuentaData || !this.cuentaData.detalles || this.cuentaData.detalles.length === 0) {
    alert('No hay datos disponibles para copiar.');
    return;
  }

  // Encabezados de las columnas (separados por tabulador \t)
  let contenidoTexto = "FECHA\tARTÍCULO / CONCEPTO\tCANTIDAD\tPRECIO UNITARIO\tIMPORTE\n";

  // Rellenamos con las celdas asegurando el nombre de campo correcto
  this.cuentaData.detalles.forEach((item: any) => {
    const fecha = item.fecha || '';
    // 🛠️ FIX 1: Soporta 'descripcion', 'descripcionManual' o 'description'
    const desc = item.descripcion || item.descripcionManual || item.description || 'SIN DESCRIPCIÓN';
    const cant = item.cantidad || 0;
    const precio = item.precioUnitario || 0;
    const importe = item.importe || (cant * precio) || 0;

    contenidoTexto += `${fecha}\t${desc}\t${cant}\t${precio}\t${importe}\n`;
  });

  // Totales al final de la tabla
  contenidoTexto += `\n\t\t\tSUBTOTAL:\t${this.cuentaData.subtotal || 0}\n`;
  contenidoTexto += `\t\t\tIVA (16%):\t${this.cuentaData.iva || 0}\n`;
  contenidoTexto += `\t\t\tTOTAL:\t${this.cuentaData.total || 0}\n`;

  // 🛠️ FIX 2: Ejecución de copiado con fallback para HTTP / Red Local
  this.copiarTextoSeguro(contenidoTexto);
}

// Mecanismo compatible con HTTP, HTTPS, localhost y red LAN
private copiarTextoSeguro(texto: string): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto)
      .then(() => alert('¡Columnas copiadas al portapapeles! Abre Excel y presiona Ctrl + V.'))
      .catch(() => this.ejecutarCopiadoFallback(texto));
  } else {
    this.ejecutarCopiadoFallback(texto);
  }
}

private ejecutarCopiadoFallback(texto: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = texto;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copiado = document.execCommand('copy');
    if (copiado) {
      alert('¡Columnas copiadas al portapapeles! Abre Excel y presiona Ctrl + V.');
    } else {
      alert('No se pudo copiar automáticamente.');
    }
  } catch (err) {
    console.error('Error al copiar:', err);
    alert('Error al copiar al portapapeles.');
  } finally {
    document.body.removeChild(textarea);
  }
}
}
