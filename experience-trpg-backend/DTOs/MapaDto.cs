using System;

namespace experience_trpg_backend.DTOs
{
    public class MapaDto
    {
        public int MapaId { get; set; }
        public int MesaId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public int Largura { get; set; } = 30;
        public int Altura { get; set; } = 30;
        public int TamanhoHex { get; set; } = 40;
        public string EstadoJson { get; set; } = string.Empty;
        public DateTime UltimaAtualizacao { get; set; }
        public bool Visivel { get; set; } = true;
        
        // Dados do estado deserializado (opcional)
        public MapaEstadoDto? Estado { get; set; }
    }
}