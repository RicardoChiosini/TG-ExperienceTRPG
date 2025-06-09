using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Sistema
    {
        [Key]
        public int SistemaId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public string Descricao { get; set; } = string.Empty; // Inicializa como uma string vazia

        public ICollection<Mesa> Mesas { get; set; } = new List<Mesa>(); // Inicializa como uma lista
        public ICollection<Ficha> Fichas { get; set; } = new List<Ficha>(); // Inicializa como uma lista
    }
}
