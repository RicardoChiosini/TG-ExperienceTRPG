namespace experience_trpg_backend.DTOs
{
    public class MensagemDto
    {
        public int MensagemId { get; set; }
        public string Texto { get; set; } = string.Empty;
        public DateTime DataHora { get; set; }
        public string UsuarioNome { get; set; } = string.Empty;
        public int UsuarioId { get; set; }
        public int MesaId { get; set; }
        public string? TipoMensagem { get; set; }
        public string? DadosFormatados { get; set; }
    }
}