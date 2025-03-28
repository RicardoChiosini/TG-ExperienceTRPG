using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class HabilidadeDto
    {
        public int HabilidadeId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public int FichaId { get; set; }
    }
}
