using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class Usuario
    {
        [Key]
        public int UsuarioId { get; set; }
        public string Nome { get; set; } = string.Empty; // Atribui valor padrão
        [EmailAddress]
        public string Email { get; set; } = string.Empty; // Atribui valor padrão
        public string Senha { get; set; } = string.Empty; // Atribui valor padrão
        public string SenhaHash { get; set; } = string.Empty; // Atribui valor padrão
        public bool EmailVerificado { get; set; } // Inicialmente FALSE
        public string EmailVerificationToken { get; set; } = string.Empty; // Atribui valor padrão
        public int? StatusUsuarioId { get; set; } // Permite null se não tiver uma referência
        public StatusUsuario? UsuStatusUsuario { get; set; } // Pode ser null, depende da implementação
        public DateTime DataCriacao { get; set; } = DateTime.Now;
        public DateTime? UltimoLogin { get; set; } // Pode ser null pois o usuário pode nunca ter feito login
        public ICollection<Mesa> MesasCriadas { get; set; } = new List<Mesa>(); // Inicializa como uma lista
        public ICollection<UsuarioMesa> MesasParticipadas { get; set; } = new List<UsuarioMesa>(); // Inicializa como uma lista
        public ICollection<UsuarioFicha> UsuarioFichas { get; set; } = new List<UsuarioFicha>(); // Inicializa como uma lista
    }
}
