using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using BCrypt.Net;
using System.Security.Claims; // Para usar o Claims
using Microsoft.IdentityModel.Tokens; // Para o Token
using System.Text; // Para codificação EX: UTF-8
using System;
using System.IdentityModel.Tokens.Jwt; // Para usar JwtSecurityToken
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.
#pragma warning disable CS8634 // O tipo não pode ser usado como parâmetro de tipo no tipo ou método genérico. A anulabilidade do argumento de tipo não corresponde à restrição 'class'.

namespace experience_trpg_backend.Controllers
{
    [Route("api/usuarios")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string? _jwtKey;

        public UsuariosController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _jwtKey = configuration["Jwt:Key"] ?? throw new InvalidOperationException("A chave JWT não pode ser nula ou vazia.");
        }

        // GET: api/usuarios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetUsuarios()
        {
            var usuarios = await _context.Usuarios
                .Include(u => u.StatusUsuarioId) // Inclui o StatusUsuario se for um relacionamento
                .ToListAsync();

            return usuarios;
        }

        // GET: api/usuarios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);

            if (usuario == null)
            {
                return NotFound();
            }

            return usuario;
        }

        // POST: api/usuarios
        [HttpPost]
        public async Task<ActionResult<Usuario>> PostUsuario(Usuario usuario)
        {
            if (string.IsNullOrEmpty(usuario.Nome) || string.IsNullOrEmpty(usuario.Email))
            {
                return BadRequest("Nome e Email são obrigatórios.");
            }
            try
            {
                // Verificar se o usuário já existe
                if (_context.Usuarios.Any(u => u.Email == usuario.Email))
                {
                    return BadRequest("Este email já está cadastrado."); // Retorna erro se email já registrado
                }

                usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(usuario.Senha);
                usuario.Senha = "";  // Certifique-se de não reter a senha em texto claro
                usuario.EmailVerificado = false;
                usuario.EmailVerificationToken = Guid.NewGuid().ToString(); // Gera um token único
                usuario.StatusUsuarioId = 2;
                usuario.DataCriacao = DateTime.Now;
                usuario.UltimoLogin = null;

                _context.Usuarios.Add(usuario);
                await _context.SaveChangesAsync();

                // Enviar email de verificação
                var emailService = new EmailService();
                await emailService.SendVerificationEmail(usuario.Email, usuario.EmailVerificationToken);

                return CreatedAtAction("GetUsuario", new { id = usuario.UsuarioId }, usuario);
            }
            catch (Exception ex)
            {
                // Log da exceção pode ajudar a diagnosticar o problema
                return StatusCode(500, $"Erro ao inserir usuário: {ex.Message}");
            }
        }


        // GET: api/usuarios/confirm
        [HttpGet("confirm")]
        public async Task<IActionResult> ConfirmEmail(string email, string token)
        {
            var usuario = await _context.Usuarios.SingleOrDefaultAsync(u => u.Email == email && u.EmailVerificationToken == token);
            if (usuario == null)
            {
                return BadRequest("Token de verificação inválido ou email não encontrado.");
            }

            try
            {
                // Atualiza o status de verificação do email
                usuario.EmailVerificado = true;
                usuario.EmailVerificationToken = ""; // Opcional: remove o token após a verificação
                await _context.SaveChangesAsync();

                return Ok(new { message = "Email confirmado com sucesso." }); // Retorne objeto com mensagem
            }
            catch (Exception ex)
            {
                // Log da exceção
                Console.WriteLine($"Erro ao confirmar o e-mail: {ex.Message}");
                return StatusCode(500, "Erro ao confirmar o e-mail. Tente novamente.");
            }
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsuario(int id, [FromBody] Usuario usuario)
        {
            if (id != usuario.UsuarioId)
            {
                return BadRequest();
            }

            // Verifica se uma nova senha foi fornecida
            if (!string.IsNullOrEmpty(usuario.Senha))
            {
                usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(usuario.Senha);
            }

            _context.Entry(usuario).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UsuarioExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/usuarios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound();
            }

            _context.Usuarios.Remove(usuario);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UsuarioExists(int id)
        {
            return _context.Usuarios.Any(e => e.UsuarioId == id);
        }

        // POST: api/usuarios/login
        [HttpPost("login")]
        public async Task<ActionResult<object>> Login([FromBody] LoginModel login)
        {
            // Verifica se o usuário existe
            var usuario = await _context.Usuarios.SingleOrDefaultAsync(u => u.Email == login.Email);
            if (usuario == null)
            {
                return Unauthorized(); // Retornar 401 se o usuário não for encontrado
            }

            // Verifica se o e-mail do usuário foi confirmado
            if (!usuario.EmailVerificado)
            {
                return BadRequest("Seu e-mail não foi verificado. Por favor, verifique seu e-mail para ativar sua conta.");
            }

            // Verificando a senha
            if (!BCrypt.Net.BCrypt.Verify(login.Senha, usuario.SenhaHash)) // Verifica se a senha corresponde ao hash
            {
                return Unauthorized(); // Retornar 401 se a senha estiver incorreta
            }

            // Gera o token JWT
            var token = GenerateJwtToken(usuario);

            // Retorna o usuário e o token
            return Ok(new
            {
                usuario = new
                {
                    UsuarioId = usuario.UsuarioId,
                    Nome = usuario.Nome,
                    Email = usuario.Email
                },
                token // Adiciona o token à resposta
            });
        }

        private string GenerateJwtToken(Usuario usuario)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, usuario.UsuarioId.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: "experience_trpg",
                audience: "users-experience_trpg",
                claims: claims,
                expires: DateTime.Now.AddMinutes(30), // Tempo de expiração do token
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
