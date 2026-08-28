import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from "@angular/router";
import {CommonModule} from "@angular/common";
import {HeaderComponent} from "../layout/header/header.component";
import {AuthService} from "../services/auth.service";
import {UserService} from "../services/user/user.service";

@Component({
    selector: 'app-pages',
    imports: [RouterOutlet, CommonModule, HeaderComponent],
    templateUrl: './pages.component.html',
    styleUrl: './pages.component.css'
})
export class PagesComponent implements OnInit{
  isPage = false;
  esRutaOculta = false;
  rutasOcultas: string[] = ['/survey/respond-evaluation'];

  user: any='';
  constructor(private router: Router, private authService:AuthService,private userService:UserService) {

    this.saveUser();

  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.verificarRuta();
      }

    });

    console.log(this.authService.getUser());
    this.verificarRuta();
  }

  verificarRuta() {
    const rutaActual = this.router.url;
    console.log(rutaActual);
    this.esRutaOculta = this.rutasOcultas.includes(rutaActual);
    console.log(this.esRutaOculta);
  }

  saveUser(){

    this.userService.getUserProfile().subscribe({
      next: (data) => {
        // Cargar los datos del usuario
        this.authService.setUser(data);
        console.log(this.authService.getUser());
       this.user=data;
      },
      error: (err) => {
        console.error('Error al cargar el perfil:', err);
      }
    });
  }

}
