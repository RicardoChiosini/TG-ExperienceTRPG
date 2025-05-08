import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { ToastrModule } from 'ngx-toastr';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { AppComponent } from '../app.component';
import { HomeComponent } from '../components/home/home.component'; // Supondo que você tenha um componente Home
import { LoginRegistroComponent } from '../components/login-registro/login-registro.component'; // Componente de login/registro
import { BarraNavegacaoComponent } from '../components/barra-navegacao/barra-navegacao.component'; // Componente de barra de navegação
import { AssinaturaComponent } from '../components/assinatura/assinatura.component'; // Componente de assinatura
import { ConfigMesaComponent } from '../components/config-mesa/config-mesa.component'; // Componente de configuração de mesa
import { CriarMesaComponent } from '../components/criar-mesa/criar-mesa.component'; // Componente de criar mesa
import { MeuPerfilComponent } from '../components/meu-perfil/meu-perfil.component'; // Componente de perfil
import { MinhasMesasComponent } from '../components/minhas-mesas/minhas-mesas.component';
import { ConfirmEmailComponent } from '../components/confirm-email/confirm-email.component';
import { MesaComponent } from '../components/mesa/mesa.component';
import { ParticiparMesaComponent } from '../components/participar-mesa/participar-mesa.component';
import { FichaDnd5eComponent } from '../components/fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../components/fichas/ficha-tormenta20/ficha-tormenta20.component';
import { ChatComponent } from '../components/chat/chat.component';

import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { SessaoService } from '../services/sessao.service';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginRegistroComponent,
    BarraNavegacaoComponent,
    AssinaturaComponent,
    ConfigMesaComponent,
    CriarMesaComponent,
    MeuPerfilComponent,
    MinhasMesasComponent,
    ConfirmEmailComponent,
    MesaComponent,
    ParticiparMesaComponent,
    FichaDnd5eComponent,
    FichaTormenta20Component,
    ChatComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    NgbModule,
    ToastrModule.forRoot()
  ],
  providers: [ApiService, AuthService, SessaoService, provideAnimationsAsync()],
  bootstrap: [AppComponent]
})
export class AppModule { }
