import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleHijoPage } from './detalle-hijo.page';

describe('DetalleHijoPage', () => {
  let component: DetalleHijoPage;
  let fixture: ComponentFixture<DetalleHijoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleHijoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
