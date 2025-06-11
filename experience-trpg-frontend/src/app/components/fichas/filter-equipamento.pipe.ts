import { Pipe, PipeTransform } from '@angular/core';
import { EquipamentoDto } from '../../dtos/equipamento.dto';

@Pipe({
  name: 'filterEquipamento'
})
export class FilterEquipamentoPipe implements PipeTransform {
  transform(equipamentos: EquipamentoDto[], tipo: string): EquipamentoDto[] {
    if (!equipamentos) return [];
    return equipamentos.filter(e => e.descricao === tipo);
  }
}