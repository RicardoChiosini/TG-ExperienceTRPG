using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using experience_trpg_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Json;
using experience_trpg_backend.DTOs;
using AutoMapper;
#pragma warning disable CS8604 // Possível argumento de referência nula.
#pragma warning disable CS8602 // Desreferência de uma referência possivelmente nula.

namespace experience_trpg_backend.Controllers
{
    [Route("api/equipamento/{fichaId}/equipamento")]
    [ApiController]
    public class EquipamentosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public EquipamentosController(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // GET: api/equipamentos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EquipamentoDto>>> GetEquipamentos(int fichaId)
        {
            var equipamentos = await _context.Equipamentos
                .Where(e => e.FichaId == fichaId)
                .ToListAsync();

            return _mapper.Map<List<EquipamentoDto>>(equipamentos);
        }

        // GET: api/ficha/5/equipamento/2
        [HttpGet("{id}")]
        public async Task<ActionResult<EquipamentoDto>> GetEquipamento(int fichaId, int id)
        {
            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.EquipamentoId == id && e.FichaId == fichaId);

            if (equipamento == null)
            {
                return NotFound();
            }

            return _mapper.Map<EquipamentoDto>(equipamento);
        }

        // PUT: api/ficha/5/equipamento/2
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEquipamento(int fichaId, int id, EquipamentoDto equipamentoDto)
        {
            if (id != equipamentoDto.EquipamentoId || fichaId != equipamentoDto.FichaId)
            {
                return BadRequest();
            }

            if (!IsValidEquipmentType(equipamentoDto.Descricao))
            {
                return BadRequest("Tipo de equipamento inválido. Valores permitidos: Arma, Armadura, Escudo, Item");
            }

            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.EquipamentoId == id && e.FichaId == fichaId);

            if (equipamento == null)
            {
                return NotFound();
            }

            // Atualiza apenas as propriedades que podem ser modificadas
            equipamento.Nome = equipamentoDto.Nome;
            equipamento.Descricao = equipamentoDto.Descricao;
            equipamento.FichaId = equipamentoDto.FichaId;

            // Atualiza o estado JSON usando o mapper
            _mapper.Map(equipamentoDto, equipamento);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EquipamentoExists(fichaId, id))
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

        // POST: api/ficha/5/equipamento
        [HttpPost]
        public async Task<ActionResult<EquipamentoDto>> PostEquipamento(int fichaId, EquipamentoDto equipamentoDto)
        {
            // Garante que o equipamento está sendo criado para a ficha correta
            equipamentoDto.FichaId = fichaId;

            if (!IsValidEquipmentType(equipamentoDto.Descricao))
            {
                return BadRequest("Tipo de equipamento inválido. Valores permitidos: Arma, Armadura, Escudo, Item");
            }

            var equipamento = _mapper.Map<Equipamento>(equipamentoDto);

            _context.Equipamentos.Add(equipamento);
            await _context.SaveChangesAsync();

            var createdDto = _mapper.Map<EquipamentoDto>(equipamento);
            return CreatedAtAction("GetEquipamento", new { fichaId = fichaId, id = equipamento.EquipamentoId }, createdDto);
        }

        // DELETE: api/ficha/5/equipamento/2
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipamento(int fichaId, int id)
        {
            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.EquipamentoId == id && e.FichaId == fichaId);

            if (equipamento == null)
            {
                return NotFound();
            }

            _context.Equipamentos.Remove(equipamento);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/ficha/5/equipamento/armadura/equipar/2
        [HttpPatch("armadura/equipar/{id}")]
        public async Task<IActionResult> InverterPosicaoArmadura(int fichaId, int id)
        {
            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.EquipamentoId == id && e.FichaId == fichaId && e.Descricao == "Armadura");

            if (equipamento == null)
            {
                return NotFound("Armadura não encontrada");
            }

            var armaduraDto = JsonSerializer.Deserialize<ArmaduraDto>(equipamento.EstadoJson);
            if (armaduraDto == null)
            {
                return BadRequest("Dados de armadura inválidos");
            }

            // Inverte o estado de equipado
            armaduraDto.Equipado = !armaduraDto.Equipado;
            equipamento.EstadoJson = JsonSerializer.Serialize(armaduraDto);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { equipado = armaduraDto.Equipado });
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EquipamentoExists(fichaId, id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }

        // PATCH: api/ficha/5/equipamento/escudo/equipar/2
        [HttpPatch("escudo/equipar/{id}")]
        public async Task<IActionResult> InverterPosicaoEscudo(int fichaId, int id)
        {
            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.EquipamentoId == id && e.FichaId == fichaId && e.Descricao == "Escudo");

            if (equipamento == null)
            {
                return NotFound("Escudo não encontrado");
            }

            var escudoDto = JsonSerializer.Deserialize<EscudoDto>(equipamento.EstadoJson);
            if (escudoDto == null)
            {
                return BadRequest("Dados de escudo inválidos");
            }

            // Inverte o estado de equipado
            escudoDto.Equipado = !escudoDto.Equipado;
            equipamento.EstadoJson = JsonSerializer.Serialize(escudoDto);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { equipado = escudoDto.Equipado });
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EquipamentoExists(fichaId, id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }

        private bool EquipamentoExists(int fichaId, int id)
        {
            return _context.Equipamentos.Any(e => e.EquipamentoId == id && e.FichaId == fichaId);
        }

        private bool IsValidEquipmentType(string? type)
        {
            return type switch
            {
                "Arma" or "Armadura" or "Escudo" or "Item" => true,
                _ => false
            };
        }
    }
}