import { ImagemDto } from './imagem.dto';

export interface AtributoDto {
  atributoId: number;
  nome: string;
  valor: number; // Ou float, se você precisar de valores decimais
  fichaId: number;
}

export interface HabilidadeDto {
  habilidadeId: number;
  nome: string;
  descricao: string;
  fichaId: number;
}

export interface ProficienciaDto {
  proficienciaId: number;
  nome: string;
  proficiente: boolean;
  fichaId: number;
}

export interface FichaDto {
    fichaId: number;
    nome: string;
    descricao: string;
    sistemaId: number;
    mesaId: number;
    imagemId: number;

    imagem?: ImagemDto;

    // Adicionar coleções para atributos, proficiências e habilidades
    atributos: AtributoDto[];      // Lista de Atributos
    habilidades: HabilidadeDto[];  // Lista de Habilidades
    proficiencias: ProficienciaDto[]; // Lista de Proficiências
  }