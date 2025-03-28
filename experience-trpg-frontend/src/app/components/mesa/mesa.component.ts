import { Component, OnInit, OnDestroy, AfterViewInit, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import Konva from 'konva';
import * as math from 'mathjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalService } from '../../services/modal.service';
import { FichaDto } from '../../dtos/ficha.dto';
import { Sistema } from '../../models/SistemaModel';
import { FichaStateService } from '../../services/ficha-state.service';

import { FichaDnd5eComponent } from '../fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../fichas/ficha-tormenta20/ficha-tormenta20.component';

@Component({
  selector: 'app-mesa',
  standalone: false,
  templateUrl: './mesa.component.html',
  styleUrls: ['./mesa.component.css']
})
export class MesaComponent implements OnInit, OnDestroy, AfterViewInit {

  stage: Konva.Stage | null = null;
  layerMapa: Konva.Layer | null = null;
  layerFundo: Konva.Layer | null = null;
  layerLuzes: Konva.Layer | null = null;
  layerMestre: Konva.Layer | null = null;
  layerTokens: Konva.Layer | null = null;

  activeTab: string = 'chat';
  mesaId: number = 0;
  private destroy$ = new Subject<void>();
  usuarioId: number = 0;
  linkConvite: string | null = null; // Link de convite
  isCriador: boolean = false; // Verifica se o usuário é o criador da mesa

  fichas: FichaDto[] = []; // Lista de fichas da mesa
  sistemas: Sistema[] = []; // Lista de sistemas disponíveis
  sistemaMesa: Sistema | null = null; // Sistema da mesa atual
  modalsAbertas: { ficha: FichaDto; modalId: string; top: number; left: number; isDragging: boolean }[] = []; // Lista de modals abertas

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private apiService: ApiService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef,
    private modalService: ModalService,
    private fichaStateService: FichaStateService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.mesaId = +this.route.snapshot.paramMap.get('id')!;
    this.usuarioId = this.authService.getUserId()!;

    this.verificarCriador();
    this.chatService.joinMesaGroup(this.mesaId);
    this.carregarFichas();

    // Inscrever para alterações de ficha
    this.fichaStateService.ficha$.subscribe(ficha => {
      if (ficha) {
          this.atualizarFichaNaMesa(ficha); // Chama um método para atualizar a ficha na mesa
      }
  });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  ngAfterViewInit(): void {
    this.inicializarKonva();
  }

  // Método para sanitizar o HTML
  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
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

  atualizarFichaNaMesa(ficha: FichaDto): void {
    // Atualiza a ficha na lista de fichas abertas
    for (let modal of this.modalsAbertas) {
        if (modal.ficha.fichaId === ficha.fichaId) {
            modal.ficha.nome = ficha.nome; // Atualiza o nome na modal
            break; // Saia do loop após encontrar
        }
    }
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

    // Função para lidar com a abertura da modal da ficha
    abrirFicha(ficha: FichaDto): void {
    // Verifica se a ficha já está aberta
    const fichaAberta = this.modalsAbertas.find(m => m.ficha.fichaId === ficha.fichaId);

    // Se a ficha já estiver aberta, não faça nada
    if (fichaAberta) {
        console.log(`A ficha '${ficha.nome}' já está aberta.`);
        return;
    }

    console.log(`A ficha '${ficha.nome}' abriu.`);
    // Gere um ID único para a modal
    const modalId = `modal-${ficha.fichaId}`;
    this.modalsAbertas.push({ ficha, modalId, top: 50, left: 50, isDragging: false }); // Adiciona a modal à lista de modals abertas

    // Obtém o componente correto para a ficha
    const componenteFicha = this.getComponenteFicha(ficha.sistemaId);

    if (componenteFicha) {
      const modalComponent = this.componentFactoryResolver.resolveComponentFactory(componenteFicha);
      const componentRef = this.viewContainerRef.createComponent(modalComponent);
    
      // Passa o fichaId para o componente da modal
      if (componentRef.instance instanceof FichaDnd5eComponent) {
          componentRef.instance.fichaId = ficha.fichaId;
          // Lógica para exibir a modal
          this.modalService.open(componentRef.instance); // Chame aqui o serviço para exibir a modal
      } else {
          console.error('O componente instanciado não é do tipo esperado.');
       }
    } else {
      console.error('Componente de ficha não encontrado para o sistema.');
    }
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
}