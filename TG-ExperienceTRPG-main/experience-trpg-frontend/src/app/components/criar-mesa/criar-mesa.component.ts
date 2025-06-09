import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Sistema } from '../../models/SistemaModel';

@Component({
  selector: 'app-criar-mesa',
  standalone: false,
  templateUrl: './criar-mesa.component.html',
  styleUrls: ['./criar-mesa.component.css']
})
export class CriarMesaComponent implements OnInit {
  sistemas: Sistema[] = [];
  Nome: string = '';
  Descricao: string = '';
  selectedSistemaId: number | null = null;

  constructor(private apiService: ApiService, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.obterSistemas();
  }

  obterSistemas() {
    this.apiService.getData('sistemas').subscribe(data => {
        console.log('Dados recebidos:', data);
        this.sistemas = data; // Armazena os dados recebidos na variável sistemas
    }, error => {
        console.error('Erro ao obter sistemas:', error);
        alert('Erro ao carregar sistemas. Tente novamente.');
    });
  }

onSubmit(mesaForm: any) {
  const novaMesa = {
    Nome: this.Nome,
    Descricao: this.Descricao,
    SistemaId: this.selectedSistemaId,
    CriadorId: this.authService.getUserId(),
  };

  console.log('Mesa a Ser Criada:', novaMesa); // Verifique se está retornando os dados esperados

  const token = this.authService.getToken(); 

  if (!token) {
      alert('Você precisa estar logado para criar uma mesa.'); 
      return; 
  }

  this.apiService.createMesa(novaMesa, token).subscribe({
      next: () => {
          this.router.navigate(['minhas-mesas']); // Redireciona para a página de mesas
      },
      error: (err) => {
        console.error('Erro ao criar mesa:', err); // Log do erro
        // A mensagem de erro específica pode ser encontrada em err.error
        alert(`Houve um erro ao criar a mesa: ${err.error || 'Tente novamente.'}`); // Exibe a mensagem de erro do backend
      },
  });
}
}
