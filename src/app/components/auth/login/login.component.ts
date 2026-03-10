import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Router} from "@angular/router";
import {AuthService} from "../../../services/auth.service";
import {CommonModule} from "@angular/common";
import {DialogService, DynamicDialogConfig, DynamicDialogRef} from "primeng/dynamicdialog";
import {RecoverPasswordComponent} from "../recover-password/recover-password.component";
import {UserService} from "../../../services/user/user.service";

@Component({
    selector: 'app-login',
    imports: [
        FormsModule,
        CommonModule
    ],
    providers: [AuthService, DialogService],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
  username : string = " ";
  password: string= " ";
  passwordFieldType: string = "password";
  isLoading: boolean = false;

  errorMessage: string | null = null;

  // Patrón para validar email
  private emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  ref: DynamicDialogRef | undefined;
  constructor(private router: Router,private authService: AuthService, private userService:UserService,public dialogService: DialogService) {}

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  // Validar formato de email
  validateEmailFormat(email: string): boolean {
    if (!email || email.trim() === '') {
      return false;
    }
    return this.emailPattern.test(email.trim());
  }

  onLogin() {
    // Limpiar espacios del username
    this.username = this.username.trim();

    // Validar que los campos no estén vacíos
    if (!this.username || !this.password.trim()) {
      this.errorMessage = 'Por favor, complete todos los campos.';
      return;
    }

    // Validar formato de email
    if (!this.validateEmailFormat(this.username)) {
      this.errorMessage = 'Por favor, ingrese un correo electrónico válido.';
      return;
    }

    // Validar longitud mínima de la contraseña
    if (this.password.trim().length < 3) {
      this.errorMessage = 'La contraseña debe tener al menos 3 caracteres.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null; // Limpiar mensajes de error anteriores

    this.authService
      .login({ userEmail: this.username, userPassword: this.password.trim() })
      .subscribe({
        next: (response) => {
          // Guardar tokens
          this.authService.saveTokens(response);
          this.isLoading = false;
          this.router.navigate(['/main']);
        },
        error: (error) => {
          console.error('Error de login:', error);
          this.isLoading = false;

          // Manejar diferentes tipos de errores
          if (error.status === 401) {
            this.errorMessage = 'Credenciales incorrectas.\nVerifique su email y contraseña.';
          } else if (error.status === 404) {
            this.errorMessage = 'Usuario no encontrado.\nVerifique su correo electrónico.';
          } else if (error.status === 500) {
            this.errorMessage = 'Error del servidor.\nIntente nuevamente más tarde.';
          } else {
            this.errorMessage = 'Error de conexión.\nVerifique su conexión a internet.';
          }
        },
      });
  }

  onLogin1(){

    this.username = this.username.trim();

    // Validar que los campos no estén vacíos
    if (!this.username || !this.password.trim()) {
      this.errorMessage = 'Por favor, complete todos los campos.';
      return;
    }

    // Validar formato de email
    if (!this.validateEmailFormat(this.username)) {
      this.errorMessage = 'Por favor, ingrese un correo electrónico válido.';
      return;
    }

    // Validar longitud mínima de la contraseña
    if (this.password.trim().length < 3) {
      this.errorMessage = 'La contraseña debe tener al menos 3 caracteres.';
      return;
    }

    if(this.username=='admin@kurikito.com' && this.password=='1234'){
    this.router.navigate(['/main']);}else {

      this.errorMessage='Error de autenticación'
    }
  }

  ngOnInit(): void {
    this.username= "";
    this.password= "";
  }

  recoveryProccess() {
    const ref = this.dialogService.open(RecoverPasswordComponent, {
      modal: true,
      dismissableMask: true,
    });
    ref.onClose.subscribe(result => {
      if (result) {
        console.log(result);
      } else {
        console.log('modal cerrado');
      }
    });
  }
}
