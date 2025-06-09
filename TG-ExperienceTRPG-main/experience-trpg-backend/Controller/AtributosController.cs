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
    [Route("api/atributos")]
    [ApiController]
    public class AtributosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AtributosController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/atributos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Atributo>>> GetAtributos()
        {
            return await _context.Atributos.ToListAsync();
        }

        // GET: api/atributos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Atributo>> GetAtributo(int id)
        {
            var atributo = await _context.Atributos.FindAsync(id);

            if (atributo == null)
            {
                return NotFound();
            }

            return atributo;
        }

        // POST: api/atributos
        [HttpPost]
        public async Task<ActionResult<Atributo>> PostAtributo(Atributo atributo)
        {
            _context.Atributos.Add(atributo);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAtributo), new { id = atributo.AtributoId }, atributo);
        }

        // PUT: api/atributos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAtributo(int id, AtributoDto atributoDto)
        {
            if (id != atributoDto.AtributoId)
            {
                return BadRequest();
            }

            var atributoAtual = await _context.Atributos.FindAsync(id);
            if (atributoAtual == null)
            {
                return NotFound();
            }

            // Mapeamento dos valores do DTO para a entidade
            atributoAtual.Valor = atributoDto.Valor;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Atributos.Any(e => e.AtributoId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }
    }
}
