// FichaDnd5eComponent.ts
import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-ficha-dnd5e',
  standalone: false,
  templateUrl: './ficha-dnd5e.component.html',
  styleUrls: ['./ficha-dnd5e.component.css']
})
export class FichaDnd5eComponent implements OnInit {
  @Input() fichaId: number = 0;
  ficha: any = {}; // Armazena a ficha carregada

  constructor(private apiService: ApiService, public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    if (this.fichaId) {
      this.carregarFicha(this.fichaId);
    }
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

  closeModal() {
    this.activeModal.close();
  }
}
