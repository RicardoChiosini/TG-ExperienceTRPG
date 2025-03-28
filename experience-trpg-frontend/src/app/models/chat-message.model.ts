export interface ChatMessage {
  mensagemId?: number;
  user: string;
  message: string;  
  texto: string;    
  tipoMensagem: 'normal' | 'dado'; 
  dadosFormatados?: string;
  usuarioId: number;
  mesaId: number;
  dataHora: string;
}