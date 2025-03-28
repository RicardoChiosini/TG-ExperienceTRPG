import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ViewChildren, QueryList } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as math from 'mathjs';
import { ChatMessage } from '../../models/chat-message.model';

interface DiceRollResult {
  quantia: number;
  lados: number;
  resultados: number[];
  ignorados?: number[];
  total: number;
  operacoes?: string;
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
    private authService: AuthService
  ) {}

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
    const regex = /\/(r|rode)\s*(\d*)d(\d+)([ ]?(ma|me)(\d+))?(.*)?/;
    const matches = comando.match(regex);

    if (!matches) return null;

    const quantia = matches[2] ? parseInt(matches[2]) : 1;
    const lados = parseInt(matches[3]);
    const tipoRolagem = matches[5];
    const y = matches[6] ? parseInt(matches[6]) : null;
    const operacoes = matches[7]?.trim() || '';

    let resultados: number[] = Array.from({length: quantia}, () => 
      Math.ceil(Math.random() * lados));
    
    let ignorados: number[] = [];
    let resultadosFinais = [...resultados];

    if (tipoRolagem === 'ma' && y) {
      resultados.sort((a, b) => b - a);
      ignorados = resultados.slice(y);
      resultadosFinais = resultados.slice(0, y);
    } else if (tipoRolagem === 'me' && y) {
      resultados.sort((a, b) => a - b);
      ignorados = resultados.slice(0, resultados.length - y);
      resultadosFinais = resultados.slice(-y);
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
    return temp.textContent || temp.innerText || '';
  }

  private formatarMensagemDados(usuario: string, resultado: DiceRollResult): string {
    const formatarNumero = (num: number, lados: number) => {
      const numStr = num.toString();
      if (num === 1) return `<span class="dice-critical-fail">${numStr}</span>`;
      if (num === lados) return `<span class="dice-critical-success">${numStr}</span>`;
      return `<span class="dice-normal">${numStr}</span>`;
    };
  
    let mensagem = `<div class="dice-roll"><span class="dice-roll-content"><strong>${usuario}:</strong> ${resultado.quantia}d${resultado.lados} (`;
    
    // Resultados considerados
    mensagem += resultado.resultados.map(n => formatarNumero(n, resultado.lados)).join(', ');
  
    // Resultados ignorados
    if (resultado.ignorados?.length) {
      mensagem += ` | <span class="dice-ignored">${resultado.ignorados.map(n => formatarNumero(n, resultado.lados)).join(', ')}</span>`;
    }
  
    mensagem += `)`;
  
    if (resultado.operacoes) {
      mensagem += ` ${resultado.operacoes}`;
    }
  
    mensagem += `</span><div class="dice-total"> ${resultado.total}</div></div>`;
  
    return mensagem;
  }

  private rolarParaBaixo(): void {
    try {
      if (this.scrollAnchors && this.scrollAnchors.last) {
        this.scrollAnchors.last.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Erro ao rolar para baixo:', err);
    }
  }

}