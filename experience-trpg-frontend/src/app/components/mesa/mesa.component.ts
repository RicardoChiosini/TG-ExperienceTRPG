import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { lastValueFrom, of, Subject, Subscription } from 'rxjs';
import { catchError, filter, switchMap, take, takeUntil, tap } from 'rxjs/operators';

// Serviços
import { ChatService } from '../../services/chat.service';
import { MapaService } from '../../services/mapa.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { FichaStateService } from '../../services/ficha-state.service';

// Serviços do Mapa
import { ImageService } from './services-mesa/image.service';
import { MapaStateService } from './services-mesa/mapastate.service';
import { PhaserGameService } from './services-mesa/phasergame.service';

// DTOs e Modelos
import { FichaDto } from '../../dtos/ficha.dto';
import { ImagemDto } from '../../dtos/imagem.dto';
import { MapaDto } from '../../dtos/mapa.dto';
import { MapaConfigDto } from '../../dtos/mapaconfig.dto';
import { TokenDto, ConfiguracaoMapaDto, MapaEstadoDto } from '../../dtos/mapaEstado.dto';
import { FichaDnd5eComponent } from '../fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../fichas/ficha-tormenta20/ficha-tormenta20.component';

@Component({
  selector: 'app-mesa',
  standalone: false,
  templateUrl: './mesa.component.html',
  styleUrls: ['./mesa.component.css'],
  providers: [ImageService, MapaStateService, PhaserGameService]
})
export class MesaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameContainer', { static: false }) gameContainer!: ElementRef;

  // Estado do componente
  activeTab: string = 'chat';
  mesaId: number = 0;
  usuarioId: number = 0;
  isCriador: boolean = false;
  linkConvite: string | null = null;
  isLoading: boolean = true;
  zoomPercentual: number = 100;
  isZooming: boolean = false;

  private subscriptions = new Subscription();
  private destroy$ = new Subject<void>();

  // Dados
  fichas: FichaDto[] = [];
  modalsAbertas: any[] = [];
  imagemFundoUrl: string | null = null;
  public showImageSelector: boolean = false;
  public mesaImages: ImagemDto[] = [];
  public debugMode: boolean = true;

  loadedTabs: { [key: string]: boolean } = {
    chat: false,
    fichas: false,
    imagens: false,
    config: false
  };
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
    private fichaStateService: FichaStateService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
    // Serviços do mapa
    public imageService: ImageService,
    public mapaStateService: MapaStateService,
    public phaserGameService: PhaserGameService,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.mesaId = +this.route.snapshot.paramMap.get('id')!;
    this.usuarioId = this.authService.getUserId()!;

    // Inicializa a aba ativa
    this.activeTab = 'fichas';
    this.loadedTabs['fichas'] = true;

    // Configura serviços que não dependem da view
    this.setupServices();

    // Carrega dados iniciais
    this.carregarDadosIniciais();
  }

  private setupServices(): void {
    // Compartilhe a mesaId e usuarioId com os serviços
    this.imageService.setMesaId(this.mesaId);
    if (this.mapaStateService.currentMap) {
      this.imageService.setCurrentMap(this.mapaStateService.currentMap);
    }
    this.mapaStateService.setMesaId(this.mesaId);
    this.mapaStateService.setIsCriador(this.isCriador);
    this.phaserGameService.usuarioId = this.usuarioId;

    // Configura listeners do mapa
    this.mapaStateService.setupMapaListeners();
  }
  private async carregarDadosIniciais(): Promise<void> {
    // 1. Verifica se é criador
    this.verificarCriador();

    // 2. Carrega fichas
    this.carregarFichas();

    // 3. Carrega imagens
    this.imageService.carregarImagensDaMesa().subscribe();

    // 4. Carrega mapas
    await this.mapaStateService.atualizarListaMapas();

    // 5. Se já houver um mapa selecionado, carrega o estado inicial
    if (this.mapaStateService.currentMapId) {
      await this.mapaStateService.loadInitialMapState(this.mapaStateService.currentMapId);
    }

    // 5. Conecta ao chat com verificação de estado
    this.chatService.joinMesaGroup(this.mesaId).then(() => {
      this.recursosCarregados.chat = true;
      this.verificarCarregamentoCompleto();

    }).catch((error) => {
      console.error('Erro ao conectar ao hub de Chat:', error);
      this.recursosCarregados.chat = true;
      this.verificarCarregamentoCompleto();
    });

    this.setActiveTab('chat');

    // 6. Configura listeners para atualizações em tempo real
    this.configurarListeners();
  }

  private configurarListeners(): void {
    // Limpa subscriptions antigas
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    this.subscriptions.add(
      this.imageService.imagesUpdated.subscribe(() => {
        console.log('Lista de imagens atualizada');
      })
    );
    this.imageService.carregarImagensDaMesa().subscribe();

    // Listener para atualizações de estado do mapa
    this.subscriptions.add(
      this.mapaService.estadoUpdates$.pipe(
        filter(estado => estado.mapaId === this.mapaStateService.currentMapId)
      ).subscribe(estado => {
        console.log('Estado recebido:', estado);
        this.phaserGameService.applyMapChanges(estado);
      })
    );

    // Listener para atualizações de background
    this.subscriptions.add(
      this.mapaService.backgroundImageUpdates$.pipe(
        filter(({ mapaId }) => mapaId === this.mapaStateService.currentMapId)
      ).subscribe(({ imagem }) => {
        this.imageService.atualizarImagemFundo(imagem); // Agora recebe o objeto completo
      })
    );

    // Listener para atualizações de configuração
    this.subscriptions.add(
    this.mapaService.configUpdates$.pipe(
        filter(({ mapaId }) => mapaId === this.mapaStateService.currentMap?.mapaId)
    ).subscribe(({ mapaId, mapaDto }) => {
        console.log('Atualização completa do mapa recebida:', mapaDto);
        
        // 1. Atualizar estado local
        this.mapaStateService.currentMap = { ...this.mapaStateService.currentMap, ...mapaDto };
        this.phaserGameService.setCurrentMapData(this.mapaStateService.currentMap);

        // 2. Atualizar lista de mapas
        this.mapaStateService.atualizarListaMapasAposSalvar(this.mapaStateService.currentMap);

        // 3. Redesenhar grid se necessário
        if (this.phaserGameService.phaserGame) {
            const scene = this.phaserGameService.phaserGame.scene.scenes[0];
            if (scene) {
                this.phaserGameService.drawHexGrid(scene);
            }
        }
    })
);
  }

  async ngAfterViewInit(): Promise<void> {
    this.phaserGameService.setGameContainer(this.gameContainer.nativeElement);
    this.phaserGameService.initializePhaserGame();
  }

  private setupPhaserGame(): void {
    if (!this.gameContainer?.nativeElement) {
      console.error('Game container not found in DOM');
      setTimeout(() => this.setupPhaserGame(), 100); // Tentar novamente após 100ms
      return;
    }

    // Configura o container primeiro
    this.phaserGameService.setGameContainer(this.gameContainer.nativeElement);

    // Depois inicializa o jogo
    this.phaserGameService.initializePhaserGame();

    // Configura outros serviços
    this.setupOtherServices();
  }

  private setupOtherServices(): void {
    const phaserGame = this.phaserGameService.getPhaserGame();
    if (!phaserGame) {
      console.error('Phaser game not initialized');
      return;
    }
    // Set the Phaser game in the services that need it
    this.imageService.setPhaserGame(phaserGame);
    this.mapaStateService.setPhaserGame(phaserGame);
    // If there is a current map, draw the grid and background
    if (this.mapaStateService.currentMap && phaserGame.scene) {
      const scene = phaserGame.scene.scenes[0];
      this.phaserGameService.drawHexGrid(scene);
      // Also, load the background image if exists
      const textureKey = `mapBackground_${this.mapaStateService.currentMap.mapaId}`;
      const imageUrl = this.mapaStateService.getImagemFundoUrl();
      this.phaserGameService.carregarImagemFundoPhaser(scene, textureKey, imageUrl);
    }
  }

  ngOnDestroy(): void {
    // Limpeza
    if (this.phaserGameService) {
      this.phaserGameService.cleanupTextures();
      this.phaserGameService.destroyGame(); // Add this method to PhaserGameService
    }

    if (this.chatService) {
      this.chatService.leaveMesaGroup(this.mesaId.toString());
    }

    this.mapaService.leaveMesaGroup(this.mesaId.toString());

    this.subscriptions.unsubscribe();
  }

  // Métodos do template
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Métodos de ficha
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

  // Métodos de criador
  verificarCriador(): void {
    const usuarioId = this.authService.getUserId();
    this.apiService.getMesaPorId(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (mesa: any) => {
          this.isCriador = mesa.criadorId === usuarioId;

          // Atualiza o estado no MapaStateService
          this.mapaStateService.setIsCriador(this.isCriador);
          this.mapaStateService.setIsCriador(this.isCriador);
          this.phaserGameService.isCriador = this.isCriador;

          if (this.isCriador) {
            this.obterLinkConvite();
          }
          this.recursosCarregados.criador = true;
          this.verificarCarregamentoCompleto();
        },
        (error) => {
          console.error('Erro ao carregar dados da mesa:', error);
          // Assume não é criador em caso de erro
          this.mapaStateService.setIsCriador(false);
          this.recursosCarregados.criador = true;
          this.verificarCarregamentoCompleto();
        }
      );
  }

  obterLinkConvite(): void {
    this.apiService.getConvitePorMesaId(this.mesaId).subscribe({
      next: (token) => {
        this.linkConvite = `${window.location.origin}/mesa/${this.mesaId}/convite/${token}`;
      },
      error: (error) => console.error('Erro ao obter convite:', error)
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Link copiado para a área de transferência');
    }).catch(err => {
      console.error('Erro ao copiar texto:', err);
      this.toastr.error('Erro ao copiar link');
    });
  }

  // Métodos de zoom
  zoomIn(): void {
    this.zoomPercentual += 10;
    this.phaserGameService.setCameraZoom(this.zoomPercentual);
  }

  zoomOut(): void {
    this.zoomPercentual -= 10;
    this.phaserGameService.setCameraZoom(this.zoomPercentual);
  }

  // Métodos de drag and drop
  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    console.log('Drop event triggered', event);
    console.log('Current map ID:', this.mapaStateService.currentMapId);

    const estadoAtual = this.mapaStateService.getEstadoMapaAtual();
    console.log('Estado atual:', estadoAtual);
    if (!this.mapaStateService.currentMapId || !this.mapaStateService.currentMap) {
      this.toastr.warning('Nenhum mapa carregado para adicionar tokens');
      return;
    }
    event.preventDefault();

    const data = event.dataTransfer?.getData('text/plain');
    if (!data) return;

    try {
      const tokenData = JSON.parse(data);
      const pointer = this.phaserGameService.getPhaserGame()?.scene.scenes[0]?.input.activePointer;

      if (pointer && this.mapaStateService.currentMapId) {
        const worldPoint = pointer.position;

        // Garantir que temos um estado válido
        const estadoAtual = this.mapaStateService.getEstadoMapaAtual();
        const tokens = estadoAtual.tokens || []; // Fallback para array vazio

        const newToken: TokenDto = {
          id: `token-${Date.now()}`,
          nome: tokenData.nome,
          x: worldPoint.x,
          y: worldPoint.y,
          z: 1,
          imagemDados: tokenData.imageUrl,
          donoId: this.usuarioId,
          visivelParaTodos: true,
          bloqueado: false,
          mapaId: this.mapaStateService.currentMapId,
          metadados: {}
        };

        // Atualizar o estado local
        estadoAtual.tokens = [...tokens, newToken];

        this.mapaStateService.adicionarTokenAoMapa(newToken);
      }
    } catch (error) {
      console.error('Erro ao processar drop:', error);
      this.toastr.error('Erro ao adicionar token ao mapa');
    }
  }

  // Métodos do template que delegam para os serviços
  toggleGridControls(): void {
    this.mapaStateService.toggleGridControls();
    this.atualizarImagemFundoUrl();
  }

  criarNovoMapa(): void {
    this.mapaStateService.criarNovoMapa();
  }

  confirmarExclusaoMapa(): void {
    this.mapaStateService.confirmarExclusaoMapa();
  }

  async mudarMapaAtual(mapaId: number): Promise<void> {
    this.showImageSelector = false;
    await this.mapaStateService.mudarMapaAtual(mapaId);

    const novoMapa = this.mapaStateService.currentMap;
    if (!novoMapa) return;

    // Atualiza ImageService com mapa básico
    this.imageService.setCurrentMap(novoMapa);

    if (novoMapa.imagemFundo) {
      try {
        const imagemDetalhes = await this.apiService.getImagemPorId(novoMapa.imagemFundo).toPromise();
        novoMapa.imaFundo = imagemDetalhes;

        // ATUALIZA ESTADO GLOBAL DO MAPA
        this.mapaStateService.setCurrentMap(novoMapa);

        // ATUALIZA IMAGE SERVICE COM DETALHES
        this.imageService.setCurrentMap(novoMapa); // <--- ESSENCIAL!

        // Atualiza Phaser
        const textureKey = `mapBackground_${novoMapa.mapaId}`;
        const imageUrl = this.imageService.getImageUrl(imagemDetalhes);
        const phaserGame = this.phaserGameService.getPhaserGame();

        if (phaserGame?.scene?.scenes.length) {
          const scene = phaserGame.scene.scenes[0];
          this.phaserGameService.carregarImagemFundoPhaser(scene, textureKey, imageUrl);
        }
      } catch (error) {
        console.error('Erro ao carregar imagem:', error);
      }
    } else {
      const textureKey = `mapBackground_${novoMapa.mapaId}`;
      this.phaserGameService.clearBackground(textureKey);
    }

    // Força atualização do template
    this.atualizarImagemFundoUrl();
    setTimeout(() => {
      this.cdRef.markForCheck();
      this.cdRef.detectChanges();
    }, 0);
  }

  async saveMapConfig(): Promise<void> {
    if (!this.mapaStateService.currentMap) {
      console.warn('Nenhum mapa atual para salvar');
      return;
    }

    try {
      // 1. Salva as configurações no servidor
      await this.mapaStateService.saveMapConfig();

      // 2. Obtém o mapa atualizado - considere clonar para evitar mutações
      const mapaAtualizado = { ...this.mapaStateService.currentMap };

      // 3. Debug logs
      console.debug('Salvando mapa:', mapaAtualizado.mapaId, 'com imagemFundo:', mapaAtualizado.imagemFundo);

      // 4. Se houver imagem de fundo, carrega os detalhes
      if (mapaAtualizado.imagemFundo) {
        try {
          const imagemDetalhes = await this.apiService.getImagemPorId(mapaAtualizado.imagemFundo).toPromise();

          if (!imagemDetalhes) {
            throw new Error('Detalhes da imagem não retornados');
          }

          mapaAtualizado.imaFundo = imagemDetalhes;
          const textureKey = `mapBackground_${mapaAtualizado.mapaId}`;
          const imageUrl = this.imageService.getImageUrl(imagemDetalhes);

          // Verifica acessibilidade da imagem
          await this.verifyImageAccessibility(imageUrl);

          const phaserGame = this.phaserGameService.getPhaserGame();
          if (!phaserGame?.scene?.scenes?.length) {
            throw new Error('Cena do Phaser não disponível');
          }

          const scene = phaserGame.scene.scenes[0];
          await this.phaserGameService.carregarImagemFundoPhaser(scene, textureKey, imageUrl);

        } catch (error) {
          console.error('Erro ao carregar imagem de fundo:', error);
          this.toastr.warning('Imagem de fundo não pôde ser carregada');
        }
      } else {
        // Limpa a imagem de fundo se não houver
        const textureKey = `mapBackground_${mapaAtualizado.mapaId}`;
        this.phaserGameService.clearBackground(textureKey);
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      this.toastr.error('Erro ao salvar configurações');
    }
  }

  private async verifyImageAccessibility(url: string): Promise<void> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Imagem não acessível`);
    }
  }

  // Métodos para controle da UI
  abrirSeletorImagens(): void {
    // Carrega as imagens se necessário
    if (!this.mesaImages || this.mesaImages.length === 0) {
      this.imageService.carregarImagensDaMesa().subscribe({
        next: (imagens: ImagemDto[]) => {
          this.mesaImages = imagens;
          this.showImageSelector = true;
          this.cdRef.detectChanges();
        },
        error: (err: any) => {
          console.error('Erro ao carregar imagens:', err);
          this.toastr.error('Erro ao carregar imagens');
        }
      });
    } else {
      this.showImageSelector = true;
      this.cdRef.detectChanges();
    }
  }

  get temImagemDeFundo(): boolean {
    return this.imageService.temImagemDeFundo();
  }

  // Método para atualizar a URL (chame manualmente nos eventos necessários)
  atualizarImagemFundoUrl(): void {
    const baseUrl = this.imageService.temImagemDeFundo()
      ? this.imageService.getImagemFundoUrl()
      : null;

    // Adiciona timestamp para forçar recarregamento
    this.imagemFundoUrl = baseUrl
      ? `${baseUrl}?t=${new Date().getTime()}`
      : null;
  }

  async selecionarImagemFundo(image: ImagemDto): Promise<void> {
    try {
      if (!this.mapaStateService.currentMap?.mapaId) {
        this.toastr.warning('Nenhum mapa selecionado');
        return;
      }

      // 1. Atualiza via API (aguarda conclusão)
      await this.imageService.selecionarImagemFundo(image);

      // 2. Atualiza o estado local
      this.mapaStateService.currentMap = {
        ...this.mapaStateService.currentMap,
        imaFundo: image,
        imagemFundo: image.imagemId
      };

      // 3. Força atualização da UI
      this.cdRef.detectChanges();
      this.showImageSelector = false;
      this.toastr.success('Imagem de fundo atualizada');
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
      this.toastr.error('Erro ao atualizar imagem de fundo');
    }
    this.atualizarImagemFundoUrl();
  }

  async removerImagemFundo(): Promise<void> {
    if (!this.mapaStateService.currentMap?.mapaId) {
      this.toastr.warning('Nenhum mapa selecionado');
      return;
    }

    try {
      // 1. Remove via API (aguarda conclusão)
      await this.imageService.removerImagemFundo();

      // 2. Atualiza estado local
      this.mapaStateService.currentMap = {
        ...this.mapaStateService.currentMap,
        imaFundo: undefined,
        imagemFundo: 0
      };

      // 3. Força atualização da UI
      this.cdRef.detectChanges();
      this.toastr.success('Imagem removida');
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      this.toastr.error('Erro ao remover imagem');
    }
  }
}