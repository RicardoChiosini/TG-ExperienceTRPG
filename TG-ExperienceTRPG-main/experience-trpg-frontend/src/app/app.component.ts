import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router'; // Importa apenas o Router

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'experience-trpg-frontend';
  loggedIn = false; // Flag simulada para status de login do usuário
  showNavbar: boolean = true; // Variável de controle

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      // Verifica se a navegação foi finalizada
      if (event instanceof NavigationEnd) {
        // Verifica a rota atual e define showNavbar
        this.showNavbar = !event.url.includes('/mesa/'); // Se a URL contiver '/mesa/', não mostra a Navbar
      }
    });
  }

  // Método para simular um login de usuário
  login() {
    this.loggedIn = true; // Simula o login
  }

  // Método para logout do usuário
  logout() {
    this.loggedIn = false; // Simula o logout
    this.router.navigate(['']); // Redireciona para a página inicial após logout
  }

  ngOnInit() {
    // Simulação de verificação de login
    this.loggedIn = this.checkUserLoggedIn();
  }

  checkUserLoggedIn(): boolean {
    return false; // Inicialmente, definido como não logado
  }
}
