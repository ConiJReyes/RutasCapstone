import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RutaActivaPage } from './ruta-activa.page';

describe('RutaActivaPage', () => {
  let component: RutaActivaPage;
  let fixture: ComponentFixture<RutaActivaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RutaActivaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
