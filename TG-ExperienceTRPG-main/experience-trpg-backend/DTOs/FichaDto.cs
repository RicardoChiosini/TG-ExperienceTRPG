using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{

    public class FichaDto
    {
        public int FichaId { get; set; }
        public string? Nome { get; set; }
        public string? Descricao { get; set; }
        public int SistemaId { get; set; }
        public int? MesaId { get; set; }
        public int? ImagemId { get; set; }

        public ImagemDto? Imagem { get; set; }

        public List<AtributoDto> Atributos { get; set; } = new List<AtributoDto>();
        public List<HabilidadeDto> Habilidades { get; set; } = new List<HabilidadeDto>();
        public List<ProficienciaDto> Proficiencias { get; set; } = new List<ProficienciaDto>();
    }
}