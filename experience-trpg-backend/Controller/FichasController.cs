using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using experience_trpg_backend.DTOs;
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
        private readonly ILogger<FichasController> _logger;

        public FichasController(IMapper mapper, AppDbContext context, ILogger<FichasController> logger)
        {
            _logger = logger;
            _context = context;
            _mapper = mapper;
        }

        // GET: api/fichas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ficha>>> GetFichas()
        {
            return await _context.Fichas.ToListAsync();
        }

        [HttpGet("{fichaId}")]
        public async Task<ActionResult<FichaDto>> GetFichaPorId(int fichaId)
        {
            // Configuração para evitar múltiplas queries de coleção
            _context.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;

            var ficha = await _context.Fichas
                .Include(f => f.Atributos)
                .Include(f => f.Proficiencias)
                .Include(f => f.Habilidades)
                .AsSplitQuery() // Evita cartesian explosion
                .Select(f => new
                {
                    Ficha = f,
                    Imagem = f.FicImagem // Carrega a imagem em uma única consulta
                })
                .FirstOrDefaultAsync(f => f.Ficha.FichaId == fichaId);

            if (ficha?.Ficha == null)
                return NotFound("Ficha não encontrada.");

            var fichaDto = new FichaDto
            {
                FichaId = ficha.Ficha.FichaId,
                Nome = ficha.Ficha.Nome ?? string.Empty,
                Descricao = ficha.Ficha.Descricao ?? string.Empty,
                SistemaId = ficha.Ficha.SistemaId,
                MesaId = ficha.Ficha.MesaId,
                ImagemId = ficha.Ficha.ImagemId,
                // Inclui a imagem diretamente no DTO se existir
                Imagem = ficha.Imagem != null ? new ImagemDto
                {
                    ImagemId = ficha.Imagem.ImagemId,
                    Nome = ficha.Imagem.Nome,
                    Extensao = ficha.Imagem.Extensao,
                    Dados = Convert.ToBase64String(ficha.Imagem.Dados),
                    ImageUrl = ficha.Imagem.ImageUrl,
                    MesaId = ficha.Imagem.MesaId
                } : null,
                Atributos = ficha.Ficha.Atributos.Select(attr => new AtributoDto
                {
                    AtributoId = attr.AtributoId,
                    Nome = attr.Nome,
                    Valor = attr.Valor,
                    FichaId = attr.FichaId
                }).ToList(),
                Proficiencias = ficha.Ficha.Proficiencias.Select(prof => new ProficienciaDto
                {
                    ProficienciaId = prof.ProficienciaId,
                    Nome = prof.Nome,
                    Proficiente = prof.Proficiente,
                    FichaId = prof.FichaId
                }).ToList(),
                Habilidades = ficha.Ficha.Habilidades.Select(hab => new HabilidadeDto
                {
                    HabilidadeId = hab.HabilidadeId,
                    Nome = hab.Nome,
                    Descricao = hab.Descricao,
                    FichaId = hab.FichaId
                }).ToList()
            };

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
                .Include(f => f.Proficiencias) // Inclui as proficiências
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
                Proficiencias = fichaPadrao.Proficiencias.Select(p => new Proficiencia { Nome = p.Nome, Proficiente = p.Proficiente }).ToList()
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
        [HttpPut("{fichaId}")]
        public async Task<IActionResult> UpdateFicha(int fichaId, FichaDto fichaDto)
        {
            var fichaExistente = await _context.Fichas
                .Include(f => f.Atributos)
                .Include(f => f.Proficiencias)
                .Include(f => f.Habilidades)
                .FirstOrDefaultAsync(f => f.FichaId == fichaId);

            if (fichaExistente == null)
            {
                return NotFound("Ficha não encontrada.");
            }

            // Atualizando as propriedades da ficha existente
            fichaExistente.Nome = fichaDto.Nome ?? fichaExistente.Nome; // Mantém o nome atual se não for fornecido
            fichaExistente.Descricao = fichaDto.Descricao ?? fichaExistente.Descricao; // Mesma lógica para a descrição

            // Atualização dos atributos
            foreach (var atributo in fichaDto.Atributos)
            {
                var existAttr = fichaExistente.Atributos.FirstOrDefault(a => a.Nome == atributo.Nome);
                if (existAttr != null)
                {
                    // Atualiza o valor do atributo existente
                    existAttr.Valor = atributo.Valor;
                }
                else
                {
                    // Cria e adiciona um novo atributo se não existir
                    fichaExistente.Atributos.Add(new Atributo
                    {
                        Nome = atributo.Nome,
                        Valor = atributo.Valor,
                        FichaId = fichaExistente.FichaId
                    });
                }
            }

            // Atualização das proficiências
            foreach (var proficiencia in fichaDto.Proficiencias)
            {
                var existProf = fichaExistente.Proficiencias.FirstOrDefault(p => p.Nome == proficiencia.Nome);
                if (existProf != null)
                {
                    // Atualiza o estado da proficiência existente
                    existProf.Proficiente = proficiencia.Proficiente; // Continue usando bool diretamente
                }
                else
                {
                    // Adiciona nova proficiência se não existir
                    fichaExistente.Proficiencias.Add(new Proficiencia
                    {
                        Nome = proficiencia.Nome,
                        Proficiente = proficiencia.Proficiente, // Usando o valor booleano diretamente
                        FichaId = fichaExistente.FichaId
                    });
                }
            }

            // Atualização das habilidades
            foreach (var habilidade in fichaDto.Habilidades)
            {
                var existHab = fichaExistente.Habilidades.FirstOrDefault(h => h.Nome == habilidade.Nome);
                if (existHab != null)
                {
                    // Atualiza a descrição da habilidade existente
                    existHab.Descricao = habilidade.Descricao;
                }
                else
                {
                    // Adiciona nova habilidade se não existir
                    fichaExistente.Habilidades.Add(new Habilidade
                    {
                        Nome = habilidade.Nome,
                        Descricao = habilidade.Descricao,
                        FichaId = fichaExistente.FichaId
                    });
                }
            }

            // Salva todas as mudanças
            await _context.SaveChangesAsync();

            return NoContent(); // Retorna NoContent se a atualização for bem-sucedida
        }

        [HttpGet("{fichaId}/mesaId")]
        public async Task<IActionResult> GetMesaIdByFichaId(int fichaId)
        {
            var ficha = await _context.Fichas.FindAsync(fichaId);

            if (ficha == null)
            {
                return NotFound(); // Retorna 404 se a ficha não for encontrada
            }

            return Ok(ficha.MesaId); // Retorna o MesaId da ficha
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

        // POST: api/fichas/{fichaId}/vincular/{imagemId}
        [HttpPost("{fichaId}/vincular/{imagemId}")]
        public async Task<ActionResult<FichaDto>> VincularImagemAFicha(int fichaId, int imagemId)
        {
            try
            {
                var ficha = await _context.Fichas
                    .Include(f => f.FicImagem)
                    .FirstOrDefaultAsync(f => f.FichaId == fichaId);

                if (ficha == null)
                    return NotFound($"Ficha com ID {fichaId} não encontrada");

                var imagem = await _context.Imagens
                    .FirstOrDefaultAsync(i => i.ImagemId == imagemId && i.MesaId == ficha.MesaId);

                if (imagem == null)
                    return NotFound($"Imagem com ID {imagemId} não encontrada ou não pertence à mesa da ficha");

                ficha.ImagemId = imagemId;
                await _context.SaveChangesAsync();

                // Carrega a imagem relacionada para incluir no retorno
                await _context.Entry(ficha).Reference(f => f.FicImagem).LoadAsync();

                return Ok(_mapper.Map<FichaDto>(ficha));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao vincular imagem {imagemId} à ficha {fichaId}");
                return StatusCode(500, "Erro interno ao processar a requisição");
            }
        }

        // DELETE: api/fichas/{fichaId}/remover-imagem
        [HttpDelete("{fichaId}/remover-imagem")]
        public async Task<ActionResult<FichaDto>> RemoverImagemDaFicha(int fichaId)
        {
            try
            {
                var ficha = await _context.Fichas.FindAsync(fichaId);
                if (ficha == null)
                    return NotFound($"Ficha com ID {fichaId} não encontrada");

                ficha.ImagemId = null;
                await _context.SaveChangesAsync();

                return Ok(_mapper.Map<FichaDto>(ficha));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao remover imagem da ficha {fichaId}");
                return StatusCode(500, "Erro interno ao processar a requisição");
            }
        }

        // GET: api/fichas/{fichaId}/imagem
        [HttpGet("{fichaId}/imagem")]
        public async Task<ActionResult<ImagemDto>> GetImagemDaFicha(int fichaId)
        {
            try
            {
                var ficha = await _context.Fichas
                    .Include(f => f.FicImagem)
                    .FirstOrDefaultAsync(f => f.FichaId == fichaId);

                if (ficha?.FicImagem == null)
                    return NotFound("Ficha não possui imagem vinculada");

                return Ok(_mapper.Map<ImagemDto>(ficha.FicImagem));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao obter imagem da ficha {fichaId}");
                return StatusCode(500, "Erro interno ao processar a requisição");
            }
        }
    }
}

