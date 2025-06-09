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
        public int? ImagemFundo { get; set; }
        public ImagemDto? ImaFundo { get; set; }
        public MapaEstadoDto? Estado { get; set; }

        public string? FundoUrl
        {
            get
            {
                if (ImaFundo == null) return null;

                return !string.IsNullOrEmpty(ImaFundo.ImageUrl)
                    ? ImaFundo.ImageUrl
                    : (!string.IsNullOrEmpty(ImaFundo.Dados) && !string.IsNullOrEmpty(ImaFundo.Extensao)
                        ? $"data:image/{ImaFundo.Extensao};base64,{ImaFundo.Dados}"
                        : null);
            }
        }
    }
}