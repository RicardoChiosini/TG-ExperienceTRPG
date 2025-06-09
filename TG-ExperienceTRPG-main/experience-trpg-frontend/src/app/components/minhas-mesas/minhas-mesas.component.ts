import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MesaDto } from '../../dtos/mesa.dto';

@Component({
  selector: 'app-minhas-mesas',
  standalone: false,
  templateUrl: './minhas-mesas.component.html',
  styleUrls: ['./minhas-mesas.component.css'],
})
export class MinhasMesasComponent implements OnInit {
  mesas: MesaDto[] = []; // Inicialize como uma lista vazia
  usuarioId: number = 0;
  currentPage: number = 0; // Página atual
  itemsPerPage: number = 4; // Número de mesas por página
  totalMesas: number = 0; // Total de mesas

  constructor(private apiService: ApiService, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.usuarioId = this.authService.getUserId() || 0; // Obtendo o ID do usuário logado
    if (this.usuarioId == 0) {
      alert('Você precisa estar logado para acessar suas mesas.');
      return;
    }
    this.loadMesas(); // Carrega as mesas ao inicializar o componente
  }

  loadMesas(): void {
    this.apiService.getMesasPorUsuario(this.usuarioId).subscribe(
      (data) => {
        this.mesas = data; // Armazena os dados retornados na lista de mesas
        this.totalMesas = data.length; // Total de mesas para controle da paginação
      },
      (error) => {
        console.error('Erro ao carregar mesas:', error);
        alert('Erro ao carregar mesas. Tente novamente.');
      }
    );  
  }

  // Lógica para paginar as mesas
  get paginatedMesas(): MesaDto[] {
    const startIndex = this.currentPage * this.itemsPerPage;
    return this.mesas.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Método para ir para a próxima página
  nextPage(): void {
    if ((this.currentPage + 1) * this.itemsPerPage < this.totalMesas) {
      this.currentPage++;
    }
  }

  // Método para ir para a página anterior
  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  // Método para acessar os nomes dos participantes como uma string
  getParticipantesNomes(mesa: MesaDto): string {
    return mesa.participantes && mesa.participantes.length > 0 
        ? mesa.participantes.map(p => p.nome).join(', ') 
        : 'Nenhum participante';
  }

  // Método para entrar na mesa
  entrarNaMesa(mesa: any) {
    console.log(`Entrar na mesa: ${mesa.nome}`);
    // Navegar para o componente de mesa, onde o mapa e chat serão usados
    this.router.navigate(['mesa', mesa.mesaId]); // Ajuste conforme suas rotas
  }

  // Método para sair da mesa
  sairDaMesa(mesa: any) {
    console.log(`Sair da mesa: ${mesa.nome}`);

    this.apiService.leaveMesa({ usuarioId: this.usuarioId, mesaId: mesa.mesaId }).subscribe(
      () => {
        console.log(`Desvinculado da mesa: ${mesa.nome}`);
        // Remover mesa da lista
        this.mesas = this.mesas.filter(m => m.mesaId !== mesa.mesaId);
      },
      error => {
        console.error(`Erro ao sair da mesa: ${error}`);
      }
    );
  }

  // Método para apagar a mesa
  apagarMesa(mesa: MesaDto) {
    const confirmDelete = prompt(`Digite "DELETE" para confirmar a exclusão da mesa "${mesa.nome}":`);
    if (confirmDelete === 'DELETE') {
      console.log(`Apagar mesa: ${mesa.nome}`);
      
      this.apiService.deleteMesa(mesa).subscribe(
        () => {
          console.log(`Mesa apagada: ${mesa.nome}`);
          // Remove a mesa da lista local após a deleção
          this.mesas = this.mesas.filter(m => m.mesaId !== mesa.mesaId);
        },
        error => {
          console.error(`Erro ao apagar mesa: ${error}`);
        }
      );
    } else {
      alert('Operação de exclusão cancelada.');
    }
  }

  // Método para acessar as configurações da mesa
  configurarMesa(mesa: any) {
    console.log(`Configurar mesa: ${mesa.nome}`);
    this.router.navigate(['config-mesa', mesa.mesaId]); // Ajuste conforme suas rotas
  }
}