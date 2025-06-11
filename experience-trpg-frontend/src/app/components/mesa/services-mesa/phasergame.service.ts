// phaser-game.service.ts
import { Injectable, EventEmitter } from '@angular/core';
import * as Phaser from 'phaser';
import { MapaDto } from '../../../dtos/mapa.dto';
import { MapaEstadoDto, TokenDto } from '../../../dtos/mapaEstado.dto';
import { ImagemDto } from '../../../dtos/imagem.dto';
import { ImageService } from './image.service';
import { Subject } from 'rxjs';

export interface HexGridConfig {
    cols: number;
    rows: number;
    hexRadius: number;
    name?: string;
}

interface CubeCoord {
    x: number;
    y: number;
    z: number;
}

interface AxialCoord {
    q: number;
    r: number;
}

@Injectable({
    providedIn: 'root'
})
export class PhaserGameService {
    private readonly GRID_FILL_COLOR = 0x2d2d2d;  // Cinza escuro
    private readonly GRID_FILL_ALPHA = 0.3;       // 30% de opacidade
    private readonly GRID_LINE_COLOR = 0x555555;  // Cinza médio
    private readonly GRID_LINE_WIDTH = 2;

    public phaserGame: Phaser.Game | null = null;
    private gameContainer: HTMLElement | null = null;  // Será injetado via setter
    private gridContainer: Phaser.GameObjects.Container | null = null;
    private backgroundImage: Phaser.GameObjects.Image | null = null;

    // Propriedades de estado que, antes, estavam no componente
    private mapaCarregado: boolean = false;
    private maps: Array<{ gridSize: { cols: number, rows: number }, hexRadius: number }> = [
        { gridSize: { cols: 30, rows: 30 }, hexRadius: 40 }
    ];
    private currentMapIndex: number = 0;
    private zoomPercentual: number = 100;
    private configuracoesAbertas: boolean = false;
    private estadosMapa: { [mapaId: number]: MapaEstadoDto } = {};
    public currentMap: MapaDto | null = null;
    public get currentMapId(): number | null {
        return this.currentMap?.mapaId || null;
    }

    // Propriedades para seleção de token
    private keyboardSetupDone: boolean = false;
    onTokenSelected = new Subject<TokenDto>();
    onTokenDeselected = new Subject<void>();
    onTokenRemoved = new Subject<string>();
    private selectedToken: Phaser.GameObjects.Sprite | null = null;
    private selectionRectangle: Phaser.GameObjects.Graphics | null = null;
    private resizeHandle: Phaser.GameObjects.Ellipse | null = null;
    private tokenSprites: { [id: string]: Phaser.GameObjects.Sprite } = {};

    // Propriedades de estado (serão fornecidas externamente)
    public isCriador: boolean = false;
    public usuarioId?: number;
    public mesaId?: number;

    public onTokenUpdated = new EventEmitter<{ token: TokenDto, changes: any }>();
    public onTokenAdded = new EventEmitter<TokenDto>();
    public onTokenDeleteRequested = new Subject<string>();

    public get activeScene(): Phaser.Scene | null {

        if (!this.phaserGame) return null;

        return this.phaserGame.scene.scenes[0];

    }

    // Configuração padrão do Phaser
    private defaultConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'gameContainer',
        backgroundColor: '#1a1a1a',
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
    constructor() {
    }

    /**
     * Injeta o container DOM para o jogo.
     */
    public setGameContainer(container: HTMLElement): void {
        this.gameContainer = container;
    }

    public setPhaserGame(game: Phaser.Game): void {
        this.phaserGame = game;
    }

    /**
     * Permite ajustar o mapa atual e o estado de carregamento.
     */
    public setCurrentMapData(mapData: any): void {
        this.currentMap = mapData;
        this.mapaCarregado = true;

        // Se o jogo já estiver inicializado, atualiza imediatamente
        if (this.phaserGame) {
            this.updatePhaserMap();
        }
    }

    public initializePhaserGame(): void {
        if (!this.gameContainer) {
            console.error('Game container não definido. Utilize setGameContainer() primeiro.');
            return;
        }
        if (!this.phaserGame) {
            this.phaserGame = new Phaser.Game({
                ...this.defaultConfig,
                parent: this.gameContainer
            });
            // Atualiza o mapa se já estiver carregado.
            if (this.mapaCarregado && this.currentMap) {
                this.updatePhaserMap();
            }
        }
    }

