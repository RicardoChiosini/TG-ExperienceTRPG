using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using experience_trpg_backend.DTOs;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace experience_trpg_backend.Hubs
{
    public class MapaHub : Hub
    {
        private readonly ILogger<MapaHub> _logger;

        public MapaHub(ILogger<MapaHub> logger)
        {
            _logger = logger;
        }

        public async Task JoinMesaGroup(string mesaId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, mesaId);
            _logger.LogInformation($"Usuário {Context.ConnectionId} entrou no grupo da mesa {mesaId}");
        }

        public async Task LeaveMesaGroup(string mesaId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, mesaId);
            _logger.LogInformation($"Usuário {Context.ConnectionId} saiu do grupo da mesa {mesaId}");
        }

        public async Task UpdateTokenPosition(string tokenId, double x, double y, int z, int mesaId)
        {
            _logger.LogDebug($"Token {tokenId} movido para ({x},{y},{z}) na mesa {mesaId}");
            await Clients.OthersInGroup(mesaId.ToString()).SendAsync("ReceiveTokenUpdate", new
            {
                Id = tokenId,
                X = x,
                Y = y,
                Z = z,
                MesaId = mesaId
            });
        }

        public async Task AddOrUpdateToken(TokenDto token, int mesaId)
        {
            _logger.LogInformation($"Token {token.Id} adicionado/atualizado na mesa {mesaId}");
            await Clients.OthersInGroup(mesaId.ToString()).SendAsync("ReceiveTokenUpdate", token);
        }

        public async Task RemoveToken(string tokenId, int mesaId)
        {
            _logger.LogInformation($"Token {tokenId} removido da mesa {mesaId}");
            await Clients.OthersInGroup(mesaId.ToString()).SendAsync("RemoveToken", tokenId);
        }

        public async Task SendMapUpdate(int mesaId, int mapaId, MapaEstadoDto estado)
        {
            _logger.LogInformation($"Atualização de estado do mapa {mapaId} recebida na mesa {mesaId}");

            try
            {
                await Clients.OthersInGroup(mesaId.ToString())
                    .SendAsync("ReceiveEstadoUpdate", estado);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao enviar atualização do mapa {mapaId}");
                throw;
            }
        }

        public async Task UpdateMapaConfig(ConfiguracaoMapaDto config, int mesaId)
        {
            _logger.LogInformation($"Configurações do mapa atualizadas na mesa {mesaId}");
            await Clients.OthersInGroup(mesaId.ToString()).SendAsync("ReceiveConfigUpdate", config);
        }

        public async Task UpdateCamadas(CamadaDto[] camadas, int mesaId)
        {
            _logger.LogInformation($"Camadas do mapa atualizadas na mesa {mesaId}");
            await Clients.OthersInGroup(mesaId.ToString()).SendAsync("ReceiveCamadasUpdate", camadas);
        }

        public async Task UpdateObjetos(ObjetoDeMapaDto[] objetos, int mesaId)
        {
            _logger.LogInformation($"Objetos do mapa atualizados na mesa {mesaId}");
            await Clients.OthersInGroup(mesaId.ToString()).SendAsync("ReceiveObjetosUpdate", objetos);
        }

        public async Task RequestFullState(int mesaId, string connectionId)
        {
            _logger.LogDebug($"Solicitação de estado completo para {connectionId} na mesa {mesaId}");
            await Clients.Client(connectionId).SendAsync("RequestFullState", mesaId);
        }
    }
}