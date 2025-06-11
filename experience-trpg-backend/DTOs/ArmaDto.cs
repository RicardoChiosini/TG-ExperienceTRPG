using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class ArmaDto
    {
        public int ArmaId { get; set; }
        public int Quantidade { get; set; }
        public string Nome { get; set; } = string.Empty;
        public bool Proficiencia { get; set; }
        public string TipoAcerto { get; set; } = string.Empty;
        public string BonusAcerto { get; set; } = string.Empty;
        public int BonusMagico { get; set; }
        public string Descricao { get; set; } = string.Empty;
        public string DadosDano1 { get; set; } = string.Empty;
        public string TipoDano1 { get; set; } = string.Empty;
        public string BonusDano1 { get; set; } = string.Empty;
        public string DadosCritico1 { get; set; } = string.Empty;
        public string DadosDano2 { get; set; } = string.Empty;
        public string TipoDano2 { get; set; } = string.Empty;
        public string BonusDano2 { get; set; } = string.Empty;
        public string DadosCritico2 { get; set; } = string.Empty;
    }
}
