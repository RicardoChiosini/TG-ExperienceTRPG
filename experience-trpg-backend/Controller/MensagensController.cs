using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using experience_trpg_backend.Dtos;

namespace experience_trpg_backend.Controllers
{
    [Route("api/mensagens")]
    [ApiController]
    public class MensagensController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MensagensController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("mesa/{mesaId}")]
        public async Task<ActionResult<IEnumerable<MensagemDto>>> GetMensagensPorMesa(int mesaId)
        {
            var mensagens = await _context.Mensagens
                .Where(m => m.MesaId == mesaId)
                .Include(m => m.MenUsuario)
                .OrderByDescending(m => m.DataHora)
                .Take(50)
                .Select(m => new MensagemDto
                {
                    MensagemId = m.MensagemId,
                    Texto = m.Texto,
                    DataHora = m.DataHora,
                    UsuarioNome = m.MenUsuario != null ? m.MenUsuario.Nome : "Usuário desconhecido",
                    UsuarioId = m.UsuarioId,
                    MesaId = m.MesaId,
                    TipoMensagem = m.TipoMensagem,
                    DadosFormatados = m.DadosFormatados
                })
                .ToListAsync();

            return Ok(mensagens.OrderBy(m => m.DataHora));
        }
    }
}