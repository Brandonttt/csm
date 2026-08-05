import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SuministrosService } from '../../servicios/suministros';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hoja-enfermeria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hoja-enfermeria.html',
  styleUrls: ['./hoja-enfermeria.scss']
})
export class HojaEnfermeriaComponent implements OnInit {
  hojaForm!: FormGroup;
  apiBaseUrl = 'http://192.168.100.10:8082/api';

  catalogoInsumos: any[] = [];
  listaEventosActivos: any[] = [];
  esModoEdicion: boolean = false;
  idEventoActual: number | null = null;

  subtotal = 0;
  iva = 0;
  total = 0;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient, 
    private suministrosService: SuministrosService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  obtenerFechaLocal(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngOnInit(): void {
    this.cargarCatalogoInsumos();
    this.hojaForm = this.fb.group({
      eventoId: [null],
      nombrePaciente: ['', Validators.required],
      fecha: [this.obtenerFechaLocal(), Validators.required],
      fechaNacimiento: [''],
      habitacion: [''],
      medicoTratante: ['', Validators.required],
      procedimiento: [''],
      consumos: this.fb.array([]) 
    });

    this.cargarEventosActivos();
    this.agregarFila();

    this.hojaForm.valueChanges.subscribe(() => {
      this.calcularTotales();
    });
  }

  cargarCatalogoInsumos(): void {
    this.http.get<any[]>(`${this.apiBaseUrl}/consumos/insumos`).subscribe({
      next: (insumosBD) => {
        this.catalogoInsumos = insumosBD;
        if (this.idEventoActual) {
          this.calcularTotales();
        }
      },
      error: (err) => console.error('Error al cargar catálogo:', err)
    });
  }

  get consumos(): FormArray {
    return this.hojaForm.get('consumos') as FormArray;
  }

  // 🛠️ CORRECCIÓN 1: Se remueve Validators.required de insumoId para permitir filas libres
  crearFilaConsumo(turnoColor: string = 'azul'): FormGroup {
    return this.fb.group({
      insumoId: [''],
      esManual: [false],
      nombreManual: [''],
      precioManual: [0],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      cantidadRecibida: [''],
      ingresoAlSistema: [false],
      fechaAplicacion: [this.obtenerFechaLocal()],
      precioUnitario: [{ value: 0, disabled: true }],
      costeo: [{ value: 0, disabled: true }],
      turno: [turnoColor]
    });
  }

  agregarFila(turnoColor: string = 'azul'): void {
    this.consumos.push(this.crearFilaConsumo(turnoColor));
  }

  eliminarFila(index: number): void {
    if (this.consumos.length > 1) {
      this.consumos.removeAt(index);
    } else {
      this.consumos.at(index).reset({
        cantidad: 1,
        ingresoAlSistema: false,
        fechaAplicacion: this.obtenerFechaLocal(),
        precioUnitario: 0,
        costeo: 0,
        esManual: false,
        nombreManual: '',
        precioManual: 0
      });
    }
  }

  obtenerNombreInsumo(insumoId: any): string {
    if (!insumoId) return '';
    const insumo = this.catalogoInsumos.find(i => (i.id || i.idInsumo) == insumoId);
    return insumo ? (insumo.descripcion || insumo.nombre) : '';
  }

  cargarEventosActivos(): void {
    this.suministrosService.obtenerEventosActivos().subscribe({
      next: (eventos: any[]) => this.listaEventosActivos = eventos,
      error: (err) => console.error('Error al obtener eventos activos:', err)
    });
  }

  onEventoChange(event: any): void {
    const selectedValue = event.target.value;

    if (selectedValue && selectedValue !== 'null') {
      this.esModoEdicion = true;
      this.idEventoActual = Number(selectedValue);

      this.suministrosService.obtenerDetalleEventoConConsumos(this.idEventoActual).subscribe({
        next: (data: any) => {
          this.mapearDatosAlFormulario(data);
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error al recuperar detalles:', err)
      });
    } else {
      this.esModoEdicion = false;
      this.idEventoActual = null;
      
      this.hojaForm.reset({
        eventoId: null,
        nombrePaciente: '',
        fecha: this.obtenerFechaLocal(),
        fechaNacimiento: '',
        habitacion: '',
        medicoTratante: '',
        procedimiento: ''
      });
      
      while (this.consumos.length !== 0) {
        this.consumos.removeAt(0);
      }
      this.agregarFila();
      this.cdr.detectChanges();
    }
  }

  // 🛠️ CORRECCIÓN 2: Mapeo robusto de campos manuales al cargar el evento guardado
  mapearDatosAlFormulario(data: any): void {
    const fechaNacLimpia = data.fechaNacimiento ? String(data.fechaNacimiento).substring(0, 10) : '';
    this.hojaForm.patchValue({
      nombrePaciente: data.nombrePaciente,
      fecha: data.fecha,
      fechaNacimiento: fechaNacLimpia,
      habitacion: data.habitacion,
      medicoTratante: data.nombreMedico,
      procedimiento: data.procedimiento
    }, { emitEvent: false });

    while (this.consumos.length !== 0) {
      this.consumos.removeAt(0);
    }

    if (data.detalles && data.detalles.length > 0) {
      data.detalles.forEach((det: any) => {
        const turnoGuardado = det.turno || det.colorTurno || 'azul';
        
        // Detecta si es manual revisando si no hay insumoId o viene descripcionManual
        const esManualRegistrado = (!det.insumoId || det.insumoId === 0) || !!det.descripcionManual;
        const nombreLibre = det.descripcionManual || det.descripcion || det.nombreInsumo || '';
        const precioLibre = det.precioUnitario || det.precio_unitario || 0;

        const filaGroup = this.fb.group({
          insumoId: [det.insumoId || ''],
          esManual: [esManualRegistrado],
          nombreManual: [nombreLibre],
          precioManual: [precioLibre],
          cantidad: [det.cantidad, [Validators.required, Validators.min(1)]],
          cantidadRecibida: [det.cantidadRecibida],
          ingresoAlSistema: [det.ingresoAlSistema || false],
          fechaAplicacion: [det.fecha],
          precioUnitario: [{ value: precioLibre, disabled: true }],
          costeo: [{ value: (det.cantidad * precioLibre) || 0, disabled: true }],
          turno: [turnoGuardado]
        });
        this.consumos.push(filaGroup);
      });
    } else {
      this.agregarFila();
    }
    
    this.calcularTotales();
    this.cdr.detectChanges();
  }

  onInsumoChange(index: number): void {
    const fila = this.consumos.at(index);
    const insumoSeleccionadoId = fila.get('insumoId')?.value;
    const insumo = this.catalogoInsumos.find(i => (i.id || i.idInsumo) == insumoSeleccionadoId);

    if (insumo) {
      fila.patchValue({
        precioUnitario: insumo.precioUnitario || insumo.precio_unitario || insumo.precio || 0
      }, { emitEvent: false });
    }
    this.calcularTotales();
  }

  calcularTotales(): void {
    let acumSubtotal = 0;

    this.consumos.controls.forEach((control) => {
      const esManual = control.get('esManual')?.value;
      const cantidad = control.get('cantidad')?.value || 0;
      
      const precio = esManual 
        ? (control.get('precioManual')?.value || 0) 
        : (control.get('precioUnitario')?.value || 0);
        
      const costeoFila = cantidad * precio;

      control.patchValue({ costeo: costeoFila }, { emitEvent: false });
      acumSubtotal += costeoFila;
    });

    this.subtotal = acumSubtotal;
    this.iva = this.subtotal * 0.16;
    this.total = this.subtotal + this.iva;
  }

  toggleModoManual(index: number): void {
    const fila = this.consumos.at(index);
    const estadoActual = fila.get('esManual')?.value;
    
    fila.patchValue({
      esManual: !estadoActual,
      insumoId: '',
      nombreManual: '',
      precioManual: 0,
      precioUnitario: 0
    });
    
    this.calcularTotales();
  }

  // 🛠️ CORRECCIÓN 3: Mapeo idéntico y consistente tanto para MODO CREACIÓN como EDICIÓN
  guardarOActualizarHoja(): void {
    const datosFormulario = this.hojaForm.getRawValue();

    const consumosMapeados = datosFormulario.consumos.map((c: any) => ({
      insumoId: c.esManual ? null : (c.insumoId ? Number(c.insumoId) : null),
      descripcionManual: c.esManual ? c.nombreManual : null,
      precioUnitario: c.esManual ? Number(c.precioManual) : null,
      cantidad: Number(c.cantidad),
      cantidadRecibida: c.cantidadRecibida,
      ingresoAlSistema: c.ingresoAlSistema,
      fechaAplicacion: c.fechaAplicacion,
      turno: c.turno
    }));

    if (this.esModoEdicion && this.idEventoActual) {
      const payloadEdicion = {
        eventoId: this.idEventoActual,
        habitacion: datosFormulario.habitacion,
        procedimiento: datosFormulario.procedimiento,
        fecha: datosFormulario.fecha,
        paciente: {
          nombre: datosFormulario.nombrePaciente,
          fechaNacimiento: datosFormulario.fechaNacimiento
        },
        medico: {
          nombre: datosFormulario.medicoTratante
        },
        consumos: consumosMapeados
      };

      this.http.put(`${this.apiBaseUrl}/consumos/evento/${this.idEventoActual}`, payloadEdicion).subscribe({
        next: () => {
          alert('¡Hoja de enfermería y datos del paciente actualizados con éxito!');
          this.cargarEventosActivos();
        },
        error: (err) => {
          console.error('Error al actualizar evento:', err);
          alert('Ocurrió un error al actualizar los datos.');
        }
      });

    } else {
      const nuevaCabecera = {
        habitacion: datosFormulario.habitacion,
        procedimiento: datosFormulario.procedimiento,
        fecha: datosFormulario.fecha,
        paciente: { 
          nombre: datosFormulario.nombrePaciente,
          fechaNacimiento: datosFormulario.fechaNacimiento
        },
        medico: { 
          nombre: datosFormulario.medicoTratante 
        },
        consumos: consumosMapeados
      };

      this.http.post(`${this.apiBaseUrl}/consumos/evento`, nuevaCabecera).subscribe({
        next: (res: any) => {
          alert('¡Paciente y Hoja de Enfermería registrados correctamente!');
          this.esModoEdicion = true;
          this.idEventoActual = typeof res === 'object' ? res.id : res;
          this.hojaForm.get('eventoId')?.setValue(this.idEventoActual, { emitEvent: false });
          this.cargarEventosActivos();
        },
        error: (err) => console.error('Error al guardar evento nuevo:', err)
      });
    }
  }

  procesarCuenta(): void {
    if (this.idEventoActual) {
      this.router.navigate(['/cuenta-paciente', this.idEventoActual]);
    } else {
      alert('Es necesario almacenar o seleccionar una hoja de enfermería antes de procesar el estado de cuenta.');
    }
  }

  imprimirHoja(): void {
    window.print();
  }
}