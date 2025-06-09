namespace experience_trpg_backend.Models
{
    public class UsuarioMesa
    {
        public int UsuarioId { get; set; }
        public Usuario? UMUsuario { get; set; } // Navegação para o modelo de Usuário

        public int MesaId { get; set; }
        public Mesa? UMMesa { get; set; } // Navegação para o modelo de Mesa
    }
}
