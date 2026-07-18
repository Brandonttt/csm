import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SuministrosService } from '../../servicios/suministros';

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

  // Simulamos un catálogo para el autocompletado (en producción se jala de la API)
  catalogoInsumos = [
    { id: 1, descripcion: 'Paracetamol 1 gr', precioUnitario: 310.00, tipo: 'MEDICAMENTO' },
    { id: 2, descripcion: 'Clonixinato de Lisina', precioUnitario: 178.00, tipo: 'MEDICAMENTO' },
    { id: 3, descripcion: 'Jeringa 5 cc', precioUnitario: 19.00, tipo: 'MATERIAL' },
    { id: 4, descripcion: 'Guantes no esteriles', precioUnitario: 36.00, tipo: 'MATERIAL' }
  ];

  subtotal = 0;
  iva = 0;
  total = 0;

  constructor(private fb: FormBuilder, private http: HttpClient, private suministrosService: SuministrosService) {}

  ngOnInit(): void {
    this.hojaForm = this.fb.group({
      nombrePaciente: ['', Validators.required],
      fecha: [new Date().toISOString().substring(0, 10), Validators.required],
      fechaNacimiento: [''],
      habitacion: [''],
      medicoTratante: ['', Validators.required],
      procedimiento: [''],
      consumos: this.fb.array([]) // Array dinámico para las filas
    });

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
      // Campos informativos para el cálculo visual en pantalla
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
    }
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

  guardarHoja(): void {
  if (this.hojaForm.invalid) {
    alert('Por favor llena los campos obligatorios de la cabecera');
    return;
  }

  // Estructuramos el arreglo de consumos limpiando los campos calculados del front
  const datosFormulario = this.hojaForm.getRawValue();
  
  // Mapeamos el JSON exactamente como lo espera recibir la entidad DetalleConsumo de Spring
  const listaParaBackend = datosFormulario.consumos.map((c: any) => ({
    evento: { id: 1 }, // Aquí irá el ID dinámico de la hoja/evento actual del paciente
    insumo: { id: c.insumoId },
    cantidad: c.cantidad,
    fechaAplicacion: c.fechaAplicacion,
    cantidadRecibida: c.cantidadRecibida,
    ingresoAlSistema: c.ingresoAlSistema
  }));

  // Le pegamos a la API
  this.suministrosService.guardarHojaConsumos(listaParaBackend).subscribe({
  next: (respuesta: any) => { // <-- Agregamos el : any aquí
    alert('¡Hoja de enfermería guardada con éxito y cuenta actualizada!');
    console.log('Respuesta del servidor:', respuesta);
  },
  error: (err: any) => { // <-- También agregamos : any aquí por seguridad
    alert('Hubo un error al conectar con el servidor local');
    console.error(err);
  }
});
}
}