import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ViewChildren, QueryList } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as math from 'mathjs';
import { ChatMessage } from '../../models/chat-message.model';
import { DiceRollService, RollData } from '../../services/dice-roll.service';

interface DiceRollResult {
  quantia: number;
  lados: number;
  resultados: number[];
  ignorados?: number[];
  total: number;
  operacoes?: string;
  expressaoOriginal?: string;
  erro?: string;
  // Adicione estas novas propriedades
  tipo?: 'attribute' | 'skill' | 'saving-throw' | 'custom' | 'weapon-attack' | 'weapon-damage' | 'weapon-critical';
  nome?: string;
  tipoDano?: string;
  personagem?: string;
}

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() mesaId!: number; // Recebe o mesaId do componente pai
  @Input() usuarioId!: number;
  @ViewChild('mensagensContainer') private mensagensContainer!: ElementRef;
  @ViewChildren('scrollAnchor') scrollAnchors!: QueryList<any>;

  mensagens: any[] = [];
  novaMensagem: string = '';
  usuarioNome: string = '';
  private destroy$ = new Subject<void>();
  private shouldScroll = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private diceRollService: DiceRollService
  ) { }

  ngOnInit(): void {
    this.usuarioId = this.authService.getUserId()!;
    this.usuarioNome = this.authService.getUserName() || 'Anônimo';

    if (!this.mesaId || isNaN(this.mesaId)) {
      console.error('ID da mesa inválido:', this.mesaId);
      return;
    }

    // Primeiro conecta ao grupo, depois carrega mensagens
    this.chatService.joinMesaGroup(this.mesaId).then(() => {
      this.carregarMensagens();
      this.iniciarEscutaMensagens();
    }).catch(err => {
      console.error('Erro ao entrar no grupo da mesa:', err);
    });
    this.iniciarEscutaRolagens();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.leaveMesaGroup(this.mesaId);
  }

  ngAfterViewInit(): void {
    this.scrollAnchors.changes.subscribe(() => {
      this.rolarParaBaixo();
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.rolarParaBaixo();
      this.shouldScroll = false;
    }
  }

  private carregarMensagens(): void {
    this.chatService.getMensagensPorMesa(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mensagens: ChatMessage[]) => {
          this.mensagens = mensagens.map(msg => ({
            ...msg,
            message: msg.message || this.formatarMensagemParaExibicao(msg)
          }));
          this.shouldScroll = true;
        },
        error: (err: any) => {
          console.error('Erro ao carregar mensagens:', err);
          this.mensagens = [];
        }
      });
  }


  private formatarMensagemParaExibicao(msg: ChatMessage): string {
    // Se já estiver formatado (mensagens recebidas via SignalR)
    if (msg.message && !msg.texto) {
      return msg.message;
    }

    // Formata mensagens carregadas do banco de dados
    if (msg.tipoMensagem === 'dado' && msg.dadosFormatados) {
      try {
        const dados = JSON.parse(msg.dadosFormatados);
        return this.formatarMensagemDados(msg.user, dados);
      } catch (e) {
        console.error('Erro ao formatar mensagem de dados:', e);
      }
    }

    // Mensagem normal
    return `<strong>${msg.user}:</strong> ${msg.texto || msg.message}`;
  }

  private iniciarEscutaMensagens(): void {
    this.chatService.getMessageObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg: ChatMessage) => this.processarNovaMensagem(msg),
        error: (err) => console.error('Erro ao receber mensagem:', err)
      });
  }

  private iniciarEscutaRolagens(): void {
    this.diceRollService.rollRequested$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rollData => {
        this.processarRolagem(rollData);
      });
  }

  private processarRolagem(rollData: RollData): void {
    // Primeiro envia a mensagem de ação
    const acaoMessage = this.criarMensagemAcao(rollData);
    this.chatService.sendMessage(acaoMessage)
      .catch(err => this.tratarErroEnvio(err));

    // Depois processa a rolagem em si
    const resultado = this.interpretarComandoDados(`/r ${rollData.expression}`);

    if (resultado) {
      // Adiciona informações extras ao resultado
      resultado.tipo = rollData.type;
      resultado.nome = rollData.name;
      resultado.personagem = rollData.nome;

      this.enviarMensagemDados(resultado);
    }
  }

  private criarMensagemAcao(rollData: RollData): ChatMessage {
    let acaoTexto = '';
    let tipoMensagem: 'acao' | 'dado' = 'acao';

    switch (rollData.type) {
      case 'weapon-attack':
        acaoTexto = `${rollData.nome} ataca com ${rollData.name}`;
        tipoMensagem = 'dado'; // Considera como mensagem de dado
        break;
      case 'weapon-damage':
        acaoTexto = `${rollData.nome} causa dano com ${rollData.name}`;
        tipoMensagem = 'dado';
        break;
      case 'weapon-critical':
        acaoTexto = `${rollData.nome} acerta um CRÍTICO com ${rollData.name}`;
        tipoMensagem = 'dado';
        break;
      case 'attribute':
        acaoTexto = `${rollData.nome} testa ${rollData.name}`;
        break;
      case 'skill':
        acaoTexto = `${rollData.nome} usa ${rollData.name}`;
        break;
      case 'saving-throw':
        acaoTexto = `${rollData.nome} tenta resistir com ${rollData.name}`;
        break;
      default:
        acaoTexto = `${rollData.nome} realiza uma ação`;
    }

    return {
      user: rollData.nome,
      message: `<div class="action-message"><strong>${rollData.nome}:</strong> ${acaoTexto}</div>`,
      texto: acaoTexto,
      tipoMensagem: tipoMensagem,
      usuarioId: this.authService.getUserId()!,
      mesaId: rollData.mesaId,
      dataHora: new Date().toISOString()
    };
  }

  private processarNovaMensagem(msg: ChatMessage): void {
    const mensagemFormatada: ChatMessage = {
      ...msg,
      message: msg.message || this.formatarMensagemParaExibicao(msg),
      texto: msg.texto || this.extrairTexto(msg.message)
    };
    this.mensagens.push(mensagemFormatada);
    this.shouldScroll = true;
  }

  private extrairTexto(html?: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }

  enviarMensagem(): void {
    if (!this.novaMensagem.trim()) return;

    if (this.novaMensagem.startsWith('/')) {
      this.processarComando();
    } else {
      this.enviarMensagemNormal();
    }
  }

  private enviarMensagemNormal(): void {
    const textoMensagem = this.novaMensagem.trim();
    if (!textoMensagem) return;

    const mensagemParaEnviar: ChatMessage = {
      user: this.usuarioNome,
      message: `<strong>${this.usuarioNome}:</strong> ${textoMensagem}`,
      texto: textoMensagem,
      tipoMensagem: 'normal',
      dadosFormatados: undefined,
      usuarioId: this.usuarioId,
      mesaId: this.mesaId,
      dataHora: new Date().toISOString()
    };

    this.chatService.sendMessage(mensagemParaEnviar)
      .then(() => this.novaMensagem = '')
      .catch(err => this.tratarErroEnvio(err));
  }

  private tratarErroEnvio(error: any): void {
    console.error('Erro ao enviar mensagem:', error);
    const mensagemErro: ChatMessage = {
      user: 'Sistema',
      message: '<div class="error-message">Erro ao enviar mensagem</div>',
      texto: 'Erro ao enviar mensagem',
      tipoMensagem: 'normal',
      usuarioId: 0,
      mesaId: this.mesaId,
      dataHora: new Date().toISOString()
    };
    this.mensagens.push(mensagemErro);
    this.shouldScroll = true;
  }

  private processarComando(): void {
    const resultado = this.interpretarComandoDados(this.novaMensagem);

    if (resultado) {
      this.enviarMensagemDados(resultado);
    } else {
      this.enviarMensagemNormal();
    }
  }

  private interpretarComandoDados(comando: string): DiceRollResult | null {
    // Padrão para expressões complexas entre parênteses com operações externas
    const parentesisPattern = /\/r\s*\((.*?)\)\s*([+\-*/].*)?/;
    const parentesisMatch = comando.match(parentesisPattern);

    if (parentesisMatch) {
      const resultado = this.interpretarExpressaoComplexa(parentesisMatch[1]);
      const operacoesExternas = parentesisMatch[2]?.trim();

      if (resultado && operacoesExternas) {
        try {
          resultado.total = math.evaluate(`${resultado.total}${operacoesExternas}`);
          resultado.operacoes = `(${resultado.expressaoOriginal || ''})${operacoesExternas}`;
        } catch (e) {
          resultado.erro = 'Operações externas inválidas';
        }
      }
      return resultado;
    }

    // Restante do código para rolagens simples tradicionais...
    const simplePattern = /\/(r|rode)\s*(\d*)d(\d+)([ ]?(ma|me)(\d+))?(.*)?/;
    const simpleMatch = comando.match(simplePattern);

    if (!simpleMatch) {
      return {
        quantia: 0,
        lados: 0,
        resultados: [],
        total: 0,
        erro: 'Formato de comando inválido'
      };
    }

    const quantia = simpleMatch[2] ? parseInt(simpleMatch[2]) : 1;
    const lados = parseInt(simpleMatch[3]);
    const tipoRolagem = simpleMatch[5];
    const y = simpleMatch[6] ? parseInt(simpleMatch[6]) : null;
    const operacoes = simpleMatch[7]?.trim() || '';

    let resultados: number[] = Array.from({ length: quantia }, () =>
      Math.ceil(Math.random() * lados));

    let ignorados: number[] = [];
    let resultadosFinais = [...resultados];

    if (tipoRolagem === 'ma' && y) {
      // Para maiores valores: ordena em ordem decrescente e pega os y primeiros
      resultados.sort((a, b) => b - a);
      resultadosFinais = resultados.slice(0, y);
      ignorados = resultados.slice(y);
    } else if (tipoRolagem === 'me' && y) {
      // Para menores valores: ordena em ordem crescente e pega os y primeiros
      resultados.sort((a, b) => a - b);
      resultadosFinais = resultados.slice(0, y);
      ignorados = resultados.slice(y);
    }

    let total = resultadosFinais.reduce((sum, num) => sum + num, 0);

    if (operacoes) {
      try {
        const expression = `${total}${operacoes.replace(/([+\-*/])\s+/g, '$1')}`;
        total = math.evaluate(expression);
      } catch (e) {
        console.error('Erro ao processar operações:', e);
      }
    }

    return {
      quantia,
      lados,
      resultados: resultadosFinais,
      ignorados: ignorados.length > 0 ? ignorados : undefined,
      total,
      operacoes: operacoes || undefined
    };
  }

  private interpretarExpressaoComplexa(expressao: string): DiceRollResult {
    const resultado: DiceRollResult = {
      quantia: 0,
      lados: 0,
      resultados: [],
      total: 0,
      expressaoOriginal: expressao
    };

    if (!this.validarExpressao(expressao)) {
      resultado.erro = 'Expressão inválida';
      return resultado;
    }

    const dicePattern = /(\d*)d(\d+)/g;
    let match;
    const rolls: DiceRollResult[] = [];

    try {
      // Processar cada rolagem de dados na expressão
      while ((match = dicePattern.exec(expressao)) !== null) {
        const quantia = match[1] ? parseInt(match[1]) : 1;
        const lados = parseInt(match[2]);

        const resultados = Array.from({ length: quantia }, () => Math.ceil(Math.random() * lados));
        const total = resultados.reduce((sum, num) => sum + num, 0);

        rolls.push({
          quantia,
          lados,
          resultados,
          total,
          expressaoOriginal: match[0]
        });
      }

      if (rolls.length === 0) {
        resultado.erro = 'Nenhum dado encontrado na expressão';
        return resultado;
      }

      // Substituir cada rolagem pelo seu total na expressão
      let expressaoCalculo = expressao;
      rolls.forEach(roll => {
        expressaoCalculo = expressaoCalculo.replace(roll.expressaoOriginal!, `(${roll.total})`);
      });

      // Calcular o resultado total
      resultado.quantia = rolls.reduce((sum, roll) => sum + roll.quantia, 0);
      resultado.lados = rolls[0]?.lados || 0; // Usar o primeiro dado como referência
      resultado.resultados = rolls.flatMap(r => r.resultados);
      resultado.total = math.evaluate(expressaoCalculo);
      resultado.operacoes = expressao;

    } catch (e) {
      console.error('Erro ao processar expressão:', e);
      resultado.erro = 'Erro no cálculo';
    }

    return resultado;
  }

  private validarExpressao(expressao: string): boolean {
    const allowedChars = /^[\dd+\-*\/() maeme\d\s]+$/;
    if (!allowedChars.test(expressao)) return false;

    // Verifica parênteses balanceados
    let balance = 0;
    for (const char of expressao) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) return false;
    }
    return balance === 0;
  }

  private enviarMensagemDados(resultado: DiceRollResult): void {
    const mensagemHtml = this.formatarMensagemDados(this.usuarioNome, resultado);
    const textoSimples = this.extractTextFromHtml(mensagemHtml); // Extrai texto sem formatação HTML

    const mensagemParaEnviar: ChatMessage = {
      user: this.usuarioNome,
      message: mensagemHtml,
      texto: textoSimples, // Adicionamos o texto simples
      mesaId: this.mesaId,
      usuarioId: this.usuarioId,
      tipoMensagem: 'dado',
      dadosFormatados: JSON.stringify(resultado),
      dataHora: new Date().toISOString()
    };

    this.chatService.sendMessage(mensagemParaEnviar)
      .then(() => {
        this.novaMensagem = '';
      })
      .catch(err => {
        console.error('Erro ao enviar mensagem de dados:', err);
        const mensagemErro: ChatMessage = {
          user: 'Sistema',
          message: '<div class="error-message">Erro ao enviar rolagem de dados. Tente novamente.</div>',
          texto: 'Erro ao enviar rolagem de dados. Tente novamente.',
          mesaId: this.mesaId,
          usuarioId: 0,
          tipoMensagem: 'normal',
          dataHora: new Date().toISOString()
        };
        this.mensagens.push(mensagemErro);
        this.shouldScroll = true;
      });
  }

  private extractTextFromHtml(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Extrai texto formatado para o banco de dados
    const diceRoll = temp.querySelector('.dice-roll');
    if (diceRoll) {
      const content = diceRoll.querySelector('.dice-roll-content')?.textContent || '';
      const total = diceRoll.querySelector('.dice-total')?.textContent || '';
      return `${content} ${total}`.trim();
    }

    return temp.textContent || temp.innerText || '';
  }

  private formatarMensagemDados(usuario: string, resultado: DiceRollResult): string {
    const formatarNumero = (num: number, lados: number) => {
      const numStr = num.toString();
      if (num === 1) return `<span class="dice-critical-fail">${numStr}</span>`;
      if (num === lados) return `<span class="dice-critical-success">${numStr}</span>`;
      return `<span class="dice-normal">${numStr}</span>`;
    };

    let mensagem = `<div class="dice-roll"><span class="dice-roll-content"><strong>${resultado.personagem || usuario}:</strong> `;

    // Adiciona tratamento específico para rolagens de armas
    if (resultado.tipo && resultado.nome) {
      switch (resultado.tipo) {
        case 'weapon-attack':
          mensagem += `<span class="roll-type">Ataque com ${resultado.nome.replace(/\(([^)]+)\)$/, '')}: </span>`;
          break;
        case 'weapon-damage':
        case 'weapon-critical':
          const weaponName = resultado.nome.replace(/\(([^)]+)\)$/, '');
          const damageType = resultado.tipoDano || resultado.nome.match(/\(([^)]+)\)$/)?.[1] || '';

          if (resultado.tipo === 'weapon-critical') {
            mensagem += `<span class="roll-type">DANO CRÍTICO com ${weaponName}: </span>`;
          } else {
            mensagem += `<span class="roll-type">Dano com ${weaponName}: </span>`;
          }
          break;
        case 'attribute':
          mensagem += `<span class="roll-type">Teste de ${resultado.nome}: </span>`;
          break;
        case 'skill':
          mensagem += `<span class="roll-type">Teste de perícia ${resultado.nome}: </span>`;
          break;
        case 'saving-throw':
          mensagem += `<span class="roll-type">Teste de resistência ${resultado.nome}: </span>`;
          break;
      }
    }

    // Trata mensagens de erro
    if (resultado.erro) {
      mensagem += `<span class="dice-error">[Erro: ${resultado.erro}]</span>`;
    }
    // Formata expressões complexas
    else if (resultado.expressaoOriginal) {
      // Mostra a expressão completa com operações externas se existirem
      const expressaoCompleta = resultado.operacoes || `(${resultado.expressaoOriginal})`;
      mensagem += `${expressaoCompleta} = `;

      // Processa a expressão original para mostrar os valores dos dados
      let expressaoComValores = resultado.expressaoOriginal;
      let index = 0;

      // Substitui cada rolagem de dados pelos valores reais
      const dicePattern = /(\d*)d(\d+)/g;
      let match;

      while ((match = dicePattern.exec(resultado.expressaoOriginal)) !== null) {
        const quantia = match[1] ? parseInt(match[1]) : 1;
        const lados = parseInt(match[2]);
        const valores = resultado.resultados.slice(index, index + quantia);

        expressaoComValores = expressaoComValores.replace(
          match[0],
          `[${valores.map(v => formatarNumero(v, lados)).join(', ')}]`
        );

        index += quantia;
      }

      // Adiciona os valores dos dados à mensagem
      mensagem += expressaoComValores;

      // Se houver operações externas, mostra o cálculo final
      if (resultado.operacoes && resultado.operacoes !== `(${resultado.expressaoOriginal})`) {
        const totalInterno = math.evaluate(resultado.expressaoOriginal
          .replace(/(\d*)d(\d+)/g, (match, quantia, lados) => {
            const qtd = quantia ? parseInt(quantia) : 1;
            const dados = resultado.resultados.slice(0, qtd);
            resultado.resultados = resultado.resultados.slice(qtd);
            return dados.reduce((a, b) => a + b, 0).toString();
          }));

        mensagem += ` = ${totalInterno}`;
        mensagem += resultado.operacoes.replace(`(${resultado.expressaoOriginal})`, '');
      }
    }
    // Formata rolagens simples
    else {
      mensagem += `${resultado.quantia}d${resultado.lados} (`;
      mensagem += resultado.resultados.map(n => formatarNumero(n, resultado.lados)).join(', ');

      if (resultado.ignorados?.length) {
        mensagem += ` | <span class="dice-ignored">${resultado.ignorados.map(n => formatarNumero(n, resultado.lados)).join(', ')}</span>`;
      }

      mensagem += `)`;

      if (resultado.operacoes) {
        mensagem += ` ${resultado.operacoes}`;
      }
    }

    // Destaque especial para críticos
    const criticalClass = resultado.tipo === 'weapon-critical' ? 'dice-critical-total' : '';

    // Adiciona o tipo de dano à direita do total, se existir
    const damageType = resultado.tipoDano || '';
    const damageTypeHtml = damageType ? `<span class="damage-type">${damageType}</span>` : '';

    mensagem += `</span><div class="dice-total ${criticalClass}">= ${resultado.total} ${damageTypeHtml}</div></div>`;
    return mensagem;
  }

  private rolarParaBaixo(): void {
    try {
      setTimeout(() => {
        this.mensagensContainer.nativeElement.scrollTop =
          this.mensagensContainer.nativeElement.scrollHeight;
      }, 100);
    } catch (err) {
      console.error('Erro ao rolar chat:', err);
    }
  }

}