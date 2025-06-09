// phaser-game.service.ts
import { Injectable, EventEmitter } from '@angular/core';
import * as Phaser from 'phaser';
import { MapaDto } from '../../../dtos/mapa.dto';
import { MapaEstadoDto, TokenDto } from '../../../dtos/mapaEstado.dto';
import { ImagemDto } from '../../../dtos/imagem.dto';
import { ImageService } from './image.service';

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
    private selectedToken?: Phaser.GameObjects.Sprite;
    private rotationHandle?: Phaser.GameObjects.Arc;
    private resizeHandle?: Phaser.GameObjects.Rectangle;
    private selectionRectangle?: Phaser.GameObjects.Rectangle;

    // Propriedades de estado (serão fornecidas externamente)
    public isCriador: boolean = false;
    public usuarioId?: number;
    public mesaId?: number;

    public onTokenSelected = new EventEmitter<TokenDto>();
    public onTokenUpdated = new EventEmitter<{ token: TokenDto, changes: any }>();
    public onTokenAdded = new EventEmitter<TokenDto>();

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

    // Aplica as mudanças do estado (tokens) na cena, delegando à TokenService (sem passar a cena)
    public applyMapChanges(mapState: MapaEstadoDto): void {
        if (!this.phaserGame || !this.currentMap || this.currentMap.mapaId !== mapState.mapaId) {
            return;
        }

        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;

        // Otimização: Cria um mapa dos tokens existentes para atualização eficiente
        const existingTokens = new Map<string, Phaser.GameObjects.Sprite>();
        scene.children.each(child => {
            if (child instanceof Phaser.GameObjects.Sprite && child.getData('tokenData')) {
                const tokenData = child.getData('tokenData');
                if (tokenData.mapaId === this.currentMapId) {
                    existingTokens.set(tokenData.id, child);
                }
            }
        });

        // Processa cada token do novo estado
        (mapState.tokens || []).forEach((token: TokenDto) => {
            try {
                if (token.mapaId === this.currentMapId) {
                    const key = `token-${token.id}`;
                    const existingToken = existingTokens.get(token.id);

                    if (existingToken) {
                        // Atualiza token existente
                        this.updateExistingToken(key, token);
                        existingTokens.delete(token.id); // Remove do mapa para não ser destruído
                    } else {
                        // Cria novo token
                        if (scene.textures.exists(key)) {
                            this.instantiateToken(key, token);
                        } else {
                            this.createTokenSprite(key, token);
                        }
                    }
                }
            } catch (e) {
                console.error('Erro ao aplicar mudanças no token:', e);
            }
        });

        // Destroi tokens que não estão mais no estado
        existingTokens.forEach(token => token.destroy());
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

    public createTokenSprite(textureKey: string, token: TokenDto): void {
        if (!this.phaserGame) {
            console.error("PhaserGame não inicializado!");
            return;
        }

        const scene = this.phaserGame.scene.scenes[0];

        if (!scene) {
            console.error("Cena do Phaser não disponível!");
            return;
        }

        try {
            // Se a textura já existe, cria o token imediatamente
            if (scene.textures.exists(textureKey)) {
                this.instantiateToken(textureKey, token);
                return;
            }

            // Configurar callbacks para carregamento
            const onLoad = () => {
                scene.load.off(`filecomplete-image-${textureKey}`, onLoad);
                this.instantiateToken(textureKey, token);
            };

            const onError = () => {
                scene.load.off(`loaderror-image-${textureKey}`, onError);
                console.error(`Falha ao carregar textura: ${textureKey}`);
            };

            scene.load.once(`filecomplete-image-${textureKey}`, onLoad);
            scene.load.once(`loaderror-image-${textureKey}`, onError);

            // Carregar a imagem
            if (token.imagemDados.startsWith('http') || token.imagemDados.startsWith('data:')) {
                scene.load.image(textureKey, token.imagemDados);
            } else {
                scene.textures.addBase64(textureKey, token.imagemDados);
            }
            scene.load.start();
        } catch (error) {
            console.error("Erro ao criar token:", error);
        }
    }

    public instantiateToken(textureKey: string, token: TokenDto): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;
        const sprite = scene.add.sprite(token.x, token.y, textureKey)
            .setInteractive()
            .setData('tokenData', token)
            .setDisplaySize(token.metadados?.width || 80, token.metadados?.height || 80)
            .setDepth(token.z || 1)
            .setName(`token-${token.id}`);  // Nome único para identificação
        // Aplicar rotação se existir
        if (token.metadados?.rotation) {
            sprite.setAngle(token.metadados.rotation);
        }
        // Configurar clique para seleção
        sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.selectToken(sprite);
            }
        });
        // Habilitar drag & drop se for permitido
        if (this.isCriador || token.donoId === this.usuarioId) {
            scene.input.setDraggable(sprite);
            this.setupTokenDrag(sprite, token);
        }
    }

    public selectToken(token: Phaser.GameObjects.Sprite): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;
        // Remover seleção anterior
        this.clearSelection();
        this.selectedToken = token;
        // Criar retângulo de seleção
        this.selectionRectangle = scene.add.rectangle(
            token.x,
            token.y,
            token.displayWidth + 20,
            token.displayHeight + 20
        )
            .setStrokeStyle(2, 0x0066cc)
            .setFillStyle(0, 0)
            .setDepth(token.depth + 1);
        // Criar alça de rotação
        this.rotationHandle = scene.add.circle(
            token.x,
            token.y - token.displayHeight / 2 - 20,
            10,
            0x0066cc
        )
            .setDepth(token.depth + 2)
            .setInteractive({ cursor: 'pointer' });
        // Criar alça de redimensionamento
        this.resizeHandle = scene.add.rectangle(
            token.x + token.displayWidth / 2 + 10,
            token.y + token.displayHeight / 2 + 10,
            15,
            15,
            0x0066cc
        )
            .setDepth(token.depth + 2)
            .setInteractive({ cursor: 'nwse-resize' });
        // Configurar interações
        this.setupRotationHandle();
        this.setupResizeHandle();
        // Feedback visual
        token.setTint(0xcccccc);
    }

    public setupTokenDrag(sprite: Phaser.GameObjects.Sprite, token: TokenDto): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;
        const gridConfig = this.getCurrentGridConfig();
        const hexRadius = gridConfig.hexRadius;
        sprite.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            try {
                const snapEnabled = true;
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
            const tokenData = sprite.getData('tokenData') as TokenDto;
            this.onTokenUpdated.emit({
                token: tokenData,
                changes: { x: sprite.x, y: sprite.y }
            });
        });
    }

    public setupRotationHandle(): void {
        if (!this.activeScene || !this.rotationHandle || !this.selectedToken) return;

        let isRotating = false;
        let startAngle = 0;
        let startRotation = 0;
        const ROTATION_SNAP = 45;

        this.rotationHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            isRotating = true;
            startAngle = Phaser.Math.Angle.Between(
                this.selectedToken!.x,
                this.selectedToken!.y,
                pointer.x,
                pointer.y
            );
            startRotation = this.selectedToken!.angle;
        });

        this.activeScene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (isRotating && pointer.isDown) {
                const newAngle = Phaser.Math.Angle.Between(
                    this.selectedToken!.x,
                    this.selectedToken!.y,
                    pointer.x,
                    pointer.y
                );
                const rotationDelta = Phaser.Math.Angle.Wrap(newAngle - startAngle);
                const newRotation = startRotation + Phaser.Math.RadToDeg(rotationDelta);

                // Aplicar snap
                const snappedRotation = Math.round(newRotation / ROTATION_SNAP) * ROTATION_SNAP;
                this.selectedToken!.setAngle(snappedRotation);
                this.updateHandlePositions();
            }
        });

        this.activeScene.input.on('pointerup', () => {
            if (isRotating) {
                isRotating = false;
                const tokenData = this.selectedToken!.getData('tokenData') as TokenDto;
                this.onTokenUpdated.emit({
                    token: tokenData,
                    changes: { rotation: this.selectedToken!.angle }
                });
            }
        });
    }

    public setupResizeHandle(): void {
        if (!this.activeScene || !this.resizeHandle || !this.selectedToken) return;

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

        this.activeScene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (isResizing && pointer.isDown) {
                const deltaX = pointer.x - startPointerX;
                let newWidth = startWidth + deltaX;
                let newHeight = newWidth / originalAspectRatio;

                // Limites de tamanho
                const MIN_TOKEN_SIZE = 40;
                const MAX_TOKEN_SIZE = 20000;
                newWidth = Phaser.Math.Clamp(newWidth, MIN_TOKEN_SIZE, MAX_TOKEN_SIZE);
                newHeight = Phaser.Math.Clamp(newHeight, MIN_TOKEN_SIZE, MAX_TOKEN_SIZE);

                this.selectedToken!.setDisplaySize(newWidth, newHeight);
                this.updateHandlePositions();
            }
        });

        this.activeScene.input.on('pointerup', () => {
            if (isResizing) {
                isResizing = false;
                const tokenData = this.selectedToken!.getData('tokenData') as TokenDto;
                this.onTokenUpdated.emit({
                    token: tokenData,
                    changes: {
                        width: this.selectedToken!.displayWidth,
                        height: this.selectedToken!.displayHeight
                    }
                });
            }
        });
    }

    public updateExistingToken(textureKey: string, token: TokenDto): void {
        if (!this.phaserGame) return;
        const scene = this.phaserGame.scene.scenes[0];
        if (!scene) return;
        // Buscar token existente pelo ID
        const existingSprite = scene.children.getByName(`token-${token.id}`) as Phaser.GameObjects.Sprite;
        if (existingSprite) {
            // Atualizar propriedades
            existingSprite.setPosition(token.x, token.y);
            existingSprite.setDepth(token.z || 1);
            if (token.metadados) {
                if (typeof token.metadados.width === 'number' && typeof token.metadados.height === 'number') {
                    existingSprite.setDisplaySize(
                        token.metadados.width,
                        token.metadados.height
                    );
                }
                if (typeof token.metadados.rotation === 'number') {
                    existingSprite.setAngle(token.metadados.rotation);
                }
            }
            // Atualizar dados
            existingSprite.setData('tokenData', token);

        } else {
            // Criar novo se não existir
            this.createTokenSprite(textureKey, token);
        }
    }

    public addTokenToMapVisual(token: TokenDto): void {
        if (!this.activeScene) return;

        const textureKey = `token-${token.id}`;

        if (this.activeScene.textures.exists(textureKey)) {
            this.updateExistingToken(textureKey, token);
        } else {
            if (token.imagemDados.startsWith('http') || token.imagemDados.startsWith('data:')) {
                this.activeScene.load.image(textureKey, token.imagemDados);
            } else {
                this.activeScene.textures.addBase64(textureKey, token.imagemDados);
            }

            this.activeScene.load.once(`filecomplete-image-${textureKey}`, () => {
                this.instantiateToken(textureKey, token);
            });

            this.activeScene.load.start();
        }
    }

    private updateHandlePositions(): void {
        if (!this.activeScene || !this.selectedToken || !this.selectionRectangle ||
            !this.rotationHandle || !this.resizeHandle) return;

        // Atualizar retângulo de seleção
        this.selectionRectangle
            .setPosition(this.selectedToken.x, this.selectedToken.y)
            .setSize(this.selectedToken.displayWidth + 20, this.selectedToken.displayHeight + 20);

        // Atualizar alça de rotação
        this.rotationHandle.setPosition(
            this.selectedToken.x,
            this.selectedToken.y - this.selectedToken.displayHeight / 2 - 20
        );

        // Atualizar alça de redimensionamento
        this.resizeHandle.setPosition(
            this.selectedToken.x + this.selectedToken.displayWidth / 2 + 10,
            this.selectedToken.y + this.selectedToken.displayHeight / 2 + 10
        );
    }

    private clearSelection(): void {
        if (this.selectedToken) {
            this.selectedToken.clearTint();
            this.selectedToken = undefined;
        }
        if (this.selectionRectangle) {
            this.selectionRectangle.destroy();
            this.selectionRectangle = undefined;
        }
        if (this.rotationHandle) {
            this.rotationHandle.destroy();
            this.rotationHandle = undefined;
        }
        if (this.resizeHandle) {
            this.resizeHandle.destroy();
            this.resizeHandle = undefined;
        }
    }
}
