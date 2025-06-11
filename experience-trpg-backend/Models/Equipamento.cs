using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Equipamento
    {
        [Key]
        public int EquipamentoId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public string Descricao { get; set; } = string.Empty; // Inicializa como uma string vazia

        public int FichaId { get; set; } // Chave estrangeira para Ficha
        public string EstadoJson { get; set; } = string.Empty;
        public Ficha? EquFicha { get; set; } // Propriedade de navegação (anulável)
    }
}
