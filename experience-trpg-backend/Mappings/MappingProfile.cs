using AutoMapper;
using experience_trpg_backend.Models;
using experience_trpg_backend.DTOs;

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

        CreateMap<Usuario, UsuarioDto>();
        CreateMap<Ficha, FichaDto>();
    }
}
