using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/statususuarios")]
    [ApiController]
    public class StatusUsuarioController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StatusUsuarioController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/statususuarios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<StatusUsuario>>> GetStatusUsuarios()
        {
            return await _context.StatusUsuarios.ToListAsync();
        }

        // GET: api/statususuarios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<StatusUsuario>> GetStatusUsuario(int id)
        {
            var statusUsuario = await _context.StatusUsuarios.FindAsync(id);

            if (statusUsuario == null)
            {
                return NotFound();
            }

            return statusUsuario;
        }
    }
}