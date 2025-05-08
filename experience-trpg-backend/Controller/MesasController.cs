using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models; // Ajuste conforme sua estrutura de projeto
using experience_trpg_backend.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Data.Common; // Adicione isso para usar Claims
using AutoMapper;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/mesas")]
    [ApiController]
    public class MesasController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public MesasController(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // Método para obter uma mesa específica
        [HttpGet("{id}")]
        public async Task<ActionResult<MesaDto>> GetMesa(int id)
        {
            var mesa = await _context.Mesas
                .Include(m => m.Participantes)
                    .ThenInclude(up => up.UMUsuario)
                .Include(m => m.MesCriador)
                .Include(m => m.MesSistema)
                .FirstOrDefaultAsync(m => m.MesaId == id);

            if (mesa == null)
            {
                return NotFound();
            }

            // Mapeamento manual ou usando AutoMapper para evitar ciclos
            var mesaDto = new MesaDto
            {
                MesaId = mesa.MesaId,
                Nome = mesa.Nome,
                Descricao = mesa.Descricao,
                DataCriacao = mesa.DataCriacao,
                CriadorId = mesa.CriadorId,
                MesCriador = new UsuarioDto
                {
                    UsuarioId = mesa.MesCriador.UsuarioId,
                    Nome = mesa.MesCriador.Nome
                },
                Participantes = mesa.Participantes.Select(p => new UsuarioDto
                {
                    UsuarioId = p.UMUsuario.UsuarioId,
                    Nome = p.UMUsuario.Nome
                }).ToList()
            };

            return Ok(mesaDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMesa(int id, [FromBody] MesaDto mesaDto)
        {
            if (id != mesaDto.MesaId)
            {
                return BadRequest("ID mismatch."); // Retorna erro se os IDs não coincidirem
            }

            // Mapeia o DTO para a entidade Mesa
            var mesa = _mapper.Map<Mesa>(mesaDto);

            _context.Entry(mesa).State = EntityState.Modified; // Marca a entidade como modificada

            try
            {
                await _context.SaveChangesAsync(); // Tenta salvar as mudanças
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MesaExists(id))
                {
                    return NotFound(); // Retorna 404 se a mesa não existir
                }
                else
                {
                    throw; // Propaga a exceção
                }
            }

            return NoContent(); // Retorna 204 No Content após sucesso
        }

        [HttpGet("{mesaId}/criador")]
        public async Task<ActionResult<Usuario>> GetCriadorDaMesa(int mesaId)
        {
            var mesa = await _context.Mesas
                .Include(m => m.MesCriador) // Inclui o criador
                .FirstOrDefaultAsync(m => m.MesaId == mesaId);

            if (mesa == null)
            {
                return NotFound();
            }

            return Ok(mesa.MesCriador);
        }

        [HttpGet("{mesaId}/participantes")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetParticipantesDaMesa(int mesaId)
        {
            var mesa = await _context.Mesas
                .Include(m => m.Participantes)
                    .ThenInclude(um => um.UMUsuario) // Inclui os usuários dos participantes
                .FirstOrDefaultAsync(m => m.MesaId == mesaId);

            if (mesa == null)
            {
                return NotFound();
            }

            var participantes = mesa.Participantes.Select(p => p.UMUsuario).ToList();
            return Ok(participantes);
        }

        // GET: api/mesas/usuario/{usuarioId}
        [HttpGet("usuario/{usuarioId}")]
        public async Task<ActionResult<IEnumerable<MesaDto>>> GetMesasPorUsuario(int usuarioId)
        {
            var mesas = await _context.Mesas
                .Where(m => m.CriadorId == usuarioId || m.Participantes.Any(p => p.UsuarioId == usuarioId))
                .Include(m => m.MesCriador)
                .Include(m => m.Participantes)
                    .ThenInclude(um => um.UMUsuario) // Acessa o usuário através de UsuarioMesa
                .ToListAsync();

            var mesasDto = mesas.Select(mesa => new MesaDto
            {
                MesaId = mesa.MesaId,
                Nome = mesa.Nome,
                DataCriacao = mesa.DataCriacao,
                Participantes = mesa.Participantes.Select(p => new UsuarioDto
                {
                    UsuarioId = p.UMUsuario.UsuarioId,
                    Nome = p.UMUsuario.Nome
                }).ToList(), // Mapeia todos os participantes
                MesCriador = new UsuarioDto
                {
                    UsuarioId = mesa.MesCriador.UsuarioId,
                    Nome = mesa.MesCriador.Nome
                }
            }).ToList();

            return Ok(mesasDto);
        }

        [HttpPost("acessar/{mesaId}")]
        public async Task<IActionResult> AcessarMesa(int mesaId)
        {
            // Obtendo o ID do usuário logado
            int usuarioId = GetCurrentUserId(); // Método que você já possui para obter o ID do usuário logado

            // Verifique se a mesa existe
            var mesa = await _context.Mesas
                .Include(m => m.MesCriador) // Inclui o criador
                .Include(m => m.Participantes) // Inclui participantes
                    .ThenInclude(pm => pm.UMUsuario) // Inclui os usuários de cada participante
                .FirstOrDefaultAsync(m => m.MesaId == mesaId);

            if (mesa == null)
            {
                return NotFound("Mesa não encontrada.");
            }

            // Verificar se o usuário é o criador ou um participante
            bool isCriador = mesa.CriadorId == usuarioId;
            bool isParticipante = mesa.Participantes.Any(p => p.UsuarioId == usuarioId);

            if (isCriador)
            {
                return Ok(new { message = "Você acessou a mesa como criador.", mesa });
            }
            else if (isParticipante)
            {
                return Ok(new { message = "Você acessou a mesa como participante.", mesa });
            }
            else
            {
                return Forbid("Você não tem permissão para acessar esta mesa."); // Caso o usuário não seja nem criador nem participante
            }
        }

        // Método para criar nova mesa
        [HttpPost]
        public async Task<ActionResult<MesaDto>> CreateMesa([FromBody] MesaDto mesaDto)
        {
            // Validação dos campos obrigatórios
            if (string.IsNullOrWhiteSpace(mesaDto.Nome))
            {
                return BadRequest("O nome da mesa é obrigatório.");
            }
            if (string.IsNullOrWhiteSpace(mesaDto.Descricao))
            {
                return BadRequest("A descrição da mesa é obrigatória.");
            }

            try
            {
                // Mapeia o DTO para a entidade Mesa
                var mesa = _mapper.Map<Mesa>(mesaDto);
                mesa.DataCriacao = DateTime.UtcNow; // Define a data de criação
                mesa.Convite = Guid.NewGuid().ToString();
                // Aqui, obtemos o CriadorId diretamente do DTO
                int criadorId = mesaDto.CriadorId;

                // Adiciona a mesa ao contexto
                _context.Mesas.Add(mesa);
                await _context.SaveChangesAsync(); // Salva a mesa criada e gera o MesaId

                // Cria o mapa inicial para a mesa
                var mapaInicial = new Mapa
                {
                    MesaId = mesa.MesaId,
                    Nome = "Mapa Principal",
                    Largura = 30,
                    Altura = 30,
                    TamanhoHex = 40,
                    EstadoJson = "{}", // Estado inicial vazio ou com configuração padrão
                    UltimaAtualizacao = DateTime.UtcNow
                };

                _context.Mapas.Add(mapaInicial);

                // Adiciona o usuário à tabela UsuarioMesas
                var usuarioMesa = new UsuarioMesa
                {
                    UsuarioId = criadorId, // Usa o CriadorId que foi enviado do frontend
                    MesaId = mesa.MesaId
                };

                _context.UsuarioMesas.Add(usuarioMesa); // Adiciona a relação à tabela
                await _context.SaveChangesAsync(); // Salva as alterações

                // Mapeia a mesa criada de volta para o DTO para a resposta
                var mesaDtoResult = _mapper.Map<MesaDto>(mesa);
                return CreatedAtAction(nameof(GetMesa), new { id = mesaDtoResult.MesaId }, mesaDtoResult);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(); // Retornar 401 se o usuário não estiver autenticado
            }
            catch (DbUpdateException dbEx)
            {
                return StatusCode(500, $"Erro ao criar mesa no banco de dados: {dbEx.Message}");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erro inesperado ao criar mesa: {ex.Message}");
            }
        }

        [HttpDelete("expulsar-participante")]
        public async Task<IActionResult> ExpulsarParticipante([FromBody] ExpulsarParticipanteRequest request)
        {
            var mesa = await _context.Mesas
                .Include(m => m.Participantes)
                .FirstOrDefaultAsync(m => m.MesaId == request.MesaId);

            if (mesa == null)
            {
                return NotFound("Mesa não encontrada.");
            }

            var participante = mesa.Participantes.FirstOrDefault(p => p.UsuarioId == request.UsuarioId);
            if (participante == null)
            {
                return NotFound("Participante não encontrado.");
            }

            mesa.Participantes.Remove(participante);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Método para sair da mesa (comparar com a lógica de jogadores)
        [HttpPost("sair")]
        public async Task<IActionResult> LeaveMesa([FromBody] LeaveMesaRequest request)
        {
            // Implementar a lógica para sair da mesa 
            var usuarioMesa = await _context.UsuarioMesas
                .FirstOrDefaultAsync(um => um.UsuarioId == request.UsuarioId && um.MesaId == request.MesaId);

            if (usuarioMesa == null)
            {
                return NotFound("Usuário não está na mesa.");
            }

            _context.UsuarioMesas.Remove(usuarioMesa);
            await _context.SaveChangesAsync();

            return NoContent(); // Retorna 204 No Content após sucesso
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMesa(int id)
        {
            // Configura um timeout maior para esta operação
            _context.Database.SetCommandTimeout(300); // 300 segundos = 5 minutos

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Remove todas as relações muitos-para-muitos (participantes)
                await _context.UsuarioMesas
                    .Where(um => um.MesaId == id)
                    .ExecuteDeleteAsync();

                // 2. Obtém todos os IDs de fichas relacionadas a esta mesa
                var fichaIds = await _context.Fichas
                    .Where(f => f.MesaId == id)
                    .Select(f => f.FichaId)
                    .ToListAsync();

                if (fichaIds.Any())
                {
                    // 3. Remove todas as relações muitos-para-muitos das fichas
                    await _context.UsuarioFichas
                        .Where(uf => fichaIds.Contains(uf.FichaId))
                        .ExecuteDeleteAsync();

                    // 4. Remove todos os atributos das fichas
                    await _context.Atributos
                        .Where(a => fichaIds.Contains(a.FichaId))
                        .ExecuteDeleteAsync();

                    // 5. Remove todas as habilidades das fichas
                    await _context.Habilidades
                        .Where(h => fichaIds.Contains(h.FichaId))
                        .ExecuteDeleteAsync();

                    // 6. Remove todas as proficiencias das fichas
                    await _context.Proficiencias
                        .Where(p => fichaIds.Contains(p.FichaId))
                        .ExecuteDeleteAsync();

                    // 7. Remove todos os equipamentos das fichas
                    await _context.Equipamentos
                        .Where(e => fichaIds.Contains(e.FichaId))
                        .ExecuteDeleteAsync();

                    // 8. Remove todas as fichas
                    await _context.Fichas
                        .Where(f => fichaIds.Contains(f.FichaId))
                        .ExecuteDeleteAsync();
                }

                // 9. Remove todas as imagens da mesa
                await _context.Imagens
                    .Where(i => i.MesaId == id)
                    .ExecuteDeleteAsync();

                // 10. Remove todas as mensagens da mesa
                await _context.Mensagens
                    .Where(m => m.MesaId == id)
                    .ExecuteDeleteAsync();

                // 11. Finalmente, remove a mesa
                await _context.Mesas
                    .Where(m => m.MesaId == id)
                    .ExecuteDeleteAsync();

                await transaction.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Erro ao deletar mesa: {ex.Message}");
            }
        }

        [HttpGet("{mesaId}/convite")]
        public async Task<ActionResult<string>> GetConvitePorMesaId(int mesaId)
        {
            var mesa = await _context.Mesas
                .FirstOrDefaultAsync(m => m.MesaId == mesaId);

            if (mesa == null)
            {
                return NotFound("Mesa não encontrada.");
            }

            if (string.IsNullOrEmpty(mesa.Convite))
            {
                return NotFound("Convite não encontrado.");
            }

            return Ok(mesa.Convite);
        }

        // Endpoint para participar de uma mesa usando um token de convite
        [HttpPost("{mesaId}/convites/{token}/participar")]
        public async Task<IActionResult> ParticiparDaMesa(int mesaId, string token, [FromBody] ParticiparMesaRequest request)
        {
            // Verifica se o usuário existe
            var usuario = await _context.Usuarios.FindAsync(request.UsuarioId);
            if (usuario == null)
            {
                return NotFound("Usuário não encontrado.");
            }

            // Verifica se a mesa existe
            var mesa = await _context.Mesas
                .FirstOrDefaultAsync(m => m.MesaId == mesaId);

            if (mesa == null)
            {
                return NotFound("Mesa não encontrada.");
            }

            // Verifica se o token de convite é válido
            if (mesa.Convite != token)
            {
                return BadRequest("Token de convite inválido.");
            }

            // Verifica se o usuário já é participante da mesa
            var jaParticipante = await _context.UsuarioMesas
                .AnyAsync(um => um.UsuarioId == request.UsuarioId && um.MesaId == mesaId);

            if (jaParticipante)
            {
                return BadRequest("Você já é participante desta mesa.");
            }

            // Adiciona o usuário à mesa
            var usuarioMesa = new UsuarioMesa
            {
                UsuarioId = request.UsuarioId,
                MesaId = mesaId
            };

            _context.UsuarioMesas.Add(usuarioMesa);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Você agora é participante da mesa!" });
        }
        

        private int GetCurrentUserId()
        {
            // Verifica se o usuário está autenticado
            if (!User.Identity.IsAuthenticated)
            {
                throw new UnauthorizedAccessException("Usuário não autenticado."); // Lança uma exceção se não estiver autenticado
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new InvalidOperationException("A claim de identificação do usuário não pode ser nula.");
            }

            return int.Parse(userIdClaim); // Retorna o ID do usuário
        }

        private bool MesaExists(int id)
        {
            return _context.Mesas.Any(e => e.MesaId == id);
        }
    }
    // Modelo para a requisição de participar da mesa
    public class ParticiparMesaRequest
    {
        public int UsuarioId { get; set; }
    }
}
