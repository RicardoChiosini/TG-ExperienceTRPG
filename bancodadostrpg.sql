INSERT INTO StatusUsuarios (Nome, Descricao) VALUES ('Online', 'Usuário está online');
INSERT INTO StatusUsuarios (Nome, Descricao) VALUES ('Offline', 'Usuário está offline');

INSERT INTO Sistemas (Nome, Descricao) VALUES ('Dungeons and Dragons 5E', '"Dungeons & Dragons 5ª edição: um RPG de fantasia que combina narrativa, aventura e jogo em equipe."');
INSERT INTO Sistemas (Nome, Descricao) VALUES ('Tormenta20', '"Tormenta20: um RPG de fantasia que combina narrativa, aventura e jogo em equipe."');
INSERT INTO Fichas (Nome, Descricao, SistemaId) VALUES ('Ficha do Jogador', 'Ficha do famoso sistema Dungeons and Dragons em sua 5ª edição.', 1);

INSERT INTO Atributos (Nome, Valor, FichaId)
VALUES
('NvClasse1', 1, 1),
('NvClasse2', 0, 1),
('NvClasse3', 0, 1),
('Experiencia', 0, 1),
('Pontos_Vida_Maxima', 0, 1),
('Pontos_Vida_Atual', 0, 1),
('Pontos_Vida_Temporaria', 0, 1),
('Deslocamento_Caminhada', 9, 1),
('Deslocamento_Escalada', 0, 1),
('Deslocamento_Agua', 0, 1),
('Deslocamento_Voo', 0, 1),
('Deslocamento_Escavacao', 0, 1),
('Forca', 10, 1),
('Destreza', 10, 1),
('Constituicao', 10, 1),
('Inteligencia', 10, 1),
('Sabedoria', 10, 1),
('Carisma', 10, 1),
('Bonus_Res_For', 0, 1),
('Bonus_Res_Des', 0, 1),
('Bonus_Res_Con', 0, 1),
('Bonus_Res_Int', 0, 1),
('Bonus_Res_Sab', 0, 1),
('Bonus_Res_Car', 0, 1),
('Bonus_Acrobacia', 0, 1),
('Bonus_Adestrar_Animais', 0, 1),
('Bonus_Arcanismo', 0, 1),
('Bonus_Atletismo', 0, 1),
('Bonus_Enganacao', 0, 1),
('Bonus_Furtividade', 0, 1),
('Bonus_Historia', 0, 1),
('Bonus_Intimidacao', 0, 1),
('Bonus_Intuicao', 0, 1),
('Bonus_Investigacao', 0, 1),
('Bonus_Medicina', 0, 1),
('Bonus_Natureza', 0, 1),
('Bonus_Percepcao', 0, 1),
('Bonus_Performance', 0, 1),
('Bonus_Persuasao', 0, 1),
('Bonus_Prestidigitacao', 0, 1),
('Bonus_Religiao', 0, 1),
('Bonus_Sobrevivencia', 0, 1),
('CA_Base', 10, 1),
('CA_Bonus', 0, 1),
('Bonus_Iniciativa', 0, 1),
('Moedas_Cobre', 0, 1),
('Moedas_Prata', 0, 1),
('Moedas_Electrum', 0, 1),
('Moedas_Ouro', 0, 1),
('Moedas_Platina', 0, 1);

INSERT INTO Proficiencias (Nome, Proficiente, FichaId)
VALUES 
('Resistencia_Forca', 0, 1), 
('Resistencia_Destreza', 0, 1),
('Resistencia_Constituicao', 0, 1),
('Resistencia_Inteligencia', 0, 1),
('Resistencia_Sabedoria', 0, 1),
('Resistencia_Carisma', 0, 1),
('Acrobacia', 0, 1),
('Adestrar_Animais', 0, 1),
('Arcanismo', 0, 1),
('Atletismo', 0, 1),
('Enganacao', 0, 1),
('Furtividade', 0, 1),
('Historia', 0, 1),
('Intimidacao', 0, 1),
('Intuicao', 0, 1),
('Investigacao', 0, 1),
('Medicina', 0, 1),
('Natureza', 0, 1),
('Percepcao', 0, 1),
('Performance', 0, 1),
('Persuasao', 0, 1),
('Prestidigitacao', 0, 1),
('Religiao', 0, 1),
('Sobrevivencia', 0, 1),
('Aptidao_Acrobacia', 0, 1),
('Aptidao_Adestrar_Animais', 0, 1),
('Aptidao_Arcanismo', 0, 1),
('Aptidao_Atletismo', 0, 1),
('Aptidao_Enganacao', 0, 1),
('Aptidao_Furtividade', 0, 1),
('Aptidao_Historia', 0, 1),
('Aptidao_Intimidacao', 0, 1),
('Aptidao_Intuicao', 0, 1),
('Aptidao_Investigacao', 0, 1),
('Aptidao_Medicina', 0, 1),
('Aptidao_Natureza', 0, 1),
('Aptidao_Percepcao', 0, 1),
('Aptidao_Performance', 0, 1),
('Aptidao_Persuasao', 0, 1),
('Aptidao_Prestidigitacao', 0, 1),
('Aptidao_Religiao', 0, 1),
('Aptidao_Sobrevivencia', 0, 1),
('Versatilidade', 0, 1),
('Talento_Confiavel', 0, 1);

INSERT INTO Habilidades (Nome, Descricao, FichaId)
VALUES
('Classe1', '', 1),
('Classe2', '', 1),
('Classe3', '', 1),
('Raca', '', 1),
('Tendencia', '', 1),
('Antecedente', '', 1),
('Personalidade', '', 1),
('Ideais', '', 1),
('Vinculos', '', 1),
('Defeitos', '', 1),
('Tipo', '', 1),
('Tamanho', '', 1),
('Altura', '', 1),
('Peso', '', 1),
('Pele', '', 1),
('Olhos', '', 1),
('Cabelo', '', 1),
('Idade', '', 1),
('Lore', '', 1),
('Anotacoes', '', 1),
('Ca_Atributo1', 'Des', 1),
('Ca_Atributo2', '', 1),
('Iniciativa_Atributo1', '', 1),
('Iniciativa_Atributo2', '', 1),
('Res_For_Atributo_Bonus', '', 1),
('Res_Des_Atributo_Bonus', '', 1),
('Res_Con_Atributo_Bonus', '', 1),
('Res_Int_Atributo_Bonus', '', 1),
('Res_Sab_Atributo_Bonus', '', 1),
('Res_Car_Atributo_Bonus', '', 1);

select * from statususuarios;
select * from usuarios;
select * from sistemas;
select * from fichas;
select * from atributos;
select * from proficiencias;
select * from habilidades;
select * from mesas;
select * from usuariomesas;
select * from mensagens;
select * from imagens;
select * from mapas;