import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-meu-perfil',
  standalone: false,
  templateUrl: './meu-perfil.component.html',
  styleUrls: ['./meu-perfil.component.css']
})
export class MeuPerfilComponent implements OnInit {
  usuario: any = {}; // Objeto para armazenar os dados do usuário
  novaSenha: string = ''; // Campo para nova senha
  confirmarNovaSenha: string = ''; // Campo para confirmar nova senha
  mensagem: string = ''; // Mensagem de feedback para o usuário

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.carregarDadosUsuario(); // Carrega os dados do usuário ao inicializar o componente
  }

  // Método para carregar os dados do usuário
  carregarDadosUsuario(): void {
    const usuarioId = this.authService.getUserId();
    if (usuarioId) {
      this.apiService.getData(`usuarios/${usuarioId}`).subscribe(
        (data) => {
          this.usuario = data; // Armazena os dados do usuário
        },
        (error) => {
          console.error('Erro ao carregar dados do usuário:', error);
          this.mensagem = 'Erro ao carregar dados do usuário. Tente novamente.';
        }
      );
    } else {
      this.mensagem = 'Usuário não autenticado.';
    }
  }

  // Método para salvar as alterações no perfil
  salvarPerfil(): void {
    // Verifica se as senhas coincidem (se preenchidas)
    if (this.novaSenha && this.novaSenha !== this.confirmarNovaSenha) {
      this.mensagem = 'As senhas não coincidem.';
      return;
    }

    // Atualiza a senha apenas se os campos de senha estiverem preenchidos
    if (this.novaSenha) {
      // Enviar a senha para o backend via campo 'Senha'
      this.usuario.Senha = this.novaSenha; // Campo que será enviado ao backend
    }

    // Envia os dados atualizados para o backend
    this.apiService.updateUsuario(this.usuario).subscribe(
      () => {
        this.mensagem = 'Perfil atualizado com sucesso!';
        // Limpa os campos de senha após a atualização
        this.novaSenha = '';
        this.confirmarNovaSenha = '';
      },
      (error) => {
        console.error('Erro ao atualizar perfil:', error);
        this.mensagem = 'Erro ao atualizar perfil. Tente novamente.';
      }
    );
  }
}