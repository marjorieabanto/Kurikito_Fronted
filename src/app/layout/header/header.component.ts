import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {InputTextModule} from "primeng/inputtext";
import {Router} from "@angular/router";
import {RouterLink} from "@angular/router";
import {AuthService} from "../../services/auth.service";
import {UserService} from "../../services/user/user.service";

@Component({
    selector: 'app-header',
    imports: [ReactiveFormsModule, InputTextModule, RouterLink],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit{
  formGroup: FormGroup | undefined;

  constructor(private router: Router, private authService: AuthService, private userService:UserService) {}

  user:any=[];
  ngOnInit() {
    this.formGroup = new FormGroup({
      text: new FormControl<string | null>(null)
    });

    this.userService.getUserProfile().subscribe({
      next: (data) => {
        this.user = data; // Cargar los datos del usuario
        this.authService.setUser(this.user);
        console.log(this.user);
      },
      error: (err) => {
        console.error('Error al cargar el perfil:', err);
      }
    });
  }

}
