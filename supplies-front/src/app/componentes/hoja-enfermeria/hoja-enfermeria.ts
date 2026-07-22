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
  apiBaseUrl = 'http://192.168.100.10:8082/api'; // Puerto 8082 configurado en tu Backend

  // Simulación de catálogo para el autocompletado
  catalogoInsumos: any[] = [];

  // Nuevas variables de control clínico
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
      eventoId: [null], // Añadido para controlar el select del HTML
      nombrePaciente: ['', Validators.required],
      fecha: [this.obtenerFechaLocal(), Validators.required],
      fechaNacimiento: [''],
      habitacion: [''],
      medicoTratante: ['', Validators.required],
      procedimiento: [''],
      consumos: this.fb.array([]) 
    });
    

    // Cargar pacientes con eventos activos desde el nacimiento del componente
    this.cargarEventosActivos();

    // Agregar la primera fila vacía por defecto
    this.agregarFila();

    // Escuchar cambios en el formulario para actualizar costos automáticamente
    this.hojaForm.valueChanges.subscribe(() => {
      this.calcularTotales();
    });
  }
  cargarCatalogoInsumos(): void {
    // Si tu servicio no tiene la función aún, consumimos directamente el endpoint de Java:
    this.http.get<any[]>(`${this.apiBaseUrl}/consumos/insumos`).subscribe({
      next: (insumosBD) => {
        this.catalogoInsumos = insumosBD;
        console.log('Catálogo de insumos cargado con éxito:', this.catalogoInsumos.length, 'artículos.');
        if (this.idEventoActual) {
        this.calcularTotales();
      }
      },
      error: (err) => {
        console.error('Error al cargar el catálogo de insumos de la base de datos:', err);
      }
    });
  }

  get consumos(): FormArray {
    return this.hojaForm.get('consumos') as FormArray;
  }

  crearFilaConsumo(turnoColor: string = 'azul'): FormGroup {
    return this.fb.group({
      insumoId: ['', Validators.required],
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
      // Si es la última fila restante, limpiamos su valor en lugar de removerla
      this.consumos.at(index).reset({
        cantidad: 1,
        ingresoAlSistema: false,
        fechaAplicacion: this.obtenerFechaLocal(),
        precioUnitario: 0,
        costeo: 0
      });
    }
  }
    obtenerNombreInsumo(insumoId: any): string {
      if (!insumoId) return '';
      const insumo = this.catalogoInsumos.find(i => i.id == insumoId);
      return insumo ? insumo.descripcion : '';
    }

  // Invoca el endpoint para poblar el dropdown superior de pacientes activos
  cargarEventosActivos(): void {
    this.suministrosService.obtenerEventosActivos().subscribe({
      next: (eventos: any[]) => {
        this.listaEventosActivos = eventos;
      },
      error: (err) => console.error('Error al obtener eventos activos:', err)
    });
  }

  // Intercepta la selección de pacientes del selector
  onEventoChange(event: any): void {
    const selectedValue = event.target.value;

    if (selectedValue && selectedValue !== 'null') {
      this.esModoEdicion = true;
      this.idEventoActual = Number(selectedValue);

      // Consumimos el servicio para recuperar datos de la cabecera e insumos previos
      this.suministrosService.obtenerDetalleEventoConConsumos(this.idEventoActual).subscribe({
        next: (data: any) => {
          this.mapearDatosAlFormulario(data);
        },
        error: (err) => console.error('Error al recuperar detalles del evento:', err)
      });
    } else {
      // Si el usuario regresa a "Nuevo Paciente", restablecemos a estado de inserción limpia
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
      
      // Limpiamos el FormArray dejando una fila base vacía
      while (this.consumos.length !== 0) {
        this.consumos.removeAt(0);
      }
      this.agregarFila();
    }
  }

  // Rellena la estructura del formulario reactivo con la información del backend
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

    // Limpiamos las filas reactivas actuales
    while (this.consumos.length !== 0) {
      this.consumos.removeAt(0);
    }

    // Si el paciente cuenta con consumos previos cargados, los inyectamos en la tabla
    if (data.detalles && data.detalles.length > 0) {
      data.detalles.forEach((det: any) => {
        const turnoGuardado = det.turno || det.colorTurno || 'azul';
        const filaGroup = this.fb.group({
          insumoId: [det.insumoId, Validators.required],
          cantidad: [det.cantidad, [Validators.required, Validators.min(1)]],
          cantidadRecibida: [det.cantidadRecibida],
          ingresoAlSistema: [det.ingresoAlSistema || false],
          fechaAplicacion: [det.fecha],
          precioUnitario: [{ value: det.precioUnitario || 0, disabled: true }],
          costeo: [{ value: (det.cantidad * det.precioUnitario) || 0, disabled: true }],
          turno: [turnoGuardado] // 👈 AHORA PRESERVA EL TURNO REGISTRADO
        });
        this.consumos.push(filaGroup);
      });
    } else {
      this.agregarFila();
    }
    
    this.calcularTotales();
  }

  onInsumoChange(index: number): void {
    const fila = this.consumos.at(index);
    const insumoSeleccionadoId = fila.get('insumoId')?.value;
    const insumo = this.catalogoInsumos.find(i => (i.id || i.idInsumo) == insumoSeleccionadoId);

    if (insumo) {
      fila.patchValue({
        precioUnitario: insumo.precioUnitario
      }, { emitEvent: false });
    }
    this.calcularTotales();
  }

  calcularTotales(): void {
    let acumSubtotal = 0;

    this.consumos.controls.forEach((control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precioUnitario')?.value || 0;
      const costeoFila = cantidad * precio;

      control.patchValue({ costeo: costeoFila }, { emitEvent: false });
      acumSubtotal += costeoFila;
    });

    this.subtotal = acumSubtotal;
    this.iva = this.subtotal * 0.16;
    this.total = this.subtotal + this.iva;
  }

  // ACCIÓN 1: Guarda o actualiza exclusivamente los datos persistentes del backend
  guardarOActualizarHoja(): void {
  const datosFormulario = this.hojaForm.getRawValue();

  if (this.esModoEdicion && this.idEventoActual) {
    // -------------------------------------------------------
    // MODO EDICIÓN: Actualizar Cabecera + Consumos
    // -------------------------------------------------------
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
      consumos: datosFormulario.consumos.map((c: any) => ({
        insumoId: c.insumoId,
        cantidad: c.cantidad,
        cantidadRecibida: c.cantidadRecibida,
        ingresoAlSistema: c.ingresoAlSistema,
        fechaAplicacion: c.fechaAplicacion,
        turno: c.turno
      }))
    };

    // Petición al backend para actualizar evento completo
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
    // -------------------------------------------------------
    // MODO CREACIÓN NUEVO
    // -------------------------------------------------------
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
      consumos: datosFormulario.consumos.map((c: any) => ({
        insumoId: c.insumoId,
        cantidad: c.cantidad,
        cantidadRecibida: c.cantidadRecibida,
        ingresoAlSistema: c.ingresoAlSistema,
        fechaAplicacion: c.fechaAplicacion,
        turno: c.turno
      }))
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
  // ACCIÓN 2: Procesa la redirección limpia al desglose contable dinámico
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