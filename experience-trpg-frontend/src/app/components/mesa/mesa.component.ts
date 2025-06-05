import { Component, OnInit, OnDestroy, AfterViewInit, ComponentFactoryResolver, ViewContainerRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { MapaService } from '../../services/mapa.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { of, Subject, Subscription, throwError } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
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
  backgroundImageUrl: string = '';
  showImageSelector: boolean = false;
  mesaImages: ImagemDto[] = [];

  estadosMapa: { [mapaId: number]: MapaEstadoDto } = {};
  private subscriptions = new Subscription();

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
    private chatService: ChatService,
    private mapaService: MapaService,
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

    // 5. Conecta ao SignalR e configura listeners
    this.chatService.joinMesaGroup(this.mesaId).then(() => {
      this.recursosCarregados.chat = true;
      this.verificarCarregamentoCompleto();

      // Configura os listeners para atualizações em tempo real
      this.configurarListenersSignalR();
    }).catch((error) => {
      console.error('Erro ao conectar ao hub de Chat:', error);
      this.recursosCarregados.chat = true;
      this.verificarCarregamentoCompleto();
    });

    // 6. Conecta ao SignalR para atualizações de mapa
    this.setupMapListeners();

  }

  private configurarListenersSignalR(): void {
    // Listener para atualizações de estado do mapa
    this.subscriptions.add(
      this.mapaService.getEstadoObservable().subscribe(estado => {
        if (this.currentMapId && this.currentMap) {
          try {
            this.applyMapChanges(estado);
          } catch (e) {
            console.error('Erro ao aplicar mudanças no mapa:', e);
          }
        }
      })
    );

    // Listener para atualizações gerais do mapa
    this.subscriptions.add(
      this.mapaService.getMapaObservable().subscribe(mapa => {
        if (mapa.mapaId === this.currentMapId) {
          this.currentMap = mapa;
          // Atualiza imagem de fundo se necessário
          if (mapa.imagemFundo !== this.currentMap.imagemFundo) {
            this.atualizarImagemFundo(mapa.imagemFundo || null);
          }
        }
      })
    );
  }

  private setupMapListeners(): void {
    // Conecta ao grupo da mesa
    this.subscriptions.add(
      this.route.params.pipe(
        switchMap(params => {
          this.mesaId = +params['id'];
          return this.mapaService.joinMesaGroup(this.mesaId);
        })
      ).subscribe()
    );

    // Listener para troca de mapa atual
    this.subscriptions.add(
      this.mapaService.getMapaObservable().subscribe(mapa => {
        if (mapa.visivel && mapa.mesaId === this.mesaId && mapa.mapaId !== this.currentMapId) {
          this.mudarMapaAtual(mapa.mapaId);
        }
      })
    );

    // Listener para tokens individuais
    this.subscriptions.add(
      this.mapaService.getTokenObservable().subscribe(token => {
        if (token.mapaId === this.currentMapId) {
          this.atualizarTokenIndividual(token);
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Limpa todas as subscriptions
    this.subscriptions.unsubscribe();

    // Limpeza existente
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupTextures();

    // Destrói o jogo Phaser
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
    }

    // Sai do grupo do SignalR
    this.chatService.leaveMesaGroup(this.mesaId.toString()).catch(err => {
      console.error('Erro ao sair do grupo do SignalR:', err);
    });
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
        if (!mapas || mapas.length === 0) {
          this.toastr.error('Nenhum mapa encontrado para esta mesa');
          return;
        }

        // Verifica e corrige múltiplos mapas visíveis
        this.allMaps = this.corrigirMultiplosMapasVisiveis(mapas);

        // Seleciona o mapa visível ou o primeiro da lista
        const mapaAtual = this.allMaps.find(m => m.visivel) || this.allMaps[0];
        this.currentMapId = mapaAtual.mapaId;

        this.carregarMapa(this.currentMapId);
      },
      error: (err) => {
        console.error('Erro ao carregar mapas:', err);
        this.toastr.error('Erro ao carregar mapas da mesa');
      }
    });
  }

  private corrigirMultiplosMapasVisiveis(mapas: MapaDto[]): MapaDto[] {
    const mapasVisiveis = mapas.filter(m => m.visivel);

    // Se houver mais de um mapa visível, corrige
    if (mapasVisiveis.length > 1) {
      // Mantém apenas o primeiro mapa como visível (ou o mais recente)
      const mapaPrincipal = mapasVisiveis[0]; // Ou ordene por data e pegue o mais recente

      return mapas.map(mapa => {
        return {
          ...mapa,
          visivel: mapa.mapaId === mapaPrincipal.mapaId
        };
      });
    }

    return [...mapas];
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

  private backgroundImage: Phaser.GameObjects.Image | null = null;
  private gridContainer!: Phaser.GameObjects.Container;

  create() {
    const scene = this.phaserGame.scene.scenes[0];

    // Inicializa o container do grid
    this.gridContainer = scene.add.container(0, 0);

    // Restante do seu código existente...
    this.drawHexGrid(scene);
    this.setupCameraControls(scene);

    scene.scale.on('resize', () => {
      this.drawHexGrid(scene);
    });
  }

  private carregarImagemFundoPhaser(scene: Phaser.Scene): void {
    // Verificação em cadeia para todas as propriedades necessárias
    if (!this.currentMap?.imaFundo || !this.gridContainer || !this.currentMap.mapaId) return;

    const textureKey = `mapBackground_${this.currentMap.mapaId}`;

    // Operador de navegação segura para texturas
    if (scene.textures?.exists(textureKey)) {
      scene.textures.remove(textureKey);
    }

    const imageUrl = this.currentMap.imaFundo.imageUrl ||
      `data:image/${this.currentMap.imaFundo.extensao};base64,${this.currentMap.imaFundo.dados}`;

    // Verificação adicional para load
    if (scene.load) {
      scene.load.image(textureKey, imageUrl);
      scene.load.once('complete', () => {
        if (this.gridContainer && this.currentMap) {
          this.criarImagemFundo(scene, textureKey);
        }
      });
      scene.load.start();
    }
  }

  private criarImagemFundo(scene: Phaser.Scene, textureKey: string): void {
    if (!this.currentMap || !this.gridContainer) return;

    const gridConfig = this.getCurrentGridConfig();
    const hexRadius = gridConfig.hexRadius;

    // Calcula o deslocamento de 1 hexágono para cima e para a esquerda
    const offsetX = -hexRadius * Math.sqrt(3) * 0.5; // 1 hexágono para esquerda
    const offsetY = -hexRadius * 1.5 * 0.75; // 1 hexágono para cima

    // Calcula as dimensões totais do grid (com espaço extra para o deslocamento)
    const gridWidth = (gridConfig.cols + 0.5) * hexRadius * Math.sqrt(3);
    const gridHeight = (gridConfig.rows + 0.5) * hexRadius * 1.5;

    // Remove imagem anterior se existir
    if (this.backgroundImage) {
      this.backgroundImage.destroy();
    }

    // Cria a imagem de fundo com o deslocamento aplicado
    this.backgroundImage = scene.add.image(offsetX, offsetY, textureKey)
      .setOrigin(0, 0)
      .setDisplaySize(gridWidth, gridHeight)
      .setDepth(-1);

    // Adiciona a imagem ao container do grid para manter o alinhamento
    this.gridContainer.add(this.backgroundImage);
    this.gridContainer.sendToBack(this.backgroundImage);
  }

  public drawHexGrid(scene: Phaser.Scene) {
    // Limpa elementos anteriores (mantendo sua lógica existente)
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Graphics ||
        child instanceof Phaser.GameObjects.Text ||
        (child instanceof Phaser.GameObjects.Sprite && child.getData('gridElement'))) {
        child.destroy();
      }
    });

    // Cria container para o grid se não existir
    if (!this.gridContainer) {
      this.gridContainer = scene.add.container(0, 0);
    } else {
      this.gridContainer.removeAll(true);
    }

    const graphics = scene.add.graphics().setData('gridElement', true);
    this.gridContainer.add(graphics);

    const gridConfig = this.getCurrentGridConfig();
    const hexRadius = gridConfig.hexRadius;
    const cols = gridConfig.cols;
    const rows = gridConfig.rows;

    // Desenha o grid (mantendo sua lógica existente)
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

    // Carrega a imagem de fundo de forma segura
    this.carregarImagemFundoPhaser(scene);

    // Atualização segura dos limites da câmera
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
    // Ajuste para coordenadas do grid desenhado
    const q = (x * Math.sqrt(3) / 3 - y / 3) / size;
    const r = y * 2 / 3 / size;

    // Converter para coordenadas cúbicas e arredondar
    const cube = this.axialToCube(q, r);
    const rounded = this.roundCube(cube);

    // Converter de volta para axial
    const axial = this.cubeToAxial(rounded);

    return {
      col: Math.round(axial.q),
      row: Math.round(axial.r)
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
  private axialToCube(q: number, r: number): { x: number, y: number, z: number } {
    return {
      x: q,
      z: r,
      y: -q - r
    };
  }

  private cubeToAxial(cube: { x: number, y: number, z: number }): { q: number, r: number } {
    return {
      q: cube.x,
      r: cube.z
    };
  }

  private roundCube(cube: { x: number, y: number, z: number }): { x: number, y: number, z: number } {
    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const xDiff = Math.abs(rx - cube.x);
    const yDiff = Math.abs(ry - cube.y);
    const zDiff = Math.abs(rz - cube.z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return { x: rx, y: ry, z: rz };
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

  // Método para carregar um mapa completo
  private carregarMapa(mapaId: number): void {
    this.clearSelection();
    this.cleanupTextures();

    this.mapaService.getMapaById(this.mesaId, mapaId).pipe(
      tap((mapa) => {
        this.currentMap = mapa;
        this.currentMapId = mapa.mapaId;
        this.mapaCarregado = true;

        if (mapa.imagemFundo) {
          this.carregarImagemDeFundo(mapa.imagemFundo);
        }

        // Inscreve para atualizações em tempo real deste mapa
        this.mapaService.getEstadoObservable().subscribe(estado => {
          this.onMapUpdate(estado);
        });

        // Carrega estado inicial
        const estadoInicial = mapa.estadoJson
          ? JSON.parse(mapa.estadoJson)
          : this.getEmptyMapState();

        this.estadosMapa[mapaId] = estadoInicial;
        this.applyMapChanges(estadoInicial);
      }),
      switchMap(() => this.mapaService.joinMesaGroup(this.mesaId.toString()))
    ).subscribe({
      error: (err) => {
        console.error('Erro ao carregar mapa:', err);
        this.toastr.error('Erro ao carregar o mapa');
      }
    });
  }

  private getEmptyMapState(): MapaEstadoDto {
    return {
      tokens: [],
      camadas: [],
      objetos: [],
      configuracoes: {
        tipoGrid: 'hexagonal',
        tamanhoCelula: 40,
        corGrid: '#cccccc',
        snapToGrid: true
      }
    };
  }

  carregarDetalhesImagemFundo(imagemId: number): void {
    this.apiService.getImagemPorId(imagemId).subscribe({
      next: (imagem) => {
        if (this.currentMap) {
          // Atualiza o mapa com os detalhes completos da imagem
          this.currentMap = {
            ...this.currentMap,
            imaFundo: imagem
          };
        }
      },
      error: (err) => console.error('Erro ao carregar imagem:', err)
    });
  }

  temImagemDeFundo(): boolean {
    return !!this.currentMap?.imaFundo || !!this.currentMap?.imagemFundo;
  }

  getImagemFundoUrl(): string {
    if (this.currentMap?.imaFundo) {
      return this.currentMap.imaFundo.imageUrl ||
        `data:image/${this.currentMap.imaFundo.extensao};base64,${this.currentMap.imaFundo.dados}`;
    }
    return 'assets/default-bg.jpg';
  }

  abrirSeletorImagens(): void {
    this.showImageSelector = true;
    this.carregarImagensDaMesa();
  }

  // Método para carregar a imagem de fundo
  carregarImagemFundo(mesaId: number, mapaId: number): void {
    this.apiService.getMapaById(mesaId, mapaId).subscribe({
      next: (mapa) => {
        // Prioridade para fundoUrl se existir
        if (mapa.fundoUrl) {
          this.backgroundImageUrl = mapa.fundoUrl;
          return;
        }

        // Se não, cria a URL a partir dos dados da imagem
        if (mapa.imaFundo) {
          this.backgroundImageUrl = this.createImageUrl(mapa.imaFundo);
        } else {
          this.backgroundImageUrl = 'assets/default-bg.jpg';
        }
      },
      error: (err) => console.error('Erro ao carregar mapa:', err)
    });
  }

  // Método para vincular nova imagem de fundo
  vincularNovaImagem(mapaId: number, imagemId: number): void {
    this.mapaService.updateBackgroundImage(this.mesaId, mapaId, imagemId).pipe(
      switchMap(() => {
        // Carrega a imagem localmente para melhor UX
        return this.mapaService.getMapaById(this.mesaId, mapaId).pipe(
          tap((mapaAtualizado) => {
            this.currentMap = mapaAtualizado;
            if (mapaAtualizado.imagemFundo) {
              this.carregarImagemDeFundo(mapaAtualizado.imagemFundo);
            }
          })
        );
      })
    ).subscribe({
      error: (err) => console.error('Erro ao vincular imagem:', err)
    });
  }

  // Método para carregar mapa com imagem
  carregarMapaComImagem(mesaId: number, mapaId: number): void {
    this.mapaService.getMapaById(mesaId, mapaId).subscribe({
      next: (mapa: MapaDto) => {
        this.currentMap = mapa;
        if (mapa.imagemFundo) {
          this.carregarImagemDeFundo(mapa.imagemFundo);
        }
      },
      error: (err) => console.error('Erro ao carregar mapa:', err)
    });
  }

  // Método para carregar imagem de fundo
  carregarImagemDeFundo(imagemId: number): void {
    this.mapaService.getImagemPorId(imagemId).subscribe({
      next: (imagem: ImagemDto) => {
        if (this.currentMap) {
          this.currentMap.imaFundo = imagem;
        }
      },
      error: (err) => console.error('Erro ao carregar imagem de fundo:', err)
    });
  }

  // Método para selecionar imagem de fundo
  selecionarImagemFundo(imagem: ImagemDto): void {
    if (!this.currentMap) return;

    // Garante que temos um objeto válido com todas propriedades obrigatórias
    const mapaAtualizado: MapaDto = {
      // Copia todas propriedades do currentMap
      ...this.currentMap,
      // Atualiza as propriedades da imagem
      imaFundo: imagem,
      imagemFundo: imagem.imagemId,
      // Garante valores para propriedades obrigatórias
      mapaId: this.currentMap.mapaId,
      mesaId: this.currentMap.mesaId,
      nome: this.currentMap.nome || 'Novo Mapa',
      largura: this.currentMap.largura || 30,
      altura: this.currentMap.altura || 30,
      tamanhoHex: this.currentMap.tamanhoHex || 40,
      estadoJson: this.currentMap.estadoJson || '{}',
      ultimaAtualizacao: this.currentMap.ultimaAtualizacao || new Date(),
      visivel: this.currentMap.visivel || false
    };

    this.mapaService.updateBackgroundImage(
      this.mesaId,
      this.currentMap.mapaId,
      imagem.imagemId
    ).pipe(
      tap(() => {
        this.currentMap = mapaAtualizado;
        this.showImageSelector = false;

        if (this.phaserGame) {
          this.carregarImagemFundoPhaser(this.phaserGame.scene.scenes[0]);
        }
      })
    ).subscribe({
      error: (err) => console.error('Erro ao vincular imagem:', err)
    });
  }

  // Método para remover imagem de fundo
  removerImagemFundo(): void {
    if (!this.currentMap) return;

    // Garante que temos valores padrão para propriedades obrigatórias
    const mapaAtualizado: MapaDto = {
      ...this.currentMap,
      imaFundo: undefined,
      imagemFundo: undefined,
      // Garante que todas as propriedades obrigatórias existam
      mapaId: this.currentMap.mapaId,
      mesaId: this.currentMap.mesaId,
      nome: this.currentMap.nome,
      largura: this.currentMap.largura,
      altura: this.currentMap.altura,
      tamanhoHex: this.currentMap.tamanhoHex,
      estadoJson: this.currentMap.estadoJson || '{}',
      ultimaAtualizacao: this.currentMap.ultimaAtualizacao || new Date(),
      visivel: this.currentMap.visivel
    };

    this.mapaService.updateBackgroundImage(
      this.mesaId,
      this.currentMap.mapaId,
      null
    ).pipe(
      tap(() => {
        this.currentMap = mapaAtualizado;
        if (this.phaserGame) {
          this.removerImagemFundoPhaser(this.phaserGame.scene.scenes[0]);
        }
      })
    ).subscribe({
      error: (err) => console.error('Erro ao remover imagem:', err)
    });
  }

  private removerImagemFundoPhaser(scene: Phaser.Scene): void {
    // Implementação para remover a imagem de fundo no Phaser
    scene.children.each(child => {
      if (child.getData('isBackgroundImage')) {
        child.destroy();
      }
    });
  }

  // Método para carregar imagens da mesa (reutilizado)
  carregarImagensDaMesa(): void {
    if (!this.currentMap?.mesaId) return;

    this.apiService.getImagensPorMesa(this.currentMap.mesaId).subscribe({
      next: (imagens: ImagemDto[]) => {
        this.mesaImages = imagens;
      },
      error: (error) => console.error('Erro ao carregar imagens:', error)
    });
  }

  getImageUrl(imagem: ImagemDto): string {
    if (!imagem) {
      return 'assets/default-bg.jpg';
    }

    if (imagem.imageUrl) {
      return imagem.imageUrl;
    }

    if (imagem.extensao && imagem.dados) {
      return `data:image/${imagem.extensao};base64,${imagem.dados}`;
    }

    return 'assets/default-bg.jpg';
  }

  private atualizarImagemFundo(imageId: number | null): void {
    if (imageId) {
      this.mapaService.getImagemPorId(imageId).subscribe(imagem => {
        if (this.currentMap) {
          this.currentMap.imaFundo = imagem;
          this.carregarImagemFundoPhaser(this.phaserGame.scene.scenes[0]);
        }
      });
    } else {
      this.removerImagemFundoPhaser(this.phaserGame.scene.scenes[0]);
    }
  }

  private atualizarTokenIndividual(token: TokenDto): void {
    // Implementação para atualizar um token específico no Phaser
    const scene = this.phaserGame.scene.scenes[0];
    const existingToken = scene.children.getByName(token.id) as Phaser.GameObjects.Sprite;

    if (existingToken) {
      existingToken.setPosition(token.x, token.y);
      existingToken.setData('tokenData', token);
    } else {
      this.adicionarTokenAoMapa(token);
    }
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

  // Método para salvar estado do token
  private saveTokenState(): void {
    if (!this.selectedToken || !this.currentMapId) return;

    const tokenData = this.selectedToken.getData('tokenData') as TokenDto;

    // Converte os valores string para number
    const metadados = {
      ...tokenData.metadados,
      rotation: Number(this.selectedToken.angle),
      width: Number(this.selectedToken.displayWidth),
      height: Number(this.selectedToken.displayHeight)
    };

    const tokenAtualizado: TokenDto = {
      ...tokenData,
      x: this.selectedToken.x,
      y: this.selectedToken.y,
      metadados: metadados
    };

    this.mapaService.updateToken(this.mesaId, this.currentMapId, tokenAtualizado).subscribe({
      error: (err) => {
        console.error('Erro ao salvar token:', err);
        this.toastr.error('Erro ao salvar alterações');
      }
    });
  }

  // Método para lidar com mudanças no mapa recebidas de outros clientes
  public onMapUpdate(mapState: MapaEstadoDto): void {
    if (!this.currentMapId || !this.currentMap || !this.mesaId) {
      console.warn('Dados incompletos para atualização do mapa');
      return;
    }

    // Filtra tokens relevantes para este mapa
    const tokensRelevantes = (mapState.tokens || [])
      .filter(token => token?.mapaId === this.currentMapId);

    // Cria configurações padrão se não existirem
    const defaultConfig = this.getDefaultConfig();

    // Atualiza estado local
    this.estadosMapa[this.currentMapId] = {
      tokens: tokensRelevantes,
      camadas: mapState.camadas || [],
      objetos: mapState.objetos || [],
      configuracoes: {
        ...defaultConfig,
        ...(mapState.configuracoes || {}) // Sobrescreve com configurações recebidas
      }
    };

    // Aplica mudanças visuais
    this.applyMapChanges(this.estadosMapa[this.currentMapId]);
  }

  private getDefaultConfig(): ConfiguracaoMapaDto {
    return {
      tipoGrid: 'hexagonal',
      tamanhoCelula: 40,
      corGrid: '#cccccc',
      snapToGrid: true
    };
  }

  public onLocalMapChange(mapState: MapaEstadoDto): void {
    // Verificação mais robusta de null
    if (!this.currentMapId || !this.currentMap || !this.mesaId) {
      console.warn('Dados incompletos para atualização do mapa');
      return;
    }

    const currentMapId = this.currentMapId; // Armazenar em variável local para consistência
    const mesaId = this.mesaId;

    // Filtrar tokens com verificação de null segura
    const tokensDoMapaAtual = (mapState.tokens || [])
      .filter(token => token?.mapaId === currentMapId);

    // Se não há tokens relevantes e o estado tem tokens, ignorar
    if (tokensDoMapaAtual.length === 0 && (mapState.tokens?.length ?? 0) > 0) {
      return;
    }

    // Criar estado completo com valores padrão
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

    // Atualizar estado local
    this.estadosMapa[currentMapId] = estadoCompleto;
    this.currentMap.estadoJson = JSON.stringify(estadoCompleto);

    // Enviar para o servidor e notificar outros jogadores
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
        // Opcional: Reverter mudanças locais em caso de erro
        return of(null);
      })
    ).subscribe({
      error: (err) => {
        console.error('Erro ao salvar estado do mapa:', err);
        this.toastr.error('Erro ao sincronizar alterações do mapa');
      }
    });
  }

  private aplicarConfiguracaoMapa(config: any): void {
    if (!this.currentMap || !this.phaserGame) {
      console.warn('Mapa ou Phaser não disponível para aplicar configurações');
      return;
    }

    try {
      // 1. Atualiza o modelo local
      this.currentMap = {
        ...this.currentMap,
        nome: config.nome || this.currentMap.nome,
        largura: config.largura ?? this.currentMap.largura,
        altura: config.altura ?? this.currentMap.altura,
        tamanhoHex: config.tamanhoHex ?? this.currentMap.tamanhoHex,
        visivel: config.visivel ?? this.currentMap.visivel
      };

      // 2. Atualiza o estado JSON se existir
      if (this.currentMap.estadoJson) {
        const estado = JSON.parse(this.currentMap.estadoJson);
        estado.configuracoes = {
          ...estado.configuracoes,
          ...config // Mescla as novas configurações
        };
        this.currentMap.estadoJson = JSON.stringify(estado);
      }

      // 3. Redesenha o grid usando seu método existente
      const scene = this.phaserGame.scene.scenes[0];
      if (scene) {
        this.drawHexGrid(scene); // Chama seu método de desenho existente

        // Atualiza visibilidade se necessário
        if (config.visivel !== undefined) {
          scene.children.each(child => {
            if (child.getData('isMapElement')) {
              // Verificação de tipo segura para GameObject
              if ('setVisible' in child && typeof child.setVisible === 'function') {
                child.setVisible(config.visivel);
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

  // Método para salvar configurações
  saveMapConfig(): void {
    if (!this.currentMap || !this.isCriador) return;

    this.isLoading = true;
    const config: ConfiguracaoMapaDto = {
      tipoGrid: 'hexagonal', // ou pegue do estado atual
      tamanhoCelula: this.currentMap.tamanhoHex,
      corGrid: '#cccccc', // ou pegue do estado atual
      snapToGrid: true
    }

    this.mapaService.updateMapConfig(this.mesaId, this.currentMap.mapaId, config).subscribe({
      next: () => {
        this.aplicarConfiguracaoMapa(config);
        this.toastr.success('Configurações salvas e sincronizadas');
      },
      error: (err) => {
        console.error('Erro ao salvar:', err);
        this.toastr.error('Erro ao salvar configurações');
      },
      complete: () => this.isLoading = false
    });
  }

  private atualizarListaMapasAposSalvar(mapaAtualizado: MapaDto): void {
    if (!this.allMaps) return;

    // Se estamos marcando este mapa como visível, desmarca todos os outros
    if (mapaAtualizado.visivel) {
      this.allMaps = this.allMaps.map(m => ({
        ...m,
        visivel: m.mapaId === mapaAtualizado.mapaId
      }));
    } else {
      // Atualiza apenas o mapa modificado
      this.allMaps = this.allMaps.map(m =>
        m.mapaId === mapaAtualizado.mapaId ? mapaAtualizado : m
      );
    }

    // Atualiza o currentMap
    this.currentMap = {
      ...mapaAtualizado,
      imaFundo: this.currentMap?.imaFundo,
      imagemFundo: this.currentMap?.imagemFundo
    };
  }

  private saveMapState(mapaId: number): void {
    // Verificação mais segura de null
    if (!this.currentMap || this.currentMap?.mapaId !== mapaId || this.configuracoesAbertas) {
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

      // Coleta tokens da cena com verificação de tipo mais segura
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

      // Atualiza estado com operador nullish coalescing
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

      // Salva e notifica com verificação adicional
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

  confirmarExclusaoMapa(): void {
    if (!this.currentMapId || this.isCurrentMapVisible()) {
      return;
    }

    const confirmacao = window.confirm(
      'Tem certeza que deseja excluir este mapa permanentemente?\n\n' +
      'Esta ação não pode ser desfeita.'
    );

    if (confirmacao) {
      this.excluirMapa();
    }
  }

  private excluirMapa(): void {
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

  private atualizarListaMapas(): void {
    this.apiService.getTodosMapasPorMesa(this.mesaId).subscribe({
      next: (mapas) => {
        this.allMaps = mapas;

        // Encontra o mapa atual (visível) ou o primeiro disponível
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
    if (!this.currentMapId || !this.allMaps) return false;
    const currentMap = this.allMaps.find(m => m.mapaId === this.currentMapId);
    return currentMap ? currentMap.visivel : false;
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

      // Obtém a posição do drop relativa ao canvas
      const scene = this.phaserGame.scene.scenes[0];
      const canvas = this.phaserGame.canvas;
      const rect = canvas.getBoundingClientRect();

      // Calcula as coordenadas corretas considerando o scroll e offset
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      // Converte para coordenadas do mundo do jogo
      const worldPoint = scene.cameras.main.getWorldPoint(clientX, clientY);
      const hexRadius = this.maps[this.currentMapIndex].hexRadius;

      // Converte para coordenadas de grid
      const gridPos = this.screenToHexGrid(worldPoint.x, worldPoint.y, hexRadius);

      // Converte de volta para coordenadas de tela (centralizado no hexágono)
      const snappedPos = this.hexGridToScreen(gridPos.col, gridPos.row, hexRadius);

      // Debug: mostra as coordenadas
      console.log('Drop position:', {
        client: { x: event.clientX, y: event.clientY },
        canvas: { left: rect.left, top: rect.top },
        relative: { x: clientX, y: clientY },
        world: worldPoint,
        grid: gridPos,
        snapped: snappedPos
      });

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

  // Método para adicionar token
  adicionarTokenAoMapa(token: TokenDto) {
    if (!this.currentMapId) return;

    this.addTokenToMapVisual(token);
    this.mapaService.addToken(this.mesaId, this.currentMapId, token).subscribe({
      error: (err) => {
        console.error('Erro ao adicionar token:', err);
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