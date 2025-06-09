// mapa-state.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { MapaEstadoDto, ConfiguracaoMapaDto } from '../../../dtos/mapaEstado.dto';
import { MapaDto } from '../../../dtos/mapa.dto';
import { MapaService } from '../../../services/mapa.service';
import { throwError, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import * as Phaser from 'phaser';
import { TokenDto } from '../../../dtos/mapaEstado.dto';
import { TokenService } from './token.service';

@Injectable({
    providedIn: 'root'
})
export class MapaStateService {
    // Estado interno de mapas
    private estadosMapa: { [mapaId: number]: MapaEstadoDto } = {};

    // Dados externos: estes valores serão definidos via setters
    private currentMapId!: number;
    private currentMap: any = null; // Defina uma interface para o mapa se desejar
    private mesaId!: number;
    private phaserGame!: Phaser.Game;

    private isLoading: boolean = false;
    private mapaCarregado: boolean = false;
    private gridControlsVisible: boolean = false;

    // Para o grid, lista local de configurações
    private maps: Array<{ gridSize: { cols: number; rows: number }; hexRadius: number }> = [
        { gridSize: { cols: 30, rows: 30 }, hexRadius: 40 }
    ];
    private allMaps: MapaDto[] = [];

    // Outras flags
    private configuracoesAbertas: boolean = false;
    private isCriador: boolean = false;
    private currentMapIndex: number = 0;

    constructor(
        private apiService: ApiService,
        private mapaService: MapaService,
        private toastr: ToastrService,
        private tokenService: TokenService
    ) { }

    /* SETTERS para injetar dados externos */
    public setPhaserGame(game: Phaser.Game): void {
        this.phaserGame = game;
    }
    public setCurrentMap(map: any): void {
        this.currentMap = map;
    }
    public setCurrentMapId(mapId: number): void {
        this.currentMapId = mapId;
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
    // MÉTODOS DE ESTADO DO MAPA
    /////////////////////////////////

    public getEstadoMapaAtual(): MapaEstadoDto {
        if (!this.currentMapId) {
            throw new Error('Nenhum mapa está carregado atualmente');
        }
        if (!this.estadosMapa[this.currentMapId]) {
            this.estadosMapa[this.currentMapId] = {
                tokens: [],
                configuracoes: {
                    tipoGrid: 'hexagonal',
                    tamanhoCelula: 40,
                    corGrid: '#cccccc',
                    snapToGrid: true
                }
            };
        }
        return this.estadosMapa[this.currentMapId];
    }

    public getConfiguracoesMapaAtual(): ConfiguracaoMapaDto {
        const estado = this.getEstadoMapaAtual();
        return estado.configuracoes;
    }

    // Aplica as mudanças do estado (tokens) na cena, delegando à TokenService (sem passar a cena)
    public applyMapChanges(mapState: MapaEstadoDto): void {
        if (!this.phaserGame || !this.currentMapId) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Limpa todos os tokens existentes do mapa atual
        scene.children.each(child => {
            if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
                const tokenData = child.getData('tokenData');
                if (tokenData.mapaId === this.currentMapId) {
                    child.destroy();
                }
            }
        });

        // Para cada token do novo estado, delega a criação/instanciação à TokenService
        (mapState.tokens || []).forEach((token: TokenDto) => {
            try {
                if (token.mapaId === this.currentMapId) {
                    const key = `token-${token.id}`;
                    if (scene.textures.exists(key)) {
                        // Chama tokenService sem a cena, pois ja foi configurada internamente
                        this.tokenService.instantiateToken(key, token);
                    } else {
                        this.tokenService.createTokenSprite(key, token);
                    }
                }
            } catch (e) {
                console.error('Erro ao aplicar mudanças no token:', e);
            }
        });
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
    public saveMapState(mapaId: number): void {
        if (!this.currentMap || this.currentMap.mapaId !== mapaId || this.configuracoesAbertas) {
            return;
        }
        try {
            if (!this.phaserGame) {
                throw new Error('Jogo Phaser não está disponível');
            }
            const scene = this.phaserGame.scene.scenes[0];
            if (!scene) {
                throw new Error('Cena do Phaser não encontrada');
            }
            const tokens: TokenDto[] = [];
            scene.children.each(child => {
                const sprite = child as Phaser.GameObjects.Sprite;
                if (sprite && sprite.getData) {
                    const tokenData = sprite.getData('tokenData');
                    if (tokenData?.mapaId === mapaId) {
                        tokens.push(tokenData);
                    }
                }
            });
            const estadoAtual = this.estadosMapa[mapaId] ?? {
                tokens: [],
                configuracoes: {
                    tipoGrid: 'hexagonal',
                    tamanhoCelula: 40,
                    corGrid: '#cccccc',
                    snapToGrid: true
                }
            };
            estadoAtual.tokens = tokens;

            this.apiService.salvarEstadoMapa(mapaId, estadoAtual).pipe(
                switchMap(() => {
                    if (!this.currentMap) {
                        return throwError(() => new Error('CurrentMap é nulo'));
                    }
                    return this.mapaService.sendMapUpdate(
                        this.mesaId,
                        mapaId,
                        JSON.stringify(estadoAtual)
                    );
                })
            ).subscribe({
                next: () => {
                    this.estadosMapa[mapaId] = estadoAtual;
                    if (this.currentMap) {
                        this.currentMap.estadoJson = JSON.stringify(estadoAtual);
                    }
                    console.log(`Estado do mapa ${mapaId} salvo com sucesso`);
                },
                error: (err) => {
                    console.error(`Erro ao salvar estado do mapa ${mapaId}:`, err);
                    this.toastr.error('Erro ao salvar estado do mapa');
                }
            });
        } catch (error) {
            console.error('Erro ao salvar estado do mapa:', error);
            this.toastr.error('Erro ao salvar estado do mapa');
        }
    }

    // Salva as configurações do mapa com base em ConfiguracaoMapaDto (sem propriedades extras)
    public saveMapConfig(): void {
        if (!this.currentMap || !this.isCriador) return;

        this.isLoading = true;
        const gridConfig = this.getCurrentGridConfig();

        const config: ConfiguracaoMapaDto = {
            tipoGrid: this.currentMap.configuracoes?.tipoGrid || gridConfig.tipoGrid || 'hexagonal',
            tamanhoCelula: this.currentMap.configuracoes?.tamanhoCelula || 40,
            corGrid: this.currentMap.configuracoes?.corGrid || '#cccccc',
            snapToGrid: this.currentMap.configuracoes?.snapToGrid ?? true
        };

        const mapaId = this.currentMap.mapaId;
        this.apiService.salvarConfigMapa(mapaId, config).pipe(
            switchMap((mapaAtualizado) => {
                this.aplicarConfiguracaoMapa(config);
                this.atualizarListaMapasAposSalvar(mapaAtualizado);
                if (!this.mesaId) return throwError(() => new Error('ID da mesa não disponível'));
                return this.mapaService.updateMapConfig(
                    this.mesaId,
                    mapaId,
                    config
                );
            })
        ).subscribe({
            next: () => {
                this.isLoading = false;
                this.toastr.success('Configurações salvas e sincronizadas');
            },
            error: (err) => {
                console.error('Erro ao salvar:', err);
                this.isLoading = false;
                this.toastr.error('Erro ao salvar configurações');
            }
        });
    }

    // Aplica as configurações ao modelo local e redesenha o grid
    public aplicarConfiguracaoMapa(config: ConfiguracaoMapaDto): void {
        if (!this.currentMap || !this.phaserGame) {
            console.warn('Mapa ou Phaser não disponível para aplicar configurações');
            return;
        }
        try {
            // Atualiza o modelo local mantendo as propriedades básicas do mapa
            this.currentMap = {
                ...this.currentMap,
                largura: this.currentMap.largura,
                altura: this.currentMap.altura,
                tamanhoHex: this.currentMap.tamanhoHex,
                visivel: this.currentMap.visivel
            };

            if (this.currentMap.estadoJson) {
                const estado = JSON.parse(this.currentMap.estadoJson);
                estado.configuracoes = {
                    ...estado.configuracoes,
                    ...config
                };
                this.currentMap.estadoJson = JSON.stringify(estado);
            }

            const scene = this.phaserGame.scene.scenes[0];
            if (scene) {
                this.drawHexGrid(scene);
                if (config.snapToGrid !== undefined) {
                    scene.children.each(child => {
                        if (child.getData('isMapElement')) {
                            if ('setVisible' in child && typeof child.setVisible === 'function') {
                                child.setVisible(config.snapToGrid);
                            }
                        }
                    });
                }
            }
            console.log('Configurações do mapa aplicadas com sucesso');
        } catch (error) {
            console.error('Erro ao aplicar configurações do mapa:', error);
            this.toastr.error('Erro ao aplicar configurações recebidas');
        }
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
                    this.mudarMapaAtual(this.currentMapId);
                }
                this.isLoading = false;
            },
            error: (err) => {
                this.toastr.error('Erro ao carregar mapas após exclusão');
                this.isLoading = false;
            }
        });
    }

    public mudarMapaAtual(mapaId: number): void {
        if (!this.isCriador) {
            this.toastr.warning('Apenas o criador da mesa pode alterar mapas');
            return;
        }
        this.clearSelection();
        this.cleanupTextures();
        this.currentMap = null;
        this.mapaCarregado = false;
        this.currentMapId = mapaId;
        this.carregarMapa(mapaId);
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

    public updateGridSize(axis: 'cols' | 'rows', value: number): void {
        this.maps[this.currentMapIndex].gridSize[axis] = Math.max(5, Math.min(100, value));
        if (this.phaserGame) {
            this.drawHexGrid(this.phaserGame.scene.scenes[0]);
        }
    }

    public updateHexSize(value: number): void {
        this.maps[this.currentMapIndex].hexRadius = Math.max(10, Math.min(100, value));
        if (this.phaserGame) {
            this.drawHexGrid(this.phaserGame.scene.scenes[0]);
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

    private getCurrentGridConfig(): { cols: number; rows: number; hexRadius: number; tipoGrid?: string } {
        if (this.currentMap) {
            return {
                cols: this.currentMap.largura || 30,
                rows: this.currentMap.altura || 30,
                hexRadius: this.currentMap.tamanhoHex || 40,
                tipoGrid: this.currentMap.configuracoes?.tipoGrid || 'hexagonal'
            };
        } else if (this.maps.length > 0 && this.currentMapIndex < this.maps.length) {
            const localMap = this.maps[this.currentMapIndex];
            return {
                cols: localMap.gridSize.cols,
                rows: localMap.gridSize.rows,
                hexRadius: localMap.hexRadius,
                tipoGrid: 'hexagonal'
            };
        }
        return { cols: 30, rows: 30, hexRadius: 40, tipoGrid: 'hexagonal' };
    }

    private drawHexGrid(scene: Phaser.Scene): void {
        console.log('drawHexGrid() chamado');
    }

    private toggleMapInteractions(enable: boolean): void {
        console.log('toggleMapInteractions() chamado com enable =', enable);
    }

    private clearSelection(): void {
        console.log('clearSelection() chamado');
    }

    private cleanupTextures(): void {
        console.log('cleanupTextures() chamado');
    }

    private carregarMapa(mapaId: number): void {
        console.log('carregarMapa() chamado para mapaId =', mapaId);
    }

    private isCurrentMapVisible(): boolean {
        return this.currentMap ? this.currentMap.visivel : false;
    }
}
