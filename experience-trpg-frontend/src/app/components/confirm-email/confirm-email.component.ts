import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-confirm-email',
  standalone: false,
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.css']
})
export class ConfirmEmailComponent implements OnInit {
  mensagem: string = '';

  constructor(private route: ActivatedRoute, private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      const token = params['token'];
  
      if (email && token) {
        // Chama o serviço para confirmar o email
        this.apiService.confirmEmail(email, token).subscribe(
          response => {
            // Agora, lidamos com a nova resposta
            this.mensagem = response.message; // Captura a mensagem de confirmação
            // Redireciona automaticamente para a tela de login-registro
            this.router.navigate(['login-registro'], { queryParams: { confirmacao: 'sucesso' } });
          },
          error => {
            console.error('Erro ao confirmar o e-mail', error);
            this.mensagem = error.error ? error.error : "Erro ao confirmar o e-mail. Tente novamente.";
          }
        );
      } else {
        this.mensagem = "Parâmetros de confirmação não válidos.";
      }
    });
  }
}