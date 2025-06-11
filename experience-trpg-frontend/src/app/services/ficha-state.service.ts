import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FichaDto } from '../dtos/ficha.dto';

@Injectable({
  providedIn: 'root'
})
export class FichaStateService {
  private fichasPorMesaSubject = new BehaviorSubject<{ [mesaId: number]: FichaDto[] }>({});
  fichasPorMesa$ = this.fichasPorMesaSubject.asObservable();

  updateFicha(mesaId: number, ficha: FichaDto) {
    const currentState = this.fichasPorMesaSubject.value;
    const fichasDaMesa = currentState[mesaId] || [];

    const index = fichasDaMesa.findIndex(f => f.fichaId === ficha.fichaId);
    if (index !== -1) {
      fichasDaMesa[index] = ficha;
    } else {
      fichasDaMesa.push(ficha);
    }

    this.fichasPorMesaSubject.next({
      ...currentState,
      [mesaId]: [...fichasDaMesa]
    });
  }

  setFichas(mesaId: number, fichas: FichaDto[]) {
    const currentState = this.fichasPorMesaSubject.value;
    this.fichasPorMesaSubject.next({
      ...currentState,
      [mesaId]: [...fichas]
    });
  }

  getFichasPorMesa(mesaId: number): FichaDto[] {
    return this.fichasPorMesaSubject.value[mesaId] || [];
  }
}