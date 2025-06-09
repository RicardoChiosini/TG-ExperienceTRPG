import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { MesaDto } from '../dtos/mesa.dto';
import { ImagemDto } from '../dtos/imagem.dto';
import { FichaDto, AtributoDto, HabilidadeDto, ProficienciaDto } from '../dtos/ficha.dto';
import { MapaDto } from '../dtos/mapa.dto';
import { MapaEstadoDto } from '../dtos/mapaEstado.dto';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:5056/api'; // URL base do seu ASP.NET

  constructor(private http: HttpClient) { }

  // Método para obter dados
  getData(endpoint: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${endpoint}`);
  }

  // Método para registrar um novo usuário
  register(user: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/usuarios`, user); // Endpoint para registro
  }

  confirmEmail(email: string, token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/usuarios/confirm?email=${email}&token=${token}`);
  }

  // Método para login de um usuário
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/usuarios/login`, credentials); // Endpoint para login
  }

  // Método para obter as mesas de um usuário
  getMesasPorUsuario(usuarioId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/mesas/usuario/${usuarioId}`);
  }

  // Método para obter uma mesa específica por ID
  getMesaPorId(id: number): Observable<MesaDto> {
    return this.http.get<MesaDto>(`${this.baseUrl}/mesas/${id}`); // Faz uma requisição GET ao endpoint
  }

  getConvitePorMesaId(mesaId: number): Observable<string> {
    return this.http.get(`http://localhost:5056/api/mesas/${mesaId}/convite`, { responseType: 'text' });
  }

  participarDaMesa(mesaId: number, token: string, usuarioId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/mesas/${mesaId}/convites/${token}/participar`, { usuarioId });
  }

  // Método para atualizar uma mesa
  expulsarParticipante(data: { usuarioId: number; mesaId: number }): Observable<any> {
    return this.http.delete(`${this.baseUrl}/mesas/expulsar-participante`, { body: data });
  }

  updateUsuario(usuario: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/usuarios/${usuario.usuarioId}`, usuario);
  }

  updateMesa(mesa: MesaDto): Observable<MesaDto> {
    return this.http.put<MesaDto>(`${this.baseUrl}/mesas/${mesa.mesaId}`, mesa);
  }

  // Método para criar uma nova mesa
  createMesa(mesaData: any, token: string | null): Observable<any> {
    let headers = {};
    if (token) {
      headers = {
        'Authorization': `Bearer ${token}` // Adiciona o token ao cabeçalho
      };
    }

    return this.http.post(`${this.baseUrl}/mesas`, mesaData, { headers }); // Passa o cabeçalho na requisição
  }

  // Método para obter mensagens de uma mesa específica
  getMensagensPorMesa(mesaId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/mesas/${mesaId}/mensagens`);
  }

  // api.service.ts
  acessarMesa(mesaId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/mesas/acessar/${mesaId}`, {});
  }

  // Método para sair da mesa
  leaveMesa(request: { usuarioId: number; mesaId: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/mesas/sair`, request);
  }

  // Método para apagar uma mesa
  deleteMesa(mesa: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}/mesas/${mesa.mesaId}`); // Usando o ID da mesa
  }

  // Busca fichas por mesa
  getFichasPorMesa(mesaId: number): Observable<FichaDto[]> {
    return this.http.get<FichaDto[]>(`${this.baseUrl}/fichas/${mesaId}/fichas`);
  }

  // Cria uma nova ficha
  criarFicha(mesaId: number): Observable<FichaDto> {
    return this.http.post<FichaDto>(`${this.baseUrl}/fichas/criarficha/${mesaId}`, {});
  }

  // Busca uma ficha por ID
  getFichaPorId(fichaId: number): Observable<FichaDto> {
    return this.http.get<FichaDto>(`${this.baseUrl}/fichas/${fichaId}`);
  }

  // Atualiza a ficha
  updateFicha(fichaId: number, ficha: Partial<FichaDto>): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/fichas/${fichaId}`, ficha);
  }

  // Atualiza um atributo
  updateAtributo(atributoId: number, atributo: AtributoDto): Observable<void> {
    console.log("Atualizando atributo:", atributo); // Adicionando log
    return this.http.put<void>(`${this.baseUrl}/atributos/${atributoId}`, atributo);
  }

  // Atualiza uma habilidade
  updateHabilidade(habilidadeId: number, habilidade: HabilidadeDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/habilidades/${habilidadeId}`, habilidade);
  }

  // Atualiza uma proficiência
  updateProficiencia(proficienciaId: number, proficiencia: ProficienciaDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/proficiencias/${proficienciaId}`, proficiencia);
  }

  // No seu serviço API, crie um método para buscar o MesaId
  getMesaIdByFichaId(fichaId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/fichas/${fichaId}/mesaId`);
  }

  getImagensPorMesa(mesaId: number): Observable<ImagemDto[]> {
    return this.http.get<ImagemDto[]>(`${this.baseUrl}/imagens/mesa/${mesaId}`);
  }

  uploadImagem(formData: FormData): Observable<HttpEvent<any>> {
    return this.http.post(`${this.baseUrl}/imagens/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  updateImagem(imagemId: number, imagemDto: ImagemDto): Observable<ImagemDto> {
    return this.http.patch<ImagemDto>(
      `${this.baseUrl}/imagens/${imagemId}`,
      imagemDto,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }
    );
  }

  deleteImagem(imagemId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/imagens/${imagemId}`);
  }

  getImagemPorId(imagemId: number): Observable<ImagemDto> {
    return this.http.get<ImagemDto>(`${this.baseUrl}/imagens/${imagemId}`);
  }

  getMapaById(mesaId: number, mapaId: number): Observable<MapaDto> {
    return this.http.get<MapaDto>(`${this.baseUrl}/mapa/${mesaId}/mapa/${mapaId}`);
  }

  excluirMapa(mesaId: number, mapaId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/mapa/${mesaId}/mapa/${mapaId}`
    ).pipe(
      catchError(error => {
        // Tratamento específico para o erro "último mapa"
        if (error.status === 400 && error.error?.message?.includes("último mapa")) {
          throw new Error('Não é possível excluir o último mapa da mesa');
        }
        // Tratamento para outros erros
        if (error.status === 404) {
          throw new Error('Mapa não encontrado');
        }
        throw new Error('Erro ao excluir mapa');
      })
    );
  }

  vincularImagemAFicha(fichaId: number, imagemId: number): Observable<FichaDto> {
    return this.http.post<FichaDto>(`${this.baseUrl}/fichas/${fichaId}/vincular/${imagemId}`, {});
  }

  removerImagemDaFicha(fichaId: number): Observable<FichaDto> {
    return this.http.delete<FichaDto>(`${this.baseUrl}/fichas/${fichaId}/remover-imagem`);
  }

  getImagemDaFicha(fichaId: number): Observable<ImagemDto> {
    return this.http.get<ImagemDto>(`${this.baseUrl}/fichas/${fichaId}/imagem`);
  }

  getMapaMaisRecentePorMesa(mesaId: number): Observable<MapaDto> {
    return this.http.get<MapaDto>(`${this.baseUrl}/mapa/${mesaId}/mapa/recente`);
  }

  getTokensDoMapa(mesaId: number, mapaId: number): Observable<MapaEstadoDto> {
    return this.http.get<MapaEstadoDto>(`${this.baseUrl}/mapa/${mesaId}/mapa/${mapaId}/tokens`).pipe(
      catchError(error => {
        console.error('Erro ao buscar tokens:', error);
        return of({
          mapaId: mapaId, // Adiciona o mapaId para manter consistência
          tokens: [],
          camadas: [],
          objetos: [],
          configuracoes: {
            tipoGrid: 'hexagonal',
            tamanhoCelula: 40,
            corGrid: '#cccccc',
            snapToGrid: true
          }
        });
      })
    );
  }

  salvarEstadoMapa(mapaId: number, estado: MapaEstadoDto): Observable<MapaEstadoDto> {
    return this.http.put<MapaEstadoDto>(
      `${this.baseUrl}/mapa/${mapaId}/estado`,
      estado
    ).pipe(
      catchError(error => {
        console.error('Erro ao salvar estado:', error);
        return of({
          mapaId: mapaId, // Garante que o fallback tenha mapaId
          tokens: [],
          camadas: [],
          objetos: [],
          configuracoes: {
            tipoGrid: 'hexagonal',
            tamanhoCelula: 40,
            corGrid: '#cccccc',
            snapToGrid: true
          }
        });
      })
    );
  }

  salvarConfigMapa(mapaId: number, config: any): Observable<MapaDto> {
    return this.http.put<MapaDto>(`${this.baseUrl}/mapa/mapa/${mapaId}/config`, config);
  }

  getTodosMapasPorMesa(mesaId: number): Observable<MapaDto[]> {
    return this.http.get<MapaDto[]>(`${this.baseUrl}/mapa/${mesaId}/mapas`);
  }

  atualizarVisibilidadeMapa(mesaId: number, mapaId: number, visivel: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/mapa/${mesaId}/mapa/${mapaId}/visibilidade`, visivel);
  }

  criarMapa(mesaId: number, mapa: MapaDto): Observable<MapaDto> {
    return this.http.post<MapaDto>(`${this.baseUrl}/mapa/${mesaId}/mapa`, mapa);
  }
}