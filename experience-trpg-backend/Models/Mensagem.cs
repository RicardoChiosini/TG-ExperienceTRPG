using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Mensagem
    {
        [Key]
        public int MensagemId { get; set; } // Chave primária
        public string Texto { get; set; } = string.Empty; // Texto da mensagem
        public DateTime DataHora { get; set; } = DateTime.Now; // Data e hora em que a mensagem foi enviada
        public int UsuarioId { get; set; } // Chave estrangeira para o usuário que enviou a mensagem
        public int MesaId { get; set; } // Chave estrangeira para a mesa

        public Usuario? MenUsuario { get; set; } // Propriedade de navegação para o usuário
        public Mesa? MenMesa { get; set; } // Propriedade de navegação para a mesa
    }
}
