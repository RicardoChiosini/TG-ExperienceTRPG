// image.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { MapaService } from '../../../services/mapa.service';
import { MapaStateService } from './mapastate.service';
import { ImagemDto } from '../../../dtos/imagem.dto';
import { ToastrService } from 'ngx-toastr';
import { catchError, lastValueFrom, Observable, Subject, tap, throwError } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { PhaserGameService } from './phasergame.service';
import { ChangeDetectorRef } from '@angular/core';
import { MapaDto } from '../../../dtos/mapa.dto';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  // Propriedades necessárias
  public imagens: ImagemDto[] = [];
  public showImageSelector: boolean = false;
  public isUploading: boolean = false;
  public uploadProgress: number = 0;

  // Essas propriedades virão de outro lugar (por exemplo, do estado da mesa)
  private selectedFile: File | null = null;
  private mesaId: number | null = null;
  public currentMap: any = null; // Idealmente, defina uma interface para o mapa.
  private gridContainer: Phaser.GameObjects.Container | null = null;
  public phaserGame: Phaser.Game | null = null;

  // Adicionando Subject para notificar atualizações
  public imagesUpdated = new Subject<void>();
  public backgroundImageChanged = new Subject<ImagemDto | null | undefined>();

  constructor(
    private apiService: ApiService,
    private mapaService: MapaService,
    private mapaStateService: MapaStateService,
    private toastr: ToastrService,
    private phaserGameService: PhaserGameService,
    private cdRef: ChangeDetectorRef
  ) { }

  private forceUpdate() {
    this.cdRef.detectChanges();
  }

  public setPhaserGame(game: Phaser.Game): void {
    this.phaserGame = game;
  }

  public setMesaId(mesaId: number): void {
    this.mesaId = mesaId;
  }

  public setCurrentMap(map: MapaDto): void {
    if (!map) return; // Adicione esta verificação

    this.currentMap = { ...map };
    this.backgroundImageChanged.next(map.imaFundo || null);
  }

  public getCurrentMap(): any {
    return this.currentMap;
  }

  public setGridContainer(container: Phaser.GameObjects.Container): void {
    this.gridContainer = container;
  }

  public onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadImagem();
      event.target.value = '';
    }
  }

  public uploadImagem(): void {
    if (!this.selectedFile || this.mesaId === null) return;

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
          this.handleUploadSuccess(event.body);
        }
      },
      error: (error) => {
        console.error('Erro no upload:', error);
        this.resetUpload();
        this.toastr.error('Erro ao enviar imagem');
      }
    });
  }

  private handleUploadSuccess(newImage: ImagemDto): void {
    this.imagens.unshift(newImage);
    this.imagesUpdated.next();
    this.resetUpload();
    this.toastr.success('Imagem enviada com sucesso');
  }

  private resetUpload(): void {
    this.isUploading = false;
    this.uploadProgress = 0;
    this.selectedFile = null;
  }

  // Carrega a imagem de fundo se existir no mapa atual
  public async loadBackgroundImageIfExists(): Promise<void> {
    if (!this.currentMap?.mapaId) return;

    try {
      const imagem = await this.mapaService.getBackgroundImage(this.currentMap.mapaId).toPromise();

      // Atualiza TODAS as propriedades possíveis para consistência
      this.currentMap = {
        ...this.currentMap,
        imaFundo: imagem,              // Padrão do backend
        imagemFundo: imagem,           // Alternativo
        backgroundImageUrl: imagem ? this.getImageUrl(imagem) : null
      };

      // Notificação de mudança
      this.backgroundImageChanged.next(imagem || null);

      // Atualização do Phaser
      const textureKey = `mapBackground_${this.currentMap.mapaId}`;
      if (imagem) {
        await this.phaserGameService.updateBackgroundImage(this.getImageUrl(imagem), textureKey);
      } else {
        this.phaserGameService.clearBackground(textureKey);
      }

    } catch (err) {
      console.error('Erro ao carregar imagem:', err);
    }
  }

  async selecionarImagemFundo(imagem: ImagemDto): Promise<void> {
    const currentMap = this.mapaStateService.currentMap || this.currentMap;
    if (!currentMap?.mapaId) {
      this.toastr.warning('Nenhum mapa selecionado');
      return;
    }

    try {
      // 1. Atualização no backend
      const result = await lastValueFrom(
        this.mapaService.setBackgroundImage(currentMap.mapaId, imagem.imagemId)
      );

      if (!result) {
        throw new Error('Nenhum resultado retornado pelo servidor');
      }

      // 2. Atualização do estado local
      const updatedMap = {
        ...currentMap,
        ...result.mapa,
        imaFundo: result.imagem,
        imagemFundo: result.imagem.imagemId,
        backgroundImageUrl: this.getImageUrl(result.imagem)
      };

      // Atualiza o estado
      this.currentMap = updatedMap;
      this.cdRef.detectChanges();

      // 3. Atualização do Phaser
      const textureKey = `mapBackground_${currentMap.mapaId}`;
      await this.phaserGameService.updateBackgroundImage(
        this.getImageUrl(result.imagem),
        textureKey
      );

      // 4. Notificações e UI
      this.backgroundImageChanged.next(result.imagem);
      this.toastr.success('Imagem de fundo atualizada');
      this.showImageSelector = false;
      this.cdRef.detectChanges();

    } catch (error: unknown) {
      console.error('Erro ao definir imagem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.toastr.error(`Erro ao atualizar imagem: ${errorMessage}`);
    }
  }

  // Gera URL a partir dos dados (caso não haja imageUrl)
  public createImageUrl(img: ImagemDto): string {
    if (img.dados && img.extensao) {
      return `data:image/${img.extensao};base64,${img.dados}`;
    }
    return ''; // Ou retorne uma imagem padrão
  }

  // Método unificado para carregar imagens
  public carregarImagensDaMesa(): Observable<ImagemDto[]> {
    if (!this.mesaId) {
      return throwError(() => new Error('MesaId não definido'));
    }

    return this.apiService.getImagensPorMesa(this.mesaId).pipe(
      tap((imagens: ImagemDto[]) => {
        this.imagens = imagens;
        this.imagesUpdated.next();
      }),
      catchError((error) => {
        console.error('Erro ao carregar imagens:', error);
        this.toastr.error('Erro ao carregar imagens da mesa');
        return throwError(() => error);
      })
    );
  }

  // Método melhorado para atualização de nome
  public atualizarNomeImagem(img: ImagemDto, newName: string | FocusEvent): void {
    const nome = typeof newName === 'string' ? newName :
      (newName.target as HTMLElement).textContent?.trim() || img.nome;

    if (nome === img.nome) return;

    const imagemAtualizada: ImagemDto = { ...img, nome };

    this.apiService.updateImagem(img.imagemId, imagemAtualizada).subscribe({
      next: (imgAtualizada) => {
        const index = this.imagens.findIndex(i => i.imagemId === imgAtualizada.imagemId);
        if (index !== -1) {
          this.imagens[index] = imgAtualizada;
          this.imagesUpdated.next();
        }
        this.toastr.success('Nome atualizado com sucesso');
      },
      error: (error) => {
        console.error('Erro ao atualizar imagem:', error);
        this.toastr.error('Erro ao atualizar nome da imagem');
      }
    });
  }

  // Método melhorado para deletar imagem
  public deletarImagem(imagemId: number, event?: Event): void {
    if (event) event.stopPropagation();

    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    this.apiService.deleteImagem(imagemId).subscribe({
      next: () => {
        this.imagens = this.imagens.filter(img => img.imagemId !== imagemId);
        this.imagesUpdated.next();
        this.toastr.success('Imagem excluída com sucesso');

        // Se a imagem era a de fundo, limpa a referência
        if (this.currentMap?.imagemFundo?.imagemId === imagemId) {
          this.removerImagemFundo();
        }
      },
      error: (error) => {
        console.error('Erro ao excluir imagem:', error);
        this.toastr.error('Erro ao excluir imagem');
      }
    });
  }

  async removerImagemFundo(): Promise<void> {
    const currentMap = this.mapaStateService.currentMap || this.currentMap;
    if (!currentMap?.mapaId) {
      this.toastr.warning('Nenhum mapa selecionado');
      return;
    }

    try {
      // 1. Remove no backend
      await lastValueFrom(
        this.mapaService.removeBackgroundImage(currentMap.mapaId)
      );

      // 2. Atualiza estado local
      const updatedMap = {
        ...currentMap,
        imaFundo: undefined,
        imagemFundo: undefined,
        backgroundImageUrl: undefined
      };

      this.currentMap = updatedMap;
      this.cdRef.detectChanges();

      // 3. Atualiza Phaser - Passa null para indicar remoção
      const textureKey = `mapBackground_${currentMap.mapaId}`;
      await this.phaserGameService.updateBackgroundImage(null, textureKey);

      // 4. Notificações e UI
      this.backgroundImageChanged.next(null);
      this.toastr.success('Imagem de fundo removida com sucesso');
      this.cdRef.detectChanges();

    } catch (error: unknown) {
      console.error('Erro ao remover imagem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.toastr.error(`Erro ao remover imagem: ${errorMessage}`);
    }
  }

  public async atualizarImagemFundo(imagem: ImagemDto | null, isLocalAction: boolean = false): Promise<void> {
    console.log('atualizarImagemFundo chamado', { imagem, isLocalAction });
    const currentMap = this.mapaStateService.currentMap;
    if (!currentMap?.mapaId) {
      this.toastr.warning('Nenhum mapa selecionado');
      return;
    }

    try {
      // Atualização local do estado com objeto completo
      const updatedMap: MapaDto = {
        ...currentMap,
        imagemFundo: imagem?.imagemId ?? undefined,
        imaFundo: imagem || undefined, // Objeto completo ou undefined
        fundoUrl: this.getImageUrl(imagem)
      };

      this.mapaStateService.currentMap = updatedMap;

      // Atualização do Phaser
      const textureKey = `mapBackground_${currentMap.mapaId}`;
      const imageUrl = this.getImageUrl(imagem);
      await this.phaserGameService.updateBackgroundImage(imageUrl, textureKey);

      // Notificações apenas para ações locais
      if (isLocalAction) {
        this.backgroundImageChanged.next(imagem);
        this.toastr.success(imagem ? 'Imagem atualizada' : 'Imagem removida');
      }
    } catch (error) {
      console.error('Erro na atualização:', error);
      if (isLocalAction) {
        this.toastr.error('Erro ao atualizar imagem');
      }
    }
  }

  // Obtém a URL da imagem, seja imageUrl ou gerada por base64
  getImagemFundoUrl(): string {
    const currentMap = this.mapaStateService.currentMap || this.currentMap;
    if (!currentMap) return 'assets/default-bg.jpg';

    // Verifica em ordem de prioridade
    if (currentMap.backgroundImageUrl) {
      return currentMap.backgroundImageUrl;
    }

    if (currentMap.imaFundo) {
      return this.getImageUrl(currentMap.imaFundo);
    }

    if (currentMap.imagemFundo) {
      return this.getImageUrl(currentMap.imagemFundo);
    }

    return 'assets/default-bg.jpg';
  }

  public getImageUrl(imagem: ImagemDto | number | undefined | null): string {
    // Caso não exista imagem
    if (!imagem) return 'assets/default-bg.jpg';

    // Se for apenas o ID
    if (typeof imagem === 'number') {
      const img = this.imagens.find(i => i.imagemId === imagem);
      if (!img) return 'assets/default-bg.jpg';
      return this.getImageUrl(img);
    }

    // Se for o objeto completo
    if (imagem.imageUrl) return imagem.imageUrl;
    if (imagem.extensao && imagem.dados) {
      return `data:image/${imagem.extensao.replace('.', '')};base64,${imagem.dados}`;
    }

    return 'assets/default-bg.jpg';
  }

  temImagemDeFundo(): boolean {
    const currentMap = this.mapaStateService.currentMap || this.currentMap;
    if (!currentMap) return false;

    return !!(
      currentMap.backgroundImageUrl ||
      currentMap.imaFundo ||
      (currentMap.imagemFundo && currentMap.imagemFundo > 0)
    );
  }

  public toggleImageSelector(show: boolean): void {
    // Este método pode ser chamado pelo componente se necessário
    this.showImageSelector = show;
  }

  public dragImage(event: DragEvent, imagem: ImagemDto): void {
    if (!event.dataTransfer) return;

    event.dataTransfer.setData('text/plain', JSON.stringify({
      imagemId: imagem.imagemId,
      imageUrl: this.getImageUrl(imagem),
      nome: imagem.nome
    }));

    if (imagem.imageUrl) {
      const img = new Image();
      img.src = imagem.imageUrl;
      event.dataTransfer.setDragImage(img, 10, 10);
    }
  }
}
