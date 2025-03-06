import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FichaDto } from '../../../dtos/ficha.dto';

@Component({
  selector: 'app-ficha-dnd5e',
  standalone: false,
  templateUrl: './ficha-dnd5e.component.html',
  styleUrls: ['./ficha-dnd5e.component.css']
})
export class FichaDnd5eComponent implements OnInit {
  @Input() fichaId: number = 0;
  ficha: any = {};
  activeTab: string = 'ficha'; // Define a aba ativa

  todasClasses: string[] = [
    'Artífice', 'Bárbaro', 'Bardo', 'Bruxo', 'Clérigo',
    'Druida', 'Feiticeiro', 'Guerreiro', 'Ladino', 'Mago',
    'Monge', 'Paladino', 'Patrulheiro'
  ];
  todasTendencias: string[] = [
    'Caótico Mal', 'Caótico Neutro', 'Caótico Bom',
    'Neutro Mal', 'Neutro Neutro', 'Neutro Bom',
    'Leal Mal', 'Leal Neutro', 'Leal Bom'
  ];

  classe1: string = '';
  classe2: string = '';
  classe3: string = '';
  nvClasse1: number = 0;
  nvClasse2: number = 0;
  nvClasse3: number = 0;
  tendencias: string[] = [''];

  // Propriedades para armazenar valores dos atributos
  forValue: number = 10; // Força
  desValue: number = 10; // Destreza
  conValue: number = 10; // Constituição
  intValue: number = 10; // Inteligência
  sabValue: number = 10; // Sabedoria
  carValue: number = 10; // Carisma
  deslocamento: number = 0; // Deslocamento

  // Propriedades para armazenar modificadores
  forModifier: number = 0;
  desModifier: number = 0;
  conModifier: number = 0;
  intModifier: number = 0;
  sabModifier: number = 0;
  carModifier: number = 0;

  // Propriedades para armazenar resultados de Resistência
  forResistencia: number = 0; // Iniciar em 10 como padrão
  desResistencia: number = 0;
  conResistencia: number = 0;
  intResistencia: number = 0;
  sabResistencia: number = 0;
  carResistencia: number = 0;

  // Checboxes para testes de resistência
  forResistenciaCheckbox: boolean = false;
  desResistenciaCheckbox: boolean = false;
  conResistenciaCheckbox: boolean = false;
  intResistenciaCheckbox: boolean = false;
  sabResistenciaCheckbox: boolean = false;
  carResistenciaCheckbox: boolean = false;

  // Proficiência (adicionar conforme seu sistema)
  proficiencia: number = 0;
  proficienciaMetade: number = 0;

  // Propriedades para armazenar resultados das perícias
  acrobaciaModifier: number = 0;
  adestrarAnimaisModifier: number = 0;
  arcanismoModifier: number = 0;
  atletismoModifier: number = 0;
  enganacaoModifier: number = 0;
  furtividadeModifier: number = 0;
  historiaModifier: number = 0;
  intimidacaoModifier: number = 0;
  intuicaoModifier: number = 0;
  investigacaoModifier: number = 0;
  medicinaModifier: number = 0;
  naturezaModifier: number = 0;
  percepcaoModifier: number = 0;
  performanceModifier: number = 0;
  persuasaoModifier: number = 0;
  prestidigitacaoModifier: number = 0;
  religiaoModifier: number = 0;
  sobrevivenciaModifier: number = 0;

  acrobaciaCheckbox: boolean = false;
  adestrarAnimaisCheckbox: boolean = false;
  arcanismoCheckbox: boolean = false;
  atletismoCheckbox: boolean = false;
  enganacaoCheckbox: boolean = false;
  furtividadeCheckbox: boolean = false;
  historiaCheckbox: boolean = false;
  intimidacaoCheckbox: boolean = false;
  intuicaoCheckbox: boolean = false;
  investigacaoCheckbox: boolean = false;
  medicinaCheckbox: boolean = false;
  naturezaCheckbox: boolean = false;
  percepcaoCheckbox: boolean = false;
  performanceCheckbox: boolean = false;
  persuasaoCheckbox: boolean = false;
  prestidigitacaoCheckbox: boolean = false;
  religiaoCheckbox: boolean = false;
  sobrevivenciaCheckbox: boolean = false;

