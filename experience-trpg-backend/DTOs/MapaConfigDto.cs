namespace experience_trpg_backend.DTOs
{
    public class MapaConfigDto
    {
        public string Nome { get; set; } = "Novo Mapa";
        public int Largura { get; set; } = 30;
        public int Altura { get; set; } = 30;
        public int TamanhoHex { get; set; } = 40;
        public bool Visivel { get; set; }
    }
}