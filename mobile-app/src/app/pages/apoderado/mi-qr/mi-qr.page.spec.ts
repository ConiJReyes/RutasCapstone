import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiQrPage } from './mi-qr.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('MiQrPage', () => {
  let component: MiQrPage;
  let fixture: ComponentFixture<MiQrPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiQrPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MiQrPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
