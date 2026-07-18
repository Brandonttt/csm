import { TestBed } from '@angular/core/testing';

import { Suministros } from './suministros';

describe('Suministros', () => {
  let service: Suministros;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Suministros);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
