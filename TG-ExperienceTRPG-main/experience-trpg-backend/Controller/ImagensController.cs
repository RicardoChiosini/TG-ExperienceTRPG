using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using experience_trpg_backend.DTOs;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;

namespace experience_trpg_backend.Controllers
{
    [Route("api/imagens")]
    [ApiController]
    public class ImagensController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ImagensController> _logger;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _hostingEnvironment;

        public ImagensController(
            AppDbContext context,
            ILogger<ImagensController> logger,
            IMapper mapper,
            IWebHostEnvironment hostingEnvironment)
        {
            _context = context;
            _logger = logger;
            _mapper = mapper;
            _hostingEnvironment = hostingEnvironment;
        }

        // GET: api/imagens/mesa/5
        [HttpGet("mesa/{mesaId}")]
        public async Task<ActionResult<IEnumerable<ImagemDto>>> GetImagensPorMesa(int mesaId)
        {
            try
            {
                if (_context.Imagens == null)
                {
                    _logger.LogWarning("DbSet Imagens é nulo");
                    return Problem("Entity set 'AppDbContext.Imagens' is null.");
                }

                var imagens = await _context.Imagens
                    .Where(i => i.MesaId == mesaId)
                    .ToListAsync();

                // Inclui a lógica para mapear os dados corretamente
                return Ok(_mapper.Map<List<ImagemDto>>(imagens)); // O mapeamento deve incluir a ImageUrl
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar imagens");
                return StatusCode(500, "Erro interno ao buscar imagens");
            }
        }

        // GET: api/imagens/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ImagemDto>> GetImagem(int id)
        {
            try
            {
                if (_context.Imagens == null)
                {
                    return Problem("Entity set 'AppDbContext.Imagens' is null.");
                }

                var imagem = await _context.Imagens.FindAsync(id);
                if (imagem == null)
                {
                    return NotFound();
                }

                // Retornar o DTO com a URL
                return _mapper.Map<ImagemDto>(imagem);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao buscar imagem com ID {id}");
                return StatusCode(500, "Erro interno ao buscar imagem");
            }
        }

        // POST: api/imagens/upload
        [HttpPost("upload")]
        public async Task<ActionResult<ImagemDto>> UploadImagem([FromForm] IFormFile file, [FromForm] int mesaId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Nenhum arquivo enviado");

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest("Tamanho máximo excedido (5MB)");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(fileExtension))
                return BadRequest("Tipo de arquivo não suportado");

            try
            {
                // Define o caminho onde a imagem será salva
                var imagesDirectory = Path.Combine("wwwroot", "images");

                // Verifica se o diretório existe, se não existir, cria
                if (!Directory.Exists(imagesDirectory))
                {
                    Directory.CreateDirectory(imagesDirectory);
                }

                var filePath = Path.Combine(imagesDirectory, Guid.NewGuid() + fileExtension);

                // Salva a imagem no servidor
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var imagemDados = await System.IO.File.ReadAllBytesAsync(filePath);

                var imagem = new Imagem
                {
                    Nome = Path.GetFileNameWithoutExtension(file.FileName) ?? "sem-nome",
                    Extensao = fileExtension.Replace(".", "") ?? "jpg",
                    Dados = imagemDados,
                    MesaId = mesaId,
                    ImageUrl = $"{Request.Scheme}://{Request.Host}/images/{Path.GetFileName(filePath)}"
                };

                if (_context.Imagens == null)
                {
                    return Problem("Entity set 'AppDbContext.Imagens' is null.");
                }

                _context.Imagens.Add(imagem);
                await _context.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetImagem),
                    new { id = imagem.ImagemId },
                    _mapper.Map<ImagemDto>(imagem));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao fazer upload de imagem");
                return StatusCode(500, "Erro interno ao processar imagem");
            }
        }

        // DELETE: api/imagens/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteImagem(int id)
        {
            try
            {
                if (_context.Imagens == null)
                {
                    return Problem("Entity set 'AppDbContext.Imagens' is null.");
                }

                var imagem = await _context.Imagens.FindAsync(id);
                if (imagem == null)
                {
                    return NotFound();
                }

                // Remove as referências da imagem nas fichas relacionadas
                var fichas = await _context.Fichas.Where(f => f.ImagemId == id).ToListAsync();
                foreach (var ficha in fichas)
                {
                    ficha.ImagemId = null;
                }
                _context.Fichas.UpdateRange(fichas);

                // Primeiro remove do banco de dados
                _context.Imagens.Remove(imagem);
                await _context.SaveChangesAsync();

                // Depois tenta excluir o arquivo físico
                if (!string.IsNullOrEmpty(imagem.ImageUrl))
                {
                    try
                    {
                        // Extrai o caminho físico da URL
                        var filePath = GetPhysicalPathFromUrl(imagem.ImageUrl);

                        if (System.IO.File.Exists(filePath))
                        {
                            System.IO.File.Delete(filePath);
                            _logger.LogInformation($"Arquivo físico {filePath} excluído com sucesso.");
                        }
                    }
                    catch (Exception fileEx)
                    {
                        // Não falha a operação se não conseguir excluir o arquivo físico
                        _logger.LogError(fileEx, $"Erro ao excluir arquivo físico da imagem ID {id}");
                    }
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao deletar imagem com ID {id}");
                return StatusCode(500, "Erro interno ao deletar imagem");
            }
        }

        // Método auxiliar para converter URL em caminho físico
        private string GetPhysicalPathFromUrl(string url)
        {
            // Supondo que suas imagens estão em wwwroot/images
            var webRootPath = _hostingEnvironment.WebRootPath;

            // Extrai o nome do arquivo da URL
            var uri = new Uri(url);
            var fileName = Path.GetFileName(uri.LocalPath);

            // Combina com o caminho físico
            return Path.Combine(webRootPath, "images", fileName);
        }

        // PATCH: api/imagens/5
        [HttpPatch("{id}")]
        public async Task<ActionResult<ImagemDto>> UpdateImagem(int id, [FromBody] ImagemDto imagemDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                if (_context.Imagens == null)
                {
                    return Problem("Entity set 'AppDbContext.Imagens' is null.");
                }

                var imagem = await _context.Imagens.FindAsync(id);
                if (imagem == null)
                {
                    return NotFound();
                }

                // Atualiza apenas o nome se fornecido
                if (!string.IsNullOrWhiteSpace(imagemDto.Nome))
                {
                    imagem.Nome = imagemDto.Nome.Trim();
                }

                _context.Entry(imagem).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(_mapper.Map<ImagemDto>(imagem));
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (!ImagemExists(id))
                {
                    return NotFound();
                }
                _logger.LogError(ex, $"Erro de concorrência ao atualizar imagem ID {id}");
                return StatusCode(409, "Conflito na atualização da imagem");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao atualizar imagem ID {id}");
                return StatusCode(500, "Erro interno ao atualizar imagem");
            }
        }

        private bool ImagemExists(int id)
        {
            return (_context.Imagens?.Any(e => e.ImagemId == id)).GetValueOrDefault();
        }
    }
}