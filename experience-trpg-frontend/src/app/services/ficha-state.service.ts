import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FichaDto } from '../dtos/ficha.dto';

@Injectable({
  providedIn: 'root'
})
export class FichaStateService {
  private fichaSubject = new BehaviorSubject<FichaDto | null>(null);
  ficha$ = this.fichaSubject.asObservable();

  updateFicha(ficha: FichaDto) {
    this.fichaSubject.next(ficha);
  }
}