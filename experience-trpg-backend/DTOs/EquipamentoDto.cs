using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class EquipamentoDto
    {
        public int EquipamentoId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty; // Usada para definir o tipo
        public int FichaId { get; set; }

        // Propriedade polimórfica baseada na Descricao
        public object? Estado
        {
            get
            {
                return Descricao switch
                {
                    "Arma" => Arma,
                    "Armadura" => Armadura,
                    "Escudo" => Escudo,
                    "Item" => Item,
                    _ => null
                };
            }
        }

        public ArmaDto? Arma { get; set; }
        public ArmaduraDto? Armadura { get; set; }
        public EscudoDto? Escudo { get; set; }
        public ItemDto? Item { get; set; }
    }
}
