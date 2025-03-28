using Microsoft.AspNetCore.SignalR;
using experience_trpg_backend.Models;
using experience_trpg_backend.Dtos;
using System.Text.Json;

namespace experience_trpg_backend.Hubs
{
    public class ChatHub : Hub
    {
        private readonly AppDbContext _context;

        public ChatHub(AppDbContext context)
        {
            _context = context;
        }

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
                mesaId, // Adicione esta linha
                dataHora = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss")
            });
        }

        public async Task JoinMesaGroup(int mesaId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, mesaId.ToString());
        }

        public async Task LeaveMesaGroup(int mesaId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, mesaId.ToString());
        }
    }
}