using AutoMapper;
using experience_trpg_backend.Models;
using experience_trpg_backend.DTOs;
using System.Text.Json;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<MesaDto, Mesa>()
            .ForMember(dest => dest.Participantes, opt => opt.Ignore()) // Ignora a mapear participantes, pois não são necessários ao criar a mesa
            .ForMember(dest => dest.MesCriador, opt => opt.Ignore()); // Ignora MesCriador se não for mapeado diretamente

        CreateMap<Mesa, MesaDto>()
            .ForMember(dest => dest.Participantes, opt => opt.Ignore()) // Ignora participantes ao mapear de Mesa para MesaDto
            .ForMember(dest => dest.MesCriador, opt => opt.MapFrom(src => new UsuarioDto
            {
                UsuarioId = src.MesCriador.UsuarioId,
                Nome = src.MesCriador.Nome
            }));

        CreateMap<Imagem, ImagemDto>()
            .ForMember(dest => dest.Nome, opt => opt.MapFrom(src => src.Nome ?? string.Empty))
            .ForMember(dest => dest.Extensao, opt => opt.MapFrom(src => src.Extensao ?? string.Empty))
            .ForMember(dest => dest.ImageUrl, opt => opt.MapFrom(src => src.ImageUrl ?? string.Empty));

        CreateMap<Usuario, UsuarioDto>();
        CreateMap<Ficha, FichaDto>()
            .ForMember(dest => dest.Nome, opt => opt.MapFrom(src => src.Nome ?? string.Empty))
            .ForMember(dest => dest.Descricao, opt => opt.MapFrom(src => src.Descricao ?? string.Empty))
            .ForMember(dest => dest.Imagem, opt => opt.MapFrom(src => src.FicImagem));
        CreateMap<Atributo, AtributoDto>();
        CreateMap<Habilidade, HabilidadeDto>();
        CreateMap<Proficiencia, ProficienciaDto>();

        // Novos mapeamentos para Mapa
        CreateMap<Mapa, MapaDto>()
            .ForMember(dest => dest.Estado, opt => opt.ConvertUsing(new JsonToEstadoConverter(), src => src.EstadoJson));

        CreateMap<Mapa, MapaDto>()
            .ForMember(dest => dest.Estado, opt => opt.ConvertUsing(new JsonToEstadoConverter(), src => src.EstadoJson))
            .ForMember(dest => dest.ImaFundo, opt => opt.MapFrom(src => src.ImaFundo));

            CreateMap<MapaDto, Mapa>()
            .ForMember(dest => dest.ImagemFundo, opt => opt.MapFrom(src => src.ImagemFundo))
            .ForMember(dest => dest.ImaFundo, opt => opt.Ignore()) // Ignoramos pois será tratado separadamente
            .ForMember(dest => dest.MapMesa, opt => opt.Ignore()); // Ignoramos a navegação para Mesa

        CreateMap<Mapa, MapaDto>()
            .ForMember(dest => dest.ImagemFundo, opt => opt.MapFrom(src => src.ImagemFundo))
            .ForMember(dest => dest.ImaFundo, opt => opt.MapFrom(src => src.ImaFundo))
            .ForMember(dest => dest.FundoUrl, opt => opt.Ignore());

        // Mapeamento para MapaEstadoDto e TokenDto (se necessário)
        CreateMap<MapaEstadoDto, MapaEstadoDto>(); // Pode ser útil para cópias
        CreateMap<TokenDto, TokenDto>(); // Pode ser útil para cópias
    }
}

public class JsonToEstadoConverter : IValueConverter<string, MapaEstadoDto>
{
    private static readonly JsonSerializerOptions _options = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    };

    public MapaEstadoDto Convert(string sourceMember, ResolutionContext context)
    {
        if (string.IsNullOrEmpty(sourceMember))
            return new MapaEstadoDto();

        return JsonSerializer.Deserialize<MapaEstadoDto>(sourceMember, _options) ?? new MapaEstadoDto();
    }
}

public class EstadoToJsonConverter : IValueConverter<MapaEstadoDto, string>
{
    private static readonly JsonSerializerOptions _options = new JsonSerializerOptions
    {
        WriteIndented = false
    };

    public string Convert(MapaEstadoDto sourceMember, ResolutionContext context)
    {
        if (sourceMember == null)
            return "{}";

        return JsonSerializer.Serialize(sourceMember, _options);
    }
}