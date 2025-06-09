using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace experience_trpg_backend.Models
{
    public class Imagem
    {
        [Key]
        public int ImagemId { get; set; }
        
        [Required]
        [StringLength(128)]
        public string Nome { get; set; } = string.Empty;
        
        [Required]
        [StringLength(10)]
        public string Extensao { get; set; } = string.Empty;
        
        [Required]
        public byte[] Dados { get; set; } = Array.Empty<byte>();
        public string? ImageUrl { get; set; }
        
        [Required]
        public int MesaId { get; set; }
        
        [ForeignKey("MesaId")]
        public Mesa? ImaMesa { get; set; }
        
        public ICollection<Ficha> Fichas { get; set; } = new List<Ficha>();
    }
}