using Microsoft.AspNetCore.SignalR;
using experience_trpg_backend.Models;
using System;

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