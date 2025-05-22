using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using Microsoft.AspNetCore.SignalR;
using experience_trpg_backend.DTOs;
using experience_trpg_backend.Hubs;
using AutoMapper;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/map")]
    [ApiController]
    public class MapController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<SessaoHub> _hubContext;
        private readonly IMapper _mapper;
        private readonly ILogger<MapController> _logger;

        public MapController(
            AppDbContext context,
            IHubContext<SessaoHub> hubContext,
            IMapper mapper,
            ILogger<MapController> logger)
        {
            _mapper = mapper;
            _hubContext = hubContext;
            _context = context;
            _logger = logger;
        }

        [HttpGet("{mesaId}/mapa/recente")]
        public async Task<ActionResult<MapaDto>> GetMapaMaisRecentePorMesa(int mesaId)
        {
            try
            {
                var mapa = await _context.Mapas
                    .Where(m => m.MesaId == mesaId)
                    .OrderByDescending(m => m.UltimaAtualizacao)
                    .FirstOrDefaultAsync();

                if (mapa == null)
                {
                    return NotFound(new { Message = "Nenhum mapa encontrado para esta mesa" });
                }

                // Garante que o estadoJson não seja nulo
                mapa.EstadoJson ??= "{}";

                return Ok(_mapper.Map<MapaDto>(mapa));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar mapa mais recente");
                return StatusCode(500, new { Message = "Erro interno ao processar a requisição" });
            }
        }

        [HttpPut("{mapaId}/estado")]
        public async Task<IActionResult> SalvarEstadoMapa(int mapaId, [FromBody] MapaEstadoDto estado)
        {
            // Validação adicional para URLs de imagem
            if (estado.Tokens != null)
            {
                foreach (var token in estado.Tokens)
                {
                    if (!Uri.IsWellFormedUriString(token.ImagemDados, UriKind.Absolute) &&
                        !token.ImagemDados.StartsWith("data:image/"))
                    {
                        return BadRequest(new { Message = $"Token {token.Id} possui URL de imagem inválida" });
                    }
                }
            }
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var mapa = await _context.Mapas
                    .FirstOrDefaultAsync(m => m.MapaId == mapaId);

                if (mapa == null)
                {
                    return NotFound(new { Message = "Mapa não encontrado" });
                }

                // Validação básica dos tokens
                if (estado.Tokens != null)
                {
                    foreach (var token in estado.Tokens)
                    {
                        if (string.IsNullOrWhiteSpace(token.ImagemDados))
                        {
                            return BadRequest(new { Message = "Token sem dados de imagem" });
                        }
                    }
                }

                mapa.EstadoJson = JsonSerializer.Serialize(estado);
                mapa.UltimaAtualizacao = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Notificação via SignalR (mantém mesaId apenas para o grupo)
                var minimalState = new
                {
                    Tokens = estado.Tokens?.Select(t => new { t.Id, t.X, t.Y }),
                    Camadas = estado.Camadas?.Select(c => new { c.Id, c.Visivel }),
                    Configuracoes = estado.Configuracoes
                };

                await _hubContext.Clients.Group(mapa.MesaId.ToString())
                    .SendAsync("ReceiveMapUpdate", mapaId, JsonSerializer.Serialize(minimalState));

                return Ok(new { Message = "Estado do mapa salvo com sucesso" });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Erro ao salvar estado do mapa");
                return StatusCode(500, new { Message = "Erro ao salvar no banco de dados" });
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Erro na serialização do estado");
                return BadRequest(new { Message = "Formato de estado inválido" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao salvar estado");
                return StatusCode(500, new { Message = "Erro interno no servidor" });
            }
        }

        [HttpPut("mapa/{mapaId}/config")]
        public async Task<IActionResult> SalvarConfigMapa(int mapaId, [FromBody] MapaConfigDto config)
        {
            var mapa = await _context.Mapas
                .FirstOrDefaultAsync(m => m.MapaId == mapaId);

            if (mapa == null)
            {
                return NotFound($"Mapa com ID {mapaId} não encontrado");
            }

            // Atualiza TODAS as propriedades
            mapa.Nome = config.Nome;
            mapa.Largura = config.Largura;
            mapa.Altura = config.Altura;
            mapa.TamanhoHex = config.TamanhoHex;
            mapa.UltimaAtualizacao = DateTime.UtcNow;

            // Se está marcando como visível, atualiza os outros mapas
            if (config.Visivel)
            {
                var outrosMapas = await _context.Mapas
                    .Where(m => m.MapaId != mapaId && m.MesaId == mapa.MesaId)
                    .ToListAsync();

                foreach (var outroMapa in outrosMapas)
                {
                    outroMapa.Visivel = false;
                }
            }

            mapa.Visivel = config.Visivel;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(mapa);
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, $"Erro ao salvar configurações: {ex.InnerException?.Message}");
            }
        }

        [HttpGet("{mesaId}/mapa/{mapaId}/tokens")]
        public async Task<ActionResult<MapaEstadoDto>> GetTokensDoMapa(int mesaId, int mapaId)
        {
            try
            {
                var mapa = await _context.Mapas
                    .FirstOrDefaultAsync(m => m.MesaId == mesaId && m.MapaId == mapaId);

                if (mapa == null)
                {
                    return NotFound("Mapa não encontrado");
                }

                // Se não houver estado, retorna um estado vazio
                if (string.IsNullOrEmpty(mapa.EstadoJson))
                {
                    return Ok(new MapaEstadoDto
                    {
                        Tokens = new List<TokenDto>(),
                        Camadas = new List<CamadaDto>(),
                        Objetos = new List<ObjetoDeMapaDto>(),
                        Configuracoes = new ConfiguracaoMapaDto()
                    });
                }

                var estado = JsonSerializer.Deserialize<MapaEstadoDto>(mapa.EstadoJson);

                // Garante que as configurações não sejam nulas
                estado.Configuracoes ??= new ConfiguracaoMapaDto();

                // Filtra tokens e verifica URLs
                if (estado.Tokens != null)
                {
                    estado.Tokens = estado.Tokens
                        .Where(t => t.VisivelParaTodos &&
                                   (t.ImagemDados.StartsWith("http") ||
                                    t.ImagemDados.StartsWith("data:image")))
                        .ToList();
                }

                return Ok(estado);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar tokens do mapa");
                return StatusCode(500, new { Message = "Erro interno ao buscar tokens" });
            }
        }

        [HttpGet("{mesaId}/mapas")]
        public async Task<ActionResult<List<MapaDto>>> GetTodosMapasPorMesa(int mesaId)
        {
            var mapas = await _context.Mapas
                .Where(m => m.MesaId == mesaId)
                .OrderByDescending(m => m.UltimaAtualizacao)
                .ToListAsync();

            return Ok(_mapper.Map<List<MapaDto>>(mapas));
        }

        [HttpGet("{mesaId}/mapa/atual")]
        public async Task<ActionResult<MapaDto>> GetMapaAtual(int mesaId)
        {
            var mapa = await _context.Mapas
                .Where(m => m.MesaId == mesaId && m.Visivel)
                .FirstOrDefaultAsync();

            return mapa == null ? NotFound() : Ok(_mapper.Map<MapaDto>(mapa));
        }

        [HttpPost("{mesaId}/mapa")]
        public async Task<ActionResult<MapaDto>> CriarMapa(int mesaId, [FromBody] MapaDto mapaDto)
        {
            var mapa = _mapper.Map<Mapa>(mapaDto);
            mapa.MesaId = mesaId;
            mapa.UltimaAtualizacao = DateTime.UtcNow;
            mapa.Visivel = false; // Novo mapa não é visível por padrão

            _context.Mapas.Add(mapa);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMapaAtual), new { mesaId }, _mapper.Map<MapaDto>(mapa));
        }

        [HttpPut("{mesaId}/mapa/{mapaId}/visibilidade")]
        public async Task<IActionResult> AtualizarVisibilidadeMapa(int mesaId, int mapaId, [FromBody] bool visivel)
        {
            // Primeiro desmarca todos os mapas como visíveis
            if (visivel)
            {
                var mapas = await _context.Mapas.Where(m => m.MesaId == mesaId).ToListAsync();
                foreach (var m in mapas)
                {
                    m.Visivel = false;
                }
            }

            var mapa = await _context.Mapas.FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);
            if (mapa == null)
            {
                return NotFound();
            }

            mapa.Visivel = visivel;
            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group(mesaId.ToString())
                .SendAsync("ReceiveCurrentMap", mapaId);

            return Ok();
        }

        [HttpGet("{mesaId}/mapa/{mapaId}")]
        public async Task<ActionResult<MapaDto>> GetMapaPorId(int mesaId, int mapaId)
        {
            var mapa = await _context.Mapas.FindAsync(mapaId);
            if (mapa == null)
            {
                return NotFound(); // Retornar caso o mapa não exista
            }

            // Inicializa estadoJson se estiver nulo
            if (string.IsNullOrWhiteSpace(mapa.EstadoJson))
            {
                mapa.EstadoJson = "{}"; // Inicializa com um objeto JSON vazio
            }

            return Ok(_mapper.Map<MapaDto>(mapa));
        }
    }
}
