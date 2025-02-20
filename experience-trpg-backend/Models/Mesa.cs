using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Mesa
    {
        [Key]
        public int MesaId { get; set; } // Chave primária
        public string Nome { get; set; } = string.Empty; // Nome da mesa
        public DateTime DataCriacao { get; set; } = DateTime.Now; // Data de criação da mesa
        public DateTime DataUltimoAcesso { get; set; } // Data do último acesso, se necessário
        public string Descricao { get; set; } = string.Empty; // Descrição da mesa
        public string Convite { get; set; }= string.Empty;
        public int CriadorId { get; set; } // Chave estrangeira para o criador (usuario)
        public Usuario? MesCriador { get; set; } // Propriedade de navegação para Usuario

        public int SistemaId { get; set; } // Chave estrangeira para Sistema
        public Sistema? MesSistema { get; set; } // Propriedade de navegação para Sistema
        
        public ICollection<UsuarioMesa> Participantes { get; set; } = new List<UsuarioMesa>(); // Participantes da mesa
        public ICollection<Ficha> Fichas { get; set; } = new List<Ficha>(); // Fichas associadas
        public ICollection<Imagem> Imagens { get; set; } = new List<Imagem>(); // Imagens associadas
    }
}
