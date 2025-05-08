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
}