import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisHijosPage } from './mis-hijos.page';

describe('MisHijosPage', () => {
  let component: MisHijosPage;
  let fixture: ComponentFixture<MisHijosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisHijosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
