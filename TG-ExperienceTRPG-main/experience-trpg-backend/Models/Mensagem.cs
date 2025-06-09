using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace experience_trpg_backend.Models
{
    public class Mensagem
    {
        [Key]
        public int MensagemId { get; set; }
        
        [Column(TypeName = "text")] // Para garantir espaço suficiente
        public string Texto { get; set; } = string.Empty;
        
        public DateTime DataHora { get; set; } = DateTime.Now;
        public int UsuarioId { get; set; }
        public int MesaId { get; set; }
        
        // Campos adicionais para formatação
        public string? TipoMensagem { get; set; } // "normal", "dado", "sistema"
        public string? DadosFormatados { get; set; } // JSON com dados da rolagem

        // Relacionamentos
        [ForeignKey("UsuarioId")]
        public Usuario? MenUsuario { get; set; }
        
        [ForeignKey("MesaId")]
        public Mesa? MenMesa { get; set; }
    }
}