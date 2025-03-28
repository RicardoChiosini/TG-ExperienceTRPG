using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Imagem
    {
        [Key]
        public int ImagemId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public string Extensao { get; set; } = string.Empty; // Inicializa como uma string vazia
        public byte[] Dados { get; set; } = Array.Empty<byte>(); // Inicializa como um array vazio

        public int MesaId { get; set; } // Chave estrangeira para Mesa
        public Mesa? ImaMesa { get; set; } // Propriedade de navegação (anulável)

        public ICollection<Ficha> Fichas { get; set; } = new List<Ficha>(); // Fichas associadas
    }
}