  aptacrobaciaCheckbox: boolean = false;
  aptadestrarAnimaisCheckbox: boolean = false;
  aptarcanismoCheckbox: boolean = false;
  aptatletismoCheckbox: boolean = false;
  aptenganacaoCheckbox: boolean = false;
  aptfurtividadeCheckbox: boolean = false;
  apthistoriaCheckbox: boolean = false;
  aptintimidacaoCheckbox: boolean = false;
  aptintuicaoCheckbox: boolean = false;
  aptinvestigacaoCheckbox: boolean = false;
  aptmedicinaCheckbox: boolean = false;
  aptnaturezaCheckbox: boolean = false;
  aptpercepcaoCheckbox: boolean = false;
  aptperformanceCheckbox: boolean = false;
  aptpersuasaoCheckbox: boolean = false;
  aptprestidigitacaoCheckbox: boolean = false;
  aptreligiaoCheckbox: boolean = false;
  aptsobrevivenciaCheckbox: boolean = false;

  versatilidadeCheckbox: boolean = false;
  verIniciativa: number = 0;

  bonusAcrobacia: number = 0;
  bonusAdestrarAnimais: number = 0;
  bonusArcanismo: number = 0;
  bonusAtletismo: number = 0;
  bonusEnganacao: number = 0;
  bonusFurtividade: number = 0;
  bonusHistoria: number = 0;
  bonusIntimidacao: number = 0;
  bonusIntuicao: number = 0;
  bonusInvestigacao: number = 0;
  bonusMedicina: number = 0;
  bonusNatureza: number = 0;
  bonusPercepcao: number = 0;
  bonusPerformance: number = 0;
  bonusPersuasao: number = 0;
  bonusPrestidigitacao: number = 0;
  bonusReligiao: number = 0;
  bonusSobrevivencia: number = 0;

  baseCa: number = 10;
  bonusCa: number = 0;
  ca: number = 0;

  bonusIniciativa: number = 0;

  // Propriedades para armazenar os atributos de cada perícia
  acrobaciaAtributo: string = 'Des';
  adestrarAnimaisAtributo: string = 'Sab';
  arcanismoAtributo: string = 'Int';
  atletismoAtributo: string = 'For';
  enganacaoAtributo: string = 'Car';
  furtividadeAtributo: string = 'Des';
  historiaAtributo: string = 'Int';
  intimidacaoAtributo: string = 'Car';
  intuicaoAtributo: string = 'Sab';
  investigacaoAtributo: string = 'Int';
  medicinaAtributo: string = 'Sab';
  naturezaAtributo: string = 'Int';
  percepcaoAtributo: string = 'Sab';
  performanceAtributo: string = 'Car';
  persuasaoAtributo: string = 'Car';
  prestidigitacaoAtributo: string = 'Des';
  religiaoAtributo: string = 'Int';
  sobrevivenciaAtributo: string = 'Sab';

  caAtributo1: string = 'Des';
  caAtributo2: string = '';

  getModifier(atributo: string): number {
    switch (atributo) {
      case 'For':
        return this.forModifier;
      case 'Des':
        return this.desModifier;
      case 'Con':
        return this.conModifier;
      case 'Int':
        return this.intModifier;
      case 'Sab':
        return this.sabModifier;
      case 'Car':
        return this.carModifier;
      default:
        return 0; // Retornar 0 se o atributo não for válido
    }
  }

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    if (this.fichaId) {
      this.carregarFicha(this.fichaId);
    }

