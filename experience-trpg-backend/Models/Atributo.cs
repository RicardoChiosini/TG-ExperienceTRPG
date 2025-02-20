using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Atributo
    {
        [Key]
        public int AtributoId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public int Valor { get; set; }

        public int FichaId { get; set; } // Chave estrangeira para Ficha
        public Ficha? AtriFicha { get; set; } // Propriedade de navegação (anulável)
    }
}
