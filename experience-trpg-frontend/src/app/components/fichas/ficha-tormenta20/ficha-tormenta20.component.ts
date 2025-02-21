import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-ficha-tormenta20',
  standalone: false,
  templateUrl: './ficha-tormenta20.component.html',
  styleUrls: ['./ficha-tormenta20.component.css']
})
export class FichaTormenta20Component implements OnInit {
@Input() fichaId: number = 0;
  ficha: any = {};

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.fichaId) {
      this.carregarFicha(this.fichaId);
    }
  }

  carregarFicha(fichaId: number): void {
    this.apiService.getFichaPorId(fichaId).subscribe(
      (data) => {
        this.ficha = data;
      },
      (error) => {
        console.error('Erro ao carregar ficha:', error);
      }
    );
  }
}