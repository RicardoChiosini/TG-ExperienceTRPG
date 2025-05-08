export interface TokenDto {
    id: string;
    nome: string;
    x: number;
    y: number;
    z?: number; // Ordem de empilhamento
    imagemDados: string; // Base64 da imagem
    donoId: number; // ID do usuário que colocou o token
    visivelParaTodos?: boolean;
    bloqueado?: boolean;
    metadados?: Record<string, string>;
  }

export interface MapaEstadoDto {
    Tokens: TokenDto[]; // Lista de tokens que representam o estado do mapa
}