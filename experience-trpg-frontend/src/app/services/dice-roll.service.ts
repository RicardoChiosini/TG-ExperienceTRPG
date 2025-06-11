import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type RollType = 'attribute' | 'skill' | 'saving-throw' | 'custom';

export interface RollData {
  type: RollType;
  name: string;
  modifier: number;
  expression: string;
  mesaId: number;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class DiceRollService {
  private rollRequestSource = new Subject<RollData>();
  rollRequested$ = this.rollRequestSource.asObservable();

  requestRoll(rollData: RollData) {
    this.rollRequestSource.next(rollData);
  }
}