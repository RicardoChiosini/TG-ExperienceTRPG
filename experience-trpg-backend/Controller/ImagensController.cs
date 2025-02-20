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
    public class ImagensController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ImagensController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/imagens
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Imagem>>> GetImagens()
        {
            return await _context.Imagens.ToListAsync();
        }

        // GET: api/imagens/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Imagem>> GetImagem(int id)
        {
            var imagem = await _context.Imagens.FindAsync(id);

            if (imagem == null)
            {
                return NotFound();
            }

            return imagem;
        }

        // POST: api/imagens
        [HttpPost]
        public async Task<ActionResult<Imagem>> PostImagem(Imagem imagem)
        {
            _context.Imagens.Add(imagem);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetImagem), new { id = imagem.ImagemId }, imagem);
        }

        // PUT: api/imagens/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutImagem(int id, Imagem imagem)
        {
            if (id != imagem.ImagemId)
            {
                return BadRequest();
            }

            _context.Entry(imagem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Imagens.Any(e => e.ImagemId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/imagens/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteImagem(int id)
        {
            var imagem = await _context.Imagens.FindAsync(id);
            if (imagem == null)
            {
                return NotFound();
            }

            _context.Imagens.Remove(imagem);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
