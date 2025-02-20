import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MesaDto, UsuarioDto } from '../../dtos/mesa.dto';
import { Sistema } from '../../models/SistemaModel';

@Component({
  selector: 'app-config-mesa',
  standalone: false,
  templateUrl: './config-mesa.component.html',
  styleUrls: ['./config-mesa.component.css']
})
export class ConfigMesaComponent implements OnInit {
  mesaId: number = 0; // ID da mesa a ser configurada
  mesa: MesaDto | null = null; // Usando o tipo MesaDto ou nulo
  sistemas: Sistema[] = [];
  selectedSistema: number | null = null;

  constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.mesaId = +params['id']; // Captura o ID da mesa da URL
      this.obterSistemas();
      this.carregarDadosDaMesa(); // Carregar os dados da mesa ao inicializar
    });
  }

  obterSistemas(): void {
    this.apiService.getData('sistemas').subscribe(data => {
      console.log('Dados recebidos:', data);
      this.sistemas = data; // Armazena os dados recebidos na variável sistemas
    }, error => {
      console.error('Erro ao obter sistemas:', error);
      alert('Erro ao carregar sistemas. Tente novamente.');
    });
  }

  carregarDadosDaMesa(): void {
    this.apiService.getMesaPorId(this.mesaId).subscribe(
      (data: MesaDto) => {
        this.mesa = data; 
        this.selectedSistema = this.mesa.sistemaId || 0; // Define o sistema selecionado
      },
      error => {
        console.error('Erro ao carregar os dados da mesa', error);
        alert('Erro ao carregar os dados da mesa. Tente novamente.'); // Mensagem de erro ao usuário
      }
    );
  }

  expulsarParticipante(participante: UsuarioDto): void {
    if (!this.mesa || !participante) {
        alert('Mesa não carregada ou participante inválido. Não é possível expulsar.');
        return;
    }

    if (participante.usuarioId !== this.mesa.criadorId) {
        this.apiService.expulsarParticipante({ usuarioId: participante.usuarioId, mesaId: this.mesa.mesaId }).subscribe(
            () => {
                console.log(`Participante ${participante.nome} foi expulso da mesa.`);
                // Recarrega os dados da mesa após expulsar o participante
                this.carregarDadosDaMesa();
            },
            error => {
                console.error(`Erro ao expulsar participante: ${error}`);
                alert('Erro ao expulsar o participante. Tente novamente.');
            }
        );
    } else {
        alert('Não é possível expulsar o criador da mesa.');
    }
  }

  salvarMesa(): void {
    if (this.mesa) {
      // Atualiza o sistemaId da mesa com o valor selecionado
      this.mesa.sistemaId = this.selectedSistema || 0;

      this.apiService.updateMesa(this.mesa).subscribe(
        () => {
          console.log('Mesa atualizada com sucesso!');
          alert('Alterações salvas com sucesso!');
        },
        error => {
          console.error('Erro ao atualizar a mesa', error);
          alert('Erro ao salvar as alterações. Tente novamente.');
        }
      );
    } else {
      alert('A mesa não está carregada. Não é possível salvar.');
    }
  }
}