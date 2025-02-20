using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using Google.Protobuf.WellKnownTypes;
using AutoMapper;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/fichas")]
    [ApiController]
    public class FichasController : ControllerBase
    {
        private readonly IMapper _mapper;
        private readonly AppDbContext _context;

        public FichasController(IMapper mapper, AppDbContext context)
        {
            _mapper = mapper;
            _context = context;
        }

        // GET: api/fichas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ficha>>> GetFichas()
        {
            return await _context.Fichas.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FichaDto>> GetFicha(int id)
        {
            var ficha = await _context.Fichas
                .FirstOrDefaultAsync(f => f.FichaId == id);

            if (ficha == null)
            {
                return NotFound();
            }

            var fichaDto = _mapper.Map<FichaDto>(ficha);
            return Ok(fichaDto);
        }

        [HttpGet("{mesaId}/fichas")]
        public async Task<ActionResult<IEnumerable<FichaDto>>> GetFichasPorMesa(int mesaId)
        {
            var fichas = await _context.Fichas
                .Where(f => f.MesaId == mesaId)
                .Select(f => new FichaDto
                {
                    FichaId = f.FichaId,
                    Nome = f.Nome,
                    Descricao = f.Descricao,
                    SistemaId = f.SistemaId,
                    MesaId = f.MesaId
                })
                .ToListAsync();

            if (fichas == null || !fichas.Any())
            {
                return NotFound();
            }

            return Ok(fichas);
        }

        // POST: api/fichas
        [HttpPost]
        public async Task<ActionResult<Ficha>> PostFicha(Ficha ficha)
        {
            _context.Fichas.Add(ficha);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetFicha", new { id = ficha.FichaId }, ficha);
        }

        [HttpPost("criarficha/{mesaId}")]
        public async Task<ActionResult<FichaDto>> CriarFicha(int mesaId)
        {
            // Obtém a mesa para verificar o SistemaId
            var mesa = await _context.Mesas.FindAsync(mesaId);
            if (mesa == null)
            {
                return NotFound("Mesa não encontrada.");
            }

            int sistemaId = mesa.SistemaId;

            // Busca a ficha padrão para o sistema com MesaId como null
            var fichaPadrao = await _context.Fichas
                .Include(f => f.Atributos) // Inclui os atributos
                .Include(f => f.Habilidades) // Inclui as habilidades
                .FirstOrDefaultAsync(f => f.SistemaId == sistemaId && f.MesaId == null);

            if (fichaPadrao == null)
            {
                return NotFound("Ficha padrão não encontrada para o sistema especificado.");
            }

            // Cria uma nova ficha baseada na ficha padrão
            var novaFicha = new Ficha
            {
                Nome = fichaPadrao.Nome,
                Descricao = fichaPadrao.Descricao,
                SistemaId = sistemaId,
                MesaId = mesaId,
                Atributos = fichaPadrao.Atributos.Select(a => new Atributo { Nome = a.Nome, Valor = a.Valor }).ToList(),
                Habilidades = fichaPadrao.Habilidades.Select(h => new Habilidade { Nome = h.Nome, Descricao = h.Descricao }).ToList(),
            };

            // Adiciona a nova ficha ao contexto
            _context.Fichas.Add(novaFicha);
            await _context.SaveChangesAsync();

            // Mapeia a entidade Ficha para FichaDto
            var fichaDto = new FichaDto
            {
                FichaId = novaFicha.FichaId,
                Nome = novaFicha.Nome,
                Descricao = novaFicha.Descricao,
                SistemaId = novaFicha.SistemaId,
                MesaId = novaFicha.MesaId
            };

            return CreatedAtAction(nameof(GetFichasPorMesa), new { mesaId = fichaDto.MesaId }, fichaDto);
        }

        // PUT: api/fichas/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutFicha(int id, Ficha ficha)
        {
            if (id != ficha.FichaId)
            {
                return BadRequest();
            }

            _context.Entry(ficha).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!FichaExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/fichas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFicha(int id)
        {
            var ficha = await _context.Fichas.FindAsync(id);
            if (ficha == null)
            {
                return NotFound();
            }

            _context.Fichas.Remove(ficha);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool FichaExists(int id)
        {
            return _context.Fichas.Any(e => e.FichaId == id);
        }
    }
}

