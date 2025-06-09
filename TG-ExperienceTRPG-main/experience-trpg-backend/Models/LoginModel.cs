namespace experience_trpg_backend.Models
{
    public class LoginModel
    {
        public string Email { get; set; } = string.Empty; // Email do usuário
        public string Senha { get; set; } = string.Empty; // Senha do usuário
        public int UsuarioId { get; set; }
    }
}
