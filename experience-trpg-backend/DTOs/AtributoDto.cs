using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class AtributoDto
    {
        public int AtributoId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public float Valor { get; set; }
        public int FichaId { get; set; }
    }
}
