import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgregarHijoPage } from './agregar-hijo.page';

describe('AgregarHijoPage', () => {
  let component: AgregarHijoPage;
  let fixture: ComponentFixture<AgregarHijoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AgregarHijoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
