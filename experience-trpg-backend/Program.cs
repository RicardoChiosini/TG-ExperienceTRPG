using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace experience_trpg_backend
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>(); // Define a classe Startup como a responsável pela configuração
                });
    }
}