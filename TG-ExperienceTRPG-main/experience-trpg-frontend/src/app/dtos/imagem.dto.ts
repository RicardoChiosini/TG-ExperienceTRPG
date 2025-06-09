export interface ImagemDto {
    imagemId: number;
    nome: string;
    extensao: string;
    dados: string; // base64
    imageUrl: string;
    mesaId: number;
  }