import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FichaDto, AtributoDto, HabilidadeDto, ProficienciaDto } from '../../../dtos/ficha.dto';
import { ImagemDto } from '../../../dtos/imagem.dto';
import { FichaStateService } from '../../../services/ficha-state.service';

@Component({
    selector: 'app-ficha-dnd5e',
    standalone: false,
    templateUrl: './ficha-dnd5e.component.html',
    styleUrls: ['./ficha-dnd5e.component.css']
})
export class FichaDnd5eComponent implements OnInit {
    @Input() fichaId: number = 0;
    ficha: FichaDto = {
        fichaId: 0,
        nome: '',
        descricao: '',
        sistemaId: 1,
        mesaId: 0,
        imagemId: 0,
        atributos: [],
        habilidades: [],
        proficiencias: [],
    }
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
    todosTipos: string[] = ['Aberração', 'Besta', 'Celestial',
        'Construto', 'Demônio', 'Dragão', 'Elemental', 'Fada',
        'Gigante', 'Humanoide', 'Limo', 'Morto-Vivo',
        'Monstruosidade', 'Planta'
    ];
    todosTamanhos: string[] = ['Miúdo', 'Pequeno', 'Médio',
        'Grande', 'Enorme', 'Gigantesco', 'Colossal'
    ];

    // Campos para controle da imagem
    selectedImage: ImagemDto | null = null;
    showImageSelector = false;
    mesaImages: ImagemDto[] = [];

    nome: string = '';

    raca: string = '';
    antecedente: string = '';
    personalidade: string = '';
    ideais: string = '';
    vinculos: string = '';
    defeitos: string = '';

    tipo: string = '';
    tamanho: string = '';
    altura: string = '';
    peso: string = '';
    pele: string = '';
    olhos: string = '';
    cabelo: string = '';
    idade: string = '';
    lore: string = '';
    anotacoes: string = '';

    classe1: string = '';
    classe2: string = '';
    classe3: string = '';
    nvClasse1: number = 0;
    nvClasse2: number = 0;
    nvClasse3: number = 0;
    experiencia: number = 0;
    tendencia: string = '';

    // Propriedades para armazenar valores dos atributos
    forValue: number = 10; // Força
    desValue: number = 10; // Destreza
    conValue: number = 10; // Constituição
    intValue: number = 10; // Inteligência
    sabValue: number = 10; // Sabedoria
    carValue: number = 10; // Carisma
    deslocamentoCaminhada: number = 0; // Deslocamento Padrão
    deslocamentoEscalada: number = 0; // Deslocamento Escalada
    deslocamentoAgua: number = 0; // Deslocamento na Água
    deslocamentoVoo: number = 0; // Deslocamento de Voo
    deslocamentoEscavacao: number = 0; // Deslocamento de Escavação

    // Propriedades para armazenar modificadores
    forModifier: number = 0;
    desModifier: number = 0;
    conModifier: number = 0;
    intModifier: number = 0;
    sabModifier: number = 0;
    carModifier: number = 0;

    desMax2: number = 0;
    desMax3: number = 0;

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
    talconCheckbox: boolean = false;
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

    hpValue: number = 0;
    hpMaxValue: number = 0;
    hpTempValue: number = 0;

    iniciativa: number = 0;
    bonusIniciativa: number = 0;

    bonusResFor: number = 0;
    bonusResDes: number = 0;
    bonusResCon: number = 0;
    bonusResInt: number = 0;
    bonusResSab: number = 0;
    bonusResCar: number = 0;

    moedasCobre: number = 0;
    moedasPrata: number = 0;
    moedasElectrum: number = 0;
    moedasOuro: number = 0;
    moedasPlatina: number = 0;

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

    iniciativaAtributo1: string = '';
    iniciativaAtributo2: string = '';

