import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HojaEnfermeriaComponent } from './componentes/hoja-enfermeria/hoja-enfermeria';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HojaEnfermeriaComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('supplies-front');
}
