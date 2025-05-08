using Microsoft.AspNetCore.SignalR;
using experience_trpg_backend.Models;
using experience_trpg_backend.DTOs;
using System.Text.Json;

namespace experience_trpg_backend.Hubs
{
    public class SessaoHub : Hub
    {
        private readonly AppDbContext _context;

        public SessaoHub(AppDbContext context)
        {
            _context = context;
        }

        // ========== Métodos do Chat ==========
        public async Task SendMessage(string user, string message, int mesaId, int usuarioId,
                            string? tipoMensagem = null, string? dadosFormatados = null)
        {
            Console.WriteLine($"Recebida mensagem para mesa {mesaId} de {user}");

            var novaMensagem = new Mensagem
            {
                Texto = message,
                DataHora = DateTime.Now,
                UsuarioId = usuarioId,
                MesaId = mesaId,
                TipoMensagem = tipoMensagem,
                DadosFormatados = dadosFormatados
            };

            _context.Mensagens.Add(novaMensagem);
            await _context.SaveChangesAsync();

            Console.WriteLine($"Enviando mensagem para grupo {mesaId}");
            await Clients.Group(mesaId.ToString()).SendAsync("ReceiveMessage", new
            {
                user,
                message,
                tipoMensagem,
                dadosFormatados,
                usuarioId,
                mesaId,
                dataHora = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss")
            });
        }

        // ========== Métodos do Mapa ==========
        public async Task SendMapUpdate(string mesaId, int mapId, string mapState)
        {
            // Envia a atualização somente para o grupo correspondente à mesa
            await Clients.Group(mesaId).SendAsync("ReceiveMapUpdate", mapId, mapState);
        }

        public async Task UpdateMapVisibility(string mesaId, int mapId, bool isVisible)
        {
            await Clients.Group(mesaId).SendAsync("ReceiveMapVisibility", mapId, isVisible);
        }

        public async Task UpdateCurrentMap(string mesaId, int mapId)
        {
            await Clients.Group(mesaId).SendAsync("ReceiveCurrentMap", mapId);
        }

        // ========== Métodos Compartilhados ==========
        public async Task JoinMesaGroup(string mesaId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, mesaId);
        }

        public async Task LeaveMesaGroup(string mesaId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, mesaId);
        }
    }
}