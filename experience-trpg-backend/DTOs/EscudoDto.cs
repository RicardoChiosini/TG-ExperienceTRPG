using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class EscudoDto
    {
        public int EscudoId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public bool Equipado { get; set; }
        public int BaseEscudo { get; set; }
        public int BonusMagico { get; set; }
    }
}
