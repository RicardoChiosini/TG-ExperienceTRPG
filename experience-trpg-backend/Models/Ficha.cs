using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Ficha
    {
        [Key]
        public int FichaId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public string Descricao { get; set; } = string.Empty; // Inicializa como uma string vazia
        public int SistemaId { get; set; } // Chave estrangeira para Sistema
        public int? MesaId { get; set; }
        public Sistema? FicSistema { get; set; } // Propriedade de navegação (anulável)
        public Mesa? FicMesa { get; set; }
        public ICollection<UsuarioFicha> UsuarioFichas { get; set; } = new List<UsuarioFicha>(); // Inicializa como uma lista
        public ICollection<Atributo> Atributos { get; set; } = new List<Atributo>(); // Inicializa como uma lista
        public ICollection<Habilidade> Habilidades { get; set; } = new List<Habilidade>(); // Inicializa como uma lista
        public ICollection<Equipamento> Equipamentos { get; set; } = new List<Equipamento>(); // Inicializa como uma lista
    }
}
