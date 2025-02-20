import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, of, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private hubConnection!: signalR.HubConnection;
  private baseUrl = 'http://localhost:5056/api';
  private messageSubject = new Subject<{ user: string; message: string }>();
  private isConnectionStarted = false; // Flag para controlar se a conexão já foi iniciada

  constructor(private http: HttpClient) {
    this.startConnection();
  }

  private startConnection() {
    if (this.isConnectionStarted) {
      console.log('Conexão já iniciada.');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5056/chathub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Conectado ao SignalR');
        this.isConnectionStarted = true;

        // Registra o listener para novas mensagens
        this.hubConnection.on('ReceiveMessage', (user: string, message: string) => {
          this.messageSubject.next({ user, message });
        });
      })
      .catch((err) => {
        console.error('Erro na conexão: ' + err);
        setTimeout(() => this.startConnection(), 5000); // Tenta reconectar após 5 segundos
      });

    // Listener para reconexão em caso de queda
    this.hubConnection.onclose(() => {
      console.log('Conexão com o SignalR fechada. Tentando reconectar...');
      this.isConnectionStarted = false; // Reseta a flag para permitir reconexão
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  // Retorna um Observable para novas mensagens
  getMessageObservable(): Observable<{ user: string; message: string }> {
    return this.messageSubject.asObservable();
  }

  // Envia uma mensagem
  sendMessage(user: string, message: string, mesaId: number, usuarioId: number): Observable<void> {
    return new Observable((observer) => {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
        this.hubConnection
          .invoke('SendMessage', user, message, mesaId, usuarioId)
          .then(() => {
            observer.next();
            observer.complete();
          })
          .catch((err) => {
            console.error('Erro ao enviar mensagem: ' + err);
            observer.error(err);
          });
      } else {
        console.error('Conexão com o SignalR não está ativa. Tentando reconectar...');
        this.startConnection();
        observer.error('Conexão com o SignalR não está ativa.');
      }
    });
  }

  // Obtém mensagens de uma mesa
  getMensagensPorMesa(mesaId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/mesas/${mesaId}/mensagens`).pipe(
      catchError((error) => {
        if (error.status === 404) {
          console.log('Nenhuma mensagem encontrada para esta mesa.');
          return of([]); // Retorna um array vazio em caso de 404
        }
        console.error('Erro ao carregar mensagens: ', error);
        throw error; // Propaga outros erros
      })
    );
  }

  // Entra no grupo da mesa
  joinMesaGroup(mesaId: number): void {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection
        .invoke('JoinMesaGroup', mesaId)
        .catch((err) => {
          console.error('Erro ao entrar no grupo: ' + err);
          this.startConnection();
          setTimeout(() => this.joinMesaGroup(mesaId), 2000);
        });
    } else {
      console.error('Conexão com o SignalR não está ativa. Tentando reconectar...');
      this.startConnection();
      setTimeout(() => this.joinMesaGroup(mesaId), 2000);
    }
  }
  
  // Sai do grupo da mesa
  leaveMesaGroup(mesaId: number): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection
        .invoke('LeaveMesaGroup', mesaId)
        .then(() => {
          console.log('Saiu do grupo da mesa:', mesaId);
        })
        .catch((err) => {
          console.error('Erro ao sair do grupo: ' + err);
        });
    }
  }
}