import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';


interface ChatMessage {
  mensagemId?: number;
  user: string;
  message: string;  
  texto: string;    
  tipoMensagem: 'normal' | 'dado'; 
  dadosFormatados?: string;
  usuarioId: number;
  mesaId: number;
  dataHora: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubConnection!: signalR.HubConnection;
  private messageSubject = new Subject<ChatMessage>();
  private baseUrl = 'http://localhost:5056';
  private connectionStarted = false;

  constructor(private http: HttpClient) {
    this.startConnection();
  }

  private startConnection(): void {
    if (this.connectionStarted) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/chathub`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => {
        this.connectionStarted = true;
        console.log('Conexão SignalR estabelecida');
        
        this.hubConnection.on('ReceiveMessage', (message: any) => {
          const chatMessage: ChatMessage = {
            user: message.user,
            message: message.message,
            texto: message.message.replace(/<[^>]*>/g, ''),
            tipoMensagem: message.tipoMensagem || 'normal',
            dadosFormatados: message.dadosFormatados,
            usuarioId: message.usuarioId,
            mesaId: message.mesaId, // Adicione esta linha
            dataHora: message.dataHora
          };
          this.messageSubject.next(chatMessage);
        });
      })
      .catch(err => console.error('Erro ao conectar ao SignalR:', err));

    this.hubConnection.onclose(() => {
      this.connectionStarted = false;
      console.log('Conexão SignalR fechada. Tentando reconectar...');
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  getMessageObservable(): Observable<ChatMessage> {
    return this.messageSubject.asObservable();
  }

  sendMessage(messageData: ChatMessage): Promise<void> {
    return this.hubConnection.invoke('SendMessage', 
      messageData.user,
      messageData.message || messageData.texto || '',
      messageData.mesaId,
      messageData.usuarioId,
      messageData.tipoMensagem,
      messageData.dadosFormatados
    );
  }

  getMensagensPorMesa(mesaId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.baseUrl}/api/mensagens/mesa/${mesaId}`).pipe(
      map(response => this.mapearRespostaParaChatMessage(response)),
      catchError(error => {
        console.error('Erro ao carregar mensagens:', error);
        return of([]);
      })
    );
  }
  
  private mapearRespostaParaChatMessage(response: any): ChatMessage[] {
    if (!Array.isArray(response)) return [];
    
    return response.map(msg => ({
      mensagemId: msg.mensagemId || 0,
      user: msg.usuarioNome || 'Anônimo',
      message: msg.texto || '',
      texto: msg.texto || '',
      tipoMensagem: msg.tipoMensagem || 'normal',
      dadosFormatados: msg.dadosFormatados,
      usuarioId: msg.usuarioId || 0,
      mesaId: msg.mesaId || 0,
      dataHora: msg.dataHora || new Date().toISOString()
    }));
  }

  joinMesaGroup(mesaId: number): Promise<void> {
    return this.hubConnection.invoke('JoinMesaGroup', mesaId);
  }

  leaveMesaGroup(mesaId: number): Promise<void> {
    return this.hubConnection.invoke('LeaveMesaGroup', mesaId);
  }
}