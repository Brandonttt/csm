import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SuministrosService } from '../../servicios/suministros';
import { Router } from '@angular/router';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-hoja-enfermeria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './hoja-enfermeria.html',
  styleUrls: ['./hoja-enfermeria.scss']
})
export class HojaEnfermeriaComponent implements OnInit {
  hojaForm!: FormGroup;
  apiBaseUrl = 'http://192.168.0.64:8082/api';

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

    this.cargarCatalogoInsumos();
    this.cargarEventosActivos();
    this.agregarFila();
  }

  cargarCatalogoInsumos(): void {
    this.http.get<any[]>(`${this.apiBaseUrl}/consumos/insumos`).subscribe({
      next: (insumosBD) => {
        this.catalogoInsumos = insumosBD || [];
        this.reinyectarPreciosCatalogo();
        this.calcularTotales();
      },
      error: (err) => console.error('Error al cargar catálogo:', err)
    });
  }

  private reinyectarPreciosCatalogo(): void {
    if (!this.catalogoInsumos.length || !this.consumos.length) return;

    this.consumos.controls.forEach((control) => {
      const valores = control.getRawValue();
      if (!valores.esManual && valores.insumoId) {
        const itemCat = this.catalogoInsumos.find(i => String(i.id || i.idInsumo) === String(valores.insumoId));
        if (itemCat) {
          const precio = Number(itemCat.precioUnitario || itemCat.precio_unitario || itemCat.precio || 0);
          control.patchValue({ precioUnitario: precio }, { emitEvent: false });
        }
      }
    });
  }

  get consumos(): FormArray {
    return this.hojaForm.get('consumos') as FormArray;
  }

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
    this.calcularTotales();
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
    this.calcularTotales();
  }

  obtenerNombreInsumo(insumoId: any): string {
    if (!insumoId) return '';
    const insumo = this.catalogoInsumos.find(i => String(i.id || i.idInsumo) === String(insumoId));
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
      this.calcularTotales();
      this.cdr.detectChanges();
    }
  }

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
        const esManualRegistrado = (!det.insumoId || det.insumoId === 0) || !!det.descripcionManual;
        const nombreLibre = det.descripcionManual || det.descripcion || det.nombreInsumo || '';
        const precioLibre = Number(det.precioUnitario || det.precio_unitario || 0);

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
    
    this.reinyectarPreciosCatalogo();
    this.calcularTotales();
    this.cdr.detectChanges();
  }

  onInsumoChange(index: number, event?: any): void {
  const fila = this.consumos.at(index);
  
  // Obtiene el valor directamente del evento o del FormControl
  const targetValue = event?.target?.value ?? fila.get('insumoId')?.value;

  if (!targetValue || targetValue === 'null') {
    fila.patchValue({ precioUnitario: 0, costeo: 0 });
    this.calcularTotales();
    return;
  }

  // Busca el insumo seleccionado en el catálogo
  const insumo = this.catalogoInsumos.find(i => String(i.id || i.idInsumo) === String(targetValue));

  if (insumo) {
    const precio = Number(insumo.precioUnitario || insumo.precio_unitario || insumo.precio || 0);
    const cantidad = Number(fila.get('cantidad')?.value) || 1;
    
    fila.patchValue({
      insumoId: insumo.id || insumo.idInsumo,
      precioUnitario: precio,
      costeo: cantidad * precio
    }, { emitEvent: false });
  }

  this.calcularTotales();
}
  calcularTotales(): void {
    let acumSubtotal = 0;

    if (this.consumos && this.consumos.controls.length > 0) {
      this.consumos.controls.forEach((control) => {
        const valores = control.getRawValue();
        const cantidad = Number(valores.cantidad) || 0;
        
        let precio = 0;
        if (valores.esManual) {
          precio = Number(valores.precioManual) || 0;
        } else {
          precio = Number(valores.precioUnitario) || 0;
          if (precio === 0 && valores.insumoId && this.catalogoInsumos.length > 0) {
            const itemCat = this.catalogoInsumos.find(i => String(i.id || i.idInsumo) === String(valores.insumoId));
            if (itemCat) {
              precio = Number(itemCat.precioUnitario || itemCat.precio_unitario || itemCat.precio || 0);
              control.get('precioUnitario')?.setValue(precio, { emitEvent: false });
            }
          }
        }

        const costeoFila = cantidad * precio;
        control.get('costeo')?.setValue(costeoFila, { emitEvent: false });
        acumSubtotal += costeoFila;
      });
    }

    this.subtotal = acumSubtotal;
    this.iva = +(this.subtotal * 0.16);
    this.total = +(this.subtotal + this.iva);

    this.cdr.detectChanges();
  }

  // 👇 GETTERS PARA ENLACE DINÁMICO EN EL HTML 👇
  get subtotalCalculado(): number {
    let acum = 0;
    if (this.consumos && this.consumos.length > 0) {
      for (const ctrl of this.consumos.controls) {
        const v = ctrl.getRawValue();
        const cant = Number(v.cantidad) || 0;
        const prec = v.esManual ? (Number(v.precioManual) || 0) : (Number(v.precioUnitario) || 0);
        acum += (cant * prec);
      }
    }
    return acum;
  }

  get ivaCalculado(): number {
    return this.subtotalCalculado * 0.16;
  }

  get totalCalculado(): number {
    return this.subtotalCalculado + this.ivaCalculado;
  }
  // 👆 FIN DE GETTERS 👆

  toggleModoManual(index: number): void {
    const fila = this.consumos.at(index);
    const estadoActual = fila.get('esManual')?.value;
    
    fila.patchValue({
      esManual: !estadoActual,
      insumoId: '',
      nombreManual: '',
      precioManual: 0,
      precioUnitario: 0,
      costeo: 0
    });
    
    this.calcularTotales();
  }

  guardarOActualizarHoja(): void {
    const datosFormulario = this.hojaForm.getRawValue();

    const consumosMapeados = datosFormulario.consumos.map((c: any) => ({
      insumoId: c.esManual ? null : (c.insumoId ? Number(c.insumoId) : null),
      descripcionManual: c.esManual ? c.nombreManual : null,
      precioUnitario: c.esManual ? Number(c.precioManual || 0) : Number(c.precioUnitario || 0),
      cantidad: Number(c.cantidad || 1),
      cantidadRecibida: c.cantidadRecibida,
      ingresoAlSistema: c.ingresoAlSistema,
      fechaAplicacion: c.fechaAplicacion,
      turno: c.turno
    }));

    const payload = {
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

    if (this.esModoEdicion && this.idEventoActual) {
      this.http.put(`${this.apiBaseUrl}/consumos/evento/${this.idEventoActual}`, payload).subscribe({
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
      this.http.post(`${this.apiBaseUrl}/consumos/evento`, payload).subscribe({
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

  reordenarFilas(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const filaMovida = this.consumos.at(event.previousIndex);
    this.consumos.removeAt(event.previousIndex);
    this.consumos.insert(event.currentIndex, filaMovida);

    this.calcularTotales();
    this.cdr.detectChanges();
  }

  moverFilaArriba(index: number): void {
  if (index > 0) {
    const filaActual = this.consumos.at(index);
    this.consumos.removeAt(index);
    this.consumos.insert(index - 1, filaActual);
    this.calcularTotales();
    this.cdr.detectChanges();
  }
}

moverFilaAbajo(index: number): void {
  if (index < this.consumos.length - 1) {
    const filaActual = this.consumos.at(index);
    this.consumos.removeAt(index);
    this.consumos.insert(index + 1, filaActual);
    this.calcularTotales();
    this.cdr.detectChanges();
  }
}
}