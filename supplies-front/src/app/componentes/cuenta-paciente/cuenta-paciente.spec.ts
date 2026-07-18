import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuentaPaciente } from './cuenta-paciente';

describe('CuentaPaciente', () => {
  let component: CuentaPaciente;
  let fixture: ComponentFixture<CuentaPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuentaPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentaPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
