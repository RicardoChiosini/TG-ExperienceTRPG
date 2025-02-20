using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsuarioFichasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsuarioFichasController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/usuariofichas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UsuarioFicha>>> GetUsuarioFichas()
        {
            return await _context.UsuarioFichas.ToListAsync();
        }

        // GET: api/usuariofichas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UsuarioFicha>> GetUsuarioFicha(int id)
        {
            var usuarioFicha = await _context.UsuarioFichas.FindAsync(id);

            if (usuarioFicha == null)
            {
                return NotFound();
            }

            return usuarioFicha;
        }

        // POST: api/usuariofichas
        [HttpPost]
        public async Task<ActionResult<UsuarioFicha>> PostUsuarioFicha(UsuarioFicha usuarioFicha)
        {
            _context.UsuarioFichas.Add(usuarioFicha);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUsuarioFicha), new { id = usuarioFicha.UsuarioId }, usuarioFicha);
        }

        // DELETE: api/usuariofichas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsuarioFicha(int id)
        {
            var usuarioFicha = await _context.UsuarioFichas.FindAsync(id);
            if (usuarioFicha == null)
            {
                return NotFound();
            }

            _context.UsuarioFichas.Remove(usuarioFicha);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UsuarioFichaExists(int usuarioId, int fichaId)
        {
            return _context.UsuarioFichas.Any(e => e.UsuarioId == usuarioId && e.FichaId == fichaId);
        }
    }
}