    this.atualizarModificadores();
  }

  carregarFicha(fichaId: number): void {
    this.apiService.getFichaPorId(fichaId).subscribe(
      (data) => {
        this.ficha = data; // Carrega os dados da ficha
      },
      (error) => {
        console.error('Erro ao carregar ficha:', error);
      }
    );
  }

  setActiveTab(tabName: string): void {
    this.activeTab = tabName; // Define a aba ativa
  }

  // Função para calcular a soma dos níveis
  totalNiveis(): number {
    return this.nvClasse1 + this.nvClasse2 + this.nvClasse3;
  }

  // Método chamado em alterações dos níveis
  atualizarTotalNiveis(): void {
    const total = this.totalNiveis();
    this.atualizarModificadores();
}

  Proficiencia(): number {
    const total = this.totalNiveis();
    this.proficiencia = Math.floor((total + 7) / 4);
    this.proficienciaMetade = Math.floor(this.proficiencia / 2);
    return this.proficiencia;
  }

  onClassSelected() {
    // Triggered on selection changes for further logic if needed.
  }

  // Método para verificar se a classe deve ser desabilitada
  isClassDisabled(classe: string, index: number): boolean {
    // Verificar se a classe já está selecionada em outra posição
    return (this.classe1 === classe && index !== 0) || 
           (this.classe2 === classe && index !== 1) || 
           (this.classe3 === classe && index !== 2);
}

  // Método para atualizar modificadores
  atualizarModificadores(): void {
    this.forModifier = Math.floor((this.forValue - 10) / 2);
    this.desModifier = Math.floor((this.desValue - 10) / 2);
    this.conModifier = Math.floor((this.conValue - 10) / 2);
    this.intModifier = Math.floor((this.intValue - 10) / 2);
    this.sabModifier = Math.floor((this.sabValue - 10) / 2);
    this.carModifier = Math.floor((this.carValue - 10) / 2);

    // Atualizar os valores dos testes de resistência
    this.atualizarTestesDeResistencia();

    // Atualizar as perícias após os modificadores serem recalculados
    this.atualizarPericias();

    // Atualizar o valor de CA
    this.atualizarCa();
  }

  atualizarTestesDeResistencia(): void {
    this.forResistencia = this.forModifier + (this.forResistenciaCheckbox ? this.proficiencia : 0);
    this.desResistencia = this.desModifier + (this.desResistenciaCheckbox ? this.proficiencia : 0);
    this.conResistencia = this.conModifier + (this.conResistenciaCheckbox ? this.proficiencia : 0);
    this.intResistencia = this.intModifier + (this.intResistenciaCheckbox ? this.proficiencia : 0);
    this.sabResistencia = this.sabModifier + (this.sabResistenciaCheckbox ? this.proficiencia : 0);
    this.carResistencia = this.carModifier + (this.carResistenciaCheckbox ? this.proficiencia : 0);
  }

  // Novo método para atualizar modificadores das perícias
  atualizarPericias(): void {
    this.acrobaciaModifier = this.getModifier(this.acrobaciaAtributo) + (this.acrobaciaCheckbox ? this.proficiencia + (this.aptacrobaciaCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusAcrobacia;
    this.adestrarAnimaisModifier = this.getModifier(this.adestrarAnimaisAtributo) + (this.adestrarAnimaisCheckbox ? this.proficiencia + (this.aptadestrarAnimaisCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0) + this.bonusAdestrarAnimais);
    this.arcanismoModifier = this.getModifier(this.arcanismoAtributo) + (this.arcanismoCheckbox ? this.proficiencia + (this.aptarcanismoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusArcanismo;
    this.atletismoModifier = this.getModifier(this.atletismoAtributo) + (this.atletismoCheckbox ? this.proficiencia + (this.aptatletismoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusAtletismo;
    this.enganacaoModifier = this.getModifier(this.enganacaoAtributo) + (this.enganacaoCheckbox ? this.proficiencia + (this.aptenganacaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusEnganacao;
    this.furtividadeModifier = this.getModifier(this.furtividadeAtributo) + (this.furtividadeCheckbox ? this.proficiencia + (this.aptfurtividadeCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusFurtividade;
    this.historiaModifier = this.getModifier(this.historiaAtributo) + (this.historiaCheckbox ? this.proficiencia + (this.apthistoriaCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusHistoria;
    this.intimidacaoModifier = this.getModifier(this.intimidacaoAtributo) + (this.intimidacaoCheckbox ? this.proficiencia + (this.aptintimidacaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusIntimidacao;
    this.intuicaoModifier = this.getModifier(this.intuicaoAtributo) + (this.intuicaoCheckbox ? this.proficiencia + (this.aptintuicaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusIntuicao;
    this.investigacaoModifier = this.getModifier(this.investigacaoAtributo) + (this.investigacaoCheckbox ? this.proficiencia + (this.aptinvestigacaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusInvestigacao;
    this.medicinaModifier = this.getModifier(this.medicinaAtributo) + (this.medicinaCheckbox ? this.proficiencia + (this.aptmedicinaCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusMedicina;
    this.naturezaModifier = this.getModifier(this.naturezaAtributo) + (this.naturezaCheckbox ? this.proficiencia + (this.aptnaturezaCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusNatureza;
    this.percepcaoModifier = this.getModifier(this.percepcaoAtributo) + (this.percepcaoCheckbox ? this.proficiencia + (this.aptpercepcaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusPercepcao;
    this.performanceModifier = this.getModifier(this.performanceAtributo) + (this.performanceCheckbox ? this.proficiencia + (this.aptperformanceCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusPerformance;
    this.persuasaoModifier = this.getModifier(this.persuasaoAtributo) + (this.persuasaoCheckbox ? this.proficiencia + (this.aptpersuasaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusPersuasao;
    this.prestidigitacaoModifier = this.getModifier(this.prestidigitacaoAtributo) + (this.prestidigitacaoCheckbox ? this.proficiencia + (this.aptprestidigitacaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusPrestidigitacao;
    this.religiaoModifier = this.getModifier(this.religiaoAtributo) + (this.religiaoCheckbox ? this.proficiencia + (this.aptreligiaoCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusReligiao;
    this.sobrevivenciaModifier = this.getModifier(this.sobrevivenciaAtributo) + (this.sobrevivenciaCheckbox ? this.proficiencia + (this.aptsobrevivenciaCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusSobrevivencia;
    this.verIniciativa = this.versatilidadeCheckbox ? this.proficienciaMetade : 0;
  }

  atualizarCa(): void {
    this.ca = this.baseCa + this.bonusCa + this.getModifier(this.caAtributo1) + this.getModifier(this.caAtributo2);
  }

  // Métodos para atualizar valores dos atributos e recalcular modificadores
  setForValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement; // Casting para HTMLInputElement
    let value = inputElement.valueAsNumber;
    // Verifique se o valor é nulo ou NaN e defina um valor padrão
    this.forValue = !isNaN(value) && value !== null ? value : 10;
    this.atualizarModificadores(); // Atualiza os modificadores
  }

  updateForResistencia(event: Event): void {
    this.forResistenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarTestesDeResistencia();
  }

  setDesValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.desValue = !isNaN(value) && value !== null ? value : 10;
    this.atualizarModificadores();
  }

  updateDesResistencia(event: Event): void {
    this.desResistenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarTestesDeResistencia();
  }

  setConValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.conValue = !isNaN(value) && value !== null ? value : 10;
    this.atualizarModificadores();
  }

  updateConResistencia(event: Event): void {
    this.conResistenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarTestesDeResistencia();
  }

  setIntValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.intValue = !isNaN(value) && value !== null ? value : 10;
    this.atualizarModificadores();
  }

  updateIntResistencia(event: Event): void {
    this.intResistenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarTestesDeResistencia();
  }

  setSabValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.sabValue = !isNaN(value) && value !== null ? value : 10;
    this.atualizarModificadores();
  }

  updateSabResistencia(event: Event): void {
    this.sabResistenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarTestesDeResistencia();
  }

  setCarValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.carValue = !isNaN(value) && value !== null ? value : 10;
    this.atualizarModificadores();
  }

  updateCarResistencia(event: Event): void {
    this.carResistenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarTestesDeResistencia();
  }

  // Métodos de atualização para as perícias com controle dos checkboxes
  updateAcrobacia(event: Event): void {
    this.acrobaciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias(); // Atualiza as perícias após a mudança
  }

  updateAdestrarAnimais(event: Event): void {
    this.adestrarAnimaisCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateArcanismo(event: Event): void {
    this.arcanismoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAtletismo(event: Event): void {
    this.atletismoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateEnganacao(event: Event): void {
    this.enganacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateFurtividade(event: Event): void {
    this.furtividadeCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateHistoria(event: Event): void {
    this.historiaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateIntimidacao(event: Event): void {
    this.intimidacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateIntuicao(event: Event): void {
    this.intuicaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateInvestigacao(event: Event): void {
    this.investigacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateMedicina(event: Event): void {
    this.medicinaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateNatureza(event: Event): void {
    this.naturezaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updatePercepcao(event: Event): void {
    this.percepcaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updatePerformance(event: Event): void {
    this.performanceCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updatePersuasao(event: Event): void {
    this.persuasaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updatePrestidigitacao(event: Event): void {
    this.prestidigitacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateReligiao(event: Event): void {
    this.religiaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateSobrevivencia(event: Event): void {
    this.sobrevivenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  // Métodos de atualização para as perícias com controle dos checkboxes
  updateAptAcrobacia(event: Event): void {
    this.aptacrobaciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias(); // Atualiza as perícias após a mudança
  }

  updateAptAdestrarAnimais(event: Event): void {
    this.aptadestrarAnimaisCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptArcanismo(event: Event): void {
    this.aptarcanismoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptAtletismo(event: Event): void {
    this.aptatletismoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptEnganacao(event: Event): void {
    this.aptenganacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptFurtividade(event: Event): void {
    this.aptfurtividadeCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptHistoria(event: Event): void {
    this.apthistoriaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptIntimidacao(event: Event): void {
    this.aptintimidacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptIntuicao(event: Event): void {
    this.aptintuicaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptInvestigacao(event: Event): void {
    this.aptinvestigacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptMedicina(event: Event): void {
    this.aptmedicinaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptNatureza(event: Event): void {
    this.aptnaturezaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptPercepcao(event: Event): void {
    this.aptpercepcaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptPerformance(event: Event): void {
    this.aptperformanceCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptPersuasao(event: Event): void {
    this.aptpersuasaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptPrestidigitacao(event: Event): void {
    this.aptprestidigitacaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptReligiao(event: Event): void {
    this.aptreligiaoCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateAptSobrevivencia(event: Event): void {
    this.aptsobrevivenciaCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  updateVersatilidade(event: Event): void {
    this.versatilidadeCheckbox = (event.target as HTMLInputElement).checked;
    this.atualizarPericias();
  }

  setBonusAcrobacia(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusAcrobacia = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusAdestrarAnimais(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusAdestrarAnimais = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusArcanismo(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusArcanismo = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusAtletismo(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusAtletismo = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusEnganacao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusEnganacao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusFurtividade(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusFurtividade = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusHistoria(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusHistoria = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusIntimidacao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusIntimidacao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusIntuicao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusIntuicao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusInvestigacao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusInvestigacao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusMedicina(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusMedicina = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusNatureza(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusNatureza = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusPercepcao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusPercepcao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusPerformance(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusPerformance = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusPersuasao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusPersuasao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusPrestidigitacao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusPrestidigitacao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusReligiao(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusReligiao = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBonusSobrevivencia(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusSobrevivencia = !isNaN(value) && value !== null ? value : 0;
    this.atualizarPericias();
  }

  setBaseCa(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.baseCa = !isNaN(value) && value !== null ? value : 10;
    this.atualizarCa();
  }

  setBonusCa(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusCa = !isNaN(value) && value !== null ? value : 0;
    this.atualizarCa();
  }

  setBonusIniciativa(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.valueAsNumber;
    this.bonusIniciativa = !isNaN(value) && value !== null ? value : 0;
  }

}