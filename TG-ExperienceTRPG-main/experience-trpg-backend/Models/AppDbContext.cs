using Microsoft.EntityFrameworkCore;

namespace experience_trpg_backend.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // DbSets para cada entidade
        public DbSet<Usuario>? Usuarios { get; set; }
        public DbSet<Mesa>? Mesas { get; set; }
        public DbSet<Mapa>? Mapas { get; set; }
        public DbSet<Mensagem> Mensagens { get; set; }
        public DbSet<Ficha>? Fichas { get; set; }
        public DbSet<StatusUsuario>? StatusUsuarios { get; set; }
        public DbSet<Sistema>? Sistemas { get; set; }
        public DbSet<Imagem>? Imagens { get; set; }
        public DbSet<Atributo>? Atributos { get; set; }
        public DbSet<Proficiencia>? Proficiencias { get; set; }
        public DbSet<Habilidade>? Habilidades { get; set; }
        public DbSet<Equipamento>? Equipamentos { get; set; }
        public DbSet<UsuarioFicha>? UsuarioFichas { get; set; }
        public DbSet<UsuarioMesa>? UsuarioMesas { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Chave Primária para StatusUsuario
            modelBuilder.Entity<StatusUsuario>()
                .HasKey(su => su.StatusUsuariosId);

            // Relação entre StatusUsuario e Usuario
            modelBuilder.Entity<Usuario>()
                .HasOne(u => u.UsuStatusUsuario) // A propriedade deve ser do tipo StatusUsuario
                .WithMany(s => s.Usuarios) // StatusUsuario pode ter muitos Usuários
                .HasForeignKey(u => u.StatusUsuarioId); // Assume que a propriedade StatusUsuarioId existe no modelo Usuario

            // Chave Primária para Usuario
            modelBuilder.Entity<Usuario>()
                .HasKey(u => u.UsuarioId);

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique(); // Garante que o email seja único

            // Relação entre Usuario e Mesas Criadas
            modelBuilder.Entity<Usuario>()
                .HasMany(u => u.MesasCriadas)
                .WithOne(m => m.MesCriador) // Certifique-se de que esta propriedade existe no modelo Mesa
                .HasForeignKey(m => m.CriadorId); // Chave estrangeira na tabela Mesa

            // Chave Primária para Mesa
            modelBuilder.Entity<Mesa>()
                .HasKey(m => m.MesaId);

            modelBuilder.Entity<Mapa>()
                .HasKey(m => m.MapaId);

            modelBuilder.Entity<Mapa>()
                .HasOne(m => m.MapMesa)
                .WithMany(m => m.Mapas)
                .HasForeignKey(m => m.MesaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Mapa>()
                .HasOne(m => m.ImaFundo)
                .WithMany()
                .HasForeignKey(m => m.ImagemFundo)
                .OnDelete(DeleteBehavior.SetNull);

            // Relação muitos-para-muitos entre Usuario e Mesa através da tabela UsuarioMesa
            modelBuilder.Entity<UsuarioMesa>()
                .HasKey(um => new { um.UsuarioId, um.MesaId }); // Chave composta

            modelBuilder.Entity<UsuarioMesa>()
                .HasOne(um => um.UMUsuario) // Refere-se à propriedade na classe UsuarioMesa que refere o Usuario
                .WithMany(u => u.MesasParticipadas) // Associa ao ICollection<UsuarioMesa> em Usuario
                .HasForeignKey(um => um.UsuarioId);

            modelBuilder.Entity<UsuarioMesa>()
                .HasOne(um => um.UMMesa) // Refere-se à propriedade na classe UsuarioMesa que refere a Mesa
                .WithMany(m => m.Participantes) // Associa ao ICollection<UsuarioMesa> em Mesa
                .HasForeignKey(um => um.MesaId);

            // Chave Primária para UsuarioFicha
            modelBuilder.Entity<UsuarioFicha>()
                .HasKey(uf => new { uf.UsuarioId, uf.FichaId });

            modelBuilder.Entity<UsuarioFicha>()
                .HasOne(uf => uf.UFUsuario) // Associa a tabela UsuarioFicha ao modelo Usuario 
                .WithMany(u => u.UsuarioFichas)
                .HasForeignKey(uf => uf.UsuarioId);

            modelBuilder.Entity<UsuarioFicha>()
                .HasOne(uf => uf.UFFicha) // Associa a tabela UsuarioFicha ao modelo Ficha
                .WithMany(f => f.UsuarioFichas)
                .HasForeignKey(uf => uf.FichaId);

            modelBuilder.Entity<Mensagem>()
                .HasOne(m => m.MenUsuario)
                .WithMany()
                .HasForeignKey(m => m.UsuarioId);

            modelBuilder.Entity<Mensagem>()
                .HasOne(m => m.MenMesa)
                .WithMany()
                .HasForeignKey(m => m.MesaId);

            // Chave Primária para Ficha
            modelBuilder.Entity<Ficha>()
                .HasKey(f => f.FichaId);

            // Chave Primária para Atributo
            modelBuilder.Entity<Atributo>()
                .HasKey(a => a.AtributoId);

            // Chave Primária para Equipamento
            modelBuilder.Entity<Equipamento>()
                .HasKey(e => e.EquipamentoId);

            // Chave Primária para Habilidade
            modelBuilder.Entity<Habilidade>()
                .HasKey(h => h.HabilidadeId);

            // Chave Primária para Proficiencia
            modelBuilder.Entity<Proficiencia>()
                .HasKey(p => p.ProficienciaId);

            // Relação entre Ficha e Atributo
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Atributos)
                .WithOne(a => a.AtriFicha) // A propriedade deve fazer referência à Ficha
                .HasForeignKey(a => a.FichaId);

            // Relação entre Atributo e Ficha
            modelBuilder.Entity<Atributo>()
                .HasOne(a => a.AtriFicha) // Propriedade na classe Atributo que referencia Ficha
                .WithMany(f => f.Atributos)
                .HasForeignKey(a => a.FichaId);

            // Relação entre Ficha e Habilidade
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Habilidades)
                .WithOne(h => h.HabFicha) // Propriedade que referencia a Ficha em Habilidade
                .HasForeignKey(h => h.FichaId);

            // Relação entre Habilidade e Ficha
            modelBuilder.Entity<Habilidade>()
                .HasOne(h => h.HabFicha) // A propriedade que referencia a Ficha
                .WithMany(f => f.Habilidades)
                .HasForeignKey(h => h.FichaId);

            // Relação entre Ficha e Proficiencia
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Proficiencias)
                .WithOne(p => p.ProfFicha) // Propriedade que referencia a Ficha em Proficiencia
                .HasForeignKey(p => p.FichaId);

            // Relação entre Proficiencia e Ficha
            modelBuilder.Entity<Proficiencia>()
                .HasOne(p => p.ProfFicha) // Propriedade que referencia a Ficha
                .WithMany(f => f.Proficiencias)
                .HasForeignKey(p => p.FichaId);

            // Relação entre Ficha e Equipamento
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Equipamentos)
                .WithOne(e => e.EquFicha) // Propriedade que referencia a Ficha em Equipamento
                .HasForeignKey(e => e.FichaId);

            // Relação entre Equipamento e Ficha
            modelBuilder.Entity<Equipamento>()
                .HasOne(e => e.EquFicha) // Propriedade que referencia a Ficha
                .WithMany(f => f.Equipamentos)
                .HasForeignKey(e => e.FichaId);

            // Relação entre Imagem e Mesa
            modelBuilder.Entity<Imagem>()
                .HasOne(i => i.ImaMesa) // Modificado para referenciar a Mesa
                .WithMany(m => m.Imagens) // Propriedade em Mesa
                .HasForeignKey(i => i.MesaId);

            // Relação entre Ficha e Sistema
            modelBuilder.Entity<Ficha>()
                .HasOne(f => f.FicSistema) // Propriedade de relacionamento (a ser definida em Ficha)
                .WithMany(s => s.Fichas) // Retratação na declaração de Status
                .HasForeignKey(f => f.SistemaId); // Chave estrangeira

            // Relação entre Ficha e Mesa
            modelBuilder.Entity<Ficha>()
                .HasOne(f => f.FicMesa) // Propriedade de relacionamento (a ser definida em Ficha)
                .WithMany(s => s.Fichas) // Retratação na declaração de Status
                .HasForeignKey(f => f.MesaId); // Chave estrangeira

            // Relação entre Ficha e Imagem
            modelBuilder.Entity<Ficha>()
                .HasOne(f => f.FicImagem) // Propriedade de relacionamento (a ser definida em Ficha)
                .WithMany(s => s.Fichas) // Retratação na declaração de Status
                .HasForeignKey(f => f.ImagemId); // Chave estrangeira

            // Configuração para Mesa -> Fichas
            modelBuilder.Entity<Mesa>()
                .HasMany(m => m.Fichas)
                .WithOne(f => f.FicMesa)
                .HasForeignKey(f => f.MesaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Mesa -> Imagens
            modelBuilder.Entity<Mesa>()
                .HasMany(m => m.Imagens)
                .WithOne(i => i.ImaMesa)
                .HasForeignKey(i => i.MesaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Mesa -> Mapas
            modelBuilder.Entity<Mesa>()
                .HasMany(m => m.Mapas)
                .WithOne(i => i.MapMesa)
                .HasForeignKey(i => i.MesaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Mapa -> Imagem
            modelBuilder.Entity<Mapa>()
                .HasOne(m => m.ImaFundo)
                .WithMany()
                .HasForeignKey(m => m.ImagemFundo)
                .OnDelete(DeleteBehavior.SetNull); // Define o comportamento de exclusão

            // Configuração para Ficha -> Atributos
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Atributos)
                .WithOne(a => a.AtriFicha)
                .HasForeignKey(a => a.FichaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Ficha -> Habilidades
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Habilidades)
                .WithOne(h => h.HabFicha)
                .HasForeignKey(h => h.FichaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Ficha -> Proficiencias
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Proficiencias)
                .WithOne(p => p.ProfFicha)
                .HasForeignKey(p => p.FichaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Ficha -> Equipamentos
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.Equipamentos)
                .WithOne(e => e.EquFicha)
                .HasForeignKey(e => e.FichaId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração para Ficha -> UsuarioFichas
            modelBuilder.Entity<Ficha>()
                .HasMany(f => f.UsuarioFichas)
                .WithOne(uf => uf.UFFicha)
                .HasForeignKey(uf => uf.FichaId)
                .OnDelete(DeleteBehavior.Cascade);
        }

    }
}
