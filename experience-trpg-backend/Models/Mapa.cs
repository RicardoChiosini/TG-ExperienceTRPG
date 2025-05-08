using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace experience_trpg_backend.Models
{
    public class Mapa
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

    public Mesa? MapMesa { get; set; } 
}
}