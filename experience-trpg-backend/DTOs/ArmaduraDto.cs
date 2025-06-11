using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class ArmaduraDto
    {
        public int ArmaduraId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public bool Equipado { get; set; }
        public string TipoArmadura { get; set; } = string.Empty;
        public int BaseArmadura { get; set; }
        public int BonusDes { get; set; }
        public int BonusMagico { get; set; }
    }
}
