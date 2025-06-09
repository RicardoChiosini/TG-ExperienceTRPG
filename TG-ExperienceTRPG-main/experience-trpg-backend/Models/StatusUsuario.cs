using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class StatusUsuario
    {
        [Key]
        public int StatusUsuariosId { get; set; }
        public string Nome { get; set; } = string.Empty; // Inicializa como uma string vazia
        public string Descricao { get; set; } = string.Empty; // Inicializa como uma string vazia

        public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>(); // Relação com Usuario
    }
}
