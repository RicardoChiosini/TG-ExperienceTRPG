// phaser-game.service.ts
import { Injectable } from '@angular/core';
import * as Phaser from 'phaser';

export interface HexGridConfig {
    cols: number;
    rows: number;
    hexRadius: number;
    name?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PhaserGameService {
    private phaserGame!: Phaser.Game;
    private gameContainer: HTMLElement | null = null;  // Será injetado via setter
    private gridContainer!: Phaser.GameObjects.Container;
    private backgroundImage: Phaser.GameObjects.Image | null = null;

    // Propriedades de estado que, antes, estavam no componente
    private mapaCarregado: boolean = false;
    private currentMap: any = null; // Idealmente, defina uma interface para o mapa.
    private maps: Array<{ gridSize: { cols: number, rows: number }, hexRadius: number }> = [
        { gridSize: { cols: 30, rows: 30 }, hexRadius: 40 }
    ];
    private currentMapIndex: number = 0;
    private zoomPercentual: number = 100;
    private configuracoesAbertas: boolean = false;

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

    /**
     * Injeta o container DOM para o jogo.
     */
    public setGameContainer(container: HTMLElement): void {
        this.gameContainer = container;
    }

    /**
     * Permite ajustar o mapa atual e o estado de carregamento.
     */
    public setCurrentMap(map: any, carregado: boolean = true): void {
        this.currentMap = map;
        this.mapaCarregado = carregado;
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

    public getPhaserGame(): Phaser.Game | null {
        return this.phaserGame ?? null;
    }

    public preload(): void {
        // Lógica de preload do Phaser (carregamento de assets, etc.)
    }

    public create(): void {
        const scene = this.phaserGame.scene.scenes[0];

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

    public drawHexGrid(scene: Phaser.Scene): void {
        // Remove elementos anteriores que compõem o grid.
        scene.children.each(child => {
            if (
                child instanceof Phaser.GameObjects.Graphics ||
                child instanceof Phaser.GameObjects.Text ||
                (child instanceof Phaser.GameObjects.Sprite && child.getData('gridElement'))
            ) {
                child.destroy();
            }
        });

        // Garante que exista o container para o grid.
        if (!this.gridContainer) {
            this.gridContainer = scene.add.container(0, 0);
        } else {
            this.gridContainer.removeAll(true);
        }

        const graphics = scene.add.graphics().setData('gridElement', true);
        this.gridContainer.add(graphics);

        const gridConfig: HexGridConfig = this.getCurrentGridConfig();
        const { hexRadius, cols, rows } = gridConfig;

        // Desenha cada hexágono do grid.
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

        // Carrega a imagem de fundo, se aplicável.
        this.carregarImagemFundoPhaser(scene);

        // Configura os limites da câmera com base no grid.
        const mapWidth = cols * hexRadius * Math.sqrt(3);
        const mapHeight = rows * hexRadius * 1.5;
        const padding = Math.min(mapWidth, mapHeight) * 0.5;
        scene.cameras.main.setBounds(-padding, -padding, mapWidth + padding * 2, mapHeight + padding * 2);
    }

    public drawHexagon(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        radius: number,
        fill: boolean
    ): void {
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

    public carregarImagemFundoPhaser(scene: Phaser.Scene): void {
        if (!this.currentMap?.imaFundo || !this.gridContainer || !this.currentMap.mapaId) return;

        const textureKey = `mapBackground_${this.currentMap.mapaId}`;
        if (scene.textures?.exists(textureKey)) {
            scene.textures.remove(textureKey);
        }

        const imageUrl = this.currentMap.imaFundo.imageUrl ||
            `data:image/${this.currentMap.imaFundo.extensao};base64,${this.currentMap.imaFundo.dados}`;

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

    public criarImagemFundo(scene: Phaser.Scene, textureKey: string): void {
        if (!this.currentMap || !this.gridContainer) return;

        const gridConfig: HexGridConfig = this.getCurrentGridConfig();
        const hexRadius = gridConfig.hexRadius;

        // Calcula o deslocamento para posicionar a imagem de fundo.
        const offsetX = -hexRadius * Math.sqrt(3) * 0.5;
        const offsetY = -hexRadius * 1.5 * 0.75;
        const gridWidth = (gridConfig.cols + 0.5) * hexRadius * Math.sqrt(3);
        const gridHeight = (gridConfig.rows + 0.5) * hexRadius * 1.5;

        if (this.backgroundImage) {
            this.backgroundImage.destroy();
        }

        this.backgroundImage = scene.add.image(offsetX, offsetY, textureKey)
            .setOrigin(0, 0)
            .setDisplaySize(gridWidth, gridHeight)
            .setDepth(-1);

        this.gridContainer.add(this.backgroundImage);
        this.gridContainer.sendToBack(this.backgroundImage);
    }

    /**
     * Retorna a configuração atual do grid. Se currentMap estiver definido, utiliza seus valores.
     * Caso contrário, utiliza um mapa local.
     */
    private getCurrentGridConfig(): HexGridConfig {
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

    /**
     * Método stub para limpar seleções – implemente conforme necessário.
     */
    private clearSelection(): void {
        console.log('clearSelection() chamado');
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
}
