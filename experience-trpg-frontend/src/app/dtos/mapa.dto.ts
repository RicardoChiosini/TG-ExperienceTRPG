import { ImagemDto } from "./imagem.dto";
import { MapaEstadoDto } from "./mapaEstado.dto";

export interface MapaDto {
  mapaId: number;
  mesaId: number;
  nome: string;
  largura: number;
  altura: number;
  tamanhoHex: number;
  estadoJson: string;
  ultimaAtualizacao: Date;
  visivel: boolean;
  imagemFundo?: number;  // ID da imagem de fundo
  imaFundo?: ImagemDto;  // Dados completos da imagem
  fundoUrl?: string;     // URL pronta (opcional)
  estado?: MapaEstadoDto;
}