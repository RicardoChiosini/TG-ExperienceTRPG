using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Proficiencia
    {
        [Key]
        public int ProficienciaId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public bool Proficiente { get; set; } 
        public int FichaId { get; set; } // Chave estrangeira para Ficha
        public Ficha? ProfFicha { get; set; } // Propriedade de navegação (anulável)
    }
}
