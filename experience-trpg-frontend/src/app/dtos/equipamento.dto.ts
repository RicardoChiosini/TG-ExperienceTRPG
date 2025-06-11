export class EquipamentoDto {
  equipamentoId: number = 0;
  nome: string = '';
  descricao: string = ''; // "Arma", "Armadura", "Escudo" ou "Item"
  fichaId: number = 0;

  // Propriedades polimórficas
  arma?: ArmaDto;
  armadura?: ArmaduraDto;
  escudo?: EscudoDto;
  item?: ItemDto;

  // Método para acessar o estado baseado na descrição
  get estado(): any {
    switch (this.descricao) {
      case 'Arma': return this.arma;
      case 'Armadura': return this.armadura;
      case 'Escudo': return this.escudo;
      case 'Item': return this.item;
      default: return null;
    }
  }

  // Factory method para criar instâncias baseadas no tipo
  static create(type: 'Arma' | 'Armadura' | 'Escudo' | 'Item'): EquipamentoDto {
    const equipamento = new EquipamentoDto();
    equipamento.descricao = type;
    
    switch (type) {
      case 'Arma': 
        equipamento.arma = new ArmaDto();
        break;
      case 'Armadura':
        equipamento.armadura = new ArmaduraDto();
        break;
      case 'Escudo':
        equipamento.escudo = new EscudoDto();
        break;
      case 'Item':
        equipamento.item = new ItemDto();
        break;
    }
    
    return equipamento;
  }
}

export class ArmaDto {
  armaId: number = 0;
  quantidade: number = 1;
  nome: string = '';
  proficiencia: boolean = false;
  tipoAcerto: string = '';
  bonusAcerto: string = '';
  bonusMagico: number = 0;
  descricao: string = '';
  dadosDano1: string = '';
  tipoDano1: string = '';
  bonusDano1: string = '';
  dadosCritico1: string = '';
  dadosDano2: string = '';
  tipoDano2: string = '';
  bonusDano2: string = '';
  dadosCritico2: string = '';
}

export class ArmaduraDto {
  armaduraId: number = 0;
  nome: string = '';
  equipado: boolean = false;
  tipoArmadura: string = '';
  baseArmadura: number = 0;
  bonusDes: number = 0;
  bonusMagico: number = 0;
}

export class EscudoDto {
  escudoId: number = 0;
  nome: string = '';
  equipado: boolean = false;
  baseEscudo: number = 0;
  bonusMagico: number = 0;
}

export class ItemDto {
  itemId: number = 0;
  nome: string = '';
  quantidade: number = 1;
  descricao: string = '';
}