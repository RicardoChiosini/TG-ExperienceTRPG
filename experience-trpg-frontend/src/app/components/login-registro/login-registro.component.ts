import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-registro',
  standalone: false,
  templateUrl: './login-registro.component.html',
  styleUrls: ['./login-registro.component.css'],
})
export class LoginRegistroComponent {
  // Campos para Registro
  email: string = '';
  senha: string = '';
  nomeUsuario: string = '';
  confirmacaoSenha: string = '';
  
  // Campos para Login
  loginEmail: string = '';
  loginSenha: string = '';

  mensagem: string = '';

  constructor(private apiService: ApiService, private router: Router, private route: ActivatedRoute, private authService: AuthService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['confirmacao'] === 'sucesso') {
        this.mensagem = 'Email confirmado com sucesso. Agora você pode fazer login.';
      }
    });
  }

  // Método para login do usuário
  onLogin() {
    const usuario = {
      email: this.loginEmail,
      senha: this.loginSenha
    };

    this.apiService.login(usuario).subscribe(
      (response) => {
        console.log('Login bem-sucedido', response);
        this.authService.login(response.token, response.usuario.usuarioId, response.usuario.nome); // Armazena o token usando o AuthService
        this.router.navigate(['minhas-mesas']); // Redireciona para uma página segura 
      },
      (error) => {
        console.error('Erro ao realizar login', error);
        this.mensagem = "Falha no login. Verifique suas credenciais.";
      }
    );
  }

  // Método de registro do usuário
  onRegister() {
    // Verifica se as senhas correspondem
    if (this.senha !== this.confirmacaoSenha) {
        this.mensagem = "As senhas não correspondem."; 
        return;
    }

    const novoUsuario = {
      nome: this.nomeUsuario,
      email: this.email,
      senha: this.senha
    };

    // Faz a chamada ao serviço de registro
    this.apiService.register(novoUsuario).subscribe(
      (response) => {
        console.log('Registro bem-sucedido', response);
        this.mensagem = "Registro realizado. Verifique seu email para confirmar."; 
      },
      (error) => {
        console.error('Erro ao registrar usuário', error);
        if (error.status === 400) {
            this.mensagem = "Email já cadastrado."; 
        } else {
            this.mensagem = "Erro ao registrar. Tente novamente."; 
        }
      }
    );
  }
}
