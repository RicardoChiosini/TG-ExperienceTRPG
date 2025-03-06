import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-ficha-tormenta20',
  standalone: false,
  templateUrl: './ficha-tormenta20.component.html',
  styleUrls: ['./ficha-tormenta20.component.css']
})
export class FichaTormenta20Component implements OnInit {
  fichaId: number = 0;
  ficha: any = {};

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit(): void {
    this.fichaId = +this.route.snapshot.paramMap.get('fichaId')!;
    this.carregarFicha(this.fichaId);
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