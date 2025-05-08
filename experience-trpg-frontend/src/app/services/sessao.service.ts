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

interface MapUpdate {
  mapId: number;
  mapState: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private hubConnection!: signalR.HubConnection;
  private messageSubject = new Subject<ChatMessage>();
  private mapUpdateSubject = new Subject<MapUpdate>();
  private currentMapSubject = new Subject<number>();
  private baseUrl = 'http://localhost:5056';
  private connectionStarted = false;

  constructor(private http: HttpClient) {
    this.startConnection();
  }

  private startConnection(): void {
    if (this.connectionStarted) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/sessaohub`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => {
        this.connectionStarted = true;
        console.log('Conexão SignalR estabelecida');
        
        // Configuração dos listeners
        this.setupMessageListener();
        this.setupMapListeners();
      })
      .catch(err => console.error('Erro ao conectar ao SignalR:', err));

    this.hubConnection.onclose(() => {
      this.connectionStarted = false;
      console.log('Conexão SignalR fechada. Tentando reconectar...');
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  private setupMessageListener(): void {
    this.hubConnection.on('ReceiveMessage', (message: any) => {
      const chatMessage: ChatMessage = {
        user: message.user,
        message: message.message,
        texto: message.message.replace(/<[^>]*>/g, ''),
        tipoMensagem: message.tipoMensagem || 'normal',
        dadosFormatados: message.dadosFormatados,
        usuarioId: message.usuarioId,
        mesaId: message.mesaId,
        dataHora: message.dataHora
      };
      this.messageSubject.next(chatMessage);
    });
  }

  private setupMapListeners(): void {
    this.hubConnection.on('ReceiveMapUpdate', (mapId: number, mapState: string) => {
      this.mapUpdateSubject.next({ mapId, mapState });
    });

    this.hubConnection.on('ReceiveCurrentMap', (mapId: number) => {
      this.currentMapSubject.next(mapId);
    });
  }

  // Métodos para o Chat
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

  // Métodos para o Mapa
  getMapUpdateObservable(): Observable<MapUpdate> {
    return this.mapUpdateSubject.asObservable();
  }

  getCurrentMapObservable(): Observable<number> {
    return this.currentMapSubject.asObservable();
  }

  sendMapUpdate(mesaId: string, mapId: number, mapState: string): Promise<void> {
    return this.hubConnection.invoke('SendMapUpdate', mesaId, mapId, mapState);
  }

  sendCurrentMap(mesaId: string, mapId: number): Promise<void> {
    return this.hubConnection.invoke('UpdateCurrentMap', mesaId, mapId);
  }

  // Métodos compartilhados
  joinMesaGroup(mesaId: number | string): Promise<void> {
    return this.hubConnection.invoke('JoinMesaGroup', mesaId.toString());
  }

  leaveMesaGroup(mesaId: number | string): Promise<void> {
    return this.hubConnection.invoke('LeaveMesaGroup', mesaId.toString());
  }

  // Métodos HTTP (mantidos do serviço original)
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
}