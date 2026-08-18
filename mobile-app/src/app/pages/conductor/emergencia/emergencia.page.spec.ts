import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmergenciaPage } from './emergencia.page';

describe('EmergenciaPage', () => {
  let component: EmergenciaPage;
  let fixture: ComponentFixture<EmergenciaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmergenciaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