    public destroyGame(): void {
        if (this.phaserGame) {
            this.phaserGame.destroy(true);
        }
        this.phaserGame = null;
        this.gameContainer = null;
    }

    public getPhaserGame(): Phaser.Game | null {
        return this.phaserGame ?? null;
    }

    public preload(): void {
        // Lógica de preload do Phaser (carregamento de assets, etc.)
    }

    public create(): void {
        // Verificação de segurança
        if (!this.phaserGame) {
            console.error('Phaser Game não está inicializado');
            return;
        }

        const scene = this.phaserGame.scene.scenes[0];

        // Verificação adicional para a cena
        if (!scene) {
            console.error('Cena do Phaser não encontrada');
            return;
        }

        // Inicializa o container do grid.
        this.gridContainer = scene.add.container(0, 0);

        // Desenha o grid e configura os controles da câmera.
        this.drawHexGrid(scene);
        this.setupCameraControls(scene);

        // Re-desenha o grid em caso de redimensionamento.
        scene.scale.on('resize', () => {
            this.drawHexGrid(scene);
        });
    }

    public update(): void {
        // Lógica contínua do loop de atualização (se necessário).
    }

    private setupKeyboardShortcuts(scene: Phaser.Scene): void {
        try {
            const keyboard = scene.input.keyboard;

            if (!keyboard) {
                console.warn('Keyboard plugin not available in scene');
                return;
            }

            // Configurar tecla DELETE
            keyboard.on('keydown-DELETE', (event: KeyboardEvent) => {
                if (this.selectedToken) {
                    const tokenId = this.selectedToken.name.replace('token-', '');
                    // Emite evento de solicitação de exclusão
                    this.onTokenDeleteRequested.next(tokenId);
                    this.clearSelection();
                }
            });

            // Configurar ESC para limpar seleção
            keyboard.on('keydown-ESC', (event: KeyboardEvent) => {
                this.clearSelection();
            });

        } catch (error) {
            console.error('Error setting up keyboard shortcuts:', error);
        }
    }

