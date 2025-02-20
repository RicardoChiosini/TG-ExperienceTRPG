using MailKit.Net.Smtp;
using MimeKit;
using System.Threading.Tasks;

public class EmailService
{
    public async Task SendVerificationEmail(string email, string token)
    {
        var confirmationLink = $"http://localhost:4200/confirm-email?email={email}&token={token}";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("ExperienceTRPG", "mourachiosini1@gmail.com"));
        message.To.Add(new MailboxAddress("", email));
        message.Subject = "Verificação de Email";
        message.Body = new TextPart("html")
        {
            Text = $"Por favor, clique no link para verificar seu email: <a href='{confirmationLink}'>Verificar Email</a>"
        };

        using (var client = new SmtpClient())
        {
            try
            {
                await client.ConnectAsync("smtp.gmail.com", 587, false);
                await client.AuthenticateAsync("mourachiosini@gmail.com", "kyjpwtfblzsyhwbw"); // Coloque a senha correta
                await client.SendAsync(message);
            }
            catch (Exception ex)
            {
                // Logar a exceção detalhadamente
                Console.WriteLine($"Erro ao enviar e-mail: {ex.Message}");
                throw; // Re-throw the exception if necessary
            }
            finally
            {
                await client.DisconnectAsync(true);
            }
        }
    }
}
