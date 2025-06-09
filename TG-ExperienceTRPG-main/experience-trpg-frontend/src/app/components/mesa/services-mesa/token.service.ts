// token.service.ts
import { Injectable } from '@angular/core';
import * as Phaser from 'phaser';
import { ApiService } from '../../../services/api.service';
import { MapaService } from '../../../services/mapa.service';
import { MapaStateService } from './mapastate.service';
import { ToastrService } from 'ngx-toastr';
import { TokenDto } from '../../../dtos/mapaEstado.dto';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  // Referência à cena do Phaser (deve ser injetada via setScene)
  private scene: Phaser.Scene | null = null;

  // Propriedades de estado necessárias
  private selectedToken?: Phaser.GameObjects.Sprite;
  private rotationHandle?: Phaser.GameObjects.Arc;
  private resizeHandle?: Phaser.GameObjects.Rectangle;
  private resizeHandles: Phaser.GameObjects.Rectangle[] = [];
  private estadosMapa: { [mapaId: number]: any } = {}; // Ajuste o tipo conforme sua interface
  private currentMapId?: number;     // Deve ser injetado/atribuído externamente
  private mesaId?: number;           // Deve ser injetado/atribuído externamente
  private configuracoesAbertas: boolean = false;
  private isCriador: boolean = false;
  private usuarioId?: number;
  // Exemplo de mapa local – você pode atualizar ou injetar esses dados
  private maps: Array<{ gridSize: { cols: number; rows: number }; hexRadius: number }> = [
    { gridSize: { cols: 30, rows: 30 }, hexRadius: 40 }
  ];
  private currentMapIndex: number = 0;

  constructor(
    private apiService: ApiService,
    private mapaService: MapaService,
    private mapaStateService: MapaStateService,
    private toastr: ToastrService
  ) {}

  // Método para injetar a cena do Phaser no serviço
  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /////////////////////////
  // MÉTODOS DE TOKENS
  /////////////////////////

  public createTokenSprite(textureKey: string, token: TokenDto): void {
    if (!this.scene) {
      console.error("Phaser Scene not set.");
      return;
    }
    try {
      // Verifica se a textura já existe e está pronta
      if (this.scene.textures.exists(textureKey)) {
        const texture = this.scene.textures.get(textureKey);
        if (texture && texture.source.length > 0) {
          this.instantiateToken(textureKey, token);
          return;
        }
      }

      // Configura callbacks para o carregamento da textura
      const onLoad = () => {
        this.scene?.load.off(`filecomplete-image-${textureKey}`, onLoad);
        this.instantiateToken(textureKey, token);
      };

      const onError = () => {
        this.scene?.load.off(`loaderror-image-${textureKey}`, onError);
        console.error(`Falha ao carregar textura: ${textureKey}`);
      };

      this.scene.load.once(`filecomplete-image-${textureKey}`, onLoad);
      this.scene.load.once(`loaderror-image-${textureKey}`, onError);

      // Carrega a imagem da URL ou base64
      if (token.imagemDados.startsWith('http') || token.imagemDados.startsWith('data:')) {
        this.scene.load.image(textureKey, token.imagemDados);
      } else {
        this.scene.textures.addBase64(textureKey, token.imagemDados);
      }

      this.scene.load.start();
    } catch (error) {
      console.error("Erro ao criar token:", error);
    }
  }

  public instantiateToken(textureKey: string, token: TokenDto): void {
    if (!this.scene) {
      console.error("Phaser Scene not set.");
      return;
    }
    const sprite = this.scene.add.sprite(token.x, token.y, textureKey)
      .setInteractive()
      .setData('tokenData', token)
      .setDisplaySize(token.metadados?.width || 80, token.metadados?.height || 80)
      .setDepth(token.z || 1);

    // Desativa interação se as configurações estiverem abertas
    if (this.configuracoesAbertas) {
      sprite.disableInteractive();
    }

    // Aplica rotação se houver nos metadados
    if (token.metadados?.rotation) {
      sprite.setAngle(token.metadados.rotation);
    }

    // Configura a interação de clique para seleção
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.selectToken(sprite);
      }
    });

    // Habilita drag & drop se for o criador ou se o token for do usuário
    if (this.isCriador || token.donoId === this.usuarioId) {
      this.scene.input.setDraggable(sprite);
      this.setupTokenDrag(sprite, token);
    }
  }

  public selectToken(token: Phaser.GameObjects.Sprite): void {
    if (!this.scene) {
      console.error("Phaser Scene not set.");
      return;
    }
    // Remove a seleção anterior (limpa elementos visuais)
    this.clearSelection();
    this.selectedToken = token;

    // Cria um retângulo de seleção
    const selectionRectangle = this.scene.add.rectangle(
      token.x,
      token.y,
      token.displayWidth + 20,
      token.displayHeight + 20
    )
      .setStrokeStyle(2, 0x0066cc)
      .setFillStyle(0, 0)
      .setDepth(token.depth + 1);
    // (Opcional: armazene selectionRectangle se necessário.)

    // Cria alça de rotação
    this.rotationHandle = this.scene.add.circle(
      token.x,
      token.y - token.displayHeight / 2 - 20,
      10,
      0x0066cc
    )
      .setDepth(token.depth + 2)
      .setInteractive({ cursor: 'pointer' });

    // Cria alça de redimensionamento
    this.resizeHandle = this.scene.add.rectangle(
      token.x + token.displayWidth / 2 + 10,
      token.y + token.displayHeight / 2 + 10,
      15,
      15,
      0x0066cc
    )
      .setDepth(token.depth + 2)
      .setInteractive({ cursor: 'nwse-resize' });

    // Configura interações para rotação e redimensionamento
    this.setupRotationHandle();
    this.setupResizeHandle();

    // Feedback visual: aplica um leve tom de cinza ao token selecionado
    token.setTint(0xcccccc);
  }

  public setupTokenDrag(sprite: Phaser.GameObjects.Sprite, token: TokenDto): void {
    if (!this.scene) {
      console.error("Phaser Scene not set.");
      return;
    }
    const originalPosition = { x: token.x, y: token.y };
    const hexRadius = this.maps[this.currentMapIndex].hexRadius;

    sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      try {
        const snapEnabled = this.mapaStateService.getConfiguracoesMapaAtual()?.snapToGrid;
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
        console.error("Erro durante drag:", error);
      }
    });

    sprite.on('dragend', () => {
      const gridPos = this.screenToHexGrid(sprite.x, sprite.y, hexRadius);
      const snappedPos = this.hexGridToScreen(gridPos.col, gridPos.row, hexRadius);
      sprite.x = snappedPos.x;
      sprite.y = snappedPos.y;

      const tokenData = sprite.getData('tokenData') as TokenDto;
      tokenData.x = sprite.x;
      tokenData.y = sprite.y;

      if (this.selectedToken === sprite) {
        this.updateHandlePositions();
      }

      // Atualiza o estado do mapa (considera que currentMapId e estadosMapa estejam definidos)
      const estadoAtual = this.estadosMapa[this.currentMapId!] || {
        tokens: [],
        configuracoes: {
          tipoGrid: 'hexagonal',
          tamanhoCelula: 40,
          corGrid: '#cccccc',
          snapToGrid: true
        }
      };

      const tokenIndex = estadoAtual.tokens.findIndex((t: TokenDto) => t.id === token.id);
      if (tokenIndex !== -1) {
        estadoAtual.tokens[tokenIndex] = tokenData;
      } else {
        estadoAtual.tokens.push(tokenData);
      }
      this.estadosMapa[this.currentMapId!] = estadoAtual;
      this.onLocalMapChange(estadoAtual);
    });
  }

  public setupRotationHandle(): void {
    if (!this.scene || !this.rotationHandle || !this.selectedToken) {
      return;
    }
    let isRotating = false;
    let startAngle = 0;
    let startRotation = 0;
    const ROTATION_SNAP = 45;
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

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isRotating && pointer.isDown) {
        const newAngle = Phaser.Math.Angle.Between(
          this.selectedToken!.x,
          this.selectedToken!.y,
          pointer.x,
          pointer.y
        );
        const rotationDelta = Phaser.Math.Angle.Wrap(newAngle - startAngle);
        const newRotation = startRotation + Phaser.Math.RadToDeg(rotationDelta);
        const targetRotation = Math.round(newRotation / ROTATION_SNAP) * ROTATION_SNAP;
        if (Math.abs(targetRotation - lastSnappedRotation) >= ROTATION_SNAP) {
          lastSnappedRotation = targetRotation;
        }
        this.selectedToken!.setAngle(lastSnappedRotation);
        this.updateHandlePositions();
      }
    });

    this.scene.input.on('pointerup', () => {
      if (isRotating) {
        isRotating = false;
        const finalRotation = Math.round(this.selectedToken!.angle / ROTATION_SNAP) * ROTATION_SNAP;
        this.selectedToken!.setAngle(finalRotation);
        this.updateHandlePositions();
        this.saveTokenState();
      }
    });
  }

  public setupResizeHandle(): void {
    if (!this.scene || !this.resizeHandle || !this.selectedToken) {
      return;
    }
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

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isResizing && pointer.isDown) {
        const deltaX = pointer.x - startPointerX;
        let newWidth = startWidth + deltaX; // ajuste conforme necessário
        let newHeight = newWidth / originalAspectRatio;

        const MIN_TOKEN_SIZE = 40;
        const MAX_TOKEN_SIZE = 20000;
        newWidth = Phaser.Math.Clamp(newWidth, MIN_TOKEN_SIZE, MAX_TOKEN_SIZE);
        newHeight = Phaser.Math.Clamp(newHeight, MIN_TOKEN_SIZE, MAX_TOKEN_SIZE);

        this.selectedToken!.setDisplaySize(newWidth, newHeight);
        this.updateResizeHandles();
        this.updateSelectionRectangle();
      }
    });

    this.scene.input.on('pointerup', () => {
      isResizing = false;
      this.saveTokenState();
    });
  }

  public saveTokenState(): void {
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
        mapaId: this.currentMapId,
        metadados: metadados
      };

      const estadoAtual = this.estadosMapa[this.currentMapId] || {
        tokens: [],
        configuracoes: {
          tipoGrid: 'hexagonal',
          tamanhoCelula: 40,
          corGrid: '#cccccc',
          snapToGrid: true
        }
      };

      const tokenIndex = estadoAtual.tokens.findIndex((t: TokenDto) => t.id === tokenAtualizado.id);
      if (tokenIndex !== -1) {
        estadoAtual.tokens[tokenIndex] = tokenAtualizado;
      } else {
        estadoAtual.tokens.push(tokenAtualizado);
      }

      this.apiService.salvarEstadoMapa(this.currentMapId, estadoAtual).pipe(
        switchMap(() =>
          this.mapaService.sendMapUpdate(
            this.mesaId!,
            this.currentMapId!,
            JSON.stringify({ tokens: [tokenAtualizado] })
          )
        )
      ).subscribe({
        next: () => {
          this.estadosMapa[this.currentMapId!] = estadoAtual;
          // Atualize currentMap.estadoJson se necessário.
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

  public adicionarTokenAoMapa(token: TokenDto): void {
    if (!this.currentMapId || !this.mesaId) {
      console.error('Mapa atual é nulo');
      return;
    }

    const currentState = this.estadosMapa[this.currentMapId] || {
      tokens: [],
      configuracoes: {
        tipoGrid: 'hexagonal',
        tamanhoCelula: 40,
        corGrid: '#cccccc',
        snapToGrid: true
      }
    };

    currentState.tokens = [...(currentState.tokens || []), token];
    this.estadosMapa[this.currentMapId] = currentState;

    this.addTokenToMapVisual(token);

    this.apiService.salvarEstadoMapa(this.currentMapId, currentState).pipe(
      switchMap(() =>
        this.mapaService.sendMapUpdate(
          this.mesaId!,
          this.currentMapId!,
          JSON.stringify({ tokens: [token] })
        )
      )
    ).subscribe({
      error: (err) => {
        console.error('Erro ao salvar estado do mapa:', err);
        this.toastr.error('Erro ao adicionar token ao mapa');
      }
    });
  }

  public updateExistingToken(textureKey: string, token: TokenDto): void {
    if (!this.scene) {
      console.error("Phaser Scene not set.");
      return;
    }
    const existingSprite = this.scene.children.getByName(token.id) as Phaser.GameObjects.Sprite;
    if (existingSprite) {
      existingSprite.setPosition(token.x, token.y);
      existingSprite.setDepth(token.z);
    } else {
      this.createTokenSprite(textureKey, token);
    }
  }

  public addTokenToMapVisual(token: TokenDto): void {
    if (!this.scene) {
      console.error("Phaser Scene not set.");
      return;
    }
    const textureKey = `token-${token.id}`;
    if (this.scene.textures.exists(textureKey)) {
      this.updateExistingToken(textureKey, token);
    } else {
      if (token.imagemDados.startsWith('http') || token.imagemDados.startsWith('data:')) {
        this.scene.load.image(textureKey, token.imagemDados);
      } else {
        console.warn('Token usando formato antigo de imagem');
        this.scene.textures.addBase64(textureKey, token.imagemDados);
      }
      this.scene.load.once(`filecomplete-image-${textureKey}`, () => {
        this.createTokenSprite(textureKey, token);
      });
      this.scene.load.start();
    }
  }

  // Métodos auxiliares (stubs) – implemente conforme a lógica da sua aplicação.
  private screenToHexGrid(x: number, y: number, hexRadius: number): { col: number; row: number } {
    // Converta as coordenadas da tela para coordenadas do grid hexagonal
    return { col: 0, row: 0 };
  }

  private hexGridToScreen(col: number, row: number, hexRadius: number): { x: number; y: number } {
    // Converta as coordenadas do grid para posições na tela
    return { x: 0, y: 0 };
  }

  private updateHandlePositions(): void {
    console.log('updateHandlePositions() chamado');
    // Atualize as posições das alças de rotação e redimensionamento conforme a posição do token
  }

  private updateResizeHandles(): void {
    console.log('updateResizeHandles() chamado');
    // Atualize as posições das alças de redimensionamento
  }

  private updateSelectionRectangle(): void {
    console.log('updateSelectionRectangle() chamado');
    // Atualize o retângulo de seleção para seguir as dimensões do token
  }

  private clearSelection(): void {
    if (!this.scene) {
      return;
    }
    if (this.selectedToken) {
      this.selectedToken.clearTint();
      this.selectedToken = undefined;
    }
    if (this.rotationHandle) {
      this.rotationHandle.destroy();
      this.rotationHandle = undefined;
    }
    if (this.resizeHandle) {
      this.resizeHandle.destroy();
      this.resizeHandle = undefined;
    }
    console.log('clearSelection() chamado');
  }

  // Stub para gerir mudanças locais no estado do mapa
  private onLocalMapChange(estadoAtual: any): void {
    console.log('onLocalMapChange() chamado com:', estadoAtual);
    // Implemente a sincronização ou atualização local do estado do mapa
  }
}
