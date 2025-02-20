using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using experience_trpg_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace experience_trpg_backend.Hubs
{
    public class ChatHub : Hub
    {
        private readonly AppDbContext _context;

        public ChatHub(AppDbContext context)
        {
            _context = context;
        }

        // Método para enviar mensagens
        public async Task SendMessage(string user, string message, int mesaId, int usuarioId)
        {
            // Salva a mensagem no banco de dados
            var novaMensagem = new Mensagem
            {
                Texto = message,
                DataHora = DateTime.Now,
                UsuarioId = usuarioId,
                MesaId = mesaId
            };

            _context.Mensagens.Add(novaMensagem);
            await _context.SaveChangesAsync();

            // Envia a mensagem para o grupo (apenas user e message)
            await Clients.Group(mesaId.ToString()).SendAsync("ReceiveMessage", user, message);
        }

        // Entra no grupo da mesa
        public async Task JoinMesaGroup(int mesaId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, mesaId.ToString());
            Console.WriteLine($"Usuário entrou no grupo da mesa: {mesaId}");
        }

        public async Task LeaveMesaGroup(int mesaId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, mesaId.ToString());
            Console.WriteLine($"Usuário saiu do grupo da mesa: {mesaId}");
        }
    }
}