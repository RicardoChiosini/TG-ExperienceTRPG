using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using experience_trpg_backend.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/habilidades")]
    [ApiController]
    public class HabilidadesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HabilidadesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/habilidades
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Habilidade>>> GetHabilidades()
        {
            return await _context.Habilidades.ToListAsync();
        }

        // GET: api/habilidades/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Habilidade>> GetHabilidade(int id)
        {
            var habilidade = await _context.Habilidades.FindAsync(id);

            if (habilidade == null)
            {
                return NotFound();
            }

            return habilidade;
        }

        // POST: api/habilidades
        [HttpPost]
        public async Task<ActionResult<Habilidade>> PostHabilidade(Habilidade habilidade)
        {
            _context.Habilidades.Add(habilidade);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetHabilidade), new { id = habilidade.HabilidadeId }, habilidade);
        }

        // PUT: api/habilidades/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutHabilidade(int id, HabilidadeDto habilidadeDto)
        {
            if (id != habilidadeDto.HabilidadeId)
            {
                return BadRequest();
            }

            var habilidadeAtual = await _context.Habilidades.FindAsync(id);
            if (habilidadeAtual == null)
            {
                return NotFound();
            }

            // Mapeamento dos valores do DTO para a entidade
            habilidadeAtual.Nome = habilidadeDto.Nome;
            habilidadeAtual.Descricao = habilidadeDto.Descricao;
            habilidadeAtual.FichaId = habilidadeDto.FichaId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Habilidades.Any(e => e.HabilidadeId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }
    }
}
