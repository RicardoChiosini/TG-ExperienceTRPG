import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-barra-navegacao',
  standalone: false,
  templateUrl: './barra-navegacao.component.html',
  styleUrls: ['./barra-navegacao.component.css'],
})
export class BarraNavegacaoComponent implements OnInit {
  loggedIn = false; // Flag para estado de login do usuário

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Se inscreva ao Observable que emite mudanças
    this.authService.isLoggedIn().subscribe(status => {
      this.loggedIn = status; // Atualiza o estado local sempre que houver uma mudança
    });
  }

  // Método para logout do usuário
  logout() {
    this.authService.logout(); // Chama o método de logout do serviço
    this.router.navigate(['']); // Redireciona para a página inicial após logout
  }
}
