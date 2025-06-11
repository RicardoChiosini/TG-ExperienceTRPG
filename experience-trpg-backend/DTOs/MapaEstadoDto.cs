using System;
using System.Collections.Generic;

namespace experience_trpg_backend.DTOs
{
    public class MapaEstadoDto
    {
        public int MapaId { get; set; }
        public List<TokenDto> Tokens { get; set; } = new List<TokenDto>();
        public List<CamadaDto> Camadas { get; set; } = new List<CamadaDto>();
        public List<ObjetoDeMapaDto> Objetos { get; set; } = new List<ObjetoDeMapaDto>();
        public ConfiguracaoMapaDto Configuracoes { get; set; } = new ConfiguracaoMapaDto();
    }

    public class TokenDto
    {
        public string Id { get; set; }
        public string Nome { get; set; }
        public double X { get; set; }  // Alterado para double para maior precisão
        public double Y { get; set; }  // Alterado para double para maior precisão
        public int Z { get; set; } = 1;
        public string ImagemDados { get; set; } // Agora contém a URL completa (data:image/...)
        public int DonoId { get; set; } // Alterado para int para corresponder ao usuárioId
        public bool VisivelParaTodos { get; set; } = true;
        public bool Bloqueado { get; set; }
        public int MapaId { get; set; }
        public Dictionary<string, string> Metadados { get; set; } = new Dictionary<string, string>();
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
        public DateTime? DataAtualizacao { get; set; }
        public int Version { get; set; }
    }

    public class TokenUpdateDto
    {
        public double? X { get; set; }
        public double? Y { get; set; }
        public int? Z { get; set; }
        public bool? VisivelParaTodos { get; set; }
        public bool? Bloqueado { get; set; }
        public Dictionary<string, string>? Metadados { get; set; }
    }

    public class TokenCreateDto
    {
        public string Nome { get; set; }
        public double X { get; set; }
        public double Y { get; set; }
        public int Z { get; set; } = 1;
        public string ImagemDados { get; set; }
        public int DonoId { get; set; }
        public bool VisivelParaTodos { get; set; } = true;
        public bool Bloqueado { get; set; }
        public Dictionary<string, string>? Metadados { get; set; }
    }

    public class CamadaDto
    {
        public string Id { get; set; }
        public string Nome { get; set; }
        public string Tipo { get; set; } // "fundo", "grid", "objetos", "tokens", "dmg"
        public bool Visivel { get; set; } = true;
        public int Ordem { get; set; }
        public string Dados { get; set; } // Dados específicos da camada
    }

    public class ObjetoDeMapaDto
    {
        public string Id { get; set; }
        public string Tipo { get; set; } // "retangulo", "circulo", "poligono", "texto"
        public int X { get; set; }
        public int Y { get; set; }
        public string Cor { get; set; }
        public Dictionary<string, object> Propriedades { get; set; } = new Dictionary<string, object>();
    }

    public class ConfiguracaoMapaDto
    {
        public string TipoGrid { get; set; } = "hexagonal"; // ou "quadrado"
        public int TamanhoCelula { get; set; } = 40;
        public string CorGrid { get; set; } = "#cccccc";
        public bool SnapToGrid { get; set; } = true;
        public string? BackgroundImage { get; set; } // URL da imagem de fundo
    }
}
