export interface UsuarioDto {
    usuarioId: number; // ID do usuário
    nome: string;      // Nome do usuário
}

export interface MesaDto {
    mesaId: number;          // Identificador único da mesa
    nome: string;            // Nome da mesa
    descricao: string;       // Descrição da mesa
    dataCriacao: Date;      // Data em que a mesa foi criada
    criadorId: number;      // ID do criador da mesa
    sistemaId: number;      // ID do sistema associado à mesa
    convite: string;
    mesSistema?: string;     // Nome do sistema associado à mesa (opcional)
    mesCriador?: UsuarioDto; // Criador da mesa, opcional
    participantes?: UsuarioDto[]; // Lista de participantes, opcional
    imagem?: string;        // URL ou caminho da imagem da mesa (opcional)
    dataUltimoAcesso?: Date; // Data do último acesso (opcional)
}