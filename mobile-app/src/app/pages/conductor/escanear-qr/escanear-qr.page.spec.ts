import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EscanearQrPage } from './escanear-qr.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('EscanearQrPage', () => {
  let component: EscanearQrPage;
  let fixture: ComponentFixture<EscanearQrPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscanearQrPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EscanearQrPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
