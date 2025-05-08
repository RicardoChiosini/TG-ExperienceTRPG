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
import { TokenDto, MapaEstadoDto } from '../../dtos/mapaEstado.dto';
import { Sistema } from '../../models/SistemaModel';
import { FichaStateService } from '../../services/ficha-state.service';

import { FichaDnd5eComponent } from '../fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../fichas/ficha-tormenta20/ficha-tormenta20.component';

// Importações do Phaser
import * as Phaser from 'phaser';

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

  currentMap: MapaDto | null = null;
  mapaCarregado = false;
  allMaps: MapaDto[] = [];
  currentMapId: number = 0;

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
        if (this.currentMapId === mapId) {
          this.currentMap!.estadoJson = mapState;
          this.applyMapChanges(JSON.parse(mapState));
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
        this.allMaps = mapas;
        const mapaAtual = mapas.find(m => m.visivel) || mapas[0];

        // Garante que sempre terá um valor numérico
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
    // Verifica se a ficha já está aberta
    const fichaAberta = this.modalsAbertas.find(m => m.ficha.fichaId === ficha.fichaId);

    if (fichaAberta) {
      // Se já está aberta, traz para frente em vez de não fazer nada
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
    // Limpa qualquer gráfico anterior
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Graphics) {
        child.destroy();
      }
    });

    const graphics = scene.add.graphics();
    const currentMap = this.maps[this.currentMapIndex];
    const hexRadius = currentMap.hexRadius;

    // Calcula o tamanho total do mapa
    const mapWidth = currentMap.gridSize.cols * hexRadius * Math.sqrt(3);
    const mapHeight = currentMap.gridSize.rows * hexRadius * 1.5;

    // Desenha o grid de hexágonos
    for (let y = 0; y < currentMap.gridSize.rows; y++) {
      for (let x = 0; x < currentMap.gridSize.cols; x++) {
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
    const padding = Math.min(mapWidth, mapHeight) * 0.5; // 50% do menor lado
    scene.cameras.main.setBounds(-padding, -padding,
      mapWidth + padding * 2,
      mapHeight + padding * 2);
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

  public toggleGridControls() {
    this.gridControlsVisible = !this.gridControlsVisible;
  }

  zoomPercentual: number = 100; // Valor inicial em 100%
  readonly ZOOM_MINIMO: number = 20;
  readonly ZOOM_MAXIMO: number = 250;
  readonly ZOOM_INCREMENTO: number = 10;

  public zoomIn(): void {
    const novoZoom = Math.min(this.zoomPercentual + this.ZOOM_INCREMENTO, this.ZOOM_MAXIMO);
    this.aplicarZoom(novoZoom);
  }

  public zoomOut(): void {
    const novoZoom = Math.max(this.zoomPercentual - this.ZOOM_INCREMENTO, this.ZOOM_MINIMO);
    this.aplicarZoom(novoZoom);
  }

  private aplicarZoom(novoZoomPercentual: number): void {
    if (!this.phaserGame) return;

    const scene = this.phaserGame.scene.scenes[0];
    const camera = scene.cameras.main;

    // Converte porcentagem para fator de zoom (100% = 1.0)
    const novoZoomFator = novoZoomPercentual / 100;

    camera.zoomTo(novoZoomFator, 200);
    this.zoomPercentual = novoZoomPercentual;
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
    this.apiService.getMapaById(this.mesaId, mapaId).subscribe({
      next: (mapa) => {
        this.currentMap = mapa;
        this.currentMapId = mapa.mapaId;
        this.mapaCarregado = true;

        // Reseta o zoom para 100% ao carregar novo mapa
        this.zoomPercentual = 100;

        this.updatePhaserMap();
      },
      error: (err) => console.error('Erro ao carregar mapa:', err)
    });
  }

  private updatePhaserMap(): void {
    if (!this.phaserGame || !this.currentMap) {
      console.error('Phaser game ou currentMap não está disponível');
      return;
    }

    const scene = this.phaserGame.scene.scenes[0];
    if (!scene) {
      console.error('Cena do Phaser não encontrada');
      return;
    }

    // Encontra ou cria a entrada para o mapa atual
    let mapIndex = this.maps.findIndex(m => m.name === this.currentMap?.nome);
    if (mapIndex === -1) {
      this.maps.push({
        name: this.currentMap.nome,
        gridSize: {
          cols: this.currentMap.largura,
          rows: this.currentMap.altura
        },
        hexRadius: this.currentMap.tamanhoHex
      });
      mapIndex = this.maps.length - 1;
    } else {
      // Atualiza as configurações do mapa existente
      this.maps[mapIndex] = {
        name: this.currentMap.nome,
        gridSize: {
          cols: this.currentMap.largura,
          rows: this.currentMap.altura
        },
        hexRadius: this.currentMap.tamanhoHex
      };
    }

    this.currentMapIndex = mapIndex;
    this.drawHexGrid(scene);

    // Aplica o estado do mapa se existir
    if (this.currentMap.estadoJson) {
      try {
        const estado = JSON.parse(this.currentMap.estadoJson);
        this.applyMapChanges(estado);
      } catch (e) {
        console.error('Erro ao parsear estado do mapa:', e);
      }
    }
  }

  private applyMapChanges(mapState: any): void {
    if (!this.phaserGame || !this.currentMap) {
      console.error('Phaser game ou currentMap não está disponível');
      return;
    }

    const scene = this.phaserGame.scene.scenes[0];
    if (!scene) {
      console.error('Cena do Phaser não encontrada');
      return;
    }

    // Limpa tokens anteriores
    scene.children.each(child => {
      if (child instanceof Phaser.GameObjects.Image ||
        child instanceof Phaser.GameObjects.Sprite) {
        child.destroy();
      }
    });

    // Aplica o novo estado dos tokens
    if (mapState.Tokens && Array.isArray(mapState.Tokens)) {
      mapState.Tokens.forEach((token: TokenDto) => {
        try {
          if (!token.imagemDados) {
            console.error('Token sem dados de imagem:', token);
            return;
          }

          const key = `token-${token.id}`;
          const imageData = token.imagemDados.split(',')[1];
          scene.textures.addBase64(key, imageData);

          const img = scene.add.image(token.x, token.y, key);
          img.setInteractive();

          // Configure draggable se o usuário for o criador
          if (this.isCriador) {
            scene.input.setDraggable(img);

            img.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
              img.x = dragX;
              img.y = dragY;

              // Atualiza o estado local com verificação de nulidade
              if (this.currentMap?.estadoJson) {
                try {
                  const estado = JSON.parse(this.currentMap.estadoJson);
                  const tokenIndex = estado.Tokens.findIndex((t: TokenDto) => t.id === token.id);
                  if (tokenIndex !== -1) {
                    estado.Tokens[tokenIndex].x = dragX;
                    estado.Tokens[tokenIndex].y = dragY;
                    this.onLocalMapChange(estado);
                  }
                } catch (e) {
                  console.error('Erro ao atualizar posição do token:', e);
                }
              }
            });
          }
        } catch (error) {
          console.error('Erro ao criar token visual:', error);
        }
      });
    }
  }

  public onLocalMapChange(mapState: any): void {
    if (!this.isCriador || !this.currentMapId || !mapState?.Tokens) {
      return;
    }

    const minimalState = {
      Tokens: mapState.Tokens.map((t: TokenDto) => ({
        id: t.id,
        x: t.x,
        y: t.y
      }))
    };

    this.sessaoService.sendMapUpdate(
      this.mesaId.toString(),
      this.currentMapId,
      JSON.stringify(minimalState)
    );

    // Verifica se currentMap existe antes de salvar
    if (this.currentMap) {
      this.apiService.salvarEstadoMapa(this.currentMapId, mapState).subscribe({
        error: (err) => console.error('Erro ao salvar estado do mapa:', err)
      });
    }
  }

  saveMapConfig(): void {
    if (this.currentMap && this.isCriador) {
      const config = {
        largura: this.maps[this.currentMapIndex].gridSize.cols,
        altura: this.maps[this.currentMapIndex].gridSize.rows,
        tamanhoHex: this.maps[this.currentMapIndex].hexRadius
      };

      // Envia apenas o mapaId, não o mesaId
      this.apiService.salvarConfigMapa(this.currentMapId, config).subscribe({
        next: () => {
          this.toastr.success('Configurações do mapa salvas');
          this.drawHexGrid(this.phaserGame.scene.scenes[0]);
        },
        error: (err) => this.toastr.error('Erro ao salvar configurações')
      });
    }
  }

  saveMapState(): void {
    if (this.currentMap) {
      const scene = this.phaserGame.scene.scenes[0];
      const tokens: any[] = [];

      // Coleta todos os tokens da cena
      scene.children.each(child => {
        if (child instanceof Phaser.GameObjects.Image ||
          child instanceof Phaser.GameObjects.Sprite) {
          tokens.push({
            id: child.name || Date.now().toString(), // Usa o nome ou um ID temporário
            x: child.x,
            y: child.y,
            imagemUrl: child.texture.key
          });
        }
      });

      const estado = { tokens };

      this.apiService.salvarEstadoMapa(this.currentMapId, estado).subscribe({
        next: () => this.toastr.success('Estado do mapa salvo'),
        error: (err) => this.toastr.error('Erro ao salvar estado do mapa')
      });
    }
  }

  criarNovoMapa(): void {
    if (this.isCriador) {
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
          if (mapa.mapaId) { // Verifica se mapaId existe
            this.allMaps.push(mapa);
            this.mudarMapaAtual(mapa.mapaId);
          } else {
            this.toastr.error('O mapa criado não possui um ID válido');
          }
        },
        error: (err) => this.toastr.error('Erro ao criar mapa')
      });
    }
  }

  mudarMapaAtual(mapaId: number): void {
    if (this.isCriador) {
      this.apiService.atualizarVisibilidadeMapa(this.mesaId, mapaId, true).subscribe({
        next: () => {
          this.currentMapId = mapaId;
          this.carregarMapa(mapaId);
          this.toastr.success('Mapa alterado com sucesso');
        },
        error: (err) => this.toastr.error('Erro ao alterar mapa')
      });
    }
  }

  dragImage(event: DragEvent, img: ImagemDto) {
    // Cria um objeto com todos os dados necessários
    const tokenData = {
      nome: img.nome,
      imagemDados: img.imageUrl,
      extensao: img.extensao,
      usuarioId: this.usuarioId // Adiciona o ID do usuário
    };

    // Converte para JSON e armazena no dataTransfer
    event.dataTransfer?.setData('application/json', JSON.stringify(tokenData));
  }

  allowDrop(event: DragEvent) {
    event.preventDefault(); // Permite que o elemento seja um destino de drop
  }

  onDrop(event: DragEvent) {
    event.preventDefault();

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

      const pointer = this.phaserGame.scene.scenes[0].input.activePointer;

      const worldPoint = this.phaserGame.scene.scenes[0].cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Cria o token com todos os dados
      const newToken: TokenDto = {
        id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID mais único
        nome: tokenData.nome,
        x: worldPoint.x,
        y: worldPoint.y,
        z: 1, // Valor padrão para ordem de empilhamento
        // Mude isso para usar a URL da imagem
        imagemDados: tokenData.imagemDados, // Aqui fica a URL em vez do base64
        donoId: tokenData.usuarioId,
        visivelParaTodos: true,
        bloqueado: false
      };

      this.adicionarTokenAoMapa(newToken);
    } catch (error) {
      console.error("Erro ao processar drop:", error);
      this.toastr.error("Erro ao adicionar token ao mapa");
    }
  }

  adicionarTokenAoMapa(token: TokenDto) {
    if (!this.currentMap) {
      console.error('Mapa atual é nulo');
      return;
    }

    // Obtém tokens existentes ou cria lista vazia
    const currentTokens: TokenDto[] = this.currentMap.estadoJson
      ? JSON.parse(this.currentMap.estadoJson).Tokens || []
      : [];

    // Adiciona o novo token
    const mapState: MapaEstadoDto = {
      Tokens: [...currentTokens, token],
      // Mantém outras propriedades se existirem
      ...(this.currentMap.estadoJson ? JSON.parse(this.currentMap.estadoJson) : {})
    };

    // Salva o estado
    this.apiService.salvarEstadoMapa(this.currentMapId, mapState).subscribe({
      next: () => {
        this.sessaoService.sendMapUpdate(
          this.mesaId.toString(),
          this.currentMapId,
          JSON.stringify(mapState)
        );
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

    try {
      const key = `token-${token.id}`;

      // Usa a imagem a partir da URL. 
      // Verifica se a URL está válida
      if (!token.imagemDados) {
        console.error('Dados da imagem inválidos');
        return;
      }

      // Adiciona a textura a partir do URL
      scene.load.image(key, token.imagemDados); // Agora carrega via URL
      scene.load.start(); // Certifique-se de carregar a imagem antes de adicionar ao cenário

      // Cria o sprite do token
      const sprite = scene.add.sprite(token.x, token.y, key);
      sprite.setInteractive();
      sprite.setData('tokenData', token);

      // Configura arraste apenas para criador ou dono do token
      if (this.isCriador || token.donoId === this.usuarioId) {
        scene.input.setDraggable(sprite);

        sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          sprite.x = dragX;
          sprite.y = dragY;

          // Atualiza o estado local com verificação de nulidade
          if (!this.currentMap?.estadoJson) {
            return;
          }

          try {
            const estado = JSON.parse(this.currentMap.estadoJson) || { Tokens: [] };
            const tokenIndex = estado.Tokens.findIndex((t: TokenDto) => t.id === token.id);

            if (tokenIndex !== -1) {
              estado.Tokens[tokenIndex].x = dragX;
              estado.Tokens[tokenIndex].y = dragY;
              this.onLocalMapChange(estado);
            }
          } catch (e) {
            console.error('Erro ao parsear estadoJson:', e);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar token visual:', error);
      this.toastr.error('Erro ao exibir token no mapa');
    }
  }
}