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
    [Route("api/mapa")]
    [ApiController]
    public class MapController : ControllerBase
    {

        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        private readonly AppDbContext _context;
        private readonly IHubContext<MapaHub> _hubContext;
        private readonly IMapper _mapper;
        private readonly ILogger<MapController> _logger;

        public MapController(
            AppDbContext context,
            IHubContext<MapaHub> hubContext,
            IMapper mapper,
            ILogger<MapController> logger)
        {
            _mapper = mapper;
            _hubContext = hubContext;
            _context = context;
            _logger = logger;
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

                // Serializa o estado completo com as opções necessárias
                var serializeOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };

                mapa.EstadoJson = JsonSerializer.Serialize(estado, serializeOptions);
                mapa.UltimaAtualizacao = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Envia o estado completo para o grupo usando o nome "ReceiveMapUpdate"
                await _hubContext.Clients.Group(mapa.MesaId.ToString())
                    .SendAsync("ReceiveMapUpdate", mapaId, mapa.EstadoJson);

                return Ok(new
                {
                    Message = "Estado do mapa salvo com sucesso",
                    MapId = mapaId,
                    LastUpdated = mapa.UltimaAtualizacao
                });
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

        [HttpPut("{mesaId}/mapa/{mapaId}/token/{tokenId}")]
        public async Task<IActionResult> UpdateToken(int mesaId, int mapaId, string tokenId, [FromBody] TokenUpdateDto update)
        {
            try
            {
                var mapa = await _context.Mapas
                    .FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);

                if (mapa == null)
                    return NotFound("Mapa não encontrado");

                // 1. OPÇÕES DE SERIALIZAÇÃO (consistentes com SalvarEstadoMapa)
                var serializeOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };

                // Desserialização segura do estado COM OPÇÕES
                MapaEstadoDto estado;
                try
                {
                    estado = string.IsNullOrWhiteSpace(mapa.EstadoJson)
                        ? new MapaEstadoDto()
                        : JsonSerializer.Deserialize<MapaEstadoDto>(mapa.EstadoJson, serializeOptions); // <- Adicione as opções aqui
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Erro ao desserializar EstadoJson");
                    estado = new MapaEstadoDto();
                }

                var token = estado.Tokens?.FirstOrDefault(t => t.Id == tokenId);
                if (token == null)
                {
                    // Log detalhado para depuração
                    var tokenIds = estado.Tokens?.Select(t => t.Id).ToList() ?? new List<string>();
                    _logger.LogWarning($"Token {tokenId} não encontrado. Tokens disponíveis: {string.Join(", ", tokenIds)}");
                    return NotFound("Token não encontrado");
                }

                // Atualização das propriedades
                if (update.X.HasValue) token.X = update.X.Value;
                if (update.Y.HasValue) token.Y = update.Y.Value;
                if (update.Z.HasValue) token.Z = update.Z.Value;
                if (update.VisivelParaTodos.HasValue) token.VisivelParaTodos = update.VisivelParaTodos.Value;
                if (update.Bloqueado.HasValue) token.Bloqueado = update.Bloqueado.Value;
                if (update.Metadados != null) token.Metadados = update.Metadados;
                token.Version++;
                token.DataAtualizacao = DateTime.UtcNow;

                // 2. USAR AS OPÇÕES NA SERIALIZAÇÃO AO SALVAR
                mapa.EstadoJson = JsonSerializer.Serialize(estado, serializeOptions); // <- Use as opções aqui também
                mapa.UltimaAtualizacao = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Notificação SignalR
                await _hubContext.Clients.Group(mesaId.ToString())
                    .SendAsync("ReceiveTokenUpdate", token);

                return Ok(token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao atualizar token");
                return StatusCode(500, "Erro interno ao atualizar token");
            }
        }

        [HttpPost("{mesaId}/mapa/{mapaId}/token")]
        public async Task<ActionResult<TokenDto>> AddToken(int mesaId, int mapaId, [FromBody] TokenCreateDto tokenDto)
        {
            try
            {
                var mapa = await _context.Mapas
                    .FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);

                if (mapa == null)
                    return NotFound(new { Message = "Mapa não encontrado" });

                // Desserializa com opções consistentes
                var estado = string.IsNullOrEmpty(mapa.EstadoJson)
                    ? new MapaEstadoDto { Tokens = new List<TokenDto>() } // Inicializa a lista!
                    : JsonSerializer.Deserialize<MapaEstadoDto>(mapa.EstadoJson, _jsonOptions); // Usa opções

                estado.Tokens ??= new List<TokenDto>(); // Garante que a lista não seja nula

                var newToken = new TokenDto
                {
                    Id = Guid.NewGuid().ToString(),
                    Nome = tokenDto.Nome,
                    X = tokenDto.X,
                    Y = tokenDto.Y,
                    Z = tokenDto.Z,
                    ImagemDados = tokenDto.ImagemDados,
                    DonoId = tokenDto.DonoId,
                    VisivelParaTodos = tokenDto.VisivelParaTodos,
                    Bloqueado = tokenDto.Bloqueado,
                    MapaId = mapaId,
                    Metadados = tokenDto.Metadados ?? new Dictionary<string, string>(),
                    DataCriacao = DateTime.UtcNow
                };

                // Adiciona o novo token mantendo os existentes
                estado.Tokens.Add(newToken);

                // Serializa com opções
                mapa.EstadoJson = JsonSerializer.Serialize(estado, _jsonOptions);
                mapa.UltimaAtualizacao = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Notifica outros clientes via SignalR
                await _hubContext.Clients.Group(mesaId.ToString())
                    .SendAsync("ReceiveTokenAddition", newToken);

                return CreatedAtAction(
                    nameof(GetToken),
                    new { mesaId, mapaId, tokenId = newToken.Id },
                    newToken
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao adicionar token");
                return StatusCode(500, new { Message = "Erro interno ao adicionar token" });
            }
        }

        [HttpDelete("{mesaId}/mapa/{mapaId}/token/{tokenId}")]
        public async Task<IActionResult> DeleteToken(int mesaId, int mapaId, string tokenId)
        {
            try
            {
                var mapa = await _context.Mapas
                    .FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);

                if (mapa == null)
                    return NotFound("Mapa não encontrado");

                // Desserializar com opções consistentes
                var estado = string.IsNullOrEmpty(mapa.EstadoJson)
                    ? new MapaEstadoDto { Tokens = new List<TokenDto>() }
                    : JsonSerializer.Deserialize<MapaEstadoDto>(mapa.EstadoJson, _jsonOptions);

                // Garantir que a lista de tokens não seja nula
                estado.Tokens ??= new List<TokenDto>();

                // Encontrar e remover o token
                var token = estado.Tokens.FirstOrDefault(t => t.Id == tokenId);
                if (token == null)
                    return NotFound("Token não encontrado");

                estado.Tokens.Remove(token);

                // Serializar com opções consistentes
                mapa.EstadoJson = JsonSerializer.Serialize(estado, _jsonOptions);
                mapa.UltimaAtualizacao = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Notificar exclusão
                await _hubContext.Clients.Group(mesaId.ToString())
                    .SendAsync("DeleteToken", tokenId);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao excluir token");
                return StatusCode(500, "Erro interno ao excluir token");
            }
        }

        [HttpGet("{mesaId}/mapa/{mapaId}/token/{tokenId}")]
        public async Task<ActionResult<TokenDto>> GetToken(int mesaId, int mapaId, string tokenId)
        {
            try
            {
                var mapa = await _context.Mapas
                    .FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);

                if (mapa == null)
                    return NotFound("Mapa não encontrado");

                // Desserializar com opções consistentes
                var estado = string.IsNullOrEmpty(mapa.EstadoJson)
                    ? new MapaEstadoDto { Tokens = new List<TokenDto>() }
                    : JsonSerializer.Deserialize<MapaEstadoDto>(mapa.EstadoJson, _jsonOptions);

                // Garantir que a lista de tokens não seja nula
                estado.Tokens ??= new List<TokenDto>();

                var token = estado.Tokens.FirstOrDefault(t => t.Id == tokenId);
                if (token == null)
                    return NotFound("Token não encontrado");

                return Ok(token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar token");
                return StatusCode(500, "Erro interno ao buscar token");
            }
        }

        [HttpGet("{mesaId}/mapas")]
        public async Task<ActionResult<List<MapaDto>>> GetTodosMapasPorMesa(int mesaId)
        {
            var mapas = await _context.Mapas
                .Where(m => m.MesaId == mesaId)
                .Include(m => m.ImaFundo) // Adicionado
                .OrderByDescending(m => m.UltimaAtualizacao)
                .ToListAsync();

            return Ok(_mapper.Map<List<MapaDto>>(mapas));
        }

        [HttpGet("{mesaId}/mapa/atual")]
        public async Task<ActionResult<MapaDto>> GetMapaAtual(int mesaId)
        {
            var mapa = await _context.Mapas
                .Where(m => m.MesaId == mesaId && m.Visivel == true)
                .Include(m => m.ImaFundo)
                .FirstOrDefaultAsync();

            return mapa == null ? NotFound() : Ok(_mapper.Map<MapaDto>(mapa));
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

        [HttpGet("{mesaId}/mapa/{mapaId}")]
        public async Task<ActionResult<MapaDto>> GetMapaPorId(int mesaId, int mapaId)
        {
            var mapa = await _context.Mapas
                .Include(m => m.ImaFundo) // Isso é essencial
                .FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);

            if (mapa == null)
            {
                return NotFound(new { Message = "Mapa não encontrado ou não pertence à mesa especificada" });
            }

            // Inicializa estadoJson se estiver nulo
            mapa.EstadoJson ??= "{}";

            return Ok(_mapper.Map<MapaDto>(mapa));
        }

        [HttpGet("{mesaId}/mapa/visivel/id")]
        public async Task<ActionResult<int>> GetMapaVisivelId(int mesaId)
        {
            try
            {
                // Busca apenas o ID do mapa visível
                var mapaId = await _context.Mapas
                    .Where(m => m.MesaId == mesaId && m.Visivel)
                    .Select(m => m.MapaId)
                    .FirstOrDefaultAsync();

                if (mapaId == 0)
                {
                    return NotFound(new { Message = "Nenhum mapa visível encontrado para esta mesa" });
                }
            
                return Ok(mapaId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar ID do mapa visível");
                return StatusCode(500, new { Message = "Erro interno ao processar a requisição" });
            }
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

        // DELETE: api/mapa/{mesaId}/mapa/{mapaId}
        [HttpDelete("{mesaId}/mapa/{mapaId}")]
        public async Task<IActionResult> ExcluirMapa(int mesaId, int mapaId)
        {
            try
            {
                var mapa = await _context.Mapas
                    .Include(m => m.MapMesa)
                    .FirstOrDefaultAsync(m => m.MapaId == mapaId && m.MesaId == mesaId);

                if (mapa == null)
                {
                    return NotFound(new { Message = "Mapa não encontrado ou não pertence à mesa especificada" });
                }

                // Verifica se é o último mapa da mesa
                var quantidadeMapas = await _context.Mapas
                    .CountAsync(m => m.MesaId == mesaId);

                if (quantidadeMapas <= 1)
                {
                    return BadRequest(new { Message = "Não é possível excluir o último mapa da mesa" });
                }

                // Se o mapa sendo excluído é o visível, tornar outro mapa visível
                if (mapa.Visivel)
                {
                    var outroMapa = await _context.Mapas
                        .Where(m => m.MesaId == mesaId && m.MapaId != mapaId)
                        .OrderByDescending(m => m.UltimaAtualizacao)
                        .FirstOrDefaultAsync();

                    if (outroMapa != null)
                    {
                        outroMapa.Visivel = true;
                        _context.Mapas.Update(outroMapa);
                    }
                }

                _context.Mapas.Remove(mapa);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.Group(mesaId.ToString())
                    .SendAsync("MapaExcluido", mapaId);

                return Ok(new { Message = "Mapa excluído com sucesso" });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Erro ao excluir mapa");
                return StatusCode(500, new { Message = "Erro ao excluir o mapa no banco de dados" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao excluir mapa");
                return StatusCode(500, new { Message = "Erro interno no servidor" });
            }
        }

        [HttpPut("{mesaId}/mapas/{mapaId}/config")]
        public async Task<IActionResult> SalvarConfigMapa(int mesaId, int mapaId, [FromBody] MapaConfigDto config,
    [FromHeader(Name = "X-SignalR-ConnectionId")] string? connectionId = null) // Tornar opcional
        {
            if (!ModelState.IsValid) // Adicione esta validação
            {
                return BadRequest(ModelState);
            }
            var mapa = await _context.Mapas
            .FirstOrDefaultAsync(m => m.MapaId == mapaId);

            if (mapa == null)
                return NotFound($"Mapa com ID {mapaId} não encontrado");

            // Valida se o mapa pertence à mesa
            if (mapa.MesaId != mesaId)
            {
                return BadRequest($"Mapa {mapaId} não pertence à mesa {mesaId}");
            }

            // Atualiza propriedades básicas
            mapa.Nome = config.Nome;
            mapa.Largura = config.Largura;   // Dimensões
            mapa.Altura = config.Altura;     // Dimensões
            mapa.TamanhoHex = config.TamanhoHex; // Tamanho do hexágono
            mapa.UltimaAtualizacao = DateTime.UtcNow;

            // Ajuste de visibilidade
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

                // Carregar imagem de fundo se necessário
                if (mapa.ImagemFundo.HasValue)
                {
                    mapa.ImaFundo = await _context.Imagens
                        .FirstOrDefaultAsync(i => i.ImagemId == mapa.ImagemFundo.Value);
                }

                var mapaDto = _mapper.Map<MapaDto>(mapa);

                // Envia para TODOS do grupo, EXCETO para o cliente que originou a ação
                await _hubContext.Clients.GroupExcept(mesaId.ToString(), new[] { connectionId })
                    .SendAsync("ReceiveMapConfigUpdate", mapaId, mapaDto);

                return Ok(new { Message = "Configurações atualizadas" });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, $"Erro ao salvar configurações: {ex.InnerException?.Message}");
            }
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

        // GET: api/mapa/{mapaId}/background-image
        [HttpGet("{mapaId}/background-image")]
        public async Task<ActionResult<ImagemDto>> GetBackgroundImage(int mapaId)
        {
            var mapa = await _context.Mapas
                .Include(m => m.ImaFundo)
                .FirstOrDefaultAsync(m => m.MapaId == mapaId);

            if (mapa?.ImaFundo == null)
                return NotFound("Mapa não possui imagem de fundo vinculada");

            return Ok(_mapper.Map<ImagemDto>(mapa.ImaFundo));
        }

        // POST: api/mapa/{mapaId}/background-image/{imagemId}
        [HttpPost("{mapaId}/background-image/{imagemId}")]
        public async Task<ActionResult<MapaDto>> SetBackgroundImage(int mapaId, int imagemId)
        {
            var mapa = await _context.Mapas
                .Include(m => m.ImaFundo)
                .FirstOrDefaultAsync(m => m.MapaId == mapaId);

            if (mapa == null)
                return NotFound($"Mapa com ID {mapaId} não encontrado");

            // Verifica se a imagem existe e pertence à mesma mesa do mapa
            var imagem = await _context.Imagens
                .FirstOrDefaultAsync(i => i.ImagemId == imagemId && i.MesaId == mapa.MesaId);

            if (imagem == null)
                return NotFound($"Imagem com ID {imagemId} não encontrada ou não pertence à mesa do mapa");

            // Atualiza ambos os campos para manter consistência
            mapa.ImagemFundo = imagemId;
            mapa.ImaFundo = imagem;
            mapa.UltimaAtualizacao = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var imagemDto = _mapper.Map<ImagemDto>(imagem);
            await _hubContext.Clients.Group(mapa.MesaId.ToString())
                .SendAsync("ReceiveBackgroundImageUpdate", mapaId, imagemDto);
            return Ok(_mapper.Map<MapaDto>(mapa));
        }

        // DELETE: api/mapa/{mapaId}/background-image
        [HttpDelete("{mapaId}/background-image")]
        public async Task<ActionResult<MapaDto>> RemoveBackgroundImage(int mapaId)
        {
            var mapa = await _context.Mapas
                .Include(m => m.ImaFundo)
                .FirstOrDefaultAsync(m => m.MapaId == mapaId);

            if (mapa == null)
                return NotFound($"Mapa com ID {mapaId} não encontrado");

            // Remove a referência tanto no ID quanto no objeto
            mapa.ImagemFundo = null;
            mapa.ImaFundo = null;
            mapa.UltimaAtualizacao = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group(mapa.MesaId.ToString())
                .SendAsync("UpdateBackgroundImage", mapa.MesaId, mapaId, null);
            return Ok(_mapper.Map<MapaDto>(mapa));
        }

    }
}
