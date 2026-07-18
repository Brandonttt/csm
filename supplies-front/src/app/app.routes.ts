import { Routes } from '@angular/router';
import { HojaEnfermeriaComponent } from './componentes/hoja-enfermeria/hoja-enfermeria'; // Ajusta la ruta si tus carpetas se llaman distinto
import { CuentaPacienteComponent } from './componentes/cuenta-paciente/cuenta-paciente';

export const routes: Routes = [
  // 1. Ruta por defecto: Redirecciona automáticamente al formulario de la hoja
  { path: '', redirectTo: 'hoja-enfermeria', pathMatch: 'full' },
  
  // 2. Ruta para capturar la hoja de enfermería
  { path: 'hoja-enfermeria', component: HojaEnfermeriaComponent },
  
  // 3. Ruta para el estado de cuenta formal, recibiendo el ID del evento por parámetro
  { path: 'cuenta-paciente/:id', component: CuentaPacienteComponent }
];