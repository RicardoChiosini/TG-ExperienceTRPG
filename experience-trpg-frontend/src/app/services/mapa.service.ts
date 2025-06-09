import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MapaEstadoDto, TokenDto, CamadaDto, ObjetoDeMapaDto, ConfiguracaoMapaDto } from '../dtos/mapaEstado.dto';
import { MapaDto } from '../dtos/mapa.dto';
import { ImagemDto } from '../dtos/imagem.dto';
import { MapaConfigDto } from '../dtos/mapaconfig.dto';

@Injectable({
  providedIn: 'root'
})
export class MapaService {
  private hubConnection!: signalR.HubConnection;
  private baseUrl = 'http://localhost:5056';
  private connectionStarted = false;
  private currentMesaId: number | string | null = null;

  // Subjects para comunicação com componentes
  private tokenUpdateSubject = new Subject<TokenDto>();
  private mapaUpdateSubject = new Subject<MapaDto>();
  private estadoUpdateSubject = new Subject<MapaEstadoDto>();
  private mapaUpdatesSource = new Subject<MapaDto>();
  private configUpdateSubject = new Subject<{ mapaId: number, mapaDto: MapaDto }>();
  private backgroundImageUpdateSubject = new Subject<{ mapaId: number, imagem: ImagemDto | null }>();


