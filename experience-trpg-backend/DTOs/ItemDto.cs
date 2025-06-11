using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class ItemDto
    {
        public int ItemId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public int Quantidade { get; set; }
        public string Descricao { get; set; } = string.Empty;
    }
}
