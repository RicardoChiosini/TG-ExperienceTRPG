import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-participar-mesa',
  standalone: false,
  templateUrl: './participar-mesa.component.html',
  styleUrls: ['./participar-mesa.component.css']
})
export class ParticiparMesaComponent implements OnInit {
  mesaId: number = 0;
  token: string = '';
  mensagem: string = '';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mesaId = +this.route.snapshot.paramMap.get('mesaId')!;
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.participarDaMesa();
  }

  // Adiciona o usuário à mesa
  participarDaMesa(): void {
    const usuarioId = this.authService.getUserId();
    if (!usuarioId) {
      this.mensagem = 'Você precisa estar logado para participar da mesa.';
      return;
    }

    this.apiService.participarDaMesa(this.mesaId, this.token, usuarioId).subscribe(
      (response: any) => {
        this.mensagem = response.message;
        this.router.navigate(['mesa', this.mesaId]); // Redireciona para a mesa
      },
      (error) => {
        this.mensagem = 'Erro ao participar da mesa. Tente novamente.';
        console.error('Erro ao participar da mesa:', error);
      }
    );
  }
}