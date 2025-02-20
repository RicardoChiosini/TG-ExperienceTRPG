import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FichaDto } from '../../dtos/ficha.dto';

import { FichaDnd5eComponent } from '../fichas/ficha-dnd5e/ficha-dnd5e.component';

@Component({
  selector: 'app-mesa',
  standalone: false,
  templateUrl: './mesa.component.html',
  styleUrls: ['./mesa.component.css']
})
export class MesaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mensagensContainer') private mensagensContainer!: ElementRef; // Referência ao container de mensagens

  stage: Konva.Stage | null = null;
  layerMapa: Konva.Layer | null = null;
  layerFundo: Konva.Layer | null = null;
  layerLuzes: Konva.Layer | null = null;
  layerMestre: Konva.Layer | null = null;
  layerTokens: Konva.Layer | null = null;

  activeTab: string = 'chat'; // Aba ativa no menu
  mesaId: number = 0; // ID da mesa
  usuarioId: number = 0;
  mensagens: { user: string; message: string }[] = []; // Mensagens do chat
  novaMensagem: string = ''; // Nova mensagem a ser enviada
  linkConvite: string | null = null; // Link de convite
  isCriador: boolean = false; // Verifica se o usuário é o criador da mesa

  fichas: FichaDto[] = []; // Lista de fichas da mesa
  public modalsAbertas: { ficha: FichaDto; modalRef: any }[] = []; // Lista de modais abertas

  private destroy$ = new Subject<void>(); // Subject para gerenciar a destruição do componente

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private apiService: ApiService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.mesaId = +this.route.snapshot.paramMap.get('id')!;
    this.usuarioId = this.authService.getUserId()!;

    this.verificarCriador();
    this.chatService.joinMesaGroup(this.mesaId);
    this.carregarFichas();
    this.carregarMensagens();

    // Escuta novas mensagens em tempo real
    this.chatService.getMessageObservable().pipe(takeUntil(this.destroy$)).subscribe((message) => {
      // Verifica se a mensagem já existe na lista para evitar duplicação
      if (!this.mensagens.some((msg) => msg.user === message.user && msg.message === message.message)) {
        this.mensagens.push(message);
        this.rolarParaBaixo();
      }
    });
  }

  ngOnDestroy(): void {
    // Fecha a conexão do SignalR ao destruir o componente
    this.chatService.leaveMesaGroup(this.mesaId);
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.inicializarKonva();
    this.rolarParaBaixo();
  }

  // Carrega as fichas da mesa
  carregarFichas(): void {
    this.apiService.getFichasPorMesa(this.mesaId).subscribe(
      (data: FichaDto[]) => {
        this.fichas = data;
      },
      (error) => {
        console.error('Erro ao carregar fichas:', error);
      }
    );
  }

  // Adiciona uma nova ficha
  adicionarFicha(): void {
    this.apiService.criarFicha(this.mesaId).subscribe(
      (data: FichaDto) => {
        this.fichas.push(data); // Adiciona a nova ficha à lista
      },
      (error) => {
        console.error('Erro ao criar ficha:', error);
      }
    );
  }

  // Abre o modal com os detalhes da ficha
  abrirFicha(ficha: FichaDto): void {
    const modalRef = this.modalService.open(FichaDnd5eComponent, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.fichaId = ficha.fichaId; // Acesse o ID da ficha, se necessário
  
    // Armazena a modal com a ficha
    this.modalsAbertas.push({ ficha, modalRef });
  
    modalRef.result.then(
      () => {
        console.log('Modal fechado');
        this.modalsAbertas = this.modalsAbertas.filter(m => m.modalRef !== modalRef); // Remove a modal da lista
      },
      () => {
        console.log('Modal descartado');
        this.modalsAbertas = this.modalsAbertas.filter(m => m.modalRef !== modalRef); // Remove a modal da lista
      }
    );
  }
  

  // Carrega as mensagens da mesa
  carregarMensagens(): void {
    this.chatService
      .getMensagensPorMesa(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.mensagens = data.reverse();
        },
        (error) => {
          if (error.status !== 404) {
            console.error('Erro ao carregar mensagens:', error);
          }
        }
      );
  }

  // Envia uma mensagem no chat
  enviarMensagem(): void {
    if (this.novaMensagem.trim()) {
      const user = this.authService.getUserName() || 'Usuário Anônimo';
      this.chatService
        .sendMessage(user, this.novaMensagem, this.mesaId, this.usuarioId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          () => {
            this.novaMensagem = ''; // Limpa o campo de mensagem
          },
          (error) => {
            console.error('Erro ao enviar mensagem:', error);
          }
        );
    }
  }

  // Rola o container de mensagens para o final
  rolarParaBaixo(): void {
    try {
      this.mensagensContainer.nativeElement.scrollTop = this.mensagensContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Erro ao rolar para o final:', err);
    }
  }

  // Verifica se o usuário é o criador da mesa
  verificarCriador(): void {
    const usuarioId = this.authService.getUserId();
    this.apiService.getMesaPorId(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (mesa: any) => {
          this.isCriador = mesa.criadorId === usuarioId;
          if (this.isCriador) {
            this.obterLinkConvite();
          }
        },
        (error) => {
          console.error('Erro ao carregar dados da mesa:', error);
        }
      );
  }

  // Obtém o link de convite da mesa
  obterLinkConvite(): void {
    this.apiService.getConvitePorMesaId(this.mesaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (token: string) => {
          this.linkConvite = `http://localhost:4200/mesa/${this.mesaId}/convite/${token}`;
        },
        (error) => {
          console.error('Erro ao obter convite:', error);
        }
      );
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Texto copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar o texto: ', err);
    });
  }

  // Inicializa o Konva e as camadas
  inicializarKonva(): void {
    const container = document.querySelector('#konva-container') as HTMLDivElement;

    // Cria o estágio (área de desenho)
    this.stage = new Konva.Stage({
      container: 'konva-container',
      width: container.offsetWidth,
      height: container.offsetHeight,
    });

    // Cria as camadas
    this.layerMapa = new Konva.Layer();
    this.layerFundo = new Konva.Layer();
    this.layerLuzes = new Konva.Layer();
    this.layerMestre = new Konva.Layer();
    this.layerTokens = new Konva.Layer();

    // Adiciona as camadas ao estágio
    this.stage.add(this.layerMapa);
    this.stage.add(this.layerFundo);
    this.stage.add(this.layerLuzes);
    this.stage.add(this.layerMestre);
    this.stage.add(this.layerTokens);

    // Exemplo: Adiciona uma imagem de fundo à camada de Mapa
    const imageObj = new Image();
    imageObj.src = ''
    imageObj.onload = () => {
      const bgImage = new Konva.Image({
        x: 0,
        y: 0,
        image: imageObj,
        width: this.stage!.width(),
        height: this.stage!.height(),
      });
      this.layerMapa!.add(bgImage);
      this.layerMapa!.batchDraw();
    };

    // Exemplo: Adiciona um token à camada de Tokens
    const token = new Konva.Circle({
      x: 100,
      y: 100,
      radius: 20,
      fill: 'red',
      draggable: true,
    });
    this.layerTokens!.add(token);
    this.layerTokens!.batchDraw();
  }

  // Alterna entre as abas do menu
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
}