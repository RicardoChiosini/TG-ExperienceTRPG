import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from '../components/home/home.component'; // Ajuste o caminho conforme necessário
import { LoginRegistroComponent } from '../components/login-registro/login-registro.component';
import { MeuPerfilComponent } from '../components/meu-perfil/meu-perfil.component';
import { MinhasMesasComponent } from '../components/minhas-mesas/minhas-mesas.component';
import { AssinaturaComponent } from '../components/assinatura/assinatura.component';
import { ConfigMesaComponent } from '../components/config-mesa/config-mesa.component';
import { CriarMesaComponent } from '../components/criar-mesa/criar-mesa.component';
import { ConfirmEmailComponent } from '../components/confirm-email/confirm-email.component';
import { MesaComponent } from '../components/mesa/mesa.component';
import { ParticiparMesaComponent } from '../components/participar-mesa/participar-mesa.component';
import { FichaDnd5eComponent } from '../components/fichas/ficha-dnd5e/ficha-dnd5e.component';
import { FichaTormenta20Component } from '../components/fichas/ficha-tormenta20/ficha-tormenta20.component';

const routes: Routes = [
  { path: '', component: HomeComponent }, // Rota principal (home)
  { path: 'home', component: HomeComponent }, // Rota principal (home)
  { path: 'login-registro', component: LoginRegistroComponent }, // Rota de login/registro
  { path: 'meu-perfil', component: MeuPerfilComponent }, // Rota de perfil
  { path: 'minhas-mesas', component: MinhasMesasComponent }, // Rota de mesas
  { path: 'assinatura', component: AssinaturaComponent }, // Rota de assinatura
  { path: 'config-mesa/:id', component: ConfigMesaComponent }, // Rota de configuração de mesa
  { path: 'criar-mesa', component: CriarMesaComponent }, // Rota para criar mesa
  { path: 'confirm-email', component: ConfirmEmailComponent},
  { path: 'mesa/:id', component: MesaComponent},
  { path: 'mesa/:mesaId/convite/:token', component: ParticiparMesaComponent},
  { path: 'ficha-dnd5e/:fichaId', component: FichaDnd5eComponent},
  { path: 'ficha-tormenta20/:fichaId', component: FichaTormenta20Component}
  // Você pode adicionar mais rotas conforme necessário
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
