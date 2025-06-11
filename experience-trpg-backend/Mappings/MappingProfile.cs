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

        // Mapeamento para Equipamento
        CreateMap<Equipamento, EquipamentoDto>()
            .ForMember(dest => dest.Arma, opt => opt.MapFrom<EquipamentoArmaResolver>())
            .ForMember(dest => dest.Armadura, opt => opt.MapFrom<EquipamentoArmaduraResolver>())
            .ForMember(dest => dest.Escudo, opt => opt.MapFrom<EquipamentoEscudoResolver>())
            .ForMember(dest => dest.Item, opt => opt.MapFrom<EquipamentoItemResolver>());

        // Mapeamento para EquipamentoDto -> Equipamento
        CreateMap<EquipamentoDto, Equipamento>()
            .ForMember(dest => dest.EstadoJson, opt => opt.MapFrom<EquipamentoJsonResolver>());
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

public class EquipamentoArmaResolver : IValueResolver<Equipamento, EquipamentoDto, ArmaDto?>
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ArmaDto? Resolve(Equipamento source, EquipamentoDto destination, ArmaDto? destMember, ResolutionContext context)
    {
        if (source.Descricao != "Arma" || string.IsNullOrEmpty(source.EstadoJson))
            return null;

        return JsonSerializer.Deserialize<ArmaDto>(source.EstadoJson, _options);
    }
}

public class EquipamentoArmaduraResolver : IValueResolver<Equipamento, EquipamentoDto, ArmaduraDto?>
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ArmaduraDto? Resolve(Equipamento source, EquipamentoDto destination, ArmaduraDto? destMember, ResolutionContext context)
    {
        if (source.Descricao != "Armadura" || string.IsNullOrEmpty(source.EstadoJson))
            return null;

        return JsonSerializer.Deserialize<ArmaduraDto>(source.EstadoJson, _options);
    }
}

public class EquipamentoEscudoResolver : IValueResolver<Equipamento, EquipamentoDto, EscudoDto?>
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public EscudoDto? Resolve(Equipamento source, EquipamentoDto destination, EscudoDto? destMember, ResolutionContext context)
    {
        if (source.Descricao != "Escudo" || string.IsNullOrEmpty(source.EstadoJson))
            return null;

        return JsonSerializer.Deserialize<EscudoDto>(source.EstadoJson, _options);
    }
}

public class EquipamentoItemResolver : IValueResolver<Equipamento, EquipamentoDto, ItemDto?>
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ItemDto? Resolve(Equipamento source, EquipamentoDto destination, ItemDto? destMember, ResolutionContext context)
    {
        if (source.Descricao != "Item" || string.IsNullOrEmpty(source.EstadoJson))
            return null;

        return JsonSerializer.Deserialize<ItemDto>(source.EstadoJson, _options);
    }
}

public class EquipamentoJsonResolver : IValueResolver<EquipamentoDto, Equipamento, string>
{
    private static readonly JsonSerializerOptions _options = new()
    {
        WriteIndented = false
    };

    public string Resolve(EquipamentoDto source, Equipamento destination, string destMember, ResolutionContext context)
    {
        return source switch
        {
            { Arma: not null } => JsonSerializer.Serialize(source.Arma, _options),
            { Armadura: not null } => JsonSerializer.Serialize(source.Armadura, _options),
            { Escudo: not null } => JsonSerializer.Serialize(source.Escudo, _options),
            { Item: not null } => JsonSerializer.Serialize(source.Item, _options),
            _ => string.Empty
        };
    }
}