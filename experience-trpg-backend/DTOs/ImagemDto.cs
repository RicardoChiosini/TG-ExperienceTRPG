using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class ImagemDto
    {
        public int ImagemId { get; set; }
        public required string Nome { get; set; }
        public required string Extensao { get; set; }
        public string? Dados { get; set; }
        public string? ImageUrl { get; set; }
        public int MesaId { get; set; }
    }
}