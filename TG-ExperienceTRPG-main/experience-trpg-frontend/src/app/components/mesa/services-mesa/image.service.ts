// image.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ImagemDto } from '../../../dtos/imagem.dto';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { HttpEventType } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  // Propriedades necessárias
  private selectedFile: File | null = null;
  private isUploading: boolean = false;
  private uploadProgress: number = 0;
  private imagens: ImagemDto[] = [];
  
  // Essas propriedades virão de outro lugar (por exemplo, do estado da mesa)
  private mesaId: number | null = null;
  private currentMap: any = null; // Idealmente, defina uma interface para o mapa.
  // gridContainer (usado para carregar imagem de fundo no Phaser) — defina se necessário.
  private gridContainer: Phaser.GameObjects.Container | null = null;
  
  constructor(private apiService: ApiService, private toastr: ToastrService) {}

  // Setters para injetar informações necessárias
  public setMesaId(mesaId: number): void {
    this.mesaId = mesaId;
  }

  public setCurrentMap(map: any): void {
    this.currentMap = map;
  }

  public setGridContainer(container: Phaser.GameObjects.Container): void {
    this.gridContainer = container;
  }

  // Tratamento do upload de imagem
  public onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadImagem(); // Envia automaticamente
      event.target.value = ''; // Permite novo upload do mesmo arquivo
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
          const novaImagem: ImagemDto = {
            ...event.body,
            // Usar a URL retornada pela API, se existir
            imageUrl: event.body.imageUrl
          };
          // Insere a nova imagem no início da lista
          this.imagens.unshift(novaImagem);
          this.resetUpload();
        }
      },
      error: (error) => {
        console.error('Erro no upload:', error);
        this.resetUpload();
      }
    });
  }

  // Método para resetar variáveis de upload
  private resetUpload(): void {
    this.isUploading = false;
    this.uploadProgress = 0;
    this.selectedFile = null;
  }

  // Gera URL a partir dos dados (caso não haja imageUrl)
  public createImageUrl(img: ImagemDto): string {
    if (img.dados && img.extensao) {
      return `data:image/${img.extensao};base64,${img.dados}`;
    }
    return ''; // Ou retorne uma imagem padrão
  }

  // Carrega as imagens para a mesa atual (usando currentMap.mesaId)
  public carregarImagensDaMesa(): void {
    if (!this.currentMap?.mesaId) return;

    this.apiService.getImagensPorMesa(this.currentMap.mesaId).subscribe({
      next: (imagens: ImagemDto[]) => {
        this.imagens = imagens;
      },
      error: (error) => console.error('Erro ao carregar imagens:', error)
    });
  }

  // Obtém a URL da imagem, seja imageUrl ou gerada por base64
  public getImageUrl(imagem: ImagemDto): string {
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

  // Atualiza o nome da imagem, a partir de um FocusEvent (ex.: quando sair do input)
  public atualizarNomeImagem(img: ImagemDto, event: FocusEvent): void {
    const novoNome = (event.target as HTMLElement).textContent?.trim() || img.nome;

    if (novoNome === img.nome) return;

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

  // Remove a imagem, atualizando a lista de imagens localmente
  public deletarImagem(imagemId: number, event?: Event): void {
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

  // Métodos para carregar a imagem de fundo utilizada pelo Phaser.
  // Esses métodos usam this.currentMap (injetado via setter) e this.gridContainer (também injetado).
  public carregarImagemFundoPhaser(scene: Phaser.Scene): void {
    // Verifica se há uma imagem de fundo definida no currentMap e se o gridContainer foi definido
    if (!this.currentMap?.imaFundo || !this.gridContainer || !this.currentMap.mapaId) return;

    const textureKey = `mapBackground_${this.currentMap.mapaId}`;

    // Se a textura já existir, remove-a
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

    // Aqui podemos calcular o offset e dimensões com base em currentMap ou em configurações padrão
    const hexRadius = 40; // ou obtenha de um método getCurrentGridConfig()
    const offsetX = -hexRadius * Math.sqrt(3) * 0.5;
    const offsetY = -hexRadius * 1.5 * 0.75;
    const gridWidth = (30 + 0.5) * hexRadius * Math.sqrt(3);
    const gridHeight = (30 + 0.5) * hexRadius * 1.5;

    // Remove a imagem anterior, se existir
    // (Se necessário, destrua a instância armazenada)
    const bgImage = scene.add.image(offsetX, offsetY, textureKey)
      .setOrigin(0, 0)
      .setDisplaySize(gridWidth, gridHeight)
      .setDepth(-1);

    // Adiciona a imagem ao container para manter o alinhamento
    this.gridContainer.add(bgImage);
    this.gridContainer.sendToBack(bgImage);
  }

  // Carrega a imagem de fundo completa a partir do ID da imagem
  public carregarImagemDeFundo(imagemId: number): void {
    this.apiService.getImagemPorId(imagemId).subscribe({
      next: (imagem: ImagemDto) => {
        // Atualiza o currentMap com os dados completos da imagem
        if (this.currentMap) {
          this.currentMap.imaFundo = imagem;
        }
      },
      error: (err) => console.error('Erro ao carregar imagem de fundo:', err)
    });
  }
}
