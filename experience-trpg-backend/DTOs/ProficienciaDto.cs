using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class ProficienciaDto
    {
        public int ProficienciaId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public bool Proficiente { get; set; }
        public int FichaId { get; set; }
    }
}
