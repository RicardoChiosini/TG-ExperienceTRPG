import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isLoggedInStatus = new BehaviorSubject<boolean>(false); // Estado do login do usuário
  private usuarioId: number | null = null;
  private nome: string = '';

  constructor() {
    // Verifica ao inicializar se há um token no localStorage
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedInStatus.next(true); // Se o token existir, considera o usuário como logado
      this.usuarioId = parseInt(localStorage.getItem('usuarioId')!); // Obtém o ID do usuário do localStorage
    }
  }

  // Método para login do usuário no AuthService
  login(token: string, userId: number, userName: string) {
    localStorage.setItem('token', token); // Armazena o token no localStorage
    localStorage.setItem('usuarioId', userId.toString()); // Armazena o ID do usuário
    localStorage.setItem('nome', userName); // Armazena o nome do usuário
    this.isLoggedInStatus.next(true); // Atualiza o estado de login
    this.usuarioId = userId; // Define o usuarioId
  }

  // Método para simular o logout do usuário
  logout() {
    localStorage.removeItem('token'); // Remove o token do localStorage
    localStorage.removeItem('usuarioId'); // Remove o ID do usuário
    this.isLoggedInStatus.next(false); // Atualiza o estado de login
    this.usuarioId = null; // Limpa o ID do usuário
  }

  // Método para verificar se o usuário está logado
  isLoggedIn() {
    return this.isLoggedInStatus.asObservable(); // Retorna o Observable do estado de login
  }

  // Método para obter o token
  getToken(): string | null {
    return localStorage.getItem('token'); // Recupera o token do localStorage
  }

  // Método para obter o usuário logado
  getUserId(): number | null {
    const userId = localStorage.getItem('usuarioId');
    return userId ? parseInt(userId, 10) : null; // Retorna o ID como número ou null se não estiver armazenado
  }

  getUserName(): string | null {
    // Recupera o nome do usuário. Você pode também armazenar o nome e outros dados ao fazer login.
    return localStorage.getItem('nome'); // Assume que você armazena o nome no localStorage
  }
}
