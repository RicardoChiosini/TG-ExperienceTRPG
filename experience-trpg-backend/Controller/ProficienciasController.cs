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
    [Route("api/proficiencias")]
    [ApiController]
    public class ProficienciasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProficienciasController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/proficiencias
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Proficiencia>>> GetProficiencias()
        {
            return await _context.Proficiencias.ToListAsync();
        }

        // GET: api/proficiencias/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Proficiencia>> GetProficiencia(int id)
        {
            var proficiencia = await _context.Proficiencias.FindAsync(id);

            if (proficiencia == null)
            {
                return NotFound();
            }

            return proficiencia;
        }

        // POST: api/proficiencias
        [HttpPost]
        public async Task<ActionResult<Proficiencia>> PostProficiencia(Proficiencia proficiencia)
        {
            _context.Proficiencias.Add(proficiencia);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProficiencia), new { id = proficiencia.ProficienciaId }, proficiencia);
        }

        // PUT: api/proficiencias/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProficiencia(int id, ProficienciaDto proficienciaDto)
        {
            if (id != proficienciaDto.ProficienciaId)
            {
                return BadRequest();
            }

            var proficienciaAtual = await _context.Proficiencias.FindAsync(id);
            if (proficienciaAtual == null)
            {
                return NotFound();
            }

            // Mapeamento dos valores do DTO para a entidade
            proficienciaAtual.Nome = proficienciaDto.Nome;
            proficienciaAtual.Proficiente = proficienciaDto.Proficiente;
            proficienciaAtual.FichaId = proficienciaDto.FichaId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Proficiencias.Any(e => e.ProficienciaId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }
    }
}