    resForAtributoBonus: string = '';
    resDesAtributoBonus: string = '';
    resConAtributoBonus: string = '';
    resIntAtributoBonus: string = '';
    resSabAtributoBonus: string = '';
    resCarAtributoBonus: string = '';

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
            case 'D.M2':
                return this.desMax2;
            case 'D.M3':
                return this.desMax3;
            default:
                return 0; // Retornar 0 se o atributo não for válido
        }
    }

    constructor(private apiService: ApiService, private fichaStateService: FichaStateService) { }

    ngOnInit(): void {
        if (this.fichaId) {
            this.carregarFichaComImagem(this.fichaId);
        }

        this.atualizarModificadores();
    }

    // Método unificado para carregar ficha com imagem
    carregarFichaComImagem(fichaId: number): void {
        this.apiService.getFichaPorId(fichaId).subscribe({
            next: (ficha: FichaDto) => {
                this.ficha = ficha;
                this.inicializaFicha();

                // Se a ficha tem imagem vinculada, carrega os detalhes
                if (ficha.imagemId) {
                    this.apiService.getImagemDaFicha(fichaId).subscribe({
                        next: (imagem: ImagemDto) => {
                            this.selectedImage = imagem;
                        },
                        error: (err) => console.error('Erro ao carregar imagem da ficha:', err)
                    });
                }
            },
            error: (err) => console.error('Erro ao carregar ficha:', err)
        });
    }

    selecionarImagem(imagem: ImagemDto): void {
        if (!this.ficha) return;

        this.apiService.vincularImagemAFicha(this.ficha.fichaId, imagem.imagemId).subscribe({
            next: (fichaAtualizada: FichaDto) => {
                this.ficha = fichaAtualizada;
                this.selectedImage = imagem;
                this.showImageSelector = false;
            },
            error: (err) => console.error('Erro ao vincular imagem:', err)
        });
    }

    removerImagem(): void {
        if (!this.ficha) return;

        this.apiService.removerImagemDaFicha(this.ficha.fichaId).subscribe({
            next: (fichaAtualizada: FichaDto) => {
                this.ficha = fichaAtualizada;
                this.selectedImage = null;
            },
            error: (err) => console.error('Erro ao remover imagem:', err)
        });
    }

    carregarImagensDaMesa(): void {
        if (!this.ficha?.mesaId) return;

        this.apiService.getImagensPorMesa(this.ficha.mesaId).subscribe({
            next: (imagens: ImagemDto[]) => {
                this.mesaImages = imagens.map(img => ({
                    ...img,
                    // Garante que sempre terá uma URL válida
                    url: img.imageUrl || this.createImageUrl(img)
                }));
            },
            error: (error) => console.error('Erro ao carregar imagens:', error)
        });
    }

    private createImageUrl(img: ImagemDto): string {
        // Fallback para imagens antigas que ainda usam base64
        if (img.dados && img.extensao) {
            return `data:image/${img.extensao};base64,${img.dados}`;
        }
        return 'assets/imagem-padrao.png'; // Imagem padrão caso não tenha URL
    }

    toggleImageSelector(): void {
        this.showImageSelector = !this.showImageSelector;
        if (this.showImageSelector) {
            this.carregarImagensDaMesa();
        }
    }

    atualizarFicha(): void {
        this.apiService.updateFicha(this.ficha.fichaId, { imagemId: this.ficha.imagemId }).subscribe(
            () => {
                console.log('Ficha atualizada com sucesso!');
                this.fichaStateService.updateFicha(this.ficha);
            },
            (error) => {
                console.error('Erro ao atualizar ficha:', error);
            }
        );
    }

    inicializaFicha(): void {
        this.nome = this.ficha.nome;
        // Atributos
        this.nvClasse1 = this.ficha.atributos.find(attr => attr.nome === 'NvClasse1')?.valor || 1;
        this.nvClasse2 = this.ficha.atributos.find(attr => attr.nome === 'NvClasse2')?.valor || 0;
        this.nvClasse3 = this.ficha.atributos.find(attr => attr.nome === 'NvClasse3')?.valor || 0;
        this.Proficiencia();
        this.experiencia = this.ficha.atributos.find(attr => attr.nome === 'Experiencia')?.valor || 0;
        this.hpMaxValue = this.ficha.atributos.find(attr => attr.nome === 'Pontos_Vida_Maxima')?.valor || 0;
        this.hpValue = this.ficha.atributos.find(attr => attr.nome === 'Pontos_Vida_Atual')?.valor || 0;
        this.hpTempValue = this.ficha.atributos.find(attr => attr.nome === 'Pontos_Vida_Temporaria')?.valor || 0;
        this.deslocamentoCaminhada = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Caminhada')?.valor || 9;
        this.deslocamentoAgua = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Agua')?.valor || 0;
        this.deslocamentoVoo = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Voo')?.valor || 0;
        this.deslocamentoEscavacao = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Escavacao')?.valor || 0;
        this.forValue = this.ficha.atributos.find(attr => attr.nome === 'Forca')?.valor || 10;
        this.desValue = this.ficha.atributos.find(attr => attr.nome === 'Destreza')?.valor || 10;
        this.conValue = this.ficha.atributos.find(attr => attr.nome === 'Constituicao')?.valor || 10;
        this.intValue = this.ficha.atributos.find(attr => attr.nome === 'Inteligencia')?.valor || 10;
        this.sabValue = this.ficha.atributos.find(attr => attr.nome === 'Sabedoria')?.valor || 10;
        this.carValue = this.ficha.atributos.find(attr => attr.nome === 'Carisma')?.valor || 10;
        this.atualizarModificadores();
        this.bonusResFor = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_For')?.valor || 0;
        this.bonusResDes = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Des')?.valor || 0;
        this.bonusResCon = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Con')?.valor || 0;
        this.bonusResInt = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Int')?.valor || 0;
        this.bonusResSab = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Sab')?.valor || 0;
        this.bonusResCar = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Car')?.valor || 0;
        this.bonusAcrobacia = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Acrobacia')?.valor || 0;
        this.bonusAdestrarAnimais = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Adestrar_Animais')?.valor || 0;
        this.bonusArcanismo = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Arcanismo')?.valor || 0;
        this.bonusAtletismo = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Atletismo')?.valor || 0;
        this.bonusEnganacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Enganacao')?.valor || 0;
        this.bonusFurtividade = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Furtividade')?.valor || 0;
        this.bonusHistoria = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Historia')?.valor || 0;
        this.bonusIntimidacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Intimidacao')?.valor || 0;
        this.bonusIntuicao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Intuicao')?.valor || 0;
        this.bonusInvestigacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Investigacao')?.valor || 0;
        this.bonusMedicina = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Medicina')?.valor || 0;
        this.bonusNatureza = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Natureza')?.valor || 0;
        this.bonusPercepcao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Percepcao')?.valor || 0;
        this.bonusPerformance = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Performance')?.valor || 0;
        this.bonusPersuasao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Persuasao')?.valor || 0;
        this.bonusPrestidigitacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Prestidigitacao')?.valor || 0;
        this.bonusReligiao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Religiao')?.valor || 0;
        this.bonusSobrevivencia = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Sobrevivencia')?.valor || 0;
        this.baseCa = this.ficha.atributos.find(attr => attr.nome === 'CA_Base')?.valor || 10;
        this.bonusCa = this.ficha.atributos.find(attr => attr.nome === 'CA_Bonus')?.valor || 0;
        this.bonusIniciativa = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Iniciativa')?.valor || 0;
        this.moedasCobre = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Cobre')?.valor || 0;
        this.moedasPrata = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Prata')?.valor || 0;
        this.moedasElectrum = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Electrum')?.valor || 0;
        this.moedasOuro = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Ouro')?.valor || 0;
        this.moedasPlatina = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Platina')?.valor || 0;

        // Habilidades
        this.classe1 = this.ficha.habilidades.find(hab => hab.nome === 'Classe1')?.descricao || '';
        this.classe2 = this.ficha.habilidades.find(hab => hab.nome === 'Classe2')?.descricao || '';
        this.classe3 = this.ficha.habilidades.find(hab => hab.nome === 'Classe3')?.descricao || '';
        this.raca = this.ficha.habilidades.find(hab => hab.nome === 'Raca')?.descricao || '';
        this.antecedente = this.ficha.habilidades.find(hab => hab.nome === 'Antecedente')?.descricao || '';
        this.tendencia = this.ficha.habilidades.find(hab => hab.nome === 'Tendencia')?.descricao || '';
        this.personalidade = this.ficha.habilidades.find(hab => hab.nome === 'Personalidade')?.descricao || '';
        this.ideais = this.ficha.habilidades.find(hab => hab.nome === 'Ideais')?.descricao || '';
        this.vinculos = this.ficha.habilidades.find(hab => hab.nome === 'Vinculos')?.descricao || '';
        this.defeitos = this.ficha.habilidades.find(hab => hab.nome === 'Defeitos')?.descricao || '';
        this.tipo = this.ficha.habilidades.find(hab => hab.nome === 'Tipo')?.descricao || '';
        this.tamanho = this.ficha.habilidades.find(hab => hab.nome === 'Tamanho')?.descricao || '';
        this.altura = this.ficha.habilidades.find(hab => hab.nome === 'Altura')?.descricao || '';
        this.peso = this.ficha.habilidades.find(hab => hab.nome === 'Peso')?.descricao || '';
        this.pele = this.ficha.habilidades.find(hab => hab.nome === 'Pele')?.descricao || '';
        this.olhos = this.ficha.habilidades.find(hab => hab.nome === 'Olhos')?.descricao || '';
        this.cabelo = this.ficha.habilidades.find(hab => hab.nome === 'Cabelo')?.descricao || '';
        this.idade = this.ficha.habilidades.find(hab => hab.nome === 'Idade')?.descricao || '';
        this.lore = this.ficha.habilidades.find(hab => hab.nome === 'Lore')?.descricao || '';
        this.anotacoes = this.ficha.habilidades.find(hab => hab.nome === 'Anotacoes')?.descricao || '';
        this.caAtributo1 = this.ficha.habilidades.find(hab => hab.nome === 'Ca_Atributo1')?.descricao || '';
        this.caAtributo2 = this.ficha.habilidades.find(hab => hab.nome === 'Ca_Atributo2')?.descricao || '';
        this.atualizarCa();
        this.iniciativaAtributo1 = this.ficha.habilidades.find(hab => hab.nome === 'Iniciativa_Atributo1')?.descricao || '';
        this.iniciativaAtributo2 = this.ficha.habilidades.find(hab => hab.nome === 'Iniciativa_Atributo2')?.descricao || '';
        this.atualizarIniciativa();
        this.resForAtributoBonus = this.ficha.habilidades.find(hab => hab.nome === 'Res_For_Atributo_Bonus')?.descricao || '';
        this.resDesAtributoBonus = this.ficha.habilidades.find(hab => hab.nome === 'Res_Des_Atributo_Bonus')?.descricao || '';
        this.resConAtributoBonus = this.ficha.habilidades.find(hab => hab.nome === 'Res_Con_Atributo_Bonus')?.descricao || '';
        this.resIntAtributoBonus = this.ficha.habilidades.find(hab => hab.nome === 'Res_Int_Atributo_Bonus')?.descricao || '';
        this.resSabAtributoBonus = this.ficha.habilidades.find(hab => hab.nome === 'Res_Sab_Atributo_Bonus')?.descricao || '';
        this.resCarAtributoBonus = this.ficha.habilidades.find(hab => hab.nome === 'Res_Car_Atributo_Bonus')?.descricao || '';

        // Proficiencias
        this.talconCheckbox = this.proficienciaStatus('Talento_Confiavel');
        this.versatilidadeCheckbox = this.proficienciaStatus('Versatilidade');
        this.aptacrobaciaCheckbox = this.proficienciaStatus('Aptidao_Acrobacia');
        this.aptadestrarAnimaisCheckbox = this.proficienciaStatus('Aptidao_Adestrar_Animais');
        this.aptarcanismoCheckbox = this.proficienciaStatus('Aptidao_Arcanismo');
        this.aptatletismoCheckbox = this.proficienciaStatus('Aptidao_Atletismo');
        this.aptenganacaoCheckbox = this.proficienciaStatus('Aptidao_Enganacao');
        this.aptfurtividadeCheckbox = this.proficienciaStatus('Aptidao_Furtividade');
        this.apthistoriaCheckbox = this.proficienciaStatus('Aptidao_Historia');
        this.aptintimidacaoCheckbox = this.proficienciaStatus('Aptidao_Intimidacao');
        this.aptintuicaoCheckbox = this.proficienciaStatus('Aptidao_Intuicao');
        this.aptinvestigacaoCheckbox = this.proficienciaStatus('Aptidao_Investigacao');
        this.aptmedicinaCheckbox = this.proficienciaStatus('Aptidao_Medicina');
        this.aptnaturezaCheckbox = this.proficienciaStatus('Aptidao_Natureza');
        this.aptpercepcaoCheckbox = this.proficienciaStatus('Aptidao_Percepcao');
        this.aptperformanceCheckbox = this.proficienciaStatus('Aptidao_Performance');
        this.aptpersuasaoCheckbox = this.proficienciaStatus('Aptidao_Persuasao');
        this.aptprestidigitacaoCheckbox = this.proficienciaStatus('Aptidao_Prestidigitacao');
        this.aptreligiaoCheckbox = this.proficienciaStatus('Aptidao_Religiao');
        this.aptsobrevivenciaCheckbox = this.proficienciaStatus('Aptidao_Sobrevivencia');
        this.acrobaciaCheckbox = this.proficienciaStatus('Acrobacia');
        this.adestrarAnimaisCheckbox = this.proficienciaStatus('Adestrar_Animais');
        this.arcanismoCheckbox = this.proficienciaStatus('Arcanismo');
        this.atletismoCheckbox = this.proficienciaStatus('Atletismo');
        this.enganacaoCheckbox = this.proficienciaStatus('Enganacao');
        this.furtividadeCheckbox = this.proficienciaStatus('Furtividade');
        this.historiaCheckbox = this.proficienciaStatus('Historia');
        this.intimidacaoCheckbox = this.proficienciaStatus('Intimidacao');
        this.intuicaoCheckbox = this.proficienciaStatus('Intuicao');
        this.investigacaoCheckbox = this.proficienciaStatus('Investigacao');
        this.medicinaCheckbox = this.proficienciaStatus('Medicina');
        this.naturezaCheckbox = this.proficienciaStatus('Natureza');
        this.percepcaoCheckbox = this.proficienciaStatus('Percepcao');
        this.performanceCheckbox = this.proficienciaStatus('Performance');
        this.persuasaoCheckbox = this.proficienciaStatus('Persuasao');
        this.prestidigitacaoCheckbox = this.proficienciaStatus('Prestidigitacao');
        this.religiaoCheckbox = this.proficienciaStatus('Religiao');
        this.sobrevivenciaCheckbox = this.proficienciaStatus('Sobrevivencia');
        this.forResistenciaCheckbox = this.proficienciaStatus('Resistencia_Forca');
        this.desResistenciaCheckbox = this.proficienciaStatus('Resistencia_Destreza');
        this.conResistenciaCheckbox = this.proficienciaStatus('Resistencia_Constituicao');
        this.intResistenciaCheckbox = this.proficienciaStatus('Resistencia_Inteligencia');
        this.sabResistenciaCheckbox = this.proficienciaStatus('Resistencia_Sabedoria');
        this.carResistenciaCheckbox = this.proficienciaStatus('Resistencia_Carisma');
        this.atualizarPericias();
        this.atualizarTestesDeResistencia();
    }

    private proficienciaStatus(nome: string): boolean {
        return this.ficha.proficiencias.find(prof => prof.nome === nome)?.proficiente || false;
    }

    // Método para atualizar o nome da ficha
    updateFichaNome(): void {
        if (this.ficha.nome !== this.nome) {
            this.apiService.updateFicha(this.fichaId, { nome: this.nome }).subscribe(
                () => {
                    console.log('Nome da ficha atualizado com sucesso!');
                    this.ficha.nome = this.nome; // Atualiza o nome original após confirmação
                    this.fichaStateService.updateFicha(this.ficha);
                },
                (error) => {
                    console.error('Erro ao atualizar nome da ficha:', error);
                }
            );
        }
    }

    // Método para atualizar os atributos
    updateAtributo(atributo: AtributoDto): void {
        this.apiService.updateAtributo(atributo.atributoId, atributo).subscribe(
            () => {
                console.log(`Atributo ${atributo.nome} atualizado com sucesso!`);
            },
            (error) => {
                console.error(`Erro ao atualizar atributo ${atributo.nome}:`, error);
            }
        );
    }

    // Método para atualizar a habilidade
    updateHabilidade(habilidade: HabilidadeDto): void {
        this.apiService.updateHabilidade(habilidade.habilidadeId, habilidade).subscribe(
            () => {
                console.log(`Habilidade ${habilidade.nome} atualizada com sucesso!`);
            },
            (error) => {
                console.error(`Erro ao atualizar habilidade ${habilidade.nome}:`, error);
            }
        );
    }

    // Método para atualizar a proficiência
    updateProficiencia(proficiencia: ProficienciaDto): void {
        this.apiService.updateProficiencia(proficiencia.proficienciaId, proficiencia).subscribe(
            () => {
                console.log(`Proficiência ${proficiencia.nome} atualizada com sucesso!`);
            },
            (error) => {
                console.error(`Erro ao atualizar proficiência ${proficiencia.nome}:`, error);
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

    onTipoSelected() {
        // Triggered on selection changes for further logic if needed.
    }

    onTamanhoSelected() {
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

        if (this.desModifier > 2) { this.desMax2 = 2; } else { this.desMax2 = this.desModifier; }
        if (this.desModifier > 3) { this.desMax3 = 3; } else { this.desMax3 = this.desModifier; }

        // Atualizar os valores dos testes de resistência
        this.atualizarTestesDeResistencia();

        // Atualizar as perícias após os modificadores serem recalculados
        this.atualizarPericias();

        // Atualizar o valor de CA
        this.atualizarCa();

        // Atualizar o valor de Iniciativa
        this.atualizarIniciativa();
    }

    atualizarTestesDeResistencia(): void {
        this.forResistencia = this.forModifier + this.getModifier(this.resForAtributoBonus) + this.bonusResFor + (this.forResistenciaCheckbox ? this.proficiencia : 0);
        this.desResistencia = this.desModifier + this.getModifier(this.resDesAtributoBonus) + this.bonusResDes + (this.desResistenciaCheckbox ? this.proficiencia : 0);
        this.conResistencia = this.conModifier + this.getModifier(this.resConAtributoBonus) + this.bonusResCon + (this.conResistenciaCheckbox ? this.proficiencia : 0);
        this.intResistencia = this.intModifier + this.getModifier(this.resIntAtributoBonus) + this.bonusResInt + (this.intResistenciaCheckbox ? this.proficiencia : 0);
        this.sabResistencia = this.sabModifier + this.getModifier(this.resSabAtributoBonus) + this.bonusResSab + (this.sabResistenciaCheckbox ? this.proficiencia : 0);
        this.carResistencia = this.carModifier + this.getModifier(this.resCarAtributoBonus) + this.bonusResCar + (this.carResistenciaCheckbox ? this.proficiencia : 0);
    }

    // Novo método para atualizar modificadores das perícias
    atualizarPericias(): void {
        this.acrobaciaModifier = this.getModifier(this.acrobaciaAtributo) + (this.acrobaciaCheckbox ? this.proficiencia + (this.aptacrobaciaCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusAcrobacia;
        this.adestrarAnimaisModifier = this.getModifier(this.adestrarAnimaisAtributo) + (this.adestrarAnimaisCheckbox ? this.proficiencia + (this.aptadestrarAnimaisCheckbox ? this.proficiencia : 0) : (this.versatilidadeCheckbox ? this.proficienciaMetade : 0)) + this.bonusAdestrarAnimais;
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

    atualizarIniciativa(): void {
        this.iniciativa = this.bonusIniciativa + this.desModifier + this.verIniciativa + this.getModifier(this.iniciativaAtributo1) + this.getModifier(this.iniciativaAtributo2);
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
        this.atualizarModificadores();
    }

    updateAdestrarAnimais(event: Event): void {
        this.adestrarAnimaisCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateArcanismo(event: Event): void {
        this.arcanismoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAtletismo(event: Event): void {
        this.atletismoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateEnganacao(event: Event): void {
        this.enganacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateFurtividade(event: Event): void {
        this.furtividadeCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateHistoria(event: Event): void {
        this.historiaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateIntimidacao(event: Event): void {
        this.intimidacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateIntuicao(event: Event): void {
        this.intuicaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateInvestigacao(event: Event): void {
        this.investigacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateMedicina(event: Event): void {
        this.medicinaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateNatureza(event: Event): void {
        this.naturezaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updatePercepcao(event: Event): void {
        this.percepcaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updatePerformance(event: Event): void {
        this.performanceCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updatePersuasao(event: Event): void {
        this.persuasaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updatePrestidigitacao(event: Event): void {
        this.prestidigitacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateReligiao(event: Event): void {
        this.religiaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateSobrevivencia(event: Event): void {
        this.sobrevivenciaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    // Métodos de atualização para as perícias com controle dos checkboxes
    updateAptAcrobacia(event: Event): void {
        this.aptacrobaciaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores(); // Atualiza as perícias após a mudança
    }

    updateAptAdestrarAnimais(event: Event): void {
        this.aptadestrarAnimaisCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptArcanismo(event: Event): void {
        this.aptarcanismoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptAtletismo(event: Event): void {
        this.aptatletismoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptEnganacao(event: Event): void {
        this.aptenganacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptFurtividade(event: Event): void {
        this.aptfurtividadeCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptHistoria(event: Event): void {
        this.apthistoriaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptIntimidacao(event: Event): void {
        this.aptintimidacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptIntuicao(event: Event): void {
        this.aptintuicaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptInvestigacao(event: Event): void {
        this.aptinvestigacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptMedicina(event: Event): void {
        this.aptmedicinaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptNatureza(event: Event): void {
        this.aptnaturezaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptPercepcao(event: Event): void {
        this.aptpercepcaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptPerformance(event: Event): void {
        this.aptperformanceCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptPersuasao(event: Event): void {
        this.aptpersuasaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptPrestidigitacao(event: Event): void {
        this.aptprestidigitacaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptReligiao(event: Event): void {
        this.aptreligiaoCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateAptSobrevivencia(event: Event): void {
        this.aptsobrevivenciaCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    updateVersatilidade(event: Event): void {
        this.versatilidadeCheckbox = (event.target as HTMLInputElement).checked;
        this.atualizarModificadores();
    }

    setBonusAcrobacia(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusAcrobacia = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusAdestrarAnimais(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusAdestrarAnimais = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusArcanismo(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusArcanismo = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusAtletismo(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusAtletismo = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusEnganacao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusEnganacao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusFurtividade(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusFurtividade = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusHistoria(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusHistoria = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusIntimidacao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusIntimidacao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusIntuicao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusIntuicao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusInvestigacao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusInvestigacao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusMedicina(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusMedicina = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusNatureza(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusNatureza = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusPercepcao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusPercepcao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusPerformance(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusPerformance = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusPersuasao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusPersuasao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusPrestidigitacao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusPrestidigitacao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusReligiao(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusReligiao = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusSobrevivencia(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusSobrevivencia = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBaseCa(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.baseCa = !isNaN(value) && value !== null ? value : 10;
        this.atualizarModificadores();
    }

    setBonusCa(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusCa = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusIniciativa(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusIniciativa = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setHpValue(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.hpValue = !isNaN(value) && value !== null ? (value > this.hpMaxValue ? this.hpMaxValue : value) : 0;
    }

    setHpMaxValue(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.hpMaxValue = !isNaN(value) && value !== null ? value : 0;
    }

    setHpTempValue(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.hpTempValue = !isNaN(value) && value !== null ? value : 0;
    }

    setBonusResFor(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusResFor = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusResDes(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusResDes = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusResCon(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusResCon = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusResInt(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusResInt = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusResSab(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusResSab = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    setBonusResCar(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        let value = inputElement.valueAsNumber;
        this.bonusResCar = !isNaN(value) && value !== null ? value : 0;
        this.atualizarModificadores();
    }

    atualizarNvClasse1(): void {
        // Obtém o atributo correspondente
        const atributoNvClasse1 = this.ficha.atributos.find(attr => attr.nome === 'NvClasse1');

        if (atributoNvClasse1) {
            // Faz a atualização com as propriedades obrigatórias
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoNvClasse1.atributoId, // Garantindo que o atributoId é um número válido
                nome: atributoNvClasse1.nome,
                valor: this.nvClasse1,
                fichaId: atributoNvClasse1.fichaId // Adicionando fichaId se necessário
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Nível da classe 1 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar nível da classe 1:', error);
                }
            );
        }
        this.atualizarTotalNiveis();
    }

    atualizarNvClasse2(): void {
        const atributoNvClasse2 = this.ficha.atributos.find(attr => attr.nome === 'NvClasse2');

        if (atributoNvClasse2) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoNvClasse2.atributoId,
                nome: atributoNvClasse2.nome,
                valor: this.nvClasse2,
                fichaId: atributoNvClasse2.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Nível da classe 2 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar nível da classe 2:', error);
                }
            );
        }
        this.atualizarTotalNiveis();
    }

    atualizarNvClasse3(): void {
        const atributoNvClasse3 = this.ficha.atributos.find(attr => attr.nome === 'NvClasse3');

        if (atributoNvClasse3) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoNvClasse3.atributoId,
                nome: atributoNvClasse3.nome,
                valor: this.nvClasse3,
                fichaId: atributoNvClasse3.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Nível da classe 3 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar nível da classe 3:', error);
                }
            );
        }
        this.atualizarTotalNiveis();
    }

    atualizarExperiencia(): void {
        const atributoExperiencia = this.ficha.atributos.find(attr => attr.nome === 'Experiencia');

        if (atributoExperiencia) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoExperiencia.atributoId,
                nome: atributoExperiencia.nome,
                valor: this.experiencia,
                fichaId: atributoExperiencia.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Experiencia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Experiencia:', error);
                }
            );
        }
    }

    atualizarPontosVidaMaxima(): void {
        const atributoPontosVidaMaxima = this.ficha.atributos.find(attr => attr.nome === 'Pontos_Vida_Maxima');

        if (atributoPontosVidaMaxima) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPontosVidaMaxima.atributoId,
                nome: atributoPontosVidaMaxima.nome,
                valor: this.hpMaxValue,
                fichaId: atributoPontosVidaMaxima.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Pontos de Vida Maxima atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Pontos de Vida Maxima:', error);
                }
            );
        }
    }

    atualizarPontosVidaAtual(): void {
        const atributoPontosVidaAtual = this.ficha.atributos.find(attr => attr.nome === 'Pontos_Vida_Atual');

        if (atributoPontosVidaAtual) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPontosVidaAtual.atributoId,
                nome: atributoPontosVidaAtual.nome,
                valor: this.hpValue,
                fichaId: atributoPontosVidaAtual.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Pontos de Vida Atual atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Pontos de Vida Atual:', error);
                }
            );
        }
    }

    atualizarPontosVidaTemporarios(): void {
        const atributoPontosVidaTemporarios = this.ficha.atributos.find(attr => attr.nome === 'Pontos_Vida_Temporaria');

        if (atributoPontosVidaTemporarios) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPontosVidaTemporarios.atributoId,
                nome: atributoPontosVidaTemporarios.nome,
                valor: this.hpTempValue,
                fichaId: atributoPontosVidaTemporarios.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Pontos de Vida Temporários atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Pontos de Vida Temporários:', error);
                }
            );
        }
    }

    atualizarDeslocamentoCaminhada(): void {
        const atributoDeslocamentoCaminhada = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Caminhada');

        if (atributoDeslocamentoCaminhada) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoDeslocamentoCaminhada.atributoId,
                nome: atributoDeslocamentoCaminhada.nome,
                valor: this.deslocamentoCaminhada,
                fichaId: atributoDeslocamentoCaminhada.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Deslocamento de Caminhada atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Deslocamento de Caminhada:', error);
                }
            );
        }
    }

    atualizarDeslocamentoAgua(): void {
        const atributoDeslocamentoAgua = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Agua');

        if (atributoDeslocamentoAgua) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoDeslocamentoAgua.atributoId,
                nome: atributoDeslocamentoAgua.nome,
                valor: this.deslocamentoAgua,
                fichaId: atributoDeslocamentoAgua.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Deslocamento na Agua atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Deslocamento na Agua:', error);
                }
            );
        }
    }

    atualizarDeslocamentoEscalada(): void {
        const atributoDeslocamentoEscalada = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Escalada');

        if (atributoDeslocamentoEscalada) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoDeslocamentoEscalada.atributoId,
                nome: atributoDeslocamentoEscalada.nome,
                valor: this.deslocamentoEscalada,
                fichaId: atributoDeslocamentoEscalada.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Deslocamento de Escalada atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Deslocamento de Escalada:', error);
                }
            );
        }
    }

    atualizarDeslocamentoVoo(): void {
        const atributoDeslocamentoVoo = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Voo');

        if (atributoDeslocamentoVoo) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoDeslocamentoVoo.atributoId,
                nome: atributoDeslocamentoVoo.nome,
                valor: this.deslocamentoVoo,
                fichaId: atributoDeslocamentoVoo.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Deslocamento de Voo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Deslocamento de Voo:', error);
                }
            );
        }
    }

    atualizarDeslocamentoEscavacao(): void {
        const atributoDeslocamentoEscavacao = this.ficha.atributos.find(attr => attr.nome === 'Deslocamento_Escavacao');

        if (atributoDeslocamentoEscavacao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoDeslocamentoEscavacao.atributoId,
                nome: atributoDeslocamentoEscavacao.nome,
                valor: this.deslocamentoEscavacao,
                fichaId: atributoDeslocamentoEscavacao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Deslocamento de Escavacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Deslocamento de Escavacao:', error);
                }
            );
        }
    }

    atualizarForca(): void {
        // Obtém o atributo correspondente
        const atributoForca = this.ficha.atributos.find(attr => attr.nome === 'Forca');

        if (atributoForca) {
            // Faz a atualização com as propriedades obrigatórias
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoForca.atributoId, // Garantindo que o atributoId é um número válido
                nome: atributoForca.nome,
                valor: this.forValue,
                fichaId: atributoForca.fichaId // Adicionando fichaId se necessário
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Força atualizada com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar força:', error);
                }
            );
        } else {
            console.error('Atributo de Força não encontrado!');
        }
    }

    atualizarDestreza(): void {
        const atributoDestreza = this.ficha.atributos.find(attr => attr.nome === 'Destreza');

        if (atributoDestreza) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoDestreza.atributoId,
                nome: atributoDestreza.nome,
                valor: this.desValue,
                fichaId: atributoDestreza.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Destreza atualizada com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar destreza:', error);
                }
            );
        } else {
            console.error('Atributo de Destreza não encontrado!');
        }
    }

    atualizarConstituicao(): void {
        const atributoConstituicao = this.ficha.atributos.find(attr => attr.nome === 'Constituicao');

        if (atributoConstituicao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoConstituicao.atributoId,
                nome: atributoConstituicao.nome,
                valor: this.conValue,
                fichaId: atributoConstituicao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Constituição atualizada com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar constituição:', error);
                }
            );
        } else {
            console.error('Atributo de Constituição não encontrado!');
        }
    }

    atualizarInteligencia(): void {
        const atributoInteligencia = this.ficha.atributos.find(attr => attr.nome === 'Inteligencia');

        if (atributoInteligencia) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoInteligencia.atributoId,
                nome: atributoInteligencia.nome,
                valor: this.intValue,
                fichaId: atributoInteligencia.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Inteligência atualizada com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar inteligência:', error);
                }
            );
        } else {
            console.error('Atributo de Inteligência não encontrado!');
        }
    }

    atualizarSabedoria(): void {
        const atributoSabedoria = this.ficha.atributos.find(attr => attr.nome === 'Sabedoria');

        if (atributoSabedoria) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoSabedoria.atributoId,
                nome: atributoSabedoria.nome,
                valor: this.sabValue,
                fichaId: atributoSabedoria.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Sabedoria atualizada com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar sabedoria:', error);
                }
            );
        } else {
            console.error('Atributo de Sabedoria não encontrado!');
        }
    }

    atualizarCarisma(): void {
        const atributoCarisma = this.ficha.atributos.find(attr => attr.nome === 'Carisma');

        if (atributoCarisma) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoCarisma.atributoId,
                nome: atributoCarisma.nome,
                valor: this.carValue,
                fichaId: atributoCarisma.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Carisma atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar carisma:', error);
                }
            );
        } else {
            console.error('Atributo de Carisma não encontrado!');
        }
    }

    atualizarBonusResFor(): void {
        const atributoBonusResFor = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_For');

        if (atributoBonusResFor) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoBonusResFor.atributoId,
                nome: atributoBonusResFor.nome,
                valor: this.bonusResFor,
                fichaId: atributoBonusResFor.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('BonusResFor atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar BonusResFor:', error);
                }
            );
        } else {
            console.error('Atributo de BonusResFor não encontrado!');
        }
    }

    atualizarBonusResDes(): void {
        const atributoBonusResDes = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Des');

        if (atributoBonusResDes) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoBonusResDes.atributoId,
                nome: atributoBonusResDes.nome,
                valor: this.bonusResDes,
                fichaId: atributoBonusResDes.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('BonusResDes atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar BonusResDes:', error);
                }
            );
        } else {
            console.error('Atributo de BonusResDes não encontrado!');
        }
    }

    atualizarBonusResCon(): void {
        const atributoBonusResCon = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Con');

        if (atributoBonusResCon) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoBonusResCon.atributoId,
                nome: atributoBonusResCon.nome,
                valor: this.bonusResCon,
                fichaId: atributoBonusResCon.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('BonusResCon atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar BonusResCon:', error);
                }
            );
        } else {
            console.error('Atributo de BonusResCon não encontrado!');
        }
    }

    atualizarBonusResInt(): void {
        const atributoBonusResInt = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Int');

        if (atributoBonusResInt) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoBonusResInt.atributoId,
                nome: atributoBonusResInt.nome,
                valor: this.bonusResInt,
                fichaId: atributoBonusResInt.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('BonusResInt atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar BonusResInt:', error);
                }
            );
        } else {
            console.error('Atributo de BonusResInt não encontrado!');
        }
    }

    atualizarBonusResSab(): void {
        const atributoBonusResSab = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Sab');

        if (atributoBonusResSab) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoBonusResSab.atributoId,
                nome: atributoBonusResSab.nome,
                valor: this.bonusResSab,
                fichaId: atributoBonusResSab.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('BonusResSab atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar BonusResSab:', error);
                }
            );
        } else {
            console.error('Atributo de BonusResSab não encontrado!');
        }
    }

    atualizarBonusResCar(): void {
        const atributoBonusResCar = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Res_Car');

        if (atributoBonusResCar) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoBonusResCar.atributoId,
                nome: atributoBonusResCar.nome,
                valor: this.bonusResCar,
                fichaId: atributoBonusResCar.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('BonusResCar atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar BonusResCar:', error);
                }
            );
        } else {
            console.error('Atributo de BonusResCar não encontrado!');
        }
    }

    atualizarBonusAcrobacia(): void {
        const atributoAcrobacia = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Acrobacia');

        if (atributoAcrobacia) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoAcrobacia.atributoId,
                nome: atributoAcrobacia.nome,
                valor: this.bonusAcrobacia,
                fichaId: atributoAcrobacia.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Acrobacia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Acrobacia:', error);
                }
            );
        } else {
            console.error('Atributo de Acrobacia não encontrado!');
        }
    }

    atualizarBonusAdestrarAnimais(): void {
        const atributoAdestrarAnimais = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Adestrar_Animais');

        if (atributoAdestrarAnimais) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoAdestrarAnimais.atributoId,
                nome: atributoAdestrarAnimais.nome,
                valor: this.bonusAdestrarAnimais,
                fichaId: atributoAdestrarAnimais.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Adestrar Animais atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Adestrar Animais:', error);
                }
            );
        } else {
            console.error('Atributo de Adestrar Animais não encontrado!');
        }
    }

    atualizarBonusArcanismo(): void {
        const atributoArcanismo = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Arcanismo');

        if (atributoArcanismo) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoArcanismo.atributoId,
                nome: atributoArcanismo.nome,
                valor: this.bonusArcanismo,
                fichaId: atributoArcanismo.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Arcanismo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Arcanismo:', error);
                }
            );
        } else {
            console.error('Atributo de Arcanismo não encontrado!');
        }
    }

    atualizarBonusAtletismo(): void {
        const atributoAtletismo = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Atletismo');

        if (atributoAtletismo) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoAtletismo.atributoId,
                nome: atributoAtletismo.nome,
                valor: this.bonusAtletismo,
                fichaId: atributoAtletismo.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Atletismo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Atletismo:', error);
                }
            );
        } else {
            console.error('Atributo de Atletismo não encontrado!');
        }
    }

    atualizarBonusEnganacao(): void {
        const atributoEnganacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Enganacao');

        if (atributoEnganacao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoEnganacao.atributoId,
                nome: atributoEnganacao.nome,
                valor: this.bonusEnganacao,
                fichaId: atributoEnganacao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Enganação atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Enganação:', error);
                }
            );
        } else {
            console.error('Atributo de Enganação não encontrado!');
        }
    }

    atualizarBonusFurtividade(): void {
        const atributoFurtividade = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Furtividade');

        if (atributoFurtividade) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoFurtividade.atributoId,
                nome: atributoFurtividade.nome,
                valor: this.bonusFurtividade,
                fichaId: atributoFurtividade.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Furtividade atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Furtividade:', error);
                }
            );
        } else {
            console.error('Atributo de Furtividade não encontrado!');
        }
    }

    atualizarBonusHistoria(): void {
        const atributoHistoria = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Historia');

        if (atributoHistoria) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoHistoria.atributoId,
                nome: atributoHistoria.nome,
                valor: this.bonusHistoria,
                fichaId: atributoHistoria.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('História atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar História:', error);
                }
            );
        } else {
            console.error('Atributo de História não encontrado!');
        }
    }

    atualizarBonusIntimidacao(): void {
        const atributoIntimidacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Intimidacao');

        if (atributoIntimidacao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoIntimidacao.atributoId,
                nome: atributoIntimidacao.nome,
                valor: this.bonusIntimidacao,
                fichaId: atributoIntimidacao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Intimidação atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Intimidação:', error);
                }
            );
        } else {
            console.error('Atributo de Intimidação não encontrado!');
        }
    }

    atualizarBonusIntuicao(): void {
        const atributoIntuicao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Intuicao');

        if (atributoIntuicao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoIntuicao.atributoId,
                nome: atributoIntuicao.nome,
                valor: this.bonusIntuicao,
                fichaId: atributoIntuicao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Intuição atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Intuição:', error);
                }
            );
        } else {
            console.error('Atributo de Intuição não encontrado!');
        }
    }

    atualizarBonusInvestigacao(): void {
        const atributoInvestigacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Investigacao');

        if (atributoInvestigacao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoInvestigacao.atributoId,
                nome: atributoInvestigacao.nome,
                valor: this.bonusInvestigacao,
                fichaId: atributoInvestigacao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Investigação atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Investigação:', error);
                }
            );
        } else {
            console.error('Atributo de Investigação não encontrado!');
        }
    }

    atualizarBonusMedicina(): void {
        const atributoMedicina = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Medicina');

        if (atributoMedicina) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoMedicina.atributoId,
                nome: atributoMedicina.nome,
                valor: this.bonusMedicina,
                fichaId: atributoMedicina.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Medicina atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Medicina:', error);
                }
            );
        } else {
            console.error('Atributo de Medicina não encontrado!');
        }
    }

    atualizarBonusNatureza(): void {
        const atributoNatureza = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Natureza');

        if (atributoNatureza) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoNatureza.atributoId,
                nome: atributoNatureza.nome,
                valor: this.bonusNatureza,
                fichaId: atributoNatureza.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Natureza atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Natureza:', error);
                }
            );
        } else {
            console.error('Atributo de Natureza não encontrado!');
        }
    }

    atualizarBonusPercepcao(): void {
        const atributoPercepcao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Percepcao');

        if (atributoPercepcao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPercepcao.atributoId,
                nome: atributoPercepcao.nome,
                valor: this.bonusPercepcao,
                fichaId: atributoPercepcao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Percepção atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Percepção:', error);
                }
            );
        } else {
            console.error('Atributo de Percepção não encontrado!');
        }
    }

    atualizarBonusPerformance(): void {
        const atributoPerformance = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Performance');

        if (atributoPerformance) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPerformance.atributoId,
                nome: atributoPerformance.nome,
                valor: this.bonusPerformance,
                fichaId: atributoPerformance.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Performance atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Performance:', error);
                }
            );
        } else {
            console.error('Atributo de Performance não encontrado!');
        }
    }

    atualizarBonusPersuasao(): void {
        const atributoPersuasao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Persuasao');

        if (atributoPersuasao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPersuasao.atributoId,
                nome: atributoPersuasao.nome,
                valor: this.bonusPersuasao,
                fichaId: atributoPersuasao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Persuasão atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Persuasão:', error);
                }
            );
        } else {
            console.error('Atributo de Persuasão não encontrado!');
        }
    }

    atualizarBonusPrestidigitacao(): void {
        const atributoPrestidigitacao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Prestidigitacao');

        if (atributoPrestidigitacao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoPrestidigitacao.atributoId,
                nome: atributoPrestidigitacao.nome,
                valor: this.bonusPrestidigitacao,
                fichaId: atributoPrestidigitacao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Prestidigitacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Prestidigitacao:', error);
                }
            );
        } else {
            console.error('Atributo de Prestidigitacao não encontrado!');
        }
    }

    atualizarBonusReligiao(): void {
        const atributoReligiao = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Religiao');

        if (atributoReligiao) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoReligiao.atributoId,
                nome: atributoReligiao.nome,
                valor: this.bonusReligiao,
                fichaId: atributoReligiao.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Religião atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Religião:', error);
                }
            );
        } else {
            console.error('Atributo de Religião não encontrado!');
        }
    }

    atualizarBonusSobrevivencia(): void {
        const atributoSobrevivencia = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Sobrevivencia');

        if (atributoSobrevivencia) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoSobrevivencia.atributoId,
                nome: atributoSobrevivencia.nome,
                valor: this.bonusSobrevivencia,
                fichaId: atributoSobrevivencia.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Sobrevivência atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Sobrevivência:', error);
                }
            );
        } else {
            console.error('Atributo de Sobrevivência não encontrado!');
        }
    }

    atualizarBonusCaBase(): void {
        const atributoCaBase = this.ficha.atributos.find(attr => attr.nome === 'CA_Base');

        if (atributoCaBase) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoCaBase.atributoId,
                nome: atributoCaBase.nome,
                valor: this.baseCa,
                fichaId: atributoCaBase.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('CaBase atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar CaBase:', error);
                }
            );
        } else {
            console.error('Atributo de CaBase não encontrado!');
        }
    }

    atualizarBonusCa(): void {
        const atributoCaBonus = this.ficha.atributos.find(attr => attr.nome === 'CA_Bonus');

        if (atributoCaBonus) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoCaBonus.atributoId,
                nome: atributoCaBonus.nome,
                valor: this.bonusCa,
                fichaId: atributoCaBonus.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('CABonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar CABonus:', error);
                }
            );
        } else {
            console.error('Atributo de CABonus não encontrado!');
        }
    }

    atualizarBonusIniciativa(): void {
        const atributoIniciativa = this.ficha.atributos.find(attr => attr.nome === 'Bonus_Iniciativa');

        if (atributoIniciativa) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoIniciativa.atributoId,
                nome: atributoIniciativa.nome,
                valor: this.bonusIniciativa,
                fichaId: atributoIniciativa.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Iniciativa atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Iniciativa:', error);
                }
            );
        } else {
            console.error('Atributo de Iniciativa não encontrado!');
        }
    }

    atualizarMoedasCobre(): void {
        const atributoMoedasCobre = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Cobre');

        if (atributoMoedasCobre) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoMoedasCobre.atributoId,
                nome: atributoMoedasCobre.nome,
                valor: this.moedasCobre,
                fichaId: atributoMoedasCobre.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Moedas de Cobre atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Moedas de Cobre:', error);
                }
            );
        } else {
            console.error('Atributo de Moedas de Cobre não encontrado!');
        }
    }

    atualizarMoedasPrata(): void {
        const atributoMoedasPrata = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Prata');

        if (atributoMoedasPrata) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoMoedasPrata.atributoId,
                nome: atributoMoedasPrata.nome,
                valor: this.moedasPrata,
                fichaId: atributoMoedasPrata.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Moedas de Prata atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Moedas de Prata:', error);
                }
            );
        } else {
            console.error('Atributo de Moedas de Prata não encontrado!');
        }
    }

    atualizarMoedasElectrum(): void {
        const atributoMoedasElectrum = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Electrum');

        if (atributoMoedasElectrum) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoMoedasElectrum.atributoId,
                nome: atributoMoedasElectrum.nome,
                valor: this.moedasElectrum,
                fichaId: atributoMoedasElectrum.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Moedas de Electrum atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Moedas de Electrum:', error);
                }
            );
        } else {
            console.error('Atributo de Moedas de Electrum não encontrado!');
        }
    }

    atualizarMoedasOuro(): void {
        const atributoMoedasOuro = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Ouro');

        if (atributoMoedasOuro) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoMoedasOuro.atributoId,
                nome: atributoMoedasOuro.nome,
                valor: this.moedasOuro,
                fichaId: atributoMoedasOuro.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Moedas de Ouro atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Moedas de Ouro:', error);
                }
            );
        } else {
            console.error('Atributo de Moedas de Ouro não encontrado!');
        }
    }

    atualizarMoedasPlatina(): void {
        const atributoMoedasPlatina = this.ficha.atributos.find(attr => attr.nome === 'Moedas_Platina');

        if (atributoMoedasPlatina) {
            const atributoParaAtualizar: AtributoDto = {
                atributoId: atributoMoedasPlatina.atributoId,
                nome: atributoMoedasPlatina.nome,
                valor: this.moedasPlatina,
                fichaId: atributoMoedasPlatina.fichaId
            };

            this.apiService.updateAtributo(atributoParaAtualizar.atributoId, atributoParaAtualizar).subscribe(
                () => {
                    console.log('Moedas de Platina atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Moedas de Platina:', error);
                }
            );
        } else {
            console.error('Atributo de Moedas de Platina não encontrado!');
        }
    }

    atualizarClasse1(): void {
        const habilidadeClasse1 = this.ficha.habilidades.find(attr => attr.nome === 'Classe1');

        if (habilidadeClasse1) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeClasse1.habilidadeId,
                nome: habilidadeClasse1.nome,
                descricao: this.classe1,
                fichaId: habilidadeClasse1.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Classe1 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Classe1:', error);
                }
            );
        } else {
            console.error('Habilidade de Classe1 não encontrado!');
        }
    }

    atualizarClasse2(): void {
        const habilidadeClasse2 = this.ficha.habilidades.find(attr => attr.nome === 'Classe2');

        if (habilidadeClasse2) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeClasse2.habilidadeId,
                nome: habilidadeClasse2.nome,
                descricao: this.classe2,
                fichaId: habilidadeClasse2.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Classe2 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Classe2:', error);
                }
            );
        } else {
            console.error('Habilidade de Classe2 não encontrado!');
        }
    }

    atualizarClasse3(): void {
        const habilidadeClasse3 = this.ficha.habilidades.find(attr => attr.nome === 'Classe3');

        if (habilidadeClasse3) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeClasse3.habilidadeId,
                nome: habilidadeClasse3.nome,
                descricao: this.classe3,
                fichaId: habilidadeClasse3.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Classe3 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Classe3:', error);
                }
            );
        } else {
            console.error('Habilidade de Classe3 não encontrado!');
        }
    }

    atualizarRaca(): void {
        const habilidadeRaca = this.ficha.habilidades.find(attr => attr.nome === 'Raca');

        if (habilidadeRaca) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRaca.habilidadeId,
                nome: habilidadeRaca.nome,
                descricao: this.raca,
                fichaId: habilidadeRaca.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Raca atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Raca:', error);
                }
            );
        } else {
            console.error('Habilidade de Raca não encontrado!');
        }
    }

    atualizarAntecedente(): void {
        const habilidadeAntecedente = this.ficha.habilidades.find(attr => attr.nome === 'Antecedente');

        if (habilidadeAntecedente) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeAntecedente.habilidadeId,
                nome: habilidadeAntecedente.nome,
                descricao: this.antecedente,
                fichaId: habilidadeAntecedente.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Antecedente atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Antecedente:', error);
                }
            );
        } else {
            console.error('Habilidade de Antecedente não encontrado!');
        }
    }

    atualizarTendencia(): void {
        const habilidadeTendencia = this.ficha.habilidades.find(attr => attr.nome === 'Tendencia');

        if (habilidadeTendencia) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeTendencia.habilidadeId,
                nome: habilidadeTendencia.nome,
                descricao: this.tendencia,
                fichaId: habilidadeTendencia.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Tendência atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Tendência:', error);
                }
            );
        } else {
            console.error('Habilidade de Tendência não encontrado!');
        }
    }

    atualizarPersonalidade(): void {
        const habilidadePersonalidade = this.ficha.habilidades.find(attr => attr.nome === 'Personalidade');

        if (habilidadePersonalidade) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadePersonalidade.habilidadeId,
                nome: habilidadePersonalidade.nome,
                descricao: this.personalidade,
                fichaId: habilidadePersonalidade.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Personalidade atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Personalidade:', error);
                }
            );
        } else {
            console.error('Habilidade de Personalidade não encontrado!');
        }
    }

    atualizarIdeais(): void {
        const habilidadeIdeais = this.ficha.habilidades.find(attr => attr.nome === 'Ideais');

        if (habilidadeIdeais) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeIdeais.habilidadeId,
                nome: habilidadeIdeais.nome,
                descricao: this.ideais,
                fichaId: habilidadeIdeais.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Ideais atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Ideais:', error);
                }
            );
        } else {
            console.error('Habilidade de Ideais não encontrado!');
        }
    }

    atualizarVinculos(): void {
        const habilidadeVinculos = this.ficha.habilidades.find(attr => attr.nome === 'Vinculos');

        if (habilidadeVinculos) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeVinculos.habilidadeId,
                nome: habilidadeVinculos.nome,
                descricao: this.vinculos,
                fichaId: habilidadeVinculos.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Vínculos atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Vínculos:', error);
                }
            );
        } else {
            console.error('Habilidade de Vínculos não encontrado!');
        }
    }

    atualizarDefeitos(): void {
        const habilidadeDefeitos = this.ficha.habilidades.find(attr => attr.nome === 'Defeitos');

        if (habilidadeDefeitos) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeDefeitos.habilidadeId,
                nome: habilidadeDefeitos.nome,
                descricao: this.defeitos,
                fichaId: habilidadeDefeitos.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Defeitos atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Defeitos:', error);
                }
            );
        } else {
            console.error('Habilidade de Defeitos não encontrado!');
        }
    }

    atualizarTipo(): void {
        const habilidadeTipo = this.ficha.habilidades.find(attr => attr.nome === 'Tipo');

        if (habilidadeTipo) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeTipo.habilidadeId,
                nome: habilidadeTipo.nome,
                descricao: this.tipo,
                fichaId: habilidadeTipo.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Tipo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Tipo:', error);
                }
            );
        } else {
            console.error('Habilidade de Tipo não encontrado!');
        }
    }

    atualizarTamanho(): void {
        const habilidadeTamanho = this.ficha.habilidades.find(attr => attr.nome === 'Tamanho');

        if (habilidadeTamanho) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeTamanho.habilidadeId,
                nome: habilidadeTamanho.nome,
                descricao: this.tamanho,
                fichaId: habilidadeTamanho.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Tamanho atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Tamanho:', error);
                }
            );
        } else {
            console.error('Habilidade de Tamanho não encontrado!');
        }
    }

    atualizarAltura(): void {
        const habilidadeAltura = this.ficha.habilidades.find(attr => attr.nome === 'Altura');

        if (habilidadeAltura) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeAltura.habilidadeId,
                nome: habilidadeAltura.nome,
                descricao: this.altura,
                fichaId: habilidadeAltura.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Altura atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Altura:', error);
                }
            );
        } else {
            console.error('Habilidade de Altura não encontrado!');
        }
    }

    atualizarPeso(): void {
        const habilidadePeso = this.ficha.habilidades.find(attr => attr.nome === 'Peso');

        if (habilidadePeso) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadePeso.habilidadeId,
                nome: habilidadePeso.nome,
                descricao: this.peso,
                fichaId: habilidadePeso.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Peso atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Peso:', error);
                }
            );
        } else {
            console.error('Habilidade de Peso não encontrado!');
        }
    }

    atualizarPele(): void {
        const habilidadePele = this.ficha.habilidades.find(attr => attr.nome === 'Pele');

        if (habilidadePele) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadePele.habilidadeId,
                nome: habilidadePele.nome,
                descricao: this.pele,
                fichaId: habilidadePele.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Pele atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Pele:', error);
                }
            );
        } else {
            console.error('Habilidade de Pele não encontrado!');
        }
    }

    atualizarOlhos(): void {
        const habilidadeOlhos = this.ficha.habilidades.find(attr => attr.nome === 'Olhos');

        if (habilidadeOlhos) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeOlhos.habilidadeId,
                nome: habilidadeOlhos.nome,
                descricao: this.olhos,
                fichaId: habilidadeOlhos.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Olhos atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Olhos:', error);
                }
            );
        } else {
            console.error('Habilidade de Olhos não encontrado!');
        }
    }

    atualizarCabelo(): void {
        const habilidadeCabelo = this.ficha.habilidades.find(attr => attr.nome === 'Cabelo');

        if (habilidadeCabelo) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeCabelo.habilidadeId,
                nome: habilidadeCabelo.nome,
                descricao: this.cabelo,
                fichaId: habilidadeCabelo.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Cabelo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Cabelo:', error);
                }
            );
        } else {
            console.error('Habilidade de Cabelo não encontrado!');
        }
    }

    atualizarIdade(): void {
        const habilidadeIdade = this.ficha.habilidades.find(attr => attr.nome === 'Idade');

        if (habilidadeIdade) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeIdade.habilidadeId,
                nome: habilidadeIdade.nome,
                descricao: this.idade,
                fichaId: habilidadeIdade.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Idade atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Idade:', error);
                }
            );
        } else {
            console.error('Habilidade de Idade não encontrado!');
        }
    }

    atualizarLore(): void {
        const habilidadeLore = this.ficha.habilidades.find(attr => attr.nome === 'Lore');

        if (habilidadeLore) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeLore.habilidadeId,
                nome: habilidadeLore.nome,
                descricao: this.lore,
                fichaId: habilidadeLore.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Lore atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Lore:', error);
                }
            );
        } else {
            console.error('Habilidade de Lore não encontrado!');
        }
    }

    atualizarAnotacoes(): void {
        const habilidadeAnotacoes = this.ficha.habilidades.find(attr => attr.nome === 'Anotacoes');

        if (habilidadeAnotacoes) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeAnotacoes.habilidadeId,
                nome: habilidadeAnotacoes.nome,
                descricao: this.anotacoes,
                fichaId: habilidadeAnotacoes.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Anotacoes atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Anotacoes:', error);
                }
            );
        } else {
            console.error('Habilidade de Anotacoes não encontrado!');
        }
    }

    atualizarCa_Atributo1(): void {
        const habilidadeCa_Atributo1 = this.ficha.habilidades.find(attr => attr.nome === 'Ca_Atributo1');

        if (habilidadeCa_Atributo1) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeCa_Atributo1.habilidadeId,
                nome: habilidadeCa_Atributo1.nome,
                descricao: this.caAtributo1,
                fichaId: habilidadeCa_Atributo1.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Ca_Atributo1 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Ca_Atributo1:', error);
                }
            );
        } else {
            console.error('Habilidade de Ca_Atributo1 não encontrado!');
        }
        this.atualizarCa();
    }

    atualizarCa_Atributo2(): void {
        const habilidadeCa_Atributo2 = this.ficha.habilidades.find(attr => attr.nome === 'Ca_Atributo2');

        if (habilidadeCa_Atributo2) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeCa_Atributo2.habilidadeId,
                nome: habilidadeCa_Atributo2.nome,
                descricao: this.caAtributo2,
                fichaId: habilidadeCa_Atributo2.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Ca_Atributo2 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Ca_Atributo2:', error);
                }
            );
        } else {
            console.error('Habilidade de Ca_Atributo2 não encontrado!');
        }
        this.atualizarCa();
    }

    atualizarIniciativa_Atributo1(): void {
        const habilidadeIniciativa_Atributo1 = this.ficha.habilidades.find(attr => attr.nome === 'Iniciativa_Atributo1');

        if (habilidadeIniciativa_Atributo1) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeIniciativa_Atributo1.habilidadeId,
                nome: habilidadeIniciativa_Atributo1.nome,
                descricao: this.iniciativaAtributo1,
                fichaId: habilidadeIniciativa_Atributo1.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Iniciativa_Atributo1 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Iniciativa_Atributo1:', error);
                }
            );
        } else {
            console.error('Habilidade de Iniciativa_Atributo1 não encontrado!');
        }
        this.atualizarIniciativa();
    }

    atualizarIniciativa_Atributo2(): void {
        const habilidadeIniciativa_Atributo2 = this.ficha.habilidades.find(attr => attr.nome === 'Iniciativa_Atributo2');

        if (habilidadeIniciativa_Atributo2) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeIniciativa_Atributo2.habilidadeId,
                nome: habilidadeIniciativa_Atributo2.nome,
                descricao: this.iniciativaAtributo2,
                fichaId: habilidadeIniciativa_Atributo2.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Iniciativa_Atributo2 atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Iniciativa_Atributo2:', error);
                }
            );
        } else {
            console.error('Habilidade de Iniciativa_Atributo2 não encontrado!');
        }
        this.atualizarIniciativa();
    }

    atualizarRes_For_Atributo_Bonus(): void {
        const habilidadeRes_For_Atributo_Bonus = this.ficha.habilidades.find(attr => attr.nome === 'Res_For_Atributo_Bonus');

        if (habilidadeRes_For_Atributo_Bonus) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRes_For_Atributo_Bonus.habilidadeId,
                nome: habilidadeRes_For_Atributo_Bonus.nome,
                descricao: this.resForAtributoBonus,
                fichaId: habilidadeRes_For_Atributo_Bonus.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Res_For_Atributo_Bonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Res_For_Atributo_Bonus:', error);
                }
            );
        } else {
            console.error('Habilidade de Res_For_Atributo_Bonus não encontrado!');
        }
        this.atualizarTestesDeResistencia();
    }

    atualizarRes_Des_Atributo_Bonus(): void {
        const habilidadeRes_Des_Atributo_Bonus = this.ficha.habilidades.find(attr => attr.nome === 'Res_Des_Atributo_Bonus');

        if (habilidadeRes_Des_Atributo_Bonus) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRes_Des_Atributo_Bonus.habilidadeId,
                nome: habilidadeRes_Des_Atributo_Bonus.nome,
                descricao: this.resDesAtributoBonus,
                fichaId: habilidadeRes_Des_Atributo_Bonus.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Res_Des_Atributo_Bonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Res_Des_Atributo_Bonus:', error);
                }
            );
        } else {
            console.error('Habilidade de Res_Des_Atributo_Bonus não encontrado!');
        }
        this.atualizarTestesDeResistencia();
    }

    atualizarRes_Con_Atributo_Bonus(): void {
        const habilidadeRes_Con_Atributo_Bonus = this.ficha.habilidades.find(attr => attr.nome === 'Res_Con_Atributo_Bonus');

        if (habilidadeRes_Con_Atributo_Bonus) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRes_Con_Atributo_Bonus.habilidadeId,
                nome: habilidadeRes_Con_Atributo_Bonus.nome,
                descricao: this.resConAtributoBonus,
                fichaId: habilidadeRes_Con_Atributo_Bonus.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Res_Con_Atributo_Bonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Res_Con_Atributo_Bonus:', error);
                }
            );
        } else {
            console.error('Habilidade de Res_Con_Atributo_Bonus não encontrado!');
        }
        this.atualizarTestesDeResistencia();
    }

    atualizarRes_Int_Atributo_Bonus(): void {
        const habilidadeRes_Int_Atributo_Bonus = this.ficha.habilidades.find(attr => attr.nome === 'Res_Int_Atributo_Bonus');

        if (habilidadeRes_Int_Atributo_Bonus) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRes_Int_Atributo_Bonus.habilidadeId,
                nome: habilidadeRes_Int_Atributo_Bonus.nome,
                descricao: this.resIntAtributoBonus,
                fichaId: habilidadeRes_Int_Atributo_Bonus.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Res_Int_Atributo_Bonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Res_Int_Atributo_Bonus:', error);
                }
            );
        } else {
            console.error('Habilidade de Res_Int_Atributo_Bonus não encontrado!');
        }
        this.atualizarTestesDeResistencia();
    }

    atualizarRes_Sab_Atributo_Bonus(): void {
        const habilidadeRes_Sab_Atributo_Bonus = this.ficha.habilidades.find(attr => attr.nome === 'Res_Sab_Atributo_Bonus');

        if (habilidadeRes_Sab_Atributo_Bonus) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRes_Sab_Atributo_Bonus.habilidadeId,
                nome: habilidadeRes_Sab_Atributo_Bonus.nome,
                descricao: this.resSabAtributoBonus,
                fichaId: habilidadeRes_Sab_Atributo_Bonus.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Res_Sab_Atributo_Bonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Res_Sab_Atributo_Bonus:', error);
                }
            );
        } else {
            console.error('Habilidade de Res_Sab_Atributo_Bonus não encontrado!');
        }
        this.atualizarTestesDeResistencia();
    }

    atualizarRes_Car_Atributo_Bonus(): void {
        const habilidadeRes_Car_Atributo_Bonus = this.ficha.habilidades.find(attr => attr.nome === 'Res_Car_Atributo_Bonus');

        if (habilidadeRes_Car_Atributo_Bonus) {
            const habilidadeParaAtualizar: HabilidadeDto = {
                habilidadeId: habilidadeRes_Car_Atributo_Bonus.habilidadeId,
                nome: habilidadeRes_Car_Atributo_Bonus.nome,
                descricao: this.resCarAtributoBonus,
                fichaId: habilidadeRes_Car_Atributo_Bonus.fichaId
            };

            this.apiService.updateHabilidade(habilidadeParaAtualizar.habilidadeId, habilidadeParaAtualizar).subscribe(
                () => {
                    console.log('Res_Car_Atributo_Bonus atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Res_Car_Atributo_Bonus:', error);
                }
            );
        } else {
            console.error('Habilidade de Res_Car_Atributo_Bonus não encontrado!');
        }
        this.atualizarTestesDeResistencia();
    }

    atualizarResistencia_Forca(): void {
        const proficienciaResistencia_Forca = this.ficha.proficiencias.find(attr => attr.nome === 'Resistencia_Forca');

        if (proficienciaResistencia_Forca) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaResistencia_Forca.proficienciaId,
                nome: proficienciaResistencia_Forca.nome,
                proficiente: this.forResistenciaCheckbox,
                fichaId: proficienciaResistencia_Forca.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Resistencia_Forca atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Resistencia_Forca:', error);
                }
            );
        } else {
            console.error('Habilidade de Resistencia_Forca não encontrado!');
        }
    }

    atualizarResistencia_Destreza(): void {
        const proficienciaResistencia_Destreza = this.ficha.proficiencias.find(attr => attr.nome === 'Resistencia_Destreza');

        if (proficienciaResistencia_Destreza) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaResistencia_Destreza.proficienciaId,
                nome: proficienciaResistencia_Destreza.nome,
                proficiente: this.desResistenciaCheckbox,
                fichaId: proficienciaResistencia_Destreza.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Resistencia_Destreza atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Resistencia_Destreza:', error);
                }
            );
        } else {
            console.error('Habilidade de Resistencia_Destreza não encontrado!');
        }
    }

    atualizarResistencia_Constituicao(): void {
        const proficienciaResistencia_Constituicao = this.ficha.proficiencias.find(attr => attr.nome === 'Resistencia_Constituicao');

        if (proficienciaResistencia_Constituicao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaResistencia_Constituicao.proficienciaId,
                nome: proficienciaResistencia_Constituicao.nome,
                proficiente: this.conResistenciaCheckbox,
                fichaId: proficienciaResistencia_Constituicao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Resistencia_Constituicao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Resistencia_Constituicao:', error);
                }
            );
        } else {
            console.error('Habilidade de Resistencia_Constituicao não encontrado!');
        }
    }

    atualizarResistencia_Inteligencia(): void {
        const proficienciaResistencia_Inteligencia = this.ficha.proficiencias.find(attr => attr.nome === 'Resistencia_Inteligencia');

        if (proficienciaResistencia_Inteligencia) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaResistencia_Inteligencia.proficienciaId,
                nome: proficienciaResistencia_Inteligencia.nome,
                proficiente: this.intResistenciaCheckbox,
                fichaId: proficienciaResistencia_Inteligencia.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Resistencia_Inteligencia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Resistencia_Inteligencia:', error);
                }
            );
        } else {
            console.error('Habilidade de Resistencia_Inteligencia não encontrado!');
        }
    }

    atualizarResistencia_Sabedoria(): void {
        const proficienciaResistencia_Sabedoria = this.ficha.proficiencias.find(attr => attr.nome === 'Resistencia_Sabedoria');

        if (proficienciaResistencia_Sabedoria) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaResistencia_Sabedoria.proficienciaId,
                nome: proficienciaResistencia_Sabedoria.nome,
                proficiente: this.sabResistenciaCheckbox,
                fichaId: proficienciaResistencia_Sabedoria.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Resistencia_Sabedoria atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Resistencia_Sabedoria:', error);
                }
            );
        } else {
            console.error('Habilidade de Resistencia_Sabedoria não encontrado!');
        }
    }

    atualizarResistencia_Carisma(): void {
        const proficienciaResistencia_Carisma = this.ficha.proficiencias.find(attr => attr.nome === 'Resistencia_Carisma');

        if (proficienciaResistencia_Carisma) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaResistencia_Carisma.proficienciaId,
                nome: proficienciaResistencia_Carisma.nome,
                proficiente: this.carResistenciaCheckbox,
                fichaId: proficienciaResistencia_Carisma.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Resistencia_Carisma atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Resistencia_Carisma:', error);
                }
            );
        } else {
            console.error('Habilidade de Resistencia_Carisma não encontrado!');
        }
    }

    atualizarAcrobacia(): void {
        const proficienciaAcrobacia = this.ficha.proficiencias.find(attr => attr.nome === 'Acrobacia');

        if (proficienciaAcrobacia) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAcrobacia.proficienciaId,
                nome: proficienciaAcrobacia.nome,
                proficiente: this.acrobaciaCheckbox,
                fichaId: proficienciaAcrobacia.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Acrobacia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Acrobacia:', error);
                }
            );
        } else {
            console.error('Habilidade de Acrobacia não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAdestrar_Animais(): void {
        const proficienciaAdestrar_Animais = this.ficha.proficiencias.find(attr => attr.nome === 'Adestrar_Animais');

        if (proficienciaAdestrar_Animais) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAdestrar_Animais.proficienciaId,
                nome: proficienciaAdestrar_Animais.nome,
                proficiente: this.adestrarAnimaisCheckbox,
                fichaId: proficienciaAdestrar_Animais.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Adestrar_Animais atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Adestrar_Animais:', error);
                }
            );
        } else {
            console.error('Habilidade de Adestrar_Animais não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarArcanismo(): void {
        const proficienciaArcanismo = this.ficha.proficiencias.find(attr => attr.nome === 'Arcanismo');

        if (proficienciaArcanismo) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaArcanismo.proficienciaId,
                nome: proficienciaArcanismo.nome,
                proficiente: this.arcanismoCheckbox,
                fichaId: proficienciaArcanismo.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Arcanismo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Arcanismo:', error);
                }
            );
        } else {
            console.error('Habilidade de Arcanismo não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAtletismo(): void {
        const proficienciaAtletismo = this.ficha.proficiencias.find(attr => attr.nome === 'Atletismo');

        if (proficienciaAtletismo) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAtletismo.proficienciaId,
                nome: proficienciaAtletismo.nome,
                proficiente: this.atletismoCheckbox,
                fichaId: proficienciaAtletismo.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Atletismo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Atletismo:', error);
                }
            );
        } else {
            console.error('Habilidade de Atletismo não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarEnganacao(): void {
        const proficienciaEnganacao = this.ficha.proficiencias.find(attr => attr.nome === 'Enganacao');

        if (proficienciaEnganacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaEnganacao.proficienciaId,
                nome: proficienciaEnganacao.nome,
                proficiente: this.enganacaoCheckbox,
                fichaId: proficienciaEnganacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Enganacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Enganacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Enganacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarFurtividade(): void {
        const proficienciaFurtividade = this.ficha.proficiencias.find(attr => attr.nome === 'Furtividade');

        if (proficienciaFurtividade) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaFurtividade.proficienciaId,
                nome: proficienciaFurtividade.nome,
                proficiente: this.furtividadeCheckbox,
                fichaId: proficienciaFurtividade.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Furtividade atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Furtividade:', error);
                }
            );
        } else {
            console.error('Habilidade de Furtividade não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarHistoria(): void {
        const proficienciaHistoria = this.ficha.proficiencias.find(attr => attr.nome === 'Historia');

        if (proficienciaHistoria) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaHistoria.proficienciaId,
                nome: proficienciaHistoria.nome,
                proficiente: this.historiaCheckbox,
                fichaId: proficienciaHistoria.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Historia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Historia:', error);
                }
            );
        } else {
            console.error('Habilidade de Historia não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarIntimidacao(): void {
        const proficienciaIntimidacao = this.ficha.proficiencias.find(attr => attr.nome === 'Intimidacao');

        if (proficienciaIntimidacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaIntimidacao.proficienciaId,
                nome: proficienciaIntimidacao.nome,
                proficiente: this.intimidacaoCheckbox,
                fichaId: proficienciaIntimidacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Intimidacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Intimidacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Intimidacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarIntuicao(): void {
        const proficienciaIntuicao = this.ficha.proficiencias.find(attr => attr.nome === 'Intuicao');

        if (proficienciaIntuicao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaIntuicao.proficienciaId,
                nome: proficienciaIntuicao.nome,
                proficiente: this.intuicaoCheckbox,
                fichaId: proficienciaIntuicao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Intuicao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Intuicao:', error);
                }
            );
        } else {
            console.error('Habilidade de Intuicao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarInvestigacao(): void {
        const proficienciaInvestigacao = this.ficha.proficiencias.find(attr => attr.nome === 'Investigacao');

        if (proficienciaInvestigacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaInvestigacao.proficienciaId,
                nome: proficienciaInvestigacao.nome,
                proficiente: this.investigacaoCheckbox,
                fichaId: proficienciaInvestigacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Investigacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Investigacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Investigacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarMedicina(): void {
        const proficienciaMedicina = this.ficha.proficiencias.find(attr => attr.nome === 'Medicina');

        if (proficienciaMedicina) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaMedicina.proficienciaId,
                nome: proficienciaMedicina.nome,
                proficiente: this.medicinaCheckbox,
                fichaId: proficienciaMedicina.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Medicina atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Medicina:', error);
                }
            );
        } else {
            console.error('Habilidade de Medicina não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarNatureza(): void {
        const proficienciaNatureza = this.ficha.proficiencias.find(attr => attr.nome === 'Natureza');

        if (proficienciaNatureza) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaNatureza.proficienciaId,
                nome: proficienciaNatureza.nome,
                proficiente: this.naturezaCheckbox,
                fichaId: proficienciaNatureza.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Natureza atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Natureza:', error);
                }
            );
        } else {
            console.error('Habilidade de Natureza não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarPercepcao(): void {
        const proficienciaPercepcao = this.ficha.proficiencias.find(attr => attr.nome === 'Percepcao');

        if (proficienciaPercepcao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaPercepcao.proficienciaId,
                nome: proficienciaPercepcao.nome,
                proficiente: this.percepcaoCheckbox,
                fichaId: proficienciaPercepcao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Percepcao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Percepcao:', error);
                }
            );
        } else {
            console.error('Habilidade de Percepcao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarPerformance(): void {
        const proficienciaPerformance = this.ficha.proficiencias.find(attr => attr.nome === 'Performance');

        if (proficienciaPerformance) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaPerformance.proficienciaId,
                nome: proficienciaPerformance.nome,
                proficiente: this.performanceCheckbox,
                fichaId: proficienciaPerformance.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Performance atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Performance:', error);
                }
            );
        } else {
            console.error('Habilidade de Performance não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarPersuasao(): void {
        const proficienciaPersuasao = this.ficha.proficiencias.find(attr => attr.nome === 'Persuasao');

        if (proficienciaPersuasao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaPersuasao.proficienciaId,
                nome: proficienciaPersuasao.nome,
                proficiente: this.persuasaoCheckbox,
                fichaId: proficienciaPersuasao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Persuasao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Persuasao:', error);
                }
            );
        } else {
            console.error('Habilidade de Persuasao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarPrestidigitacao(): void {
        const proficienciaPrestidigitacao = this.ficha.proficiencias.find(attr => attr.nome === 'Prestidigitacao');

        if (proficienciaPrestidigitacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaPrestidigitacao.proficienciaId,
                nome: proficienciaPrestidigitacao.nome,
                proficiente: this.prestidigitacaoCheckbox,
                fichaId: proficienciaPrestidigitacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Prestidigitacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Prestidigitacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Prestidigitacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarReligiao(): void {
        const proficienciaReligiao = this.ficha.proficiencias.find(attr => attr.nome === 'Religiao');

        if (proficienciaReligiao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaReligiao.proficienciaId,
                nome: proficienciaReligiao.nome,
                proficiente: this.religiaoCheckbox,
                fichaId: proficienciaReligiao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Religiao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Religiao:', error);
                }
            );
        } else {
            console.error('Habilidade de Religiao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarSobrevivencia(): void {
        const proficienciaSobrevivencia = this.ficha.proficiencias.find(attr => attr.nome === 'Sobrevivencia');

        if (proficienciaSobrevivencia) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaSobrevivencia.proficienciaId,
                nome: proficienciaSobrevivencia.nome,
                proficiente: this.sobrevivenciaCheckbox,
                fichaId: proficienciaSobrevivencia.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Sobrevivencia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Sobrevivencia:', error);
                }
            );
        } else {
            console.error('Habilidade de Sobrevivencia não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Acrobacia(): void {
        const proficienciaAptidao_Acrobacia = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Acrobacia');

        if (proficienciaAptidao_Acrobacia) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Acrobacia.proficienciaId,
                nome: proficienciaAptidao_Acrobacia.nome,
                proficiente: this.aptacrobaciaCheckbox,
                fichaId: proficienciaAptidao_Acrobacia.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Acrobacia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Acrobacia:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Acrobacia não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Adestrar_Animais(): void {
        const proficienciaAptidao_Adestrar_Animais = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Adestrar_Animais');

        if (proficienciaAptidao_Adestrar_Animais) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Adestrar_Animais.proficienciaId,
                nome: proficienciaAptidao_Adestrar_Animais.nome,
                proficiente: this.aptadestrarAnimaisCheckbox,
                fichaId: proficienciaAptidao_Adestrar_Animais.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Adestrar_Animais atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Adestrar_Animais:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Adestrar_Animais não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Arcanismo(): void {
        const proficienciaAptidao_Arcanismo = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Arcanismo');

        if (proficienciaAptidao_Arcanismo) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Arcanismo.proficienciaId,
                nome: proficienciaAptidao_Arcanismo.nome,
                proficiente: this.aptarcanismoCheckbox,
                fichaId: proficienciaAptidao_Arcanismo.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Arcanismo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Arcanismo:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Arcanismo não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Atletismo(): void {
        const proficienciaAptidao_Atletismo = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Atletismo');

        if (proficienciaAptidao_Atletismo) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Atletismo.proficienciaId,
                nome: proficienciaAptidao_Atletismo.nome,
                proficiente: this.aptatletismoCheckbox,
                fichaId: proficienciaAptidao_Atletismo.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Atletismo atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Atletismo:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Atletismo não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Enganacao(): void {
        const proficienciaAptidao_Enganacao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Enganacao');

        if (proficienciaAptidao_Enganacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Enganacao.proficienciaId,
                nome: proficienciaAptidao_Enganacao.nome,
                proficiente: this.aptenganacaoCheckbox,
                fichaId: proficienciaAptidao_Enganacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Enganacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Enganacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Enganacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Furtividade(): void {
        const proficienciaAptidao_Furtividade = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Furtividade');

        if (proficienciaAptidao_Furtividade) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Furtividade.proficienciaId,
                nome: proficienciaAptidao_Furtividade.nome,
                proficiente: this.aptfurtividadeCheckbox,
                fichaId: proficienciaAptidao_Furtividade.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Furtividade atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Furtividade:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Furtividade não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Historia(): void {
        const proficienciaAptidao_Historia = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Historia');

        if (proficienciaAptidao_Historia) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Historia.proficienciaId,
                nome: proficienciaAptidao_Historia.nome,
                proficiente: this.apthistoriaCheckbox,
                fichaId: proficienciaAptidao_Historia.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Historia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Historia:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Historia não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Intimidacao(): void {
        const proficienciaAptidao_Intimidacao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Intimidacao');

        if (proficienciaAptidao_Intimidacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Intimidacao.proficienciaId,
                nome: proficienciaAptidao_Intimidacao.nome,
                proficiente: this.aptintimidacaoCheckbox,
                fichaId: proficienciaAptidao_Intimidacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Intimidacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Intimidacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Intimidacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Intuicao(): void {
        const proficienciaAptidao_Intuicao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Intuicao');

        if (proficienciaAptidao_Intuicao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Intuicao.proficienciaId,
                nome: proficienciaAptidao_Intuicao.nome,
                proficiente: this.aptintuicaoCheckbox,
                fichaId: proficienciaAptidao_Intuicao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Intuicao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Intuicao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Intuicao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Investigacao(): void {
        const proficienciaAptidao_Investigacao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Investigacao');

        if (proficienciaAptidao_Investigacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Investigacao.proficienciaId,
                nome: proficienciaAptidao_Investigacao.nome,
                proficiente: this.aptinvestigacaoCheckbox,
                fichaId: proficienciaAptidao_Investigacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Investigacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Investigacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Investigacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Medicina(): void {
        const proficienciaAptidao_Medicina = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Medicina');

        if (proficienciaAptidao_Medicina) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Medicina.proficienciaId,
                nome: proficienciaAptidao_Medicina.nome,
                proficiente: this.aptmedicinaCheckbox,
                fichaId: proficienciaAptidao_Medicina.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Medicina atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Medicina:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Medicina não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Natureza(): void {
        const proficienciaAptidao_Natureza = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Natureza');

        if (proficienciaAptidao_Natureza) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Natureza.proficienciaId,
                nome: proficienciaAptidao_Natureza.nome,
                proficiente: this.aptnaturezaCheckbox,
                fichaId: proficienciaAptidao_Natureza.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Natureza atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Natureza:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Natureza não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Percepcao(): void {
        const proficienciaAptidao_Percepcao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Percepcao');

        if (proficienciaAptidao_Percepcao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Percepcao.proficienciaId,
                nome: proficienciaAptidao_Percepcao.nome,
                proficiente: this.aptpercepcaoCheckbox,
                fichaId: proficienciaAptidao_Percepcao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Percepcao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Percepcao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Percepcao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Performance(): void {
        const proficienciaAptidao_Performance = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Performance');

        if (proficienciaAptidao_Performance) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Performance.proficienciaId,
                nome: proficienciaAptidao_Performance.nome,
                proficiente: this.aptperformanceCheckbox,
                fichaId: proficienciaAptidao_Performance.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Performance atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Performance:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Performance não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Persuasao(): void {
        const proficienciaAptidao_Persuasao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Persuasao');

        if (proficienciaAptidao_Persuasao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Persuasao.proficienciaId,
                nome: proficienciaAptidao_Persuasao.nome,
                proficiente: this.aptpersuasaoCheckbox,
                fichaId: proficienciaAptidao_Persuasao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Persuasao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Persuasao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Persuasao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Prestidigitacao(): void {
        const proficienciaAptidao_Prestidigitacao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Prestidigitacao');

        if (proficienciaAptidao_Prestidigitacao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Prestidigitacao.proficienciaId,
                nome: proficienciaAptidao_Prestidigitacao.nome,
                proficiente: this.aptprestidigitacaoCheckbox,
                fichaId: proficienciaAptidao_Prestidigitacao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Prestidigitacao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Prestidigitacao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Prestidigitacao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Religiao(): void {
        const proficienciaAptidao_Religiao = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Religiao');

        if (proficienciaAptidao_Religiao) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Religiao.proficienciaId,
                nome: proficienciaAptidao_Religiao.nome,
                proficiente: this.aptreligiaoCheckbox,
                fichaId: proficienciaAptidao_Religiao.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Religiao atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Religiao:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Religiao não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarAptidao_Sobrevivencia(): void {
        const proficienciaAptidao_Sobrevivencia = this.ficha.proficiencias.find(attr => attr.nome === 'Aptidao_Sobrevivencia');

        if (proficienciaAptidao_Sobrevivencia) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaAptidao_Sobrevivencia.proficienciaId,
                nome: proficienciaAptidao_Sobrevivencia.nome,
                proficiente: this.aptsobrevivenciaCheckbox,
                fichaId: proficienciaAptidao_Sobrevivencia.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Aptidao_Sobrevivencia atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Aptidao_Sobrevivencia:', error);
                }
            );
        } else {
            console.error('Habilidade de Aptidao_Sobrevivencia não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarVersatilidade(): void {
        const proficienciaVersatilidade = this.ficha.proficiencias.find(attr => attr.nome === 'Versatilidade');

        if (proficienciaVersatilidade) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaVersatilidade.proficienciaId,
                nome: proficienciaVersatilidade.nome,
                proficiente: this.versatilidadeCheckbox,
                fichaId: proficienciaVersatilidade.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Versatilidade atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Versatilidade:', error);
                }
            );
        } else {
            console.error('Habilidade de Versatilidade não encontrado!');
        }
        this.atualizarPericias();
    }

    atualizarTalento_Confiavel(): void {
        const proficienciaTalento_Confiavel = this.ficha.proficiencias.find(attr => attr.nome === 'Talento_Confiavel');

        if (proficienciaTalento_Confiavel) {
            const proficienciaParaAtualizar: ProficienciaDto = {
                proficienciaId: proficienciaTalento_Confiavel.proficienciaId,
                nome: proficienciaTalento_Confiavel.nome,
                proficiente: this.versatilidadeCheckbox,
                fichaId: proficienciaTalento_Confiavel.fichaId
            };

            this.apiService.updateProficiencia(proficienciaParaAtualizar.proficienciaId, proficienciaParaAtualizar).subscribe(
                () => {
                    console.log('Talento_Confiavel atualizado com sucesso!');
                },
                (error) => {
                    console.error('Erro ao atualizar Talento_Confiavel:', error);
                }
            );
        } else {
            console.error('Habilidade de Talento_Confiavel não encontrado!');
        }
        this.atualizarPericias();
    }
}