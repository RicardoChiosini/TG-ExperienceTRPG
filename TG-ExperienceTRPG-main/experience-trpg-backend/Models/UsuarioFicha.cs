using System.ComponentModel.DataAnnotations;

namespace experience_trpg_backend.Models
{
    public class UsuarioFicha
    {
        public int UsuarioId { get; set; }
        public Usuario? UFUsuario { get; set; }
        public int FichaId { get; set; }
        public Ficha? UFFicha { get; set; }
    }
}
