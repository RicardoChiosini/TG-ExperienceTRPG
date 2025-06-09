import { MapaEstadoDto } from '../dtos/mapaEstado.dto';

export class MapStateAdapter {
    static parseBackendToFrontend(backendData: any): MapaEstadoDto {
      return {
        tokens: backendData.Tokens?.map((token: any) => ({
          id: token.Id,
          nome: token.Nome,
          x: token.X,
          y: token.Y,
          z: token.Z || 1,
          imagemDados: token.ImagemDados,
          donoId: token.DonoId,
          visivelParaTodos: token.VisivelParaTodos ?? true,
          bloqueado: token.Bloqueado ?? false,
          metadados: token.Metadados || {},
          dataCriacao: token.DataCriacao
        })) || [],
        camadas: backendData.Camadas?.map((camada: any) => ({
          id: camada.Id,
          nome: camada.Nome,
          tipo: camada.Tipo,
          visivel: camada.Visivel ?? true,
          ordem: camada.Ordem || 0,
          dados: camada.Dados
        })) || [],
        objetos: backendData.Objetos?.map((objeto: any) => ({
          id: objeto.Id,
          tipo: objeto.Tipo,
          x: objeto.X,
          y: objeto.Y,
          cor: objeto.Cor,
          propriedades: objeto.Propriedades || {}
        })) || [],
        configuracoes: {
          tipoGrid: backendData.Configuracoes?.TipoGrid || 'hexagonal',
          tamanhoCelula: backendData.Configuracoes?.TamanhoCelula || 40,
          corGrid: backendData.Configuracoes?.CorGrid || '#cccccc',
          snapToGrid: backendData.Configuracoes?.SnapToGrid ?? true
        }
      };
    }
  
    static prepareForBackend(frontendData: MapaEstadoDto): any {
      return {
        Tokens: frontendData.tokens.map(token => ({
          Id: token.id,
          Nome: token.nome,
          X: token.x,
          Y: token.y,
          Z: token.z,
          ImagemDados: token.imagemDados,
          DonoId: token.donoId,
          VisivelParaTodos: token.visivelParaTodos,
          Bloqueado: token.bloqueado,
          Metadados: token.metadados || {},
          DataCriacao: token.dataCriacao ? new Date(token.dataCriacao) : new Date()
        })),
        Camadas: frontendData.camadas?.map(camada => ({
          Id: camada.id,
          Nome: camada.nome,
          Tipo: camada.tipo,
          Visivel: camada.visivel,
          Ordem: camada.ordem,
          Dados: camada.dados
        })) || [],
        Objetos: frontendData.objetos?.map(objeto => ({
          Id: objeto.id,
          Tipo: objeto.tipo,
          X: objeto.x,
          Y: objeto.y,
          Cor: objeto.cor,
          Propriedades: objeto.propriedades || {}
        })) || [],
        Configuracoes: {
          TipoGrid: frontendData.configuracoes?.tipoGrid || 'hexagonal',
          TamanhoCelula: frontendData.configuracoes?.tamanhoCelula || 40,
          CorGrid: frontendData.configuracoes?.corGrid || '#cccccc',
          SnapToGrid: frontendData.configuracoes?.snapToGrid ?? true
        }
      };
    }
}