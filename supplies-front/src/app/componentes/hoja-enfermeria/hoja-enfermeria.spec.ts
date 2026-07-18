import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HojaEnfermeria } from './hoja-enfermeria';

describe('HojaEnfermeria', () => {
  let component: HojaEnfermeria;
  let fixture: ComponentFixture<HojaEnfermeria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HojaEnfermeria],
    }).compileComponents();

    fixture = TestBed.createComponent(HojaEnfermeria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
