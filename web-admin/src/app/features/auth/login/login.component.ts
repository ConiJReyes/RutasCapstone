import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Componente para el inicio de sesión en la plataforma.
 * Maneja el formulario reactivo, validaciones y la llamada al servicio de autenticación.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  // Formulario reactivo para capturar credenciales
  loginForm: FormGroup;
  
  // Signal para alternar la visibilidad de la contraseña
  showPassword = signal(false);
  
  // Signal para indicar el estado de carga durante la autenticación
  isLoading = signal(false);
  
  // Signal para almacenar mensajes de error en caso de credenciales incorrectas
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Inicialización del formulario con validaciones básicas de formato
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  /**
   * Alterna entre mostrar u ocultar los caracteres de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword.update(val => !val);
  }

  /**
   * Método que procesa el envío del formulario.
   * Realiza la validación verídica llamando a AuthService.
   */
  async onSubmit(): Promise<void> {
    // Si los campos están vacíos o no cumplen formato, marcar como tocados
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    try {
      // Intento de autenticación verídico
      await this.authService.login(email, password);
      
      // Si fue exitoso, redirigir inmediatamente al Dashboard
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      // Si las credenciales no son válidas, mostrar mensaje de error explicativo
      this.errorMessage.set('Credenciales inválidas. Correo o contraseña incorrectos.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
