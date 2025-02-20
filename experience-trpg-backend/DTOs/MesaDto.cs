using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class MesaDto
    {
        public int MesaId { get; set; }
        public string? Nome { get; set; }
        public string? Descricao { get; set; }
        public DateTime DataCriacao { get; set; }
        public int CriadorId { get; set; }
        public int SistemaId { get; set; }
        public UsuarioDto? MesCriador { get; set; }
        public List<UsuarioDto>? Participantes { get; set; }
        public List<FichaDto> Fichas { get; set; } = new List<FichaDto>();
    }
}