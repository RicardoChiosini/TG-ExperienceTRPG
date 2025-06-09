using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/sistemas")]
    [ApiController]
    public class SistemasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SistemasController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/sistemas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Sistema>>> GetSistemas()
        {
            var sistemas = await _context.Sistemas.ToListAsync();
            return Ok(sistemas); // Retorna a lista de sistemas com status 200
        }

        // GET: api/sistemas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Sistema>> GetSistema(int id)
        {
            var sistema = await _context.Sistemas.FindAsync(id);

            if (sistema == null)
            {
                return NotFound(); // Retorna 404 se o sistema não for encontrado
            }

            return Ok(sistema); // Retorna o sistema encontrado com status 200
        }
    }
}
