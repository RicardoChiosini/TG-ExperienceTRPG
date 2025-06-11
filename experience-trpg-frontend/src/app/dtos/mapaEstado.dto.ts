export interface TokenDto {
  id: string;
  nome: string;
  x: number;  // double no backend
  y: number;  // double no backend
  z: number;
  imagemDados: string; // URL completa ou data:image
  donoId: number;
  visivelParaTodos: boolean;
  bloqueado: boolean;
  mapaId: integer;
  metadados?: {
    rotation?: number;
    width?: number;
    height?: number;
    [key: string]: any;
  };
  dataCriacao?: string; // Usaremos string para facilitar, pode converter para Date quando necessário
  version: number;
}

export interface TokenUpdateDto {
    x?: number;
    y?: number;
    z?: number;
    visivelParaTodos?: boolean;
    bloqueado?: boolean;
    metadados?: { [key: string]: any };
}

export interface CamadaDto {
  id: string;
  nome: string;
  tipo: string; // "fundo", "grid", "objetos", "tokens", "dmg"
  visivel: boolean;
  ordem: number;
  dados: string; // Dados específicos da camada
}

export interface ObjetoDeMapaDto {
  id: string;
  tipo: string; // "retangulo", "circulo", "poligono", "texto"
  x: number;
  y: number;
  cor: string;
  propriedades?: Record<string, any>; // Equivalente a Dictionary<string, object>
}

export interface ConfiguracaoMapaDto {
  tipoGrid: string;
  tamanhoCelula: number;
  corGrid: string;
  snapToGrid: boolean;
}

export interface MapaEstadoDto {
  mapaId: number;
  tokens: TokenDto[];
  camadas?: CamadaDto[];
  objetos?: ObjetoDeMapaDto[];
  configuracoes: ConfiguracaoMapaDto;
}