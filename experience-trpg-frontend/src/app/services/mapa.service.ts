import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MapaEstadoDto, TokenDto, CamadaDto, ObjetoDeMapaDto, ConfiguracaoMapaDto } from '../dtos/mapaEstado.dto';
import { MapaDto } from '../dtos/mapa.dto';
import { ImagemDto } from '../dtos/imagem.dto';

@Injectable({
  providedIn: 'root'
})
export class MapaService {
  private hubConnection!: signalR.HubConnection;
  private mapaUpdateSubject = new Subject<MapaDto>();
  private tokenUpdateSubject = new Subject<TokenDto>();
  private estadoUpdateSubject = new Subject<MapaEstadoDto>();
  private baseUrl = 'http://localhost:5056';
  private connectionStarted = false;
  private currentMesaId: number | string | null = null;

  constructor(private http: HttpClient) {
    this.startConnection();
  }

  private startConnection(): void {
    if (this.connectionStarted) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/mapahub`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onreconnected(() => {
      if (this.currentMesaId) {
        this.joinMesaGroup(this.currentMesaId);
      }
    });

    this.hubConnection.start()
      .then(() => {
        this.connectionStarted = true;
        if (this.currentMesaId) {
          this.joinMesaGroup(this.currentMesaId);
        }
        this.setupListeners();
      })
      .catch(err => console.error('Erro ao conectar ao SignalR:', err));

    this.hubConnection.onclose(() => {
      this.connectionStarted = false;
      setTimeout(() => this.startConnection(), 5000);
    });
  }

  private setupListeners(): void {
    this.hubConnection.on('ReceiveMapaUpdate', (mapa: MapaDto) => {
      this.mapaUpdateSubject.next(mapa);
    });

    this.hubConnection.on('ReceiveEstadoUpdate', (estado: MapaEstadoDto) => {
      this.estadoUpdateSubject.next(estado);
    });

    this.hubConnection.on('ReceiveTokenUpdate', (token: TokenDto) => {
      this.tokenUpdateSubject.next(token);
    });
  }

  // Métodos de conexão
  joinMesaGroup(mesaId: number | string): Promise<void> {
    this.currentMesaId = mesaId;
    return this.hubConnection.invoke('JoinMesaGroup', mesaId.toString());
  }

  leaveMesaGroup(mesaId: number | string): Promise<void> {
    if (this.currentMesaId === mesaId) {
      this.currentMesaId = null;
    }
    return this.hubConnection.invoke('LeaveMesaGroup', mesaId.toString());
  }

  // Métodos observables
  getMapaObservable(): Observable<MapaDto> {
    return this.mapaUpdateSubject.asObservable();
  }

  getEstadoObservable(): Observable<MapaEstadoDto> {
    return this.estadoUpdateSubject.asObservable();
  }

  getTokenObservable(): Observable<TokenDto> {
    return this.tokenUpdateSubject.asObservable();
  }

  // Métodos HTTP + SignalR
  updateBackgroundImage(mesaId: number, mapaId: number, imagemId: number | null): Observable<any> {
    const url = imagemId !== null
      ? `${this.baseUrl}/api/mapa/${mapaId}/background-image/${imagemId}`
      : `${this.baseUrl}/api/mapa/${mapaId}/background-image`;

    const request = imagemId !== null
      ? this.http.post(url, {})
      : this.http.delete(url);

    return request.pipe(
      switchMap(() => {
        return this.hubConnection.invoke('UpdateBackgroundImage', mesaId, mapaId, imagemId);
      }),
      catchError(error => {
        console.error('Erro ao atualizar imagem de fundo:', error);
        return throwError(error);
      })
    );
  }

  getMapaById(mesaId: number, mapaId: number): Observable<MapaDto> {
    return this.http.get<MapaDto>(`${this.baseUrl}/api/mapa/${mesaId}/mapa/${mapaId}`).pipe(
      catchError(error => {
        console.error('Erro ao buscar mapa:', error);
        return throwError(error);
      })
    );
  }

  getImagemPorId(imagemId: number): Observable<ImagemDto> {
    return this.http.get<ImagemDto>(`${this.baseUrl}/api/imagens/${imagemId}`).pipe(
      catchError(error => {
        console.error('Erro ao buscar imagem:', error);
        return throwError(error);
      })
    );
  }

  updateToken(mesaId: number, mapaId: number, token: TokenDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/mapa/${mapaId}/token/${token.id}`, token).pipe(
      switchMap(() => {
        return this.hubConnection.invoke('UpdateToken', mesaId, mapaId, token);
      }),
      catchError(error => {
        console.error('Erro ao atualizar token:', error);
        return throwError(error);
      })
    );
  }

  updateMapConfig(mesaId: number, mapaId: number, config: ConfiguracaoMapaDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/mapa/${mapaId}/configuracoes`, config).pipe(
      switchMap(() => {
        return this.hubConnection.invoke('UpdateMapConfig', mesaId, mapaId, config);
      }),
      catchError(error => {
        console.error('Erro ao atualizar configurações:', error);
        return throwError(error);
      })
    );
  }

  addToken(mesaId: number, mapaId: number, token: TokenDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/mapa/${mapaId}/token`, token).pipe(
      switchMap(() => {
        return this.hubConnection.invoke('AddToken', mesaId, mapaId, token);
      }),
      catchError(error => {
        console.error('Erro ao adicionar token:', error);
        return throwError(error);
      })
    );
  }

  // Métodos auxiliares para operações com o estado do mapa
  sendMapUpdate(mesaId: number, mapaId: number, estadoJson: string): Observable<any> {
    const estado = JSON.parse(estadoJson) as MapaEstadoDto;
    return this.http.put(`${this.baseUrl}/api/mapa/${mapaId}/estado`, estado).pipe(
      switchMap(() => {
        // Note que o nome do método agora corresponde ao do backend
        return this.hubConnection.invoke('SendMapUpdate', mesaId, mapaId, estado);
      }),
      catchError(error => {
        console.error('Erro ao enviar atualização do mapa:', error);
        return throwError(error);
      })
    );
  }

  getCurrentMapState(mesaId: number, mapaId: number): Observable<MapaEstadoDto> {
    return this.http.get<MapaEstadoDto>(`${this.baseUrl}/api/mapa/${mesaId}/mapa/${mapaId}/tokens`).pipe(
      catchError(error => {
        console.error('Erro ao buscar estado do mapa:', error);
        return throwError(error);
      })
    );
  }

  getMapUpdateObservable(): Observable<{ mapId: number, estado: MapaEstadoDto }> {
    return this.estadoUpdateSubject.pipe(
      // Assumindo que o estado está vinculado a um mapa específico
      // Você precisará garantir que o mapId seja passado de alguma forma
      map(estado => ({
        mapId: estado.tokens[0]?.mapaId || 0, // Pega do primeiro token ou usa padrão
        estado
      }))
    );
  }

  getCurrentMapObservable(): Observable<number> {
    return this.mapaUpdateSubject.pipe(
      map(mapa => mapa.mapaId))
  }

  getBackgroundImageObservable(): Observable<{ mapId: number, imageId: number | null }> {
    return this.mapaUpdateSubject.pipe(
      map(mapa => ({ mapId: mapa.mapaId, imageId: mapa.imagemFundo || null })))
  }
}