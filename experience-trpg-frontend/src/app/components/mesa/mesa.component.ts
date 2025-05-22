import { Component, OnInit, OnDestroy, AfterViewInit, ComponentFactoryResolver, ViewContainerRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { SessaoService } from '../../services/sessao.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalService } from '../../services/modal.service';
import { FichaDto } from '../../dtos/ficha.dto';
import { ImagemDto } from '../../dtos/imagem.dto';
import { MapaDto } from '../../dtos/mapa.dto';
import { TokenDto, CamadaDto, ObjetoDeMapaDto, ConfiguracaoMapaDto, MapaEstadoDto } from '../../dtos/mapaEstado.dto';
import { Sistema } from '../../models/SistemaModel';
import { FichaStateService } from '../../services/ficha-state.service';

import { FichaDnd5eComponent } from '../fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../fichas/ficha-tormenta20/ficha-tormenta20.component';

// Importações do Phaser
import * as Phaser from 'phaser';

interface HexGridConfig {
  cols: number;
  rows: number;
  hexRadius: number;
  name?: string; // Opcional, apenas para mapas locais
}

@Component({
  selector: 'app-mesa',
  standalone: false,
  templateUrl: './mesa.component.html',
  styleUrls: ['./mesa.component.css']
})
export class MesaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameContainer') gameContainer!: ElementRef;
  phaserGame!: Phaser.Game;
  private config: Phaser.Types.Core.GameConfig;

  configuracoesAbertas = false;
  currentMap: MapaDto | null = null;
  mapaCarregado = false;
  allMaps: MapaDto[] = [];
  currentMapId: number = 0;

  estadosMapa: { [mapaId: number]: MapaEstadoDto } = {};

  isZooming: boolean = false;
  selectedToken: Phaser.GameObjects.Sprite | null = null;
  rotationHandle: Phaser.GameObjects.Arc | null = null;
  resizeHandle: Phaser.GameObjects.Rectangle | null = null;
  resizeHandles: Phaser.GameObjects.Rectangle[] = [];
  selectionRectangle: Phaser.GameObjects.Rectangle | null = null;

  // Tamanho mínimo e máximo para redimensionamento
  readonly MIN_TOKEN_SIZE = 40;
  readonly MAX_TOKEN_SIZE = 20000;

  activeTab: string = 'chat';
  mesaId: number = 0;
  private destroy$ = new Subject<void>();
  usuarioId: number = 0;
  linkConvite: string | null = null; // Link de convite
  isCriador: boolean = false; // Verifica se o usuário é o criador da mesa

  fichas: FichaDto[] = []; // Lista de fichas da mesa
  sistemas: Sistema[] = []; // Lista de sistemas disponíveis
  sistemaMesa: Sistema | null = null; // Sistema da mesa atual
  modalsAbertas: { ficha: FichaDto; modalId: string; top: number; left: number; isDragging: boolean }[] = [];

  imagens: any[] = [];
  selectedFile: File | null = null;
  uploadProgress = 0;
  isUploading = false;

  loadedTabs: { [key: string]: boolean } = {
    chat: false,
    fichas: false,
    imagens: false,
    config: false
  };

  isLoading: boolean = true;
  recursosCarregados = {
    fichas: false,
    chat: false,
    criador: false
  };

  constructor(
    private route: ActivatedRoute,
    private sessaoService: SessaoService,
    private authService: AuthService,
    private apiService: ApiService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef,
    private modalService: ModalService,
    private fichaStateService: FichaStateService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) {
    // Configuração do Phaser
    this.config = {
      type: Phaser.AUTO,
      parent: 'gameContainer',
      backgroundColor: '#1a1a1a', // Fundo escuro
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: {
        preload: this.preload.bind(this),
        create: this.create.bind(this),
        update: this.update.bind(this)
      }
    };
  }

  ngOnInit(): void {
    this.mesaId = +this.route.snapshot.paramMap.get('id')!;
    this.usuarioId = this.authService.getUserId()!;

    // Inicia na aba de fichas durante o carregamento
    this.activeTab = 'fichas';
    this.loadedTabs['fichas'] = true;

    // Inicia o carregamento dos recursos
    this.carregarRecursos();
    this.setupFichaStateSubscription();
  }

  private carregarRecursos(): void {
    // 1. Carrega as fichas primeiro
    this.carregarFichas();

    // 2. Carrega as imagens
    this.carregarImagens();

    // 3. Carrega o mapa mais recente
    this.carregarTodosMapas();

    // 4. Verifica se é criador
    this.verificarCriador();

    // 5. Carrega os sistemas disponíveis
    this.sessaoService.joinMesaGroup(this.mesaId).then(() => {
      this.recursosCarregados.chat = true;
      this.verificarCarregamentoCompleto();

      // Inscreva-se para atualizações do mapa
      this.sessaoService.getMapUpdateObservable().subscribe(({ mapId, mapState }) => {
        // Aplica apenas se for o mapa atual
        if (this.currentMapId === mapId) {
          const parsedState = typeof mapState === 'string' ? JSON.parse(mapState) : mapState;
          this.applyMapChanges(parsedState);
        }
      });
    }).catch(error => {
      console.error('Erro ao conectar ao hub de sessão:', error);
      this.recursosCarregados.chat = true;
      this.verificarCarregamentoCompleto();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.cleanupTextures();

    // Destrói o jogo Phaser quando o componente é destruído
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
    }

    this.sessaoService.leaveMesaGroup(this.mesaId.toString());
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.loadedTabs[tab] = true;
  }

  ngAfterViewInit(): void {
    // Inicializa o jogo Phaser quando a view estiver pronta
    this.initializePhaserGame();
  }

  // Método para sanitizar o HTML
  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private carregarTodosMapas(): void {
    this.apiService.getTodosMapasPorMesa(this.mesaId).subscribe({
      next: (mapas) => {
        // Garante que apenas um mapa está marcado como visível
        let mapaVisivelEncontrado = false;
        this.allMaps = mapas.map(mapa => {
          if (mapa.visivel) {
            if (mapaVisivelEncontrado) {
              // Se já encontramos um mapa visível, marca este como não visível
              mapa.visivel = false;
            } else {
              mapaVisivelEncontrado = true;
            }
          }
          return mapa;
        });

        const mapaAtual = mapas.find(m => m.visivel) || mapas[0];
        this.currentMapId = mapaAtual?.mapaId ?? 0;

        if (this.currentMapId !== 0) {
          this.carregarMapa(this.currentMapId);
        } else {
          this.toastr.error('Nenhum mapa válido encontrado');
        }
      },
      error: (err) => console.error('Erro ao carregar mapas:', err)
    });
  }

  // Carrega as fichas da mesa
  carregarFichas(): void {
    this.apiService.getFichasPorMesa(this.mesaId).subscribe(
      (data: FichaDto[]) => {
        this.fichas = data;
        this.recursosCarregados.fichas = true;
        this.verificarCarregamentoCompleto();
      },
      (error) => {
        console.error('Erro ao carregar fichas:', error);
        this.recursosCarregados.fichas = true; // Prossegue mesmo com erro
        this.verificarCarregamentoCompleto();
      }
    );
  }

  private setupFichaStateSubscription(): void {
    this.fichaStateService.ficha$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(fichaAtualizada => {
      if (fichaAtualizada) {
        // Atualiza a ficha na lista de fichas
        const index = this.fichas.findIndex(f => f.fichaId === fichaAtualizada.fichaId);
        if (index !== -1) {
          this.fichas[index] = { ...this.fichas[index], ...fichaAtualizada };
        }

        // Atualiza a ficha nas modais abertas
        this.modalsAbertas.forEach(modal => {
          if (modal.ficha.fichaId === fichaAtualizada.fichaId) {
            modal.ficha = { ...modal.ficha, ...fichaAtualizada };
          }
        });
      }
    });
  }

  // Método para carregar imagens
  carregarImagens(): void {
    this.apiService.getImagensPorMesa(this.mesaId).subscribe({
      next: (imagens: ImagemDto[]) => {
        // Usa imageUrl diretamente se existir, caso contrário cria URL de dados
        this.imagens = imagens.map(img => ({
          ...img,
          url: img.imageUrl || this.createImageUrl(img)
        }));
      },
      error: (error) => console.error('Erro ao carregar imagens:', error)
    });
  }

  // Método auxiliar para criar URL de dados se necessário
  private createImageUrl(img: ImagemDto): string {
    if (img.dados && img.extensao) {
      return `data:image/${img.extensao};base64,${img.dados}`;
    }
    return ''; // Ou uma URL de imagem padrão
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadImagem(); // Envia automaticamente
      event.target.value = ''; // Limpa o input para permitir novo upload do mesmo arquivo
    }
  }

  // Método para upload simplificado
  uploadImagem(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('mesaId', this.mesaId.toString());

    this.apiService.uploadImagem(formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event.type === HttpEventType.Response) {
          const novaImagem = {
            ...event.body,
            url: event.body.imageUrl // Usar a URL retornada
          };
          this.imagens.unshift(novaImagem); // Armazenando a nova imagem com URL e Dados
          this.resetUpload();
        }
      },
      error: (error) => {
        console.error('Erro no upload:', error);
        this.resetUpload();
      }
    });
  }

  // Método para atualizar o nome da imagem
  atualizarNomeImagem(img: ImagemDto, event: FocusEvent): void {
    const novoNome = (event.target as HTMLElement).textContent?.trim() || img.nome;

    if (novoNome === img.nome) return;

    // Crie um objeto ImagemDto completo para enviar
    const imagemAtualizada: ImagemDto = {
      ...img,
      nome: novoNome
    };

    this.apiService.updateImagem(img.imagemId, imagemAtualizada).subscribe({
      next: (imagemAtualizada) => {
        img.nome = imagemAtualizada.nome;
        this.toastr.success('Nome da imagem atualizado com sucesso');
      },
      error: (error) => {
        console.error('Erro:', error);
        (event.target as HTMLElement).textContent = img.nome;

        if (error.status === 400) {
          this.toastr.error('Dados inválidos para atualização');
        } else if (error.status === 404) {
          this.toastr.error('Imagem não encontrada');
        } else {
          this.toastr.error('Erro ao atualizar nome da imagem');
        }
      }
    });
  }

  deletarImagem(imagemId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (confirm('Tem certeza que deseja excluir esta imagem?')) {
      this.apiService.deleteImagem(imagemId).subscribe({
        next: () => {
          this.imagens = this.imagens.filter(img => img.imagemId !== imagemId);
          this.toastr.success('Imagem excluída com sucesso');
        },
        error: (error) => {
          console.error('Erro ao excluir imagem:', error);
          this.toastr.error('Erro ao excluir imagem');
        }
      });
    }
  }

  private resetUpload(): void {
    this.isUploading = false;
    this.uploadProgress = 0;
    this.selectedFile = null;
  }

  private verificarCarregamentoCompleto(): void {
    console.log('Estado do carregamento:', this.recursosCarregados);

    if (this.recursosCarregados.fichas &&
      this.recursosCarregados.chat &&
      this.recursosCarregados.criador) {

      console.log('Todos os recursos carregados, mudando para chat...');

      setTimeout(() => {
        this.activeTab = 'chat';
        this.loadedTabs['chat'] = true;
        this.isLoading = false;
      }, 100);
    }
  }

  atualizarFichaNaMesa(ficha: FichaDto): void {
    // Atualiza a ficha na lista de fichas abertas
    for (let modal of this.modalsAbertas) {
      if (modal.ficha.fichaId === ficha.fichaId) {
        modal.ficha.nome = ficha.nome; // Atualiza o nome na modal
        break; // Saia do loop após encontrar
      }
    }
  }

  // Adiciona uma nova ficha
  adicionarFicha(): void {
    this.apiService.criarFicha(this.mesaId).subscribe(
      (data: FichaDto) => {
        this.fichas.push(data); // Adiciona a nova ficha à lista
      },
      (error) => {
        console.error('Erro ao criar ficha:', error);
      }
    );
  }

  // no seu MesaComponent.ts
  getComponenteFicha(sistemaId: number): any {
    switch (sistemaId) {
      case 1:
        return FichaDnd5eComponent; // ID de D&D 5E
      case 2:
        return FichaTormenta20Component; // ID de Tormenta 20
      default:
        return null;
    }
  }

  // Função para lidar com a abertura da modal da ficha
  abrirFicha(ficha: FichaDto): void {
    // Notifica o serviço de estado sobre a ficha que está sendo aberta
    this.fichaStateService.updateFicha(ficha);

    // Verifica se a ficha já está aberta
    const fichaAberta = this.modalsAbertas.find(m => m.ficha.fichaId === ficha.fichaId);

    if (fichaAberta) {
      // Se já está aberta, traz para frente
      this.modalsAbertas = this.modalsAbertas.filter(m => m.modalId !== fichaAberta.modalId);
      this.modalsAbertas.push(fichaAberta);
      return;
    }

    const modalId = `modal-${ficha.fichaId}`;
    const novaModal = {
      ficha,
      modalId,
      top: 50 + (this.modalsAbertas.length * 20),
      left: 50 + (this.modalsAbertas.length * 20),
      isDragging: false
    };

    this.modalsAbertas.push(novaModal);

    const componenteFicha = this.getComponenteFicha(ficha.sistemaId);
    if (componenteFicha) {
      const modalComponent = this.componentFactoryResolver.resolveComponentFactory(componenteFicha);
      const componentRef = this.viewContainerRef.createComponent(modalComponent);

      if (componentRef.instance instanceof FichaDnd5eComponent) {
        componentRef.instance.fichaId = ficha.fichaId;
        this.modalService.open(componentRef.instance);
      }
    }
  }

  fecharModal(modalId: string): void {
    this.modalsAbertas = this.modalsAbertas.filter(m => m.modalId !== modalId); // Remove a modal da lista
  }

  iniciarArrastar(event: MouseEvent, modalId: string): void {
    const modal = this.modalsAbertas.find(m => m.modalId === modalId);
    if (modal) {
      modal.isDragging = true;
      const offsetX = event.clientX - modal.left;
      const offsetY = event.clientY - modal.top;

      const moverModal = (e: MouseEvent) => {
        if (modal.isDragging) {
          // Calcular nova posição
          let newLeft = e.clientX - offsetX;
          let newTop = e.clientY - offsetY;

          // Obter dimensões da modal
          const modalWidth = 300; // Largura padrão
          const modalHeight = 200; // Altura padrão (ajuste conforme necessário)
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          // Restringir a nova posição
          if (newTop < 0) {
            newTop = 0; // Limita a parte superior
          } else if (newTop + modalHeight > windowHeight) {
            newTop = windowHeight - modalHeight; // Limita a parte inferior
          }

          if (newLeft < 0) {
            newLeft = 0; // Limita a parte esquerda
          } else if (newLeft + modalWidth > windowWidth) {
            newLeft = windowWidth - modalWidth; // Limita a parte direita
          }

          // Atualizar a posição da modal
          modal.left = newLeft;
          modal.top = newTop;
        }
      };

      const pararArrastar = () => {
        modal.isDragging = false;
        document.removeEventListener('mousemove', moverModal);
        document.removeEventListener('mouseup', pararArrastar);
      };

      document.addEventListener('mousemove', moverModal);
      document.addEventListener('mouseup', pararArrastar);
    }
  }

  // Verifica se o usuário é o criador da mesa
  verificarCriador(): void {
    const usuarioId = this.authService.getUserId();
    this.apiService.getMesaPorId(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (mesa: any) => {
          this.isCriador = mesa.criadorId === usuarioId;
          if (this.isCriador) {
            this.obterLinkConvite();
          }
          this.recursosCarregados.criador = true;
          this.verificarCarregamentoCompleto();
        },
        (error) => {
          console.error('Erro ao carregar dados da mesa:', error);
          this.recursosCarregados.criador = true; // Prossegue mesmo com erro
          this.verificarCarregamentoCompleto();
        }
      );
  }

  // Obtém o link de convite da mesa
  obterLinkConvite(): void {
    this.apiService.getConvitePorMesaId(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (token: string) => {
          this.linkConvite = `http://localhost:4200/mesa/${this.mesaId}/convite/${token}`;
        },
        (error) => {
          console.error('Erro ao obter convite:', error);
        }
      );
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Texto copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar o texto: ', err);
    });
  }

  currentMapIndex = 0;
  maps = [
    { name: 'Mapa Principal', gridSize: { cols: 30, rows: 30 }, hexRadius: 40 }
  ];
  gridControlsVisible = false;

  // Atualize o método initializePhaserGame
  initializePhaserGame(): void {
    if (!this.phaserGame) {
      this.phaserGame = new Phaser.Game({
        ...this.config,
        parent: this.gameContainer.nativeElement
      });

      // Se o mapa já foi carregado, atualiza o Phaser
      if (this.mapaCarregado && this.currentMap) {
        this.updatePhaserMap();
      }
    }
  }

  // Método para trocar de mapa
  changeCurrentMap() {
    this.drawHexGrid(this.phaserGame.scene.scenes[0]);
  }

  preload() {

  }

  create() {
    const scene = this.phaserGame.scene.scenes[0];

    // Configuração do grid hexagonal
    this.drawHexGrid(scene);

    // Configura controles da câmera
    this.setupCameraControls(scene);

    // Configura redimensionamento
    scene.scale.on('resize', () => {
      this.drawHexGrid(scene);
    });
  }

  public drawHexGrid(scene: Phaser.Scene) {
    // Limpa qualquer elemento anterior do grid de forma mais abrangente
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Graphics ||
        child instanceof Phaser.GameObjects.Text ||
        (child instanceof Phaser.GameObjects.Sprite && child.getData('gridElement'))) {
        child.destroy();
      }
    });

    const graphics = scene.add.graphics().setData('gridElement', true);

    const gridConfig = this.getCurrentGridConfig();
    const hexRadius = gridConfig.hexRadius;
    const cols = gridConfig.cols;
    const rows = gridConfig.rows;

    // Desenha o grid sem os textos de coordenadas
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let xPos = x * hexRadius * Math.sqrt(3);
        const yPos = y * hexRadius * 1.5;

        if (y % 2 !== 0) {
          xPos += (hexRadius * Math.sqrt(3)) / 2;
        }

        graphics.fillStyle(0x2d2d2d, 0.3);
        this.drawHexagon(graphics, xPos, yPos, hexRadius, true);

        graphics.lineStyle(2, 0x555555, 1);
        this.drawHexagon(graphics, xPos, yPos, hexRadius, false);
      }
    }

    // Atualiza os limites da câmera
    const mapWidth = cols * hexRadius * Math.sqrt(3);
    const mapHeight = rows * hexRadius * 1.5;
    const padding = Math.min(mapWidth, mapHeight) * 0.5;
    scene.cameras.main.setBounds(-padding, -padding, mapWidth + padding * 2, mapHeight + padding * 2);
  }

  private getCurrentGridConfig(): HexGridConfig {
    if (this.currentMap) {
      // Usando o MapaDto
      return {
        cols: this.currentMap.largura,
        rows: this.currentMap.altura,
        hexRadius: this.currentMap.tamanhoHex
      };
    } else if (this.maps.length > 0 && this.currentMapIndex < this.maps.length) {
      // Usando o mapa local
      const localMap = this.maps[this.currentMapIndex];
      return {
        cols: localMap.gridSize.cols,
        rows: localMap.gridSize.rows,
        hexRadius: localMap.hexRadius
      };
    }

    // Retorno padrão caso não haja mapas
    return {
      cols: 30,
      rows: 30,
      hexRadius: 40
    };
  }

  private drawHexagon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, fill: boolean) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI / 3) - Math.PI / 6;
      points.push({
        x: x + radius * Math.cos(angle),
        y: y + radius * Math.sin(angle)
      });
    }

    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }

    graphics.closePath();

    if (fill) {
      graphics.fillPath();
    } else {
      graphics.strokePath();
    }
  }

  /**
 * Converte coordenadas de tela (x,y) para coordenadas de grid hexagonal (col, row)
 */
  private screenToHexGrid(x: number, y: number, hexRadius: number): { col: number, row: number } {
    const size = hexRadius;
    const q = (x * Math.sqrt(3) / 3 - y / 3) / size;
    const r = y * 2 / 3 / size;

    // Convert to axial coordinates
    const axial = this.cubeToAxial(this.roundCube(this.axialToCube(q, r)));

    return {
      col: axial.q,
      row: axial.r
    };
  }

  /**
   * Converte coordenadas de grid hexagonal (col, row) para coordenadas de tela (x,y)
   */
  private hexGridToScreen(col: number, row: number, hexRadius: number): { x: number, y: number } {
    const size = hexRadius;
    const x = size * Math.sqrt(3) * (col + row / 2);
    const y = size * 3 / 2 * row;

    return { x, y };
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

  private getEstadoMapaAtual(): MapaEstadoDto {
    if (!this.currentMapId) {
      throw new Error('Nenhum mapa está carregado atualmente');
    }

    // Se não existir estado para o mapa atual, cria um novo com valores padrão
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

  private getConfiguracoesMapaAtual(): ConfiguracaoMapaDto {
    const estado = this.getEstadoMapaAtual();
    return estado.configuracoes;
  }

  // Funções auxiliares para conversão entre sistemas de coordenadas hexagonais
  private axialToCube(q: number, r: number): { q: number, r: number, s: number } {
    return {
      q: q,
      r: r,
      s: -q - r
    };
  }

  private cubeToAxial(cube: { q: number, r: number, s: number }): { q: number, r: number } {
    return {
      q: cube.q,
      r: cube.r
    };
  }

  private roundCube(cube: { q: number, r: number, s: number }): { q: number, r: number, s: number } {
    let q = Math.round(cube.q);
    let r = Math.round(cube.r);
    let s = Math.round(cube.s);

    const qDiff = Math.abs(q - cube.q);
    const rDiff = Math.abs(r - cube.r);
    const sDiff = Math.abs(s - cube.s);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    } else {
      s = -q - r;
    }

    return { q, r, s };
  }

  update() {
    // Lógica de atualização do jogo
  }

  public removeCurrentMap() {
    if (this.maps.length > 1) {
      this.maps.splice(this.currentMapIndex, 1);
      this.currentMapIndex = Math.min(this.currentMapIndex, this.maps.length - 1);
      this.drawHexGrid(this.phaserGame.scene.scenes[0]);
    }
  }

  // Atualiza o nome do mapa
  updateMapName(newName: string) {
    if (this.currentMap) {
      this.currentMap.nome = newName;
      this.saveMapConfig();
    }
  }

  public updateGridSize(axis: 'cols' | 'rows', value: number) {
    this.maps[this.currentMapIndex].gridSize[axis] = Math.max(5, Math.min(100, value));
    this.drawHexGrid(this.phaserGame.scene.scenes[0]);
  }

  public updateHexSize(value: number) {
    this.maps[this.currentMapIndex].hexRadius = Math.max(10, Math.min(100, value));
    this.drawHexGrid(this.phaserGame.scene.scenes[0]);
  }

  public toggleGridControls(): void {
    this.gridControlsVisible = !this.gridControlsVisible;
    this.configuracoesAbertas = this.gridControlsVisible;

    // Desabilita/habilita interações com o mapa
    this.toggleMapInteractions(!this.configuracoesAbertas);
  }

  private toggleMapInteractions(enable: boolean): void {
    if (!this.phaserGame) return;

    const scene = this.phaserGame.scene.scenes[0];
    if (!scene) return;

    // Ativa/desativa todos os tokens
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
        child.disableInteractive();

        if (enable) {
          // Habilita interação apenas para tokens do usuário ou se for criador
          const tokenData = child.getData('tokenData') as TokenDto;
          if (this.isCriador || tokenData.donoId === this.usuarioId) {
            child.setInteractive();
          }
        }
      }
    });

    // Adiciona/remove classe CSS para feedback visual
    const container = this.gameContainer.nativeElement;
    if (enable) {
      container.classList.remove('map-disabled');
    } else {
      container.classList.add('map-disabled');
    }
  }

  zoomPercentual: number = 100; // Valor inicial em 100%
  readonly ZOOM_MINIMO: number = 20;
  readonly ZOOM_MAXIMO: number = 250;
  readonly ZOOM_INCREMENTO: number = 10;

  public zoomIn(): void {
    if (this.isZooming) return;

    const novoZoom = Math.min(this.zoomPercentual + this.ZOOM_INCREMENTO, this.ZOOM_MAXIMO);
    this.aplicarZoom(novoZoom);
  }

  public zoomOut(): void {
    if (this.isZooming) return;

    const novoZoom = Math.max(this.zoomPercentual - this.ZOOM_INCREMENTO, this.ZOOM_MINIMO);
    this.aplicarZoom(novoZoom);
  }

  private aplicarZoom(novoZoomPercentual: number): void {
    if (!this.phaserGame || this.isZooming) return;

    this.isZooming = true;
    const scene = this.phaserGame.scene.scenes[0];
    const camera = scene.cameras.main;

    // Converte porcentagem para fator de zoom (100% = 1.0)
    const novoZoomFator = novoZoomPercentual / 100;

    camera.zoomTo(novoZoomFator, 200, 'Power2', true, (camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.isZooming = false;
      }
      this.zoomPercentual = Math.round(camera.zoom * 100);
    });
  }

  private resetZoom(): void {
    if (!this.phaserGame) return;

    const scene = this.phaserGame.scene.scenes[0];
    const camera = scene.cameras.main;

    camera.zoomTo(1, 200, 'Power2', true, () => {
      this.zoomPercentual = 100;
      this.isZooming = false;
    });
  }

  readonly ZOOM_SENSITIVITY: number = 1;

  private setupCameraControls(scene: Phaser.Scene) {
    // Configurações iniciais da câmera
    const mapWidth = this.maps[this.currentMapIndex].gridSize.cols * this.maps[this.currentMapIndex].hexRadius * Math.sqrt(3);
    const mapHeight = this.maps[this.currentMapIndex].gridSize.rows * this.maps[this.currentMapIndex].hexRadius * 1.5;
    const padding = 500;
    scene.cameras.main.setBounds(-padding, -padding, mapWidth + padding * 2, mapHeight + padding * 2);

    // Configura zoom inicial para 100%
    scene.cameras.main.zoom = 1;
    this.zoomPercentual = 100;

    // Controle de arraste (mantido igual)
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    const dragThreshold = 5;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.configuracoesAbertas) return;
      if (pointer.leftButtonDown()) {
        // Verifica se clicou em um objeto interativo
        const hitObjects = scene.input.hitTestPointer(pointer);

        // Se não clicou em nada interativo ou clicou no grid, limpa a seleção
        if (hitObjects.length === 0 ||
          (hitObjects.length === 1 && hitObjects[0] instanceof Phaser.GameObjects.Graphics)) {
          this.clearSelection();
        }
      }

      if (pointer.rightButtonDown()) {
        isDragging = false;
        lastX = pointer.x;
        lastY = pointer.y;
        this.gameContainer.nativeElement.classList.add('grabbing');
      }
    });

    scene.input.on('pointerup', () => {
      isDragging = false;
      this.gameContainer.nativeElement.classList.remove('grabbing');
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.configuracoesAbertas) return;
      if (pointer.rightButtonDown()) {
        if (!isDragging && (Math.abs(pointer.x - lastX) > dragThreshold ||
          Math.abs(pointer.y - lastY) > dragThreshold)) {
          isDragging = true;
        }

        if (isDragging) {
          const camera = scene.cameras.main;
          camera.scrollX -= (pointer.x - lastX) / camera.zoom;
          camera.scrollY -= (pointer.y - lastY) / camera.zoom;
          lastX = pointer.x;
          lastY = pointer.y;
        }
      }
    });
  }

  private carregarMapa(mapaId: number): void {
    // 1. Limpeza completa do estado anterior
    this.clearSelection();
    this.cleanupTextures();

    this.apiService.getMapaById(this.mesaId, mapaId).subscribe({
      next: (mapa) => {
        // 2. Atualiza o estado com o novo mapa
        this.currentMap = mapa;
        this.currentMapId = mapa.mapaId;
        this.mapaCarregado = true;

        // 3. Inicializa um estado vazio se não existir
        if (!this.estadosMapa[mapaId]) {
          this.estadosMapa[mapaId] = {
            tokens: [],
            configuracoes: {
              tipoGrid: 'hexagonal',
              tamanhoCelula: 40,
              corGrid: '#cccccc',
              snapToGrid: true
            }
          };
        }

        // 4. Carrega o estado do mapa se existir
        if (mapa.estadoJson) {
          try {
            const estado = JSON.parse(mapa.estadoJson) as MapaEstadoDto;
            this.estadosMapa[mapaId] = estado;
          } catch (e) {
            console.error('Erro ao parsear estado do mapa:', e);
          }
        }

        // 5. Redesenha o grid hexagonal
        if (this.phaserGame) {
          const scene = this.phaserGame.scene.scenes[0];
          this.drawHexGrid(scene);

          // 6. Aplica o estado do mapa atual (incluindo tokens)
          this.applyMapChanges(this.estadosMapa[mapaId]);
        }

        // 7. Carrega tokens adicionais do servidor se necessário
        this.carregarTokensDoServidor();
      },
      error: (err) => {
        console.error('Erro ao carregar mapa:', err);
        this.toastr.error('Erro ao carregar o mapa');
      }
    });
  }

  private carregarTokensDoServidor(): void {
    if (!this.currentMapId) return;

    this.apiService.getTokensDoMapa(this.mesaId, this.currentMapId).subscribe({
      next: (estado: MapaEstadoDto) => {
        if (estado.tokens && estado.tokens.length > 0) {
          // Atualiza o estado local apenas com os tokens do mapa atual
          const estadoAtual = this.estadosMapa[this.currentMapId] || {
            tokens: [],
            configuracoes: {
              tipoGrid: 'hexagonal',
              tamanhoCelula: 40,
              corGrid: '#cccccc',
              snapToGrid: true
            }
          };

          // Mantém configurações existentes, apenas atualiza tokens
          estadoAtual.tokens = estado.tokens;
          this.estadosMapa[this.currentMapId] = estadoAtual;

          // Aplica as mudanças
          this.applyMapChanges(estadoAtual);
        }
      },
      error: (err) => console.error('Erro ao carregar tokens:', err)
    });
  }

  private updatePhaserMap(): void {
    if (!this.phaserGame || !this.currentMap) return;

    const scene = this.phaserGame.scene.scenes[0];
    if (!scene) return;

    // Atualiza o mapa local correspondente
    const mapIndex = this.maps.findIndex(m => m.name === this.currentMap?.nome);
    if (mapIndex === -1) {
      this.maps.push({
        name: this.currentMap.nome,
        gridSize: {
          cols: this.currentMap.largura,
          rows: this.currentMap.altura
        },
        hexRadius: this.currentMap.tamanhoHex
      });
      this.currentMapIndex = this.maps.length - 1;
    } else {
      this.maps[mapIndex] = {
        name: this.currentMap.nome,
        gridSize: {
          cols: this.currentMap.largura,
          rows: this.currentMap.altura
        },
        hexRadius: this.currentMap.tamanhoHex
      };
      this.currentMapIndex = mapIndex;
    }

    this.drawHexGrid(scene);

    if (this.currentMap.estadoJson) {
      try {
        const estado = JSON.parse(this.currentMap.estadoJson);
        this.applyMapChanges(estado);
      } catch (e) {
        console.error('Erro ao parsear estado do mapa:', e);
      }
    }
  }

  private applyMapChanges(mapState: MapaEstadoDto): void {
    if (!this.phaserGame || !this.currentMapId) return;

    const scene = this.phaserGame.scene.scenes[0];
    if (!scene) return;

    // 1. Limpa todos os tokens existentes do mapa atual
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
        const tokenData = child.getData('tokenData');
        if (tokenData.mapaId === this.currentMapId) {
          child.destroy();
        }
      }
    });

    // 2. Carrega os tokens do novo mapa
    (mapState.tokens || []).forEach((token: TokenDto) => {
      try {
        if (token.mapaId === this.currentMapId) {
          const key = `token-${token.id}`;

          // Verifica se a textura já está carregada
          if (scene.textures.exists(key)) {
            this.instantiateToken(scene, key, token);
          } else {
            // Carrega a textura primeiro
            this.createTokenSprite(scene, key, token);
          }
        }
      } catch (e) {
        console.error('Erro ao aplicar mudanças no token:', e);
      }
    });
  }

  private createTokenSprite(scene: Phaser.Scene, textureKey: string, token: TokenDto): void {
    try {
      // Verifica se a textura já existe e está pronta
      if (scene.textures.exists(textureKey)) {
        const texture = scene.textures.get(textureKey);
        if (texture && texture.source.length > 0) {
          this.instantiateToken(scene, textureKey, token);
          return;
        }
      }

      // Carrega a textura com tratamento de erro
      const onLoad = () => {
        scene.load.off(`filecomplete-image-${textureKey}`, onLoad);
        this.instantiateToken(scene, textureKey, token);
      };

      const onError = () => {
        scene.load.off(`loaderror-image-${textureKey}`, onError);
        console.error(`Falha ao carregar textura: ${textureKey}`);
      };

      scene.load.once(`filecomplete-image-${textureKey}`, onLoad);
      scene.load.once(`loaderror-image-${textureKey}`, onError);

      if (token.imagemDados.startsWith('http') || token.imagemDados.startsWith('data:')) {
        scene.load.image(textureKey, token.imagemDados);
      } else {
        scene.textures.addBase64(textureKey, token.imagemDados);
      }

      scene.load.start();
    } catch (error) {
      console.error('Erro ao criar token:', error);
    }
  }

  private instantiateToken(scene: Phaser.Scene, textureKey: string, token: TokenDto): void {
    const sprite = scene.add.sprite(token.x, token.y, textureKey)
      .setInteractive()
      .setData('tokenData', token)
      .setDisplaySize(token.metadados?.width || 80, token.metadados?.height || 80)
      .setDepth(token.z || 1);

    // Desativa interação se configurações estiverem abertas
    if (this.configuracoesAbertas) {
      sprite.disableInteractive();
    }

    // Adiciona rotação se existir nos metadados
    if (token.metadados?.rotation) {
      sprite.setAngle(token.metadados.rotation);
    }

    // Configura interação de clique
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.selectToken(sprite);
      }
    });

    if (this.isCriador || token.donoId === this.usuarioId) {
      scene.input.setDraggable(sprite);
      this.setupTokenDrag(scene, sprite, token);
    }
  }

  private selectToken(token: Phaser.GameObjects.Sprite): void {
    const scene = this.phaserGame.scene.scenes[0];

    // Remove a seleção anterior
    this.clearSelection();

    // Define o token selecionado
    this.selectedToken = token;

    // Cria um retângulo de seleção
    this.selectionRectangle = scene.add.rectangle(
      token.x,
      token.y,
      token.displayWidth + 20,
      token.displayHeight + 20
    )
      .setStrokeStyle(2, 0x0066cc) // Azul (#0066cc)
      .setFillStyle(0, 0)
      .setDepth(token.depth + 1);

    // Adiciona alça de rotação (círculo no topo)
    this.rotationHandle = scene.add.circle(
      token.x,
      token.y - token.displayHeight / 2 - 20,
      10,
      0x0066cc // Azul (#0066cc)
    )
      .setDepth(token.depth + 2)
      .setInteractive({ cursor: 'pointer' });

    // Adiciona alça de redimensionamento (apenas no canto inferior direito)
    this.resizeHandle = scene.add.rectangle(
      token.x + token.displayWidth / 2 + 10,
      token.y + token.displayHeight / 2 + 10,
      15,
      15,
      0x0066cc // Azul (#0066cc)
    )
      .setDepth(token.depth + 2)
      .setInteractive({ cursor: 'nwse-resize' });

    // Configura interação para rotação
    this.setupRotationHandle(scene);

    // Configura interação para redimensionamento
    this.setupResizeHandle(scene);

    // Adiciona feedback visual
    token.setTint(0xcccccc); // Leve escurecimento do token selecionado
  }

  private setupResizeHandles(scene: Phaser.Scene): void {
    if (!this.resizeHandles || !this.selectedToken) return;

    let startWidth = 0;
    let startHeight = 0;
    let startPointerX = 0;
    let startPointerY = 0;
    let activeHandleIndex = -1;

    // Configura evento pointerdown para todas as alças
    this.resizeHandles.forEach((handle, index) => {
      handle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        activeHandleIndex = index;
        startWidth = this.selectedToken!.displayWidth;
        startHeight = this.selectedToken!.displayHeight;
        startPointerX = pointer.x;
        startPointerY = pointer.y;
      });
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && activeHandleIndex !== -1) {
        const deltaX = pointer.x - startPointerX;
        const deltaY = pointer.y - startPointerY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        // Determina qual alça está sendo usada e como redimensionar
        switch (activeHandleIndex) {
          case 0: // Topo
            newHeight = startHeight - deltaY * 2;
            break;
          case 1: // Direita
            newWidth = startWidth + deltaX * 2;
            break;
          case 2: // Baixo
            newHeight = startHeight + deltaY * 2;
            break;
          case 3: // Esquerda
            newWidth = startWidth - deltaX * 2;
            break;
        }

        // Mantém a proporção original (shift pressionado)
        if (pointer.event.shiftKey) {
          const aspectRatio = startWidth / startHeight;
          if (activeHandleIndex === 0 || activeHandleIndex === 2) { // Topo ou Baixo
            newWidth = newHeight * aspectRatio;
          } else { // Direita ou Esquerda
            newHeight = newWidth / aspectRatio;
          }
        }

        // Limita o tamanho
        newWidth = Phaser.Math.Clamp(newWidth, this.MIN_TOKEN_SIZE, this.MAX_TOKEN_SIZE);
        newHeight = Phaser.Math.Clamp(newHeight, this.MIN_TOKEN_SIZE, this.MAX_TOKEN_SIZE);

        this.selectedToken!.setDisplaySize(newWidth, newHeight);

        // Atualiza a posição das alças de redimensionamento
        this.updateResizeHandles();

        // Atualiza o retângulo de seleção
        this.updateSelectionRectangle();
      }
    });

    scene.input.on('pointerup', () => {
      activeHandleIndex = -1;
      this.saveTokenState();
    });
  }

  private updateResizeHandles(): void {
    if (!this.selectedToken || !this.resizeHandles) return;

    const halfWidth = this.selectedToken.displayWidth / 2;
    const halfHeight = this.selectedToken.displayHeight / 2;

    // Atualiza posições das alças
    this.resizeHandles[0].setPosition(this.selectedToken.x, this.selectedToken.y - halfHeight - 10); // Topo
    this.resizeHandles[1].setPosition(this.selectedToken.x + halfWidth + 10, this.selectedToken.y); // Direita
    this.resizeHandles[2].setPosition(this.selectedToken.x, this.selectedToken.y + halfHeight + 10); // Baixo
    this.resizeHandles[3].setPosition(this.selectedToken.x - halfWidth - 10, this.selectedToken.y); // Esquerda
  }

  private clearSelection(): void {
    if (this.selectionRectangle) {
      this.selectionRectangle.destroy();
      this.selectionRectangle = null;
    }

    if (this.rotationHandle) {
      this.rotationHandle.destroy();
      this.rotationHandle = null;
    }

    if (this.resizeHandle) {
      this.resizeHandle.destroy();
      this.resizeHandle = null;
    }

    if (this.selectedToken) {
      this.selectedToken.clearTint(); // Remove o efeito visual de seleção
      this.selectedToken = null;
    }
  }

  private setupRotationHandle(scene: Phaser.Scene): void {
    if (!this.rotationHandle || !this.selectedToken) return;

    let isRotating = false;
    let startAngle = 0;
    let startRotation = 0;
    const ROTATION_SNAP = 45; // Rotação em incrementos de 45 graus
    let lastSnappedRotation = 0;

    this.rotationHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isRotating = true;
      startAngle = Phaser.Math.Angle.Between(
        this.selectedToken!.x,
        this.selectedToken!.y,
        pointer.x,
        pointer.y
      );
      startRotation = this.selectedToken!.angle;
      lastSnappedRotation = Math.round(startRotation / ROTATION_SNAP) * ROTATION_SNAP;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isRotating && pointer.isDown) {
        const newAngle = Phaser.Math.Angle.Between(
          this.selectedToken!.x,
          this.selectedToken!.y,
          pointer.x,
          pointer.y
        );

        // Calcula a diferença angular desde o início da rotação
        let rotationDelta = Phaser.Math.Angle.Wrap(newAngle - startAngle);

        // Converte para graus e aplica ao ângulo inicial
        let newRotation = startRotation + Phaser.Math.RadToDeg(rotationDelta);

        // Calcula o snap mais próximo de 45 graus
        const targetRotation = Math.round(newRotation / ROTATION_SNAP) * ROTATION_SNAP;

        // Suaviza a transição entre snaps
        if (Math.abs(targetRotation - lastSnappedRotation) >= ROTATION_SNAP) {
          lastSnappedRotation = targetRotation;
        }

        // Aplica a rotação com snap
        this.selectedToken!.setAngle(lastSnappedRotation);

        // Atualiza posições das alças
        this.updateHandlePositions();
      }
    });

    scene.input.on('pointerup', () => {
      if (isRotating) {
        isRotating = false;
        // Garante que o ângulo final seja um múltiplo exato de 45
        const finalRotation = Math.round(this.selectedToken!.angle / ROTATION_SNAP) * ROTATION_SNAP;
        this.selectedToken!.setAngle(finalRotation);
        this.updateHandlePositions();
        this.saveTokenState();
      }
    });
  }

  private updateHandlePositions(): void {
    if (!this.selectedToken) return;

    // Atualiza alça de rotação
    if (this.rotationHandle) {
      const distance = this.selectedToken.displayHeight / 2 + 20;
      const angleRad = Phaser.Math.DegToRad(this.selectedToken.angle - 90);
      this.rotationHandle.setPosition(
        this.selectedToken.x + Math.cos(angleRad) * distance,
        this.selectedToken.y + Math.sin(angleRad) * distance
      );
    }

    // Atualiza alça de redimensionamento
    if (this.resizeHandle) {
      this.resizeHandle.setPosition(
        this.selectedToken.x + this.selectedToken.displayWidth / 2 + 10,
        this.selectedToken.y + this.selectedToken.displayHeight / 2 + 10
      );
    }

    // Atualiza retângulo de seleção
    if (this.selectionRectangle) {
      this.selectionRectangle.setSize(
        this.selectedToken.displayWidth + 20,
        this.selectedToken.displayHeight + 20
      );
      this.selectionRectangle.setPosition(
        this.selectedToken.x,
        this.selectedToken.y
      );
    }
  }

  private setupResizeHandle(scene: Phaser.Scene): void {
    if (!this.resizeHandle || !this.selectedToken) return;

    let isResizing = false;
    let startWidth = 0;
    let startHeight = 0;
    let startPointerX = 0;
    let startPointerY = 0;
    const originalAspectRatio = this.selectedToken.displayWidth / this.selectedToken.displayHeight;

    this.resizeHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isResizing = true;
      startWidth = this.selectedToken!.displayWidth;
      startHeight = this.selectedToken!.displayHeight;
      startPointerX = pointer.x;
      startPointerY = pointer.y;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isResizing && pointer.isDown) {
        const deltaX = pointer.x - startPointerX;

        // Calcula o novo tamanho mantendo a proporção original
        const scale = 1 + (deltaX / startWidth);
        let newWidth = startWidth * scale;
        let newHeight = newWidth / originalAspectRatio;

        // Limita o tamanho
        newWidth = Phaser.Math.Clamp(newWidth, this.MIN_TOKEN_SIZE, this.MAX_TOKEN_SIZE);
        newHeight = Phaser.Math.Clamp(newHeight, this.MIN_TOKEN_SIZE, this.MAX_TOKEN_SIZE);

        this.selectedToken!.setDisplaySize(newWidth, newHeight);
        this.updateHandlePositions();
      }
    });

    scene.input.on('pointerup', () => {
      if (isResizing) {
        isResizing = false;
        this.saveTokenState();
      }
    });
  }

  private updateSelectionRectangle(): void {
    if (!this.selectedToken || !this.selectionRectangle) return;

    this.selectionRectangle.setSize(
      this.selectedToken.displayWidth + 20,
      this.selectedToken.displayHeight + 20
    );
    this.selectionRectangle.setPosition(
      this.selectedToken.x,
      this.selectedToken.y
    );
  }

  private saveTokenState(): void {
    if (this.configuracoesAbertas) return;
    if (!this.selectedToken || !this.currentMapId) return;

    try {
      const tokenData = this.selectedToken.getData('tokenData') as TokenDto;

      const metadados: { [key: string]: string } = {
        rotation: this.selectedToken.angle.toString(),
        width: this.selectedToken.displayWidth.toString(),
        height: this.selectedToken.displayHeight.toString()
      };

      const tokenAtualizado: TokenDto = {
        id: tokenData.id,
        nome: tokenData.nome,
        x: this.selectedToken.x,
        y: this.selectedToken.y,
        z: tokenData.z || 1,
        imagemDados: tokenData.imagemDados,
        donoId: tokenData.donoId,
        visivelParaTodos: tokenData.visivelParaTodos !== false,
        bloqueado: tokenData.bloqueado || false,
        mapaId: this.currentMapId, // Usa o currentMapId atual
        metadados: metadados
      };

      // Obtém o estado atual do mapa correto
      const estadoAtual = this.estadosMapa[this.currentMapId] || {
        tokens: [],
        configuracoes: {
          tipoGrid: 'hexagonal',
          tamanhoCelula: 40,
          corGrid: '#cccccc',
          snapToGrid: true
        }
      };

      // Atualiza ou adiciona o token
      const tokenIndex = estadoAtual.tokens.findIndex(t => t.id === tokenAtualizado.id);
      if (tokenIndex !== -1) {
        estadoAtual.tokens[tokenIndex] = tokenAtualizado;
      } else {
        estadoAtual.tokens.push(tokenAtualizado);
      }

      // Salva no servidor
      this.apiService.salvarEstadoMapa(this.currentMapId, estadoAtual).subscribe({
        next: () => {
          // Atualiza o estado local
          this.estadosMapa[this.currentMapId] = estadoAtual;
          if (this.currentMap) {
            this.currentMap.estadoJson = JSON.stringify(estadoAtual);
          }
        },
        error: (err) => {
          console.error('Erro ao salvar estado:', err);
          this.toastr.error('Erro ao salvar alterações');
        }
      });
    } catch (e) {
      console.error('Erro ao preparar estado:', e);
    }
  }

  public onLocalMapChange(mapState: MapaEstadoDto): void {
    if (!this.currentMapId || !this.currentMap) {
      return;
    }

    // Verifica se o estado recebido pertence ao mapa atual
    const tokensDoMapaAtual = (mapState.tokens || []).filter(token => token.mapaId === this.currentMapId);

    if (tokensDoMapaAtual.length === 0 && (mapState.tokens || []).length > 0) {
      // Ignora atualizações que não são para o mapa atual
      return;
    }

    // Garante que o estado tenha a estrutura correta
    const estadoCompleto: MapaEstadoDto = {
      tokens: tokensDoMapaAtual,
      camadas: mapState.camadas || [],
      objetos: mapState.objetos || [],
      configuracoes: mapState.configuracoes || {
        tipoGrid: 'hexagonal',
        tamanhoCelula: 40,
        corGrid: '#cccccc',
        snapToGrid: true
      }
    };

    // Atualiza o estado local apenas para o mapa atual
    this.estadosMapa[this.currentMapId] = estadoCompleto;
    this.currentMap.estadoJson = JSON.stringify(estadoCompleto);

    // Envia atualização para outros jogadores apenas se for o criador
    if (this.isCriador) {
      this.sessaoService.sendMapUpdate(
        this.mesaId.toString(),
        this.currentMapId,
        this.currentMap.estadoJson
      );
    }

    // Salva no servidor
    this.apiService.salvarEstadoMapa(this.currentMapId, estadoCompleto).subscribe({
      error: (err) => console.error('Erro ao salvar estado do mapa:', err)
    });
  }

  // Método para salvar as configurações
  saveMapConfig(): void {
    if (!this.currentMap || !this.isCriador) return;

    const config = {
      nome: this.currentMap.nome,
      largura: this.currentMap.largura,
      altura: this.currentMap.altura,
      tamanhoHex: this.currentMap.tamanhoHex,
      visivel: this.currentMap.visivel  // Adicionando a propriedade visivel
    };

    this.apiService.salvarConfigMapa(this.currentMap.mapaId, config).subscribe({
      next: (mapaAtualizado) => {
        // Atualiza a lista local de mapas
        const index = this.allMaps.findIndex(m => m.mapaId === mapaAtualizado.mapaId);
        if (index !== -1) {
          this.allMaps[index] = mapaAtualizado;
        }

        // Atualiza o mapa atual
        this.currentMap = { ...mapaAtualizado };

        this.toastr.success('Configurações do mapa salvas com sucesso');
        this.drawHexGrid(this.phaserGame.scene.scenes[0]);
      },
      error: (err) => {
        console.error('Erro ao salvar configurações:', err);
        this.toastr.error('Erro ao salvar configurações');
      }
    });
  }

  private saveMapState(mapaId: number): void {
    // Verificar se temos um mapa atual válido
    if (!this.currentMap || this.currentMap.mapaId !== mapaId) {
      return;
    }

    // Verificar se as configurações estão abertas
    if (this.configuracoesAbertas) {
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

      // Coleta todos os tokens da cena atual
      const tokens: TokenDto[] = [];
      scene.children.each(child => {
        if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
          const tokenData = child.getData('tokenData');
          // Verifica se o token pertence ao mapa atual
          if (tokenData.mapaId === mapaId) {
            tokens.push(tokenData);
          }
        }
      });

      // Obtém ou cria o estado para o mapa especificado
      const estadoAtual = this.estadosMapa[mapaId] || {
        tokens: [],
        configuracoes: {
          tipoGrid: 'hexagonal',
          tamanhoCelula: 40,
          corGrid: '#cccccc',
          snapToGrid: true
        }
      };

      // Atualiza apenas os tokens
      estadoAtual.tokens = tokens;

      // Atualiza o estado local
      this.estadosMapa[mapaId] = estadoAtual;
      this.currentMap.estadoJson = JSON.stringify(estadoAtual);

      // Salva no servidor
      this.apiService.salvarEstadoMapa(mapaId, estadoAtual).subscribe({
        next: () => {
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

  criarNovoMapa(): void {
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
      visivel: false
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

  mudarMapaAtual(mapaId: number): void {
    if (!this.isCriador) {
      this.toastr.warning('Apenas o criador da mesa pode alterar mapas');
      return;
    }

    // 1. Limpa seleção e texturas
    this.clearSelection();
    this.cleanupTextures();

    // 2. Reseta o estado do mapa atual
    this.currentMap = null;
    this.mapaCarregado = false;
    this.currentMapId = mapaId;

    // 3. Carrega o novo mapa
    this.carregarMapa(mapaId);
  }

  // Método para alternar o mapa atual via checkbox
  toggleCurrentMap(): void {
    if (!this.isCriador || !this.currentMap) return;

    // Inverte o estado de visibilidade
    this.currentMap.visivel = !this.currentMap.visivel;

    // Chama o método de salvar para persistir as alterações
    this.saveMapConfig();
  }

  isCurrentMapVisible(): boolean {
    return this.currentMap?.visivel ?? false;
  }

  dragImage(event: DragEvent, img: ImagemDto) {
    // Cria um objeto com todos os dados necessários
    const tokenData = {
      nome: img.nome,
      // Usa imageUrl diretamente, com fallback para base64 se necessário
      imagemDados: img.imageUrl || `data:image/${img.extensao};base64,${img.dados}`,
      extensao: img.extensao,
      usuarioId: this.usuarioId,
      // Adiciona metadados adicionais se necessário
      metadata: {
        origem: 'biblioteca_imagens',
        dataAdicao: new Date().toISOString()
      }
    };

    // Define uma imagem de preview para o drag
    if (img.imageUrl || img.dados) {
      const imgElement = new Image();
      imgElement.src = tokenData.imagemDados;
      imgElement.width = 100;
      event.dataTransfer?.setDragImage(imgElement, 50, 50);
    }

    // Converte para JSON e armazena no dataTransfer
    event.dataTransfer?.setData('application/json', JSON.stringify(tokenData));
    event.dataTransfer?.setData('text/plain', img.nome); // Para compatibilidade
  }

  allowDrop(event: DragEvent) {
    if (this.configuracoesAbertas) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    // Adiciona feedback visual durante o drag-over
    const gameContainer = this.gameContainer.nativeElement;
    gameContainer.classList.add('drag-over');
  }

  onDrop(event: DragEvent) {
    if (this.configuracoesAbertas) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const gameContainer = this.gameContainer.nativeElement;
    gameContainer.classList.remove('drag-over');

    if (!event.dataTransfer) {
      console.error("dataTransfer is null");
      return;
    }

    try {
      const tokenDataStr = event.dataTransfer.getData('application/json');
      if (!tokenDataStr) {
        console.error("Nenhum dado de token encontrado");
        return;
      }

      const tokenData = JSON.parse(tokenDataStr);
      if (!tokenData.nome || !tokenData.imagemDados || !tokenData.usuarioId) {
        console.error("Dados do token incompletos");
        return;
      }

      // Obtém a posição do drop no mundo do jogo
      const scene = this.phaserGame.scene.scenes[0];
      const pointer = scene.input.activePointer;
      const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const hexRadius = this.maps[this.currentMapIndex].hexRadius;

      // Converte para coordenadas de grid e volta para obter o centro exato do hexágono
      const gridPos = this.screenToHexGrid(worldPoint.x, worldPoint.y, hexRadius);
      const snappedPos = this.hexGridToScreen(gridPos.col, gridPos.row, hexRadius);

      // Cria o token com todos os dados
      const newToken: TokenDto = {
        id: `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        nome: tokenData.nome,
        x: snappedPos.x,
        y: snappedPos.y,
        z: 1,
        imagemDados: tokenData.imagemDados,
        donoId: tokenData.usuarioId,
        visivelParaTodos: true,
        bloqueado: false,
        mapaId: this.currentMapId,
        metadados: tokenData.metadata || {}
      };

      this.adicionarTokenAoMapa(newToken);
    } catch (error) {
      console.error("Erro ao processar drop:", error);
      this.toastr.error("Erro ao adicionar token ao mapa");
    }
  }

  adicionarTokenAoMapa(token: TokenDto) {
    if (!this.currentMap || !this.currentMapId) {
      console.error('Mapa atual é nulo');
      return;
    }

    // Obtém o estado atual do mapa ou cria um novo
    const currentState = this.estadosMapa[this.currentMapId] || {
      tokens: [],
      configuracoes: {
        tipoGrid: 'hexagonal',
        tamanhoCelula: 40,
        corGrid: '#cccccc',
        snapToGrid: true
      }
    };

    // Adiciona o novo token
    currentState.tokens = [...(currentState.tokens || []), token];

    // Atualiza o estado local
    this.estadosMapa[this.currentMapId] = currentState;

    // Atualiza o estado no servidor
    this.apiService.salvarEstadoMapa(this.currentMapId, currentState).subscribe({
      next: () => {
        // Notifica outros jogadores
        this.sessaoService.sendMapUpdate(
          this.mesaId.toString(),
          this.currentMapId,
          JSON.stringify({
            tokens: currentState.tokens.map(t => ({
              id: t.id,
              x: t.x,
              y: t.y,
              z: t.z
            }))
          })
        );

        // Adiciona visualmente ao mapa
        this.addTokenToMapVisual(token);
      },
      error: (err) => {
        console.error('Erro ao salvar estado do mapa:', err);
        this.toastr.error('Erro ao adicionar token ao mapa');
      }
    });
  }

  private addTokenToMapVisual(token: TokenDto) {
    if (!this.phaserGame || !this.phaserGame.scene || !this.phaserGame.scene.scenes[0]) {
      console.error('Phaser game ou scene não está disponível');
      return;
    }

    const scene = this.phaserGame.scene.scenes[0];
    const textureKey = `token-${token.id}`;

    // Verifica se a textura já existe
    if (scene.textures.exists(textureKey)) {
      this.updateExistingToken(scene, textureKey, token);
      return;
    }

    // Carrega a imagem da URL ou dados base64
    if (token.imagemDados.startsWith('http') || token.imagemDados.startsWith('data:')) {
      scene.load.image(textureKey, token.imagemDados);
    } else {
      // Fallback para imagens antigas (deve ser removido eventualmente)
      console.warn('Token usando formato antigo de imagem');
      scene.textures.addBase64(textureKey, token.imagemDados);
    }

    scene.load.once(`filecomplete-image-${textureKey}`, () => {
      this.createTokenSprite(scene, textureKey, token);
    });

    scene.load.start();
  }

  private setupTokenDrag(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, token: TokenDto): void {
    let originalPosition = { x: token.x, y: token.y };
    const hexRadius = this.maps[this.currentMapIndex].hexRadius;

    sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      try {
        const snapEnabled = this.getConfiguracoesMapaAtual().snapToGrid;

        if (snapEnabled) {
          const gridPos = this.screenToHexGrid(dragX, dragY, hexRadius);
          const snappedPos = this.hexGridToScreen(gridPos.col, gridPos.row, hexRadius);
          sprite.x = snappedPos.x;
          sprite.y = snappedPos.y;
        } else {
          sprite.x = dragX;
          sprite.y = dragY;
        }

        if (this.selectedToken === sprite) {
          this.updateHandlePositions();
        }
      } catch (error) {
        console.error('Erro durante drag:', error);
      }
    });

    sprite.on('dragend', () => {
      // Sempre aplica snap ao final do arraste
      const gridPos = this.screenToHexGrid(sprite.x, sprite.y, hexRadius);
      const snappedPos = this.hexGridToScreen(gridPos.col, gridPos.row, hexRadius);
      sprite.x = snappedPos.x;
      sprite.y = snappedPos.y;

      // Atualiza a posição no tokenData
      const tokenData = sprite.getData('tokenData') as TokenDto;
      tokenData.x = sprite.x;
      tokenData.y = sprite.y;

      // Atualiza a seleção após o arraste
      if (this.selectedToken === sprite) {
        this.updateHandlePositions();
      }

      // Atualiza o estado do mapa
      const estadoAtual = this.estadosMapa[this.currentMapId] || {
        tokens: [],
        configuracoes: {
          tipoGrid: 'hexagonal',
          tamanhoCelula: 40,
          corGrid: '#cccccc',
          snapToGrid: true
        }
      };

      const tokenIndex = estadoAtual.tokens.findIndex(t => t.id === token.id);
      if (tokenIndex !== -1) {
        estadoAtual.tokens[tokenIndex] = tokenData;
      } else {
        estadoAtual.tokens.push(tokenData);
      }

      this.estadosMapa[this.currentMapId] = estadoAtual;
      this.onLocalMapChange(estadoAtual);
    });
  }

  private updateExistingToken(scene: Phaser.Scene, textureKey: string, token: TokenDto) {
    const existingSprite = scene.children.getByName(token.id) as Phaser.GameObjects.Sprite;
    if (existingSprite) {
      existingSprite.setPosition(token.x, token.y);
      existingSprite.setDepth(token.z);
    } else {
      this.createTokenSprite(scene, textureKey, token);
    }
  }

  private cleanupTextures(): void {
    if (!this.phaserGame || !this.phaserGame.scene) return;

    const scene = this.phaserGame.scene.scenes[0];
    if (!scene) return;

    // Destrói todos os sprites primeiro
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Sprite) {
        child.destroy();
      }
    });

    // Limpa as texturas de forma segura
    Object.keys(scene.textures.list).forEach(key => {
      if (key.startsWith('token-')) {
        try {
          const texture = scene.textures.get(key);
          if (texture && !texture.destroy) {
            texture.destroy();
          }
        } catch (e) {
          console.warn(`Erro ao destruir textura ${key}:`, e);
        }
      }
    });

    this.debugSceneObjects(scene);
  }

  private debugSceneObjects(scene: Phaser.Scene): void {
    let graphicsCount = 0;
    let textCount = 0;
    let spriteCount = 0;

    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Graphics) graphicsCount++;
      if (child instanceof Phaser.GameObjects.Text) textCount++;
      if (child instanceof Phaser.GameObjects.Sprite) spriteCount++;
    });

    console.log(`Objetos na cena: Graphics=${graphicsCount}, Texts=${textCount}, Sprites=${spriteCount}`);
  }
}