import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FichaDto } from '../../dtos/ficha.dto';
import { Sistema } from '../../models/SistemaModel';

import { FichaDnd5eComponent } from '../fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../fichas/ficha-tormenta20/ficha-tormenta20.component';

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
  sistemas: Sistema[] = []; // Lista de sistemas disponíveis
  sistemaMesa: Sistema | null = null; // Sistema da mesa atual
  modalsAbertas: { ficha: FichaDto; modalId: string; top: number; left: number; isDragging: boolean }[] = []; // Lista de modals abertas

  private destroy$ = new Subject<void>(); // Subject para gerenciar a destruição do componente

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private apiService: ApiService,
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

  // no seu MesaComponent.ts
  getComponenteFicha(sistemaId: number): any {
    switch (sistemaId) {
      case 1:
        return FichaDnd5eComponent; // ID de D&D 5E
      case 2:
        return FichaTormenta20Component; // ID de Tormenta 20
      default:
        return null;
    }
  }

  // Abre o modal com os detalhes da ficha
  abrirFicha(ficha: FichaDto): void {
    // Verifica se a ficha já está aberta
    const fichaAberta = this.modalsAbertas.find(m => m.ficha.fichaId === ficha.fichaId);
  
    // Se a ficha já estiver aberta, não faça nada
    if (fichaAberta) {
      console.log(`A ficha '${ficha.nome}' já está aberta.`);
      return;
    }
  
    // Gere um ID único para a modal
    const modalId = `modal-${ficha.fichaId}`; 
    this.modalsAbertas.push({ ficha, modalId, top: 50, left: 50, isDragging: false }); // Adiciona a modal à lista de modals abertas
  }

  fecharModal(modalId: string): void {
    this.modalsAbertas = this.modalsAbertas.filter(m => m.modalId !== modalId); // Remove a modal da lista
  }

  iniciarArrastar(event: MouseEvent, modalId: string): void {
    const modal = this.modalsAbertas.find(m => m.modalId === modalId);
    if (modal) {
      modal.isDragging = true;
      const offsetX = event.clientX - modal.left;
      const offsetY = event.clientY - modal.top;
  
      const moverModal = (e: MouseEvent) => {
        if (modal.isDragging) {
          // Calcular nova posição
          let newLeft = e.clientX - offsetX;
          let newTop = e.clientY - offsetY;
  
          // Obter dimensões da modal
          const modalWidth = 300; // Largura padrão
          const modalHeight = 200; // Altura padrão (ajuste conforme necessário)
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
  
          // Restringir a nova posição
          if (newTop < 0) {
            newTop = 0; // Limita a parte superior
          } else if (newTop + modalHeight > windowHeight) {
            newTop = windowHeight - modalHeight; // Limita a parte inferior
          }
  
          if (newLeft < 0) {
            newLeft = 0; // Limita a parte esquerda
          } else if (newLeft + modalWidth > windowWidth) {
            newLeft = windowWidth - modalWidth; // Limita a parte direita
          }
  
          // Atualizar a posição da modal
          modal.left = newLeft;
          modal.top = newTop;
        }
      };
  
      const pararArrastar = () => {
        modal.isDragging = false;
        document.removeEventListener('mousemove', moverModal);
        document.removeEventListener('mouseup', pararArrastar);
      };
  
      document.addEventListener('mousemove', moverModal);
      document.addEventListener('mouseup', pararArrastar);
    }
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