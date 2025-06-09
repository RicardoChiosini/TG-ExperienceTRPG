using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Habilidade
    {
        [Key]
        public int HabilidadeId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public string Descricao { get; set; } = string.Empty; // Inicializa como uma string vazia

        public int FichaId { get; set; } // Chave estrangeira para Ficha
        public Ficha? HabFicha { get; set; } // Propriedade de navegação (anulável)
    }
}
