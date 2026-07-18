import { Component, OnInit } from '@angular/core';
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
  apiBaseUrl = 'http://localhost:8082/api'; // Puerto 8082 configurado en tu Backend

  // Simulación de catálogo para el autocompletado
  catalogoInsumos = [
    { id: 1, descripcion: 'Paracetamol 1 gr', precioUnitario: 310.00, tipo: 'MEDICAMENTO' },
    { id: 2, descripcion: 'Clonixinato de Lisina', precioUnitario: 178.00, tipo: 'MEDICAMENTO' },
    { id: 3, descripcion: 'Jeringa 5 cc', precioUnitario: 19.00, tipo: 'MATERIAL' },
    { id: 4, descripcion: 'Guantes no esteriles', precioUnitario: 36.00, tipo: 'MATERIAL' }
  ];

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.hojaForm = this.fb.group({
      eventoId: [null], // Añadido para controlar el select del HTML
      nombrePaciente: ['', Validators.required],
      fecha: [new Date().toISOString().substring(0, 10), Validators.required],
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

  get consumos(): FormArray {
    return this.hojaForm.get('consumos') as FormArray;
  }

  crearFilaConsumo(): FormGroup {
    return this.fb.group({
      insumoId: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      cantidadRecibida: [''],
      ingresoAlSistema: [false],
      fechaAplicacion: [new Date().toISOString().substring(0, 10)],
      precioUnitario: [{ value: 0, disabled: true }],
      costeo: [{ value: 0, disabled: true }]
    });
  }

  agregarFila(): void {
    this.consumos.push(this.crearFilaConsumo());
  }

  eliminarFila(index: number): void {
    if (this.consumos.length > 1) {
      this.consumos.removeAt(index);
    } else {
      // Si es la última fila restante, limpiamos su valor en lugar de removerla
      this.consumos.at(index).reset({
        cantidad: 1,
        ingresoAlSistema: false,
        fechaAplicacion: new Date().toISOString().substring(0, 10),
        precioUnitario: 0,
        costeo: 0
      });
    }
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
        fecha: new Date().toISOString().substring(0, 10),
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
    this.hojaForm.patchValue({
      nombrePaciente: data.nombrePaciente,
      fecha: data.fecha,
      fechaNacimiento: data.fechaNacimiento,
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
        const filaGroup = this.fb.group({
          insumoId: [det.insumoId, Validators.required],
          cantidad: [det.cantidad, [Validators.required, Validators.min(1)]],
          cantidadRecibida: [det.cantidadRecibida],
          ingresoAlSistema: [det.ingresoAlSistema || false],
          fechaAplicacion: [det.fecha],
          precioUnitario: [{ value: det.precioUnitario || 0, disabled: true }],
          costeo: [{ value: (det.cantidad * det.precioUnitario) || 0, disabled: true }]
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
    const insumo = this.catalogoInsumos.find(i => i.id == insumoSeleccionadoId);

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
  if (this.hojaForm.invalid) {
    alert('Por favor llena los campos obligatorios de la cabecera');
    return;
  }

  const datosFormulario = this.hojaForm.getRawValue();

  if (this.esModoEdicion && this.idEventoActual) {
    // -------------------------------------------------------
    // MODO EDICIÓN: El evento ya existe, actualizamos insumos
    // -------------------------------------------------------
    const listaParaBackend = datosFormulario.consumos.map((c: any) => ({
      evento: { id: this.idEventoActual }, // ID real del paciente seleccionado
      insumo: { id: c.insumoId },
      cantidad: c.cantidad,
      fechaAplicacion: c.fechaAplicacion,
      cantidadRecibida: c.cantidadRecibida,
      ingresoAlSistema: c.ingresoAlSistema
    }));

    this.suministrosService.actualizarHojaConsumos(this.idEventoActual, listaParaBackend).subscribe({
      next: (respuesta: any) => {
        alert('¡Insumos actualizados con éxito!');
        this.cargarEventosActivos();
      },
      error: (err) => console.error(err)
    });

  } else {
   const nuevaCabecera = {
      habitacion: datosFormulario.habitacion,
      procedimiento: datosFormulario.procedimiento,
      fecha: datosFormulario.fecha,
      // Pasamos los datos en formato de objeto para que encajen con tus relaciones de Spring
      paciente: { 
        nombre: datosFormulario.nombrePaciente,
        fechaNacimiento: datosFormulario.fechaNacimiento
      },
      medico: { 
        nombre: datosFormulario.medicoTratante 
      }
    };

 // Enviamos la petición POST para registrar la cabecera del evento
this.http.post('http://localhost:8082/api/consumos/evento', nuevaCabecera).subscribe({
  next: (eventoGuardado: any) => {
    const idGenerado = eventoGuardado.id; // Obtenemos el ID real generado dinámicamente
    this.idEventoActual = idGenerado;

    // 2. Mapeamos la lista de consumos vinculándolos al ID real obtenido
    const listaConsumosNuevos = datosFormulario.consumos.map((c: any) => ({
      evento: { id: idGenerado }, // Vinculación dinámica real
      insumo: { id: c.insumoId },
      cantidad: c.cantidad,
      fechaAplicacion: c.fechaAplicacion,
      cantidadRecibida: c.cantidadRecibida,
      ingresoAlSistema: c.ingresoAlSistema
    }));

    // 3. Guardamos los consumos de forma masiva
    this.suministrosService.guardarHojaConsumos(listaConsumosNuevos).subscribe({
      next: () => {
        alert('¡Hoja de enfermería y nuevo evento registrados correctamente!');
        this.esModoEdicion = true;
        this.hojaForm.get('eventoId')?.setValue(idGenerado, { emitEvent: false });
        this.cargarEventosActivos();
      },
      error: (err) => alert('Error al registrar la lista de insumos del nuevo paciente.')
    });
  },
  error: (err) => {
    alert('Error al registrar los datos de la cabecera clínica.');
    console.error(err);
  }
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
}