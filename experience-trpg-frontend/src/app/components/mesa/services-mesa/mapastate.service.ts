// mapa-state.service.ts
import { EventEmitter, Inject, Injectable } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { MapaEstadoDto, ConfiguracaoMapaDto, TokenUpdateDto } from '../../../dtos/mapaEstado.dto';
import { MapaDto } from '../../../dtos/mapa.dto';
import { TokenDto } from '../../../dtos/mapaEstado.dto';
import { MapaService } from '../../../services/mapa.service';
import { PhaserGameService } from './phasergame.service';
import { AuthService } from '../../../services/auth.service';
import { throwError, of, Subscription, Observable, lastValueFrom } from 'rxjs';
import { switchMap, catchError, tap, finalize } from 'rxjs/operators';
import * as Phaser from 'phaser';
import { MapaConfigDto } from '../../../dtos/mapaconfig.dto';
import { e, im } from 'mathjs';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class MapaStateService {
    private get usuarioId(): number {
        const id = this.authService.getUserId();
        if (id === null) {
            throw new Error('User ID not available - user not logged in');
        }
        return id;
    }
    // Estado interno de mapas
    private estadosMapa: { [mapaId: number]: MapaEstadoDto } = {};
    public onTokenAdicionado = new EventEmitter<TokenDto>();
    private subscriptions = new Subscription();
    private localUpdates = new Set<string>();


    // Dados externos: estes valores serão definidos via setters
    public currentMapId!: number;
    public currentMap: MapaDto | null = null;
    private mesaId!: number;
    private phaserGame!: Phaser.Game;
    private gridContainer: Phaser.GameObjects.Container | null = null;

    private isLoading: boolean = false;
    private mapaCarregado: boolean = false;
    public gridControlsVisible: boolean = false;

    // Para o grid, lista local de configurações
    private maps: Array<{ gridSize: { cols: number; rows: number }; hexRadius: number }> = [
        { gridSize: { cols: 30, rows: 30 }, hexRadius: 40 }
    ];
    public allMaps: MapaDto[] = [];

    // Outras flags
    private configuracoesAbertas: boolean = false;
    private isCriador: boolean = false;
    private currentMapIndex: number = 0;
    private selectedToken?: Phaser.GameObjects.Sprite;
    private ignoreNextTokenUpdate: Set<string> = new Set();
    private ignoreNextTokenDelete: Set<string> = new Set();

    constructor(
        private apiService: ApiService,
        private mapaService: MapaService,
        private toastr: ToastrService,
        private authService: AuthService,
        private phaserGameService: PhaserGameService
    ) {
        this.phaserGameService.onTokenDeleteRequested.subscribe(tokenId => {
            this.removerToken(tokenId).subscribe();
        });

        this.phaserGameService.onTokenUpdated.subscribe(({ token, changes }) => {
            if (token.id && this.currentMapId) {
                this.atualizarToken(token.id, changes).subscribe();
            }
        });
    }

    /* SETTERS para injetar dados externos */
    public setPhaserGame(game: Phaser.Game): void {
        this.phaserGame = game;
    }
    public setCurrentMap(map: any): void {
        this.currentMap = map;
    }
    public getCurrentMap(): MapaDto | null {
        return this.currentMap;
    }
    public setCurrentMapId(mapId: number): void {
        this.currentMapId = mapId;
    }
    public getCurrentMapId(): number | null {
        return this.currentMapId;
    }
    public setMesaId(mesaId: number): void {
        this.mesaId = mesaId;
    }
    public setIsCriador(isCriador: boolean): void {
        this.isCriador = isCriador;
    }
    public getAllMaps(): MapaDto[] {
        return this.allMaps;
    }
    public setAllMaps(maps: MapaDto[]): void {
        this.allMaps = maps;
    }
    public setMaps(maps: Array<{ gridSize: { cols: number; rows: number }; hexRadius: number }>): void {
        this.maps = maps;
    }

    /////////////////////////////////
    // MÉTODOS DE LISTENERS
    /////////////////////////////////

    public async loadInitialMapState(mapaId: number): Promise<void> {
        if (!this.mesaId) return;

        try {
            const estado = await this.mapaService.loadInitialMapState(this.mesaId, mapaId).toPromise();
            if (estado) {
                this.estadosMapa[mapaId] = estado;
                this.phaserGameService.applyMapChanges(estado);
            }
        } catch (error) {
            console.error('Erro ao carregar estado inicial do mapa:', error);
            this.toastr.error('Erro ao carregar estado do mapa');
        }
    }

    // Comunicação entre serviços
    public setPhaserGameService(service: PhaserGameService): void {
        this.phaserGameService = service;
    }

    /////////////////////////////////
    // MÉTODOS DE ESTADO DO MAPA
    /////////////////////////////////

    public getEstadoMapaAtual(): MapaEstadoDto {
        if (!this.currentMapId) {
            throw new Error('Nenhum mapa está carregado atualmente');
        }

        if (!this.estadosMapa[this.currentMapId]) {
            this.estadosMapa[this.currentMapId] = {
                mapaId: this.currentMapId,
                tokens: [], // Garantir que tokens existe e é um array vazio
                configuracoes: {
                    tipoGrid: 'hexagonal',
                    tamanhoCelula: 40,
                    corGrid: '#cccccc',
                    snapToGrid: true
                },
                camadas: [],
                objetos: []
            };
        }

        // Garantir que tokens existe mesmo se o estado já existir
        if (!this.estadosMapa[this.currentMapId].tokens) {
            this.estadosMapa[this.currentMapId].tokens = [];
        }

        return this.estadosMapa[this.currentMapId];
    }

    public getConfiguracoesMapaAtual(): ConfiguracaoMapaDto {
        const estado = this.getEstadoMapaAtual();
        return estado.configuracoes;
    }

    public async atualizarImagemFundo(imagemId: number | null): Promise<void> {
        if (!this.currentMap || !this.mesaId) return;

        try {
            const mapaAtualizado = await this.mapaService.updateBackgroundImage(
                this.mesaId,
                this.currentMap.mapaId,
                imagemId
            ).toPromise();

            // Verificação adicional de tipo
            if (!mapaAtualizado) {
                throw new Error('Mapa atualizado não retornado pelo servidor');
            }

            // Atualiza localmente
            this.currentMap = mapaAtualizado;

            // Verificações antes de chamar os métodos
            if (this.currentMap) {
                this.aplicarConfiguracaoMapa(this.currentMap);
                this.atualizarListaMapasAposSalvar(this.currentMap);
            }

            this.toastr.success('Imagem de fundo atualizada');
        } catch (error) {
            console.error('Erro ao atualizar imagem de fundo:', error);
            this.toastr.error('Erro ao atualizar imagem de fundo');
        }
    }

    public getImagemFundoUrl(): string {
        if (!this.currentMap?.imaFundo) {
            return 'assets/default-bg.jpg';
        }

        // Usa a lógica do ImageService adaptada
        const imagem = this.currentMap.imaFundo;
        if (imagem.imageUrl) return imagem.imageUrl;
        if (imagem.extensao && imagem.dados) {
            return `data:image/${imagem.extensao};base64,${imagem.dados}`;
        }
        return 'assets/default-bg.jpg';
    }

    // Atualiza o estado local e dispara atualização para outros usuários
    public onLocalMapChange(mapState: MapaEstadoDto): void {
        if (!this.currentMapId || !this.currentMap || !this.mesaId) {
            console.warn('Dados incompletos para atualização do mapa');
            return;
        }
        const currentMapId = this.currentMapId;
        const mesaId = this.mesaId;
        const tokensDoMapaAtual = (mapState.tokens || [])
            .filter(token => token?.mapaId === currentMapId);
        if (tokensDoMapaAtual.length === 0 && (mapState.tokens?.length ?? 0) > 0) {
            return;
        }
        const estadoCompleto: MapaEstadoDto = {
            mapaId: currentMapId,
            tokens: tokensDoMapaAtual,
            camadas: mapState.camadas ?? [],
            objetos: mapState.objetos ?? [],
            configuracoes: mapState.configuracoes ?? {
                tipoGrid: 'hexagonal',
                tamanhoCelula: 40,
                corGrid: '#cccccc',
                snapToGrid: true
            }
        };
        this.estadosMapa[currentMapId] = estadoCompleto;
        this.currentMap.estadoJson = JSON.stringify(estadoCompleto);

        this.apiService.salvarEstadoMapa(currentMapId, estadoCompleto).pipe(
            switchMap(() => {
                if (!this.currentMap?.estadoJson) {
                    throw new Error('Estado do mapa inválido após atualização');
                }
                return this.mapaService.sendMapUpdate(
                    mesaId,
                    currentMapId,
                    this.currentMap.estadoJson
                );
            }),
            catchError(err => {
                console.error('Erro na sincronização do mapa:', err);
                return of(null);
            })
        ).subscribe({
            error: (err) => {
                console.error('Erro ao salvar estado do mapa:', err);
                this.toastr.error('Erro ao sincronizar alterações do mapa');
            }
        });
    }

    // Coleta os tokens da cena e salva o estado do mapa
    public saveMapState(mapaId: number, options: { silent?: boolean } = {}): void {
        // Verificação mais segura do currentMap
        if (!this.currentMap?.mapaId || this.currentMap.mapaId !== mapaId || this.configuracoesAbertas) {
            return;
        }

        try {
            if (!this.phaserGame) throw new Error('Jogo Phaser não está disponível');

            const scene = this.phaserGame.scene.scenes[0];
            if (!scene) throw new Error('Cena do Phaser não encontrada');

            // Coleta tokens da cena
            const tokens: TokenDto[] = [];
            scene.children.each(child => {
                if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
                    const tokenData = child.getData('tokenData');
                    if (tokenData?.mapaId === mapaId) {
                        tokens.push(tokenData);
                    }
                }
            });

            const estadoAtual: MapaEstadoDto = {
                mapaId,
                tokens,
                camadas: this.estadosMapa[mapaId]?.camadas || [],
                objetos: this.estadosMapa[mapaId]?.objetos || [],
                configuracoes: this.getConfiguracoesMapaAtual()
            };

            this.apiService.salvarEstadoMapa(mapaId, estadoAtual).pipe(
                switchMap(() => {
                    if (!options.silent) {
                        return this.mapaService.sendMapUpdate(
                            this.mesaId,
                            mapaId,
                            JSON.stringify(estadoAtual)
                        );
                    }
                    return of(null);
                })
            ).subscribe({
                next: () => {
                    // Atualiza o estado local com verificação segura
                    this.estadosMapa[mapaId] = estadoAtual;

                    // Verificação adicional antes de acessar currentMap
                    if (this.currentMap) {
                        this.currentMap.estadoJson = JSON.stringify(estadoAtual);
                    }

                    if (!options.silent) {
                        console.log(`Estado do mapa ${mapaId} salvo e sincronizado`);
                    }
                },
                error: (err) => {
                    console.error(`Erro ao salvar estado do mapa ${mapaId}:`, err);
                    if (!options.silent) {
                        this.toastr.error('Erro ao salvar estado do mapa');
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao salvar estado do mapa:', error);
            if (!options.silent) {
                this.toastr.error('Erro ao salvar estado do mapa');
            }
        }
    }

    // Salva as configurações do mapa com base em ConfiguracaoMapaDto (sem propriedades extras)
    public saveMapConfig(): void {
        if (!this.currentMap || !this.isCriador) return;

        this.isLoading = true;
        const config: MapaConfigDto = {
            nome: this.currentMap.nome,
            largura: this.currentMap.largura,
            altura: this.currentMap.altura,
            tamanhoHex: this.currentMap.tamanhoHex,
            visivel: this.currentMap.visivel
        };

        const mesaId = this.mesaId;
        const mapaId = this.currentMap.mapaId;

        // Obter connectionId do SignalR
        const connectionId = this.mapaService.getConnectionId();
        const headers = connectionId ? new HttpHeaders().set('X-SignalR-ConnectionId', connectionId) : new HttpHeaders();

        this.mapaService.updateMapConfig(mesaId, mapaId, config, headers).subscribe({
            next: () => {
                this.isLoading = false;
                this.toastr.success('Configurações salvas. Sincronizando...');
            },
            error: (err) => {
                console.error('Erro ao salvar:', err);
                this.isLoading = false;
                this.toastr.error('Erro ao salvar configurações');
            }
        });
    }

    public aplicarConfiguracaoMapa(mapa: MapaDto): void {
        if (!this.phaserGameService || !this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Obtenha a configuração ATUALIZADA
        const gridConfig = {
            cols: mapa.largura || 30,
            rows: mapa.altura || 30,
            hexRadius: mapa.tamanhoHex || 40
        };

        // Passe a configuração explicitamente
        this.phaserGameService.drawHexGrid(scene, {
            cols: mapa.largura,
            rows: mapa.altura,
            hexRadius: mapa.tamanhoHex
        });

        // Carrega imagem de fundo se existir
        if (mapa.imaFundo) {
            const textureKey = `mapBackground_${mapa.mapaId}`;
            const imageUrl = this.getImagemFundoUrl(); // método do MapaStateService
            this.phaserGameService.carregarImagemFundoPhaser(scene, textureKey, imageUrl);
        }
    }

    public limparCena(): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Destruir todos os elementos da cena
        scene.children.each(child => {
            if (!(child instanceof Phaser.Cameras.Scene2D.Camera)) {
                child.destroy();
            }
        });

        // Resetar container
        this.gridContainer = null;

        // Recriar elementos essenciais
        this.gridContainer = scene.add.container(0, 0);
        scene.cameras.main.centerOn(0, 0);
    }

    public atualizarListaMapasAposSalvar(mapaAtualizado: MapaDto): void {
        if (!this.allMaps) return;
        if (mapaAtualizado.visivel) {
            this.allMaps = this.allMaps.map(m => ({
                ...m,
                visivel: m.mapaId === mapaAtualizado.mapaId
            }));
        } else {
            this.allMaps = this.allMaps.map(m =>
                m.mapaId === mapaAtualizado.mapaId ? mapaAtualizado : m
            );
        }
        this.currentMap = {
            ...mapaAtualizado,
            imaFundo: this.currentMap?.imaFundo,
            imagemFundo: this.currentMap?.imagemFundo
        };
    }

    public atualizarListaMapas(): void {
        if (!this.mesaId) return;
        this.apiService.getTodosMapasPorMesa(this.mesaId).subscribe({
            next: (mapas) => {
                this.allMaps = mapas;
                const novoMapa = this.allMaps.find(m => m.visivel) || this.allMaps[0];
                if (novoMapa) {
                    this.currentMapId = novoMapa.mapaId;
                    this.carregarMapaInicial(this.currentMapId);
                }
                this.isLoading = false;
            },
            error: (err) => {
                this.toastr.error('Erro ao carregar mapas após exclusão');
                this.isLoading = false;
            }
        });
    }

    public async carregarMapaInicial(mapaId: number): Promise<void> {
        // Não verifica se é criador
        this.clearSelection();
        this.phaserGameService.cleanupTextures();
        this.currentMap = null;
        this.mapaCarregado = false;
        this.currentMapId = mapaId;
        await this.carregarMapa(mapaId);
        // Notificar PhaserGameService da mudança
        if (this.phaserGameService) {
            this.phaserGameService.setCurrentMapData(this.currentMap);
        }
    }

    public async mudarMapaAtual(mapaId: number): Promise<void> {

        this.clearSelection();
        this.phaserGameService.cleanupTextures();
        this.currentMap = null;
        this.mapaCarregado = false;
        this.currentMapId = mapaId;

        await this.carregarMapa(mapaId);

        // Notificar PhaserGameService da mudança
        if (this.phaserGameService) {
            this.phaserGameService.setCurrentMapData(this.currentMap);
        }
    }

    public criarNovoMapa(): void {
        if (!this.isCriador) {
            this.toastr.warning('Apenas o criador da mesa pode adicionar novos mapas');
            return;
        }
        const novoMapa: MapaDto = {
            mapaId: 0,
            mesaId: this.mesaId,
            nome: `Novo Mapa ${this.allMaps.length + 1}`,
            largura: 30,
            altura: 30,
            tamanhoHex: 40,
            estadoJson: '{}',
            ultimaAtualizacao: new Date(),
            visivel: false,
            fundoUrl: ''
        };
        this.apiService.criarMapa(this.mesaId, novoMapa).subscribe({
            next: (mapa) => {
                if (mapa.mapaId) {
                    this.allMaps.push(mapa);
                    this.mudarMapaAtual(mapa.mapaId);
                    this.toastr.success('Novo mapa criado com sucesso!');
                } else {
                    this.toastr.error('O mapa criado não possui um ID válido');
                }
            },
            error: (err) => {
                console.error('Erro ao criar mapa:', err);
                this.toastr.error('Erro ao criar novo mapa');
            }
        });
    }

    public confirmarExclusaoMapa(): void {
        if (!this.currentMapId || this.isCurrentMapVisible()) {
            return;
        }
        const confirmacao = window.confirm(
            'Tem certeza que deseja excluir este mapa permanentemente?\n\nEsta ação não pode ser desfeita.'
        );
        if (confirmacao) {
            this.excluirMapa();
        }
    }

    public excluirMapa(): void {
        if (!this.currentMapId || !this.mesaId) return;
        this.isLoading = true;
        this.apiService.excluirMapa(this.mesaId, this.currentMapId).subscribe({
            next: () => {
                this.toastr.success('Mapa excluído com sucesso');
                this.atualizarListaMapas();
            },
            error: (err) => {
                this.toastr.error(err.message || 'Erro ao excluir mapa');
                this.isLoading = false;
            }
        });
    }

    public updateMapName(newName: string): void {
        if (this.currentMap) {
            this.currentMap.nome = newName;
            this.saveMapConfig();
        }
    }

    public toggleGridControls(): void {
        this.gridControlsVisible = !this.gridControlsVisible;
        this.configuracoesAbertas = this.gridControlsVisible;
        this.toggleMapInteractions(!this.configuracoesAbertas);
    }

    public toggleSnapToGrid(): void {
        try {
            const configuracoes = this.getConfiguracoesMapaAtual();
            configuracoes.snapToGrid = !configuracoes.snapToGrid;
            this.saveMapState(this.currentMapId);
            this.toastr.info(`Snap to grid ${configuracoes.snapToGrid ? 'ativado' : 'desativado'}`);
        } catch (error) {
            console.error('Erro ao alternar snap to grid:', error);
            this.toastr.error('Erro ao alterar configurações do grid');
        }
    }

    // STUBS e métodos auxiliares

    public getCurrentGridConfig(): { cols: number; rows: number; hexRadius: number; visivel?: boolean; } {
        if (this.currentMap) {
            return {
                cols: this.currentMap.largura || 30,
                rows: this.currentMap.altura || 30,
                hexRadius: this.currentMap.tamanhoHex || 40,
                visivel: this.currentMap.visivel || false,
            };
        } else if (this.maps.length > 0 && this.currentMapIndex < this.maps.length) {
            const localMap = this.maps[this.currentMapIndex];
            return {
                cols: localMap.gridSize.cols,
                rows: localMap.gridSize.rows,
                hexRadius: localMap.hexRadius,
                visivel: true
            };
        }
        return { cols: 30, rows: 30, hexRadius: 40, visivel: false };
    }

    private toggleMapInteractions(enable: boolean): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        scene.children.each(child => {
            if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
                child.disableInteractive();

                if (enable) {
                    const tokenData = child.getData('tokenData') as TokenDto;
                    if (this.isCriador || tokenData.donoId === this.usuarioId) {
                        child.setInteractive();
                    }
                }
            }
        });

        // Adiciona/remove classe CSS para feedback visual
        const container = document.querySelector('.game-container');
        if (container) {
            if (enable) {
                container.classList.remove('map-disabled');
            } else {
                container.classList.add('map-disabled');
            }
        }
    }

    private clearSelection(): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Remove qualquer seleção visual
        scene.children.each(child => {
            if (child instanceof Phaser.GameObjects.Sprite && child.getData('selected')) {
                child.clearTint();
                child.setData('selected', false);
            }
        });
    }

    public carregarMapa(mapaId: number): void {
        if (!this.mesaId) return;

        this.clearSelection();
        this.phaserGameService.cleanupTextures();

        this.apiService.getMapaById(this.mesaId, mapaId).subscribe({
            next: (mapa) => {
                this.currentMap = mapa;
                this.currentMapId = mapa.mapaId;
                this.mapaCarregado = true;

                this.phaserGameService.setCurrentMapData(mapa);

                // Carrega estado inicial
                const estadoInicial = mapa.estadoJson
                    ? JSON.parse(mapa.estadoJson)
                    : { tokens: [], configuracoes: this.getConfiguracoesMapaAtual() };

                this.estadosMapa[mapaId] = estadoInicial;
                this.phaserGameService.applyMapChanges(estadoInicial);

                // Desenha o grid
                if (this.phaserGame) {
                    const scene = this.phaserGame.scene.scenes[0];
                    this.phaserGameService.drawHexGrid(scene);
                }
                if (!estadoInicial.tokens) {
                    estadoInicial.tokens = [];
                }

                // Conecta ao grupo do mapa para atualizações em tempo real
                this.mapaService.joinMesaGroup(this.mesaId.toString()).then();
            },
            error: (err) => {
                console.error('Erro ao carregar mapa:', err);
                this.toastr.error('Erro ao carregar o mapa');
            }
        });
    }

    public isCurrentMapVisible(): boolean {
        return this.currentMap ? this.currentMap.visivel : false;
    }

    // Novo: Carregar tokens do mapa
    public carregarTokensMapa(mapaId: number): Observable<TokenDto[]> {
        if (!this.mesaId) return of([]);

        return this.mapaService.getTokensDoMapa(this.mesaId, mapaId).pipe(
            tap(tokens => {
                // Atualiza estado local
                if (!this.estadosMapa[mapaId]) {
                    this.estadosMapa[mapaId] = {
                        mapaId: mapaId, // Adicione esta linha
                        tokens: [],
                        configuracoes: {
                            tipoGrid: 'hexagonal', // Objeto literal em vez de 'new'
                            tamanhoCelula: 40,
                            corGrid: '#cccccc',
                            snapToGrid: true
                        },
                        camadas: [],
                        objetos: []
                    };
                }
                this.estadosMapa[mapaId].tokens = tokens;

                // Envia para o Phaser
                this.phaserGameService.applyMapChanges(this.estadosMapa[mapaId]);
            }),
            catchError(err => {
                console.error('Erro ao carregar tokens:', err);
                return of([]);
            })
        );
    }

    // Novo: Adicionar token
    public adicionarToken(token: TokenDto): Observable<TokenDto> {
        return this.mapaService.addToken(this.mesaId, this.currentMapId, token).pipe(
            tap(novoToken => {
                // Atualização local apenas para o criador
                if (!this.estadosMapa[this.currentMapId].tokens) {
                    this.estadosMapa[this.currentMapId].tokens = [];
                }
                this.estadosMapa[this.currentMapId].tokens.push(novoToken);
            })
        );
    }

    // Novo: Atualizar token
    public atualizarToken(tokenId: string, changes: Partial<TokenDto>): Observable<TokenDto> {
        // Converter para TokenUpdateDto incluindo apenas campos permitidos
        const updateData: TokenUpdateDto = {
            x: changes.x,
            y: changes.y,
            z: changes.z,
            visivelParaTodos: changes.visivelParaTodos,
            bloqueado: changes.bloqueado,
            metadados: changes.metadados
        };

        return this.mapaService.updateToken(
            this.mesaId,
            this.currentMapId,
            tokenId,
            updateData
        ).pipe(
            tap(tokenAtualizado => {
                // Atualiza os metadados corretamente
                if (this.estadosMapa[this.currentMapId]) {
                    const index = this.estadosMapa[this.currentMapId].tokens.findIndex(t => t.id === tokenId);
                    if (index !== -1) {
                        this.estadosMapa[this.currentMapId].tokens[index] = {
                            ...this.estadosMapa[this.currentMapId].tokens[index],
                            ...tokenAtualizado
                        };
                    }
                }
            })
        );
    }

    // Novo: Remover token
    public removerToken(tokenId: string): Observable<void> {
        if (!this.mesaId || !this.currentMapId) return throwError('Mapa não selecionado');

        return this.mapaService.removeToken(
            this.mesaId,
            this.currentMapId,
            tokenId
        ).pipe(
            tap(() => {
                // Atualiza o estado local
                if (this.estadosMapa[this.currentMapId]) {
                    this.estadosMapa[this.currentMapId].tokens =
                        this.estadosMapa[this.currentMapId].tokens.filter(t => t.id !== tokenId);
                }
                this.phaserGameService.removerTokenVisual(tokenId);
            })
        );
    }

    // Novo: Obter token específico
    public getToken(tokenId: string): Observable<TokenDto | null> {
        if (!this.mesaId || !this.currentMapId) return of(null);

        return this.mapaService.getToken(this.mesaId, this.currentMapId, tokenId).pipe(
            catchError(() => of(null))
        );
    }
}