    private setupCanvasFocus(scene: Phaser.Scene): void {
        const canvas = scene.game.canvas;
        if (!canvas) return;

        canvas.tabIndex = -1;

        scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const hitObjects = scene.input.hitTestPointer(pointer);
            if (hitObjects.length === 0 ||
                (hitObjects.length === 1 && hitObjects[0] instanceof Phaser.GameObjects.Graphics)) {
                // Só focar se clicar em área vazia do mapa
                canvas.focus();
            }
        });
    }

    public drawHexGrid(scene: Phaser.Scene, config?: HexGridConfig): void {
        if (this.gridContainer) {
            this.gridContainer.destroy(true);
            this.gridContainer = null;
        }

        const gridConfig = config || this.getCurrentGridConfig();
        const hexRadius = gridConfig.hexRadius;
        const cols = gridConfig.cols;
        const rows = gridConfig.rows;

        // Criar novo container
        this.gridContainer = scene.add.container(0, 0);
        const graphics = scene.add.graphics().setData('gridElement', true);
        this.gridContainer.add(graphics);

        // Configurar profundidade do grid
        if (this.gridContainer) {
            this.gridContainer.setDepth(10); // ⭐ Camada intermediária
        }

        // Configurar profundidade do fundo
        if (this.backgroundImage) {
            this.backgroundImage.setDepth(0); // ⭐ Camada inferior
        }

        // Desenha o grid hexagonal
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let xPos = x * hexRadius * Math.sqrt(3);
                const yPos = y * hexRadius * 1.5;

                if (y % 2 !== 0) {
                    xPos += (hexRadius * Math.sqrt(3)) / 2;
                }

                graphics.fillStyle(this.GRID_FILL_COLOR, this.GRID_FILL_ALPHA);
                this.drawHexagon(graphics, xPos, yPos, hexRadius, true);

                graphics.lineStyle(this.GRID_LINE_WIDTH, this.GRID_LINE_COLOR, 1);
                this.drawHexagon(graphics, xPos, yPos, hexRadius, false);
            }
        }

        // Atualiza os limites da câmera
        const mapWidth = cols * hexRadius * Math.sqrt(3);
        const mapHeight = rows * hexRadius * 1.5;
        const padding = Math.min(mapWidth, mapHeight) * 0.5;
        scene.cameras.main.setBounds(-padding, -padding, mapWidth + padding * 2, mapHeight + padding * 2);

        // Recriar imagem de fundo se existir
        if (this.currentMap?.imaFundo) {
            const textureKey = `mapBackground_${this.currentMap.mapaId}`;
            const imageUrl = this.getImageUrl(this.currentMap.imaFundo);
            this.carregarImagemFundoPhaser(scene, textureKey, imageUrl);
        }
        // Ajusta os limites da câmera
        this.ajustarCameraParaNovoGrid();
    }

    private drawHexagon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, fill: boolean): void {
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

    private screenToHexGrid(x: number, y: number, hexRadius: number): { col: number, row: number } {
        const size = hexRadius;
        const q = (x * Math.sqrt(3) / 3 - y / 3) / size;
        const r = y * 2 / 3 / size;

        const cube = this.axialToCube(q, r);
        const rounded = this.roundCube(cube);
        const axial = this.cubeToAxial(rounded);

        return {
            col: Math.round(axial.q),
            row: Math.round(axial.r)
        };
    }

    private hexGridToScreen(col: number, row: number, hexRadius: number): { x: number, y: number } {
        const size = hexRadius;
        const x = size * Math.sqrt(3) * (col + row / 2);
        const y = size * 3 / 2 * row;

        return { x, y };
    }

    private axialToCube(q: number, r: number): CubeCoord {
        return {
            x: q,
            z: r,
            y: -q - r
        };
    }

    private cubeToAxial(cube: CubeCoord): AxialCoord {
        return {
            q: cube.x,
            r: cube.z
        };
    }

    private roundCube(cube: CubeCoord): CubeCoord {
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

    public updateGridConfig(config: HexGridConfig): void {
        const scene = this.phaserGame?.scene.scenes[0];
        if (!scene) return;

        // Atualizar apenas elementos gráficos do grid (sem destruir o container)
        if (this.gridContainer) {
            const graphics = this.gridContainer.getAt(0) as Phaser.GameObjects.Graphics;
            if (graphics) {
                graphics.clear();

                // Redesenhar hexágonos com novas configurações
                for (let y = 0; y < config.rows; y++) {
                    for (let x = 0; x < config.cols; x++) {
                        // ... lógica de desenho ...
                    }
                }
            }
        }

        // Atualizar limites da câmera
        this.ajustarCameraParaNovoGrid();
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

    private getImageUrl(imagem: ImagemDto): string {
        if (!imagem) return 'assets/default-bg.jpg';
        if (imagem.imageUrl) return imagem.imageUrl;
        if (imagem.extensao && imagem.dados) {
            return `data:image/${imagem.extensao};base64,${imagem.dados}`;
        }
        return 'assets/default-bg.jpg';
    }

    public updateBackgroundImage(imageUrl: string | null, textureKey: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const game = this.getPhaserGame();
            if (!game) return reject('Phaser não inicializado');

            const scene = game.scene.scenes[0];
            if (!scene) return reject('Cena não encontrada');

            // Limpeza segura
            this.clearBackground(textureKey);

            // Se não há imagem válida (incluindo null para remoção)
            if (!imageUrl || imageUrl.includes('default-bg.jpg')) {
                return resolve();
            }

            // Configuração do carregamento
            scene.load.once(`filecomplete-image-${textureKey}`, () => {
                try {
                    this.criarImagemFundo(scene, textureKey);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            scene.load.once(`loaderror-image-${textureKey}`, () => {
                reject('Erro ao carregar imagem');
            });

            // Carrega a nova imagem
            scene.load.image(textureKey, imageUrl);
            if (!scene.load.isLoading()) {
                scene.load.start();
            }
        });
    }

    public clearBackground(textureKey: string): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // 1. Remove a imagem de fundo se existir
        if (this.backgroundImage) {
            this.backgroundImage.destroy();
            this.backgroundImage = null;
        }

        // 2. Remove a textura de forma segura
        if (scene.textures.exists(textureKey)) {
            try {
                // Método correto para destruir texturas no Phaser
                scene.textures.remove(textureKey);

                // Adicional: Limpa os frames da textura se necessário
                const texture = scene.textures.get(textureKey);
                if (texture) {
                    // Remove todos os frames associados
                    Object.keys(texture.frames).forEach(frame => {
                        texture.remove(frame);
                    });
                    // Destrói a textura
                    texture.destroy();
                }
            } catch (error) {
                console.warn('Erro ao remover textura:', error);
            }
        }
    }

    public carregarImagemFundoPhaser(scene: Phaser.Scene, textureKey: string, imageUrl: string): void {
        // Remove textura existente
        if (scene.textures.exists(textureKey)) {
            scene.textures.remove(textureKey);
        }

        // Limpa imagem atual
        if (this.backgroundImage) {
            this.backgroundImage.destroy();
            this.backgroundImage = null;
        }

        // Carrega nova imagem
        scene.load.image(textureKey, imageUrl);
        scene.load.once('complete', () => {
            this.criarImagemFundo(scene, textureKey);
        });
        scene.load.start();
    }

    public criarImagemFundo(scene: Phaser.Scene, textureKey: string): void {
        // Verifica se a textura existe antes de tentar criar a imagem
        if (!scene.textures.exists(textureKey)) {
            console.error(`Textura "${textureKey}" não encontrada`);
            return;
        }

        if (!this.currentMap || !this.gridContainer) return;

        const gridConfig: HexGridConfig = this.getCurrentGridConfig();
        const hexRadius = gridConfig.hexRadius;

        // Calcula o deslocamento e dimensões
        const offsetX = -hexRadius * Math.sqrt(3) * 0.5;
        const offsetY = -hexRadius * 1.5 * 0.75;
        const gridWidth = (gridConfig.cols + 0.5) * hexRadius * Math.sqrt(3);
        const gridHeight = (gridConfig.rows + 0.5) * hexRadius * 1.5;

        // Destrói a imagem anterior se existir
        if (this.backgroundImage) {
            this.backgroundImage.destroy();
            this.backgroundImage = null;
        }

        try {
            // Cria a nova imagem de fundo
            this.backgroundImage = scene.add.image(
                offsetX,
                offsetY,
                textureKey
            )
                .setOrigin(0, 0)
                .setDisplaySize(gridWidth, gridHeight)
                .setDepth(-1);

            // Adiciona ao container e envia para trás
            this.gridContainer.add(this.backgroundImage);
            this.gridContainer.sendToBack(this.backgroundImage);

            // Debug: verifica se a imagem foi criada corretamente
            console.log('Imagem de fundo criada:', {
                textureKey,
                position: { offsetX, offsetY },
                size: { gridWidth, gridHeight }
            });

        } catch (error) {
            console.error('Erro ao criar imagem de fundo:', error);
        }
    }

    public limparGridCompleto(): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Remove o container do grid completamente
        if (this.gridContainer) {
            this.gridContainer.destroy(true);
            this.gridContainer = null;
        }

        // Remove a imagem de fundo
        if (this.backgroundImage) {
            this.backgroundImage.destroy();
            this.backgroundImage = null;
        }

        // Limpa quaisquer gráficos residuais
        scene.children.each(child => {
            if (child.getData('gridElement')) {
                child.destroy();
            }
        });
    }

    public ajustarCameraParaNovoGrid(): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        const gridConfig = this.getCurrentGridConfig();
        const hexRadius = gridConfig.hexRadius;
        const cols = gridConfig.cols;
        const rows = gridConfig.rows;

        // Calcula os novos limites do mapa
        const mapWidth = cols * hexRadius * Math.sqrt(3);
        const mapHeight = rows * hexRadius * 1.5;
        const padding = Math.min(mapWidth, mapHeight) * 0.5;

        // Ajusta os limites da câmera
        scene.cameras.main.setBounds(
            -padding,
            -padding,
            mapWidth + padding * 2,
            mapHeight + padding * 2
        );

        // Centraliza a câmera
        scene.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
    }

    /**
     * Retorna a configuração atual do grid. Se currentMap estiver definido, utiliza seus valores.
     * Caso contrário, utiliza um mapa local.
     */
    public getCurrentGridConfig(): HexGridConfig {
        if (this.currentMap) {
            return {
                cols: this.currentMap.largura || 30,
                rows: this.currentMap.altura || 30,
                hexRadius: this.currentMap.tamanhoHex || 40
            };
        } else if (this.maps.length > 0 && this.currentMapIndex < this.maps.length) {
            const localMap = this.maps[this.currentMapIndex];
            return {
                cols: localMap.gridSize.cols,
                rows: localMap.gridSize.rows,
                hexRadius: localMap.hexRadius
            };
        }
        return {
            cols: 30,
            rows: 30,
            hexRadius: 40
        };
    }

    public setupCameraControls(scene: Phaser.Scene): void {
        if (this.maps.length === 0 || this.currentMapIndex < 0) return;

        const currentMapConfig = this.maps[this.currentMapIndex];
        const mapWidth = currentMapConfig.gridSize.cols * currentMapConfig.hexRadius * Math.sqrt(3);
        const mapHeight = currentMapConfig.gridSize.rows * currentMapConfig.hexRadius * 1.5;
        const padding = 500;
        scene.cameras.main.setBounds(-padding, -padding, mapWidth + padding * 2, mapHeight + padding * 2);

        scene.cameras.main.zoom = 1;
        this.zoomPercentual = 100;

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        const dragThreshold = 5;

        scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.configuracoesAbertas) return;
            if (pointer.leftButtonDown()) {
                const hitObjects = scene.input.hitTestPointer(pointer);
                if (
                    hitObjects.length === 0 ||
                    (hitObjects.length === 1 && hitObjects[0] instanceof Phaser.GameObjects.Graphics)
                ) {
                    this.clearSelection();
                }
            }
            if (pointer.rightButtonDown()) {
                isDragging = false;
                lastX = pointer.x;
                lastY = pointer.y;
                if (this.gameContainer) {
                    this.gameContainer.classList.add('grabbing');
                }
            }
        });

        scene.input.on('pointerup', () => {
            isDragging = false;
            if (this.gameContainer) {
                this.gameContainer.classList.remove('grabbing');
            }
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

    public setCameraZoom(zoomPercentual: number): void {
        if (!this.phaserGame) {
            console.error('PhaserGame não inicializado.');
            return;
        }

        const scene = this.phaserGame.scene.scenes[0]; // Obtém a cena ativa
        if (scene && scene.cameras.main) {
            scene.cameras.main.setZoom(zoomPercentual / 100);
        } else {
            console.error('Câmera do Phaser não encontrada.');
        }
    }

    // Em phaser-game.service.ts, adicione:
    public clearTextures(): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        Object.keys(scene.textures.list).forEach(key => {
            if (key.startsWith('token-') || key.startsWith('mapBackground_')) {
                scene.textures.remove(key);
            }
        });
    }

    /**
     * Atualiza o mapa Phaser, por exemplo, redesenhando o grid.
     */
    public updatePhaserMap(): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;
        this.drawHexGrid(scene);
    }

    public cleanupTextures(): void {
        if (!this.phaserGame || !this.phaserGame.scene) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;
        scene.children.each(child => {
            if (child instanceof Phaser.GameObjects.Sprite) {
                child.destroy();
            }
        });
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

    public debugSceneObjects(scene: Phaser.Scene): void {
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

    /////////////////////////////////
    // MÉTODOS DE TOKEN
    /////////////////////////////////

    // Novo: Aplicar mudanças de estado do mapa
    public applyMapChanges(estado: MapaEstadoDto): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // 1. Limpar tokens existentes
        scene.children.each(child => {
            if (child instanceof Phaser.GameObjects.Sprite && child.name.startsWith('token-')) {
                child.destroy();
            }
        });

        // 2. Adicionar novos tokens
        const tokens = estado.tokens || [];
        tokens.forEach(token => {
            this.adicionarTokenVisual(token);
        });
    }

    // Novo: Adicionar token visualmente
    public adicionarTokenVisual(token: TokenDto): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Carregar textura se necessário
        const textureKey = `token-${token.id}`;
        if (!scene.textures.exists(textureKey)) {
            scene.load.image(textureKey, token.imagemDados);
            scene.load.once(`filecomplete-image-${textureKey}`, () => {
                this.criarSpriteToken(scene, textureKey, token);
            });
            scene.load.start();
        } else {
            this.criarSpriteToken(scene, textureKey, token);
        }
    }

    private criarSpriteToken(scene: Phaser.Scene, textureKey: string, token: TokenDto): void {
        // Forçar token quadrado 60x60 se não houver metadados
        const baseSize = 60;
        let displayWidth = baseSize;
        let displayHeight = baseSize;

        if (token.metadados) {
            // Manter proporção quadrada usando apenas a largura
            if (token.metadados.width) {
                displayWidth = token.metadados.width;
                displayHeight = token.metadados.width; // Forçar altura igual à largura
            }
        }

        const sprite = scene.add.sprite(token.x, token.y, textureKey)
            .setName(`token-${token.id}`)
            .setInteractive()
            .setDisplaySize(displayWidth, displayHeight)
            .setData('tokenData', token)
            .setDepth(100);

        // Configurar teclado apenas uma vez
        if (!this.keyboardSetupDone) {
            this.setupKeyboardShortcuts(scene);
            this.setupCanvasFocus(scene); // Adicione esta linha
            this.keyboardSetupDone = true;
        }

        // Evento de clique para seleção
        sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.selectToken(sprite);

                // Garantir foco no canvas
                if (scene.game.canvas) {
                    scene.game.canvas.focus();
                }
            }
        });

        // Configurar arrasto
        sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            sprite.x = dragX;
            sprite.y = dragY;

            // Atualizar elementos de seleção durante o movimento
            if (this.selectedToken === sprite) {
                this.updateSelectionElements();
            }
        });

        sprite.on('dragstart', () => {
            sprite.setAlpha(0.7);
        });

        sprite.on('dragend', () => {
            sprite.setAlpha(1);

            // Encaixa no grid
            const snappedPos = this.snapToGrid(sprite.x, sprite.y);
            sprite.setPosition(snappedPos.x, snappedPos.y);

            // Atualizar token
            this.atualizarTokenPosicao(token.id, snappedPos.x, snappedPos.y);

            // ATUALIZAR SELEÇÃO (nova linha)
            if (this.selectedToken === sprite) {
                this.updateSelectionElements();
            }
        });

        scene.input.setDraggable(sprite);
    }

    public snapToGrid(worldX: number, worldY: number): { x: number, y: number } {
        if (!this.phaserGame) return { x: worldX, y: worldY };

        const scene = this.phaserGame.scene.scenes[0];
        const gridConfig = this.getCurrentGridConfig();

        // Converte as coordenadas do mundo para coordenadas de grid
        const gridPos = this.screenToHexGrid(worldX, worldY, gridConfig.hexRadius);

        // Converte de volta para coordenadas do mundo, alinhadas ao grid
        return this.hexGridToScreen(gridPos.col, gridPos.row, gridConfig.hexRadius);
    }


    // Novo: Atualizar token visualmente
    public atualizarTokenVisual(token: TokenDto): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        const sprite = scene.children.getByName(`token-${token.id}`) as Phaser.GameObjects.Sprite;
        if (sprite) {
            sprite.setPosition(token.x, token.y);

            if (token.metadados) {
                if (token.metadados.width && token.metadados.height) {
                    sprite.setDisplaySize(token.metadados.width, token.metadados.height);
                }
                if (token.metadados.rotation) {
                    sprite.setAngle(token.metadados.rotation);
                }
            }
        }
    }

    private selectToken(tokenSprite: Phaser.GameObjects.Sprite): void {
        this.clearSelection();
        this.selectedToken = tokenSprite;

        const bounds = tokenSprite.getBounds();

        // Retângulo de seleção (depth 150)
        this.selectionRectangle = tokenSprite.scene.add.graphics()
            .lineStyle(2, 0x0000ff)
            .strokeRect(
                bounds.x - 5,
                bounds.y - 5,
                bounds.width + 10,
                bounds.height + 10
            )
            .setDepth(150); // ⭐⭐ Definir depth alto

        // Alça de redimensionamento (depth 151 - acima do retângulo)
        this.resizeHandle = tokenSprite.scene.add.ellipse(
            bounds.right,
            bounds.bottom,
            15, 15, 0x0000ff
        )
            .setInteractive()
            .setDepth(151); // ⭐⭐ Depth mais alto que o retângulo

        // Configurar interações
        this.setupResizeInteraction();
    }

    private setupResizeInteraction(): void {
        if (!this.selectedToken || !this.resizeHandle) return;

        const scene = this.selectedToken.scene;
        const token = this.selectedToken;
        const handle = this.resizeHandle;

        scene.input.setDraggable(handle);

        let initialWidth: number;
        let startX: number;

        handle.on('dragstart', () => {
            initialWidth = token.displayWidth;
            startX = scene.input.activePointer.x;
        });

        handle.on('drag', (pointer: Phaser.Input.Pointer) => {
            // Calcular diferença de movimento
            const deltaX = pointer.x - startX;

            // Calcular novo tamanho mantendo proporção
            const newWidth = Math.max(20, initialWidth + deltaX);
            token.setDisplaySize(newWidth, newWidth);

            this.updateSelectionElements();
        });

        handle.on('dragend', () => {
            if (this.selectedToken) {
                const tokenId = this.selectedToken.name.replace('token-', '');
                this.onTokenUpdated.emit({
                    token: { id: tokenId } as TokenDto,
                    changes: {
                        metadados: {
                            width: this.selectedToken.displayWidth.toString(), // Converta para string
                            height: this.selectedToken.displayHeight.toString() // Converta para string
                        }
                    }
                });
            }
        });
    }

    private updateSelectionElements(): void {
        if (!this.selectedToken || !this.selectionRectangle || !this.resizeHandle) return;

        const bounds = this.selectedToken.getBounds();

        // Atualizar retângulo
        this.selectionRectangle.clear()
            .lineStyle(2, 0x00ff00)
            .strokeRect(
                bounds.x - 5,
                bounds.y - 5,
                bounds.width + 10,
                bounds.height + 10
            )
            .setDepth(150); // ⭐ Manter depth

        // Atualizar alças
        this.resizeHandle.setPosition(bounds.right, bounds.bottom)
        .setDepth(151);
    }

    // Novo: Remover token visualmente
    public removerTokenVisual(tokenId: string): void {
        if (!this.phaserGame) return;

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        const sprite = scene.children.getByName(`token-${tokenId}`) as Phaser.GameObjects.Sprite;
        if (sprite) {
            sprite.destroy(); // Remove o sprite do token
        }

        // Limpa a seleção se o token excluído estava selecionado
        if (this.selectedToken?.name === `token-${tokenId}`) {
            this.clearSelection();
        }
    }

    // Novo: Atualizar posição (chamado quando usuário arrasta token)
    private atualizarTokenPosicao(tokenId: string, x: number, y: number): void {
        // Crie um token parcial com o ID e novas posições
        const tokenUpdate: Partial<TokenDto> & { id: string } = {
            id: tokenId,
            x,
            y
        };

        this.onTokenUpdated.next({
            token: tokenUpdate as TokenDto,
            changes: { x, y }
        });
    }

    private finalizeTokenChanges(): void {
        if (!this.selectedToken) return;

        const tokenId = this.selectedToken.name.replace('token-', '');
        const tokenData = this.selectedToken.getData('tokenData') as TokenDto;

        const changes: Partial<TokenDto> = {
            x: this.selectedToken.x,
            y: this.selectedToken.y,
            metadados: {
                rotation: this.selectedToken.angle,
                width: this.selectedToken.displayWidth,
                height: this.selectedToken.displayHeight
            }
        };

        this.onTokenUpdated.next({
            token: { ...tokenData, ...changes } as TokenDto,
            changes
        });
    }

    private clearSelection(): void {
        if (this.selectedToken) {
            this.selectedToken.clearTint();
            this.selectedToken = null
        }
        if (this.selectionRectangle) {
            this.selectionRectangle.destroy();
            this.selectionRectangle = null;
        }
        if (this.resizeHandle) {
            this.resizeHandle.destroy();
            this.resizeHandle = null;
        }
    }
}