  // Expose como observables
  tokenUpdates$ = this.tokenUpdateSubject.asObservable();
  mapaUpdates$ = this.mapaUpdateSubject.asObservable();
  estadoUpdates$ = this.estadoUpdateSubject.asObservable();
  mapaUpdatesSource$ = this.mapaUpdatesSource.asObservable();
  configUpdates$ = this.configUpdateSubject.asObservable();
  backgroundImageUpdates$ = this.backgroundImageUpdateSubject.asObservable();

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
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Adiciona tempos de reconexão
      .configureLogging(signalR.LogLevel.Information) // Habilita logs para debug
      .build();

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconectando...');
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconectado');
      if (this.currentMesaId) {
        this.joinMesaGroup(this.currentMesaId.toString()).catch(err => {
          console.error('Erro ao reentrar no grupo:', err);
        });
      }
    });

    this.hubConnection.onclose((error) => {
      console.log('SignalR desconectado', error);
      this.connectionStarted = false;
      setTimeout(() => this.startConnection(), 5000);
    });

    this.hubConnection.start()
      .then(() => {
        console.log('SignalR conectado');
        this.connectionStarted = true;
        this.setupListeners();
        if (this.currentMesaId) {
          this.joinMesaGroup(this.currentMesaId.toString());
        }
      })
      .catch(err => {
        console.error('Erro ao conectar ao SignalR:', err);
        setTimeout(() => this.startConnection(), 5000);
      });
  }

  getConnectionId(): string {
    return this.hubConnection?.connectionId || '';
  }

  private setupListeners(): void {
    // Listener para atualizações completas do estado do mapa
    this.hubConnection.on('ReceiveMapUpdate', (mapaId: number, estadoJson: string) => {
      try {
        const estado: MapaEstadoDto = JSON.parse(estadoJson);
        this.estadoUpdateSubject.next(estado);
      } catch (error) {
        console.error('Erro ao processar atualização do mapa:', error);
      }
    });

    // Listener para atualizações de mapa
    this.hubConnection.on('ReceiveBackgroundImageUpdate', (mapaId: number, imagem: ImagemDto | null) => {
      this.backgroundImageUpdateSubject.next({ mapaId, imagem });
    });

    // Listener para atualizações individuais de tokens
    this.hubConnection.on('ReceiveTokenUpdate', (token: TokenDto) => {
      this.tokenUpdateSubject.next(token);
    });

    // Adicione um listener específico para atualizações de configuração
    this.hubConnection.on('ReceiveMapConfigUpdate', (mapaId: number, mapaDto: MapaDto) => {
        this.configUpdateSubject.next({ mapaId, mapaDto });
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

  // Carrega o estado inicial do mapa
  public loadInitialMapState(mesaId: number, mapaId: number): Observable<MapaEstadoDto> {
    return this.http.get<MapaEstadoDto>(`${this.baseUrl}/api/mapa/${mapaId}/estado`).pipe(
      tap(estado => {
        // Envia para os subscribers
        this.estadoUpdateSubject.next(estado);
      }),
      catchError(error => {
        console.error('Erro ao carregar estado inicial:', error);
        return throwError(error);
      })
    );
  }

  // Salva o estado do mapa e notifica outros clientes
  public saveMapState(mesaId: number, mapaId: number, estado: MapaEstadoDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/mapa/${mapaId}/estado`, estado).pipe(
      switchMap(() => {
        return from(this.hubConnection.invoke('SendMapUpdate', mesaId, mapaId, JSON.stringify(estado)));
      }),
      catchError(error => {
        console.error('Erro ao salvar estado do mapa:', error);
        return throwError(error);
      })
    );
  }

  // Método para atualizações parciais do estado
  public partialMapUpdate(mesaId: number, mapaId: number, update: Partial<MapaEstadoDto>): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/api/mapa/${mapaId}/estado`, update).pipe(
      switchMap(() => {
        return from(this.hubConnection.invoke('SendPartialUpdate', mesaId, mapaId, JSON.stringify(update)));
      })
    );
  }

  updateBackgroundImage(mesaId: number, mapaId: number, imagemId: number | null): Observable<any> {
    const url = imagemId !== null
      ? `${this.baseUrl}/api/mapa/${mapaId}/background-image/${imagemId}`
      : `${this.baseUrl}/api/mapa/${mapaId}/background-image`;

    const request = imagemId !== null
      ? this.http.post(url, {})
      : this.http.delete(url);

    return request.pipe(
      switchMap(() => {
        // Notificar outros usuários via SignalR
        return from(this.hubConnection.invoke('UpdateBackgroundImage', mesaId, mapaId, imagemId));
      }),
      catchError(error => {
        console.error('Erro ao atualizar imagem de fundo:', error);
        return throwError(error);
      })
    );
  }

  // Obtém a imagem de fundo do mapa (se existir)
  getBackgroundImage(mapaId: number): Observable<ImagemDto | null> {
    return this.http.get<ImagemDto>(`${this.baseUrl}/api/mapa/${mapaId}/background-image`).pipe(
      catchError(error => {
        if (error.status === 404) {
          return of(null); // Retorna null quando não encontrado
        }
        console.error('Erro ao obter imagem de fundo:', error);
        return throwError(error);
      })
    );
  }

  // Define uma imagem de fundo para o mapa
  setBackgroundImage(mapaId: number, imagemId: number): Observable<{ mapa: MapaDto, imagem: ImagemDto }> {
    return this.http.post<MapaDto>(
      `${this.baseUrl}/api/mapa/${mapaId}/background-image/${imagemId}`, {}
    ).pipe(
      tap(updatedMap => {
        this.hubConnection.invoke('UpdateBackgroundImage', updatedMap.mesaId!, mapaId, imagemId)
          .catch(err => console.error('Erro ao notificar atualização de imagem:', err));
      }),
      switchMap(updatedMap =>
        this.getImagemPorId(imagemId).pipe(
          map(imagem => ({ mapa: updatedMap, imagem })),
          catchError(error => {
            console.error('Erro ao obter imagem:', error);
            return of({ mapa: updatedMap, imagem: null! });
          })
        )
      ),
      catchError(error => {
        console.error('Erro ao definir imagem de fundo:', error);
        return throwError(() => error);
      })
    );
  }

  // Remove a imagem de fundo do mapa
  removeBackgroundImage(mapaId: number): Observable<MapaDto> {
    return this.http.delete<MapaDto>(
      `${this.baseUrl}/api/mapa/${mapaId}/background-image`
    ).pipe(
      tap(updatedMap => {
        this.hubConnection.invoke('UpdateBackgroundImage', updatedMap.mesaId!, mapaId, null)
          .catch(err => console.error('Erro ao notificar remoção de imagem:', err));
      }),
      catchError(error => {
        console.error('Erro ao remover imagem de fundo:', error);
        return throwError(() => error);
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

  updateMapConfig(mesaId: number, mapaId: number, config: MapaConfigDto, headers?: HttpHeaders): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/mapa/${mesaId}/mapas/${mapaId}/config`,
      config,
      { headers }
    ).pipe(
      tap(() => {
        // Notificação via SignalR
        this.hubConnection.invoke('UpdateMapConfig', mesaId, mapaId, config)
          .catch(err => console.error('Erro ao notificar atualização de configuração:', err));
      })
    );
  }

  addToken(mesaId: number, mapaId: number, token: TokenDto): Observable<TokenDto> {
    return this.http.post<TokenDto>(
      `${this.baseUrl}/api/mapa/${mesaId}/mapa/${mapaId}/token`,
      token
    ).pipe(
      switchMap((tokenAdicionado) => {
        // Usa AddOrUpdateToken em vez de AddToken
        return from(this.hubConnection.invoke('AddOrUpdateToken', tokenAdicionado, mesaId))
          .pipe(map(() => tokenAdicionado));
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