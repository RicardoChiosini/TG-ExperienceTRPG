INSERT INTO StatusUsuarios (Nome, Descricao) VALUES ('Online', 'Usuário está online');
INSERT INTO StatusUsuarios (Nome, Descricao) VALUES ('Offline', 'Usuário está offline');

INSERT INTO Sistemas (Nome, Descricao) VALUES ('Dungeons and Dragons 5E', '"Dungeons & Dragons 5ª edição: um RPG de fantasia que combina narrativa, aventura e jogo em equipe."');
INSERT INTO Sistemas (Nome, Descricao) VALUES ('Tormenta20', '"Tormenta20: um RPG de fantasia que combina narrativa, aventura e jogo em equipe."');
INSERT INTO Fichas (Nome, Descricao, SistemaId) VALUES ('Ficha do Jogador', 'Ficha do famoso sistema Dungeons and Dragons em sua 5ª edição.', 1);

INSERT INTO Atributos (Nome, Valor, FichaId)
VALUES
('Nível', 1, 1),
('Pontos_Vida_Maxima', 0, 1),
('Pontos_Vida_Atual', 0, 1),
('Pontos_Vida_Temporária', 0, 1),
('Deslocamento', 30, 1),
('Força', 10, 1),
('Destreza', 10, 1),
('Constituição', 10, 1),
('Inteligência', 10, 1),
('Sabedoria', 10, 1),
('Carisma', 10, 1),
('Bônus_Acrobacia', 0, 1),
('Bônus_Adestrar_Animais', 0, 1),
('Bônus_Arcanismo', 0, 1),
('Bônus_Atletismo', 0, 1),
('Bônus_Enganação', 0, 1),
('Bônus_Furtividade', 0, 1),
('Bônus_História', 0, 1),
('Bônus_Intimidação', 0, 1),
('Bônus_Intuição', 0, 1),
('Bônus_Investigação', 0, 1),
('Bônus_Medicina', 0, 1),
('Bônus_Natureza', 0, 1),
('Bônus_Percepção', 0, 1),
('Bônus_Performance', 0, 1),
('Bônus_Persuasão', 0, 1),
('Bônus_Prestidigitação', 0, 1),
('Bônus_Religião', 0, 1),
('Bônus_Sobrevivência', 0, 1),
('CA_Base', 10, 1),
('CA_B1', 0, 1),
('CA_B2', 0, 1),
('Moedas_Cobre', 0, 1),
('Moedas_Prata', 0, 1),
('Moedas_Electrum', 0, 1),
('Moedas_Ouro', 0, 1),
('Moedas_Platina', 0, 1);

INSERT INTO Proficiencias (Nome, Proficiente, FichaId, AtributoId, HabilidadeId)
VALUES 
('Resistência_Força', 0, 1, NULL, NULL), 
('Resistência_Destreza', 0, 1, NULL, NULL),
('Resistência_Constituição', 0, 1, NULL, NULL),
('Resistência_Inteligência', 0, 1, NULL, NULL),
('Resistência_Sabedoria', 0, 1, NULL, NULL),
('Resistência_Carisma', 0, 1, NULL, NULL),
('Acrobacia', 0, 1, NULL, NULL),
('Adestrar_Animais', 0, 1, NULL, NULL),
('Arcanismo', 0, 1, NULL, NULL),
('Atletismo', 0, 1, NULL, NULL),
('Enganação', 0, 1, NULL, NULL),
('Furtividade', 0, 1, NULL, NULL),
('História', 0, 1, NULL, NULL),
('Intimidação', 0, 1, NULL, NULL),
('Intuição', 0, 1, NULL, NULL),
('Investigação', 0, 1, NULL, NULL),
('Medicina', 0, 1, NULL, NULL),
('Natureza', 0, 1, NULL, NULL),
('Percepção', 0, 1, NULL, NULL),
('Performance', 0, 1, NULL, NULL),
('Persuasão', 0, 1, NULL, NULL),
('Prestidigitação', 0, 1, NULL, NULL),
('Religião', 0, 1, NULL, NULL),
('Sobrevivência', 0, 1, NULL, NULL),
('Aptidão_Acrobacia', 0, 1, NULL, NULL),
('Aptidão_Adestrar_Animais', 0, 1, NULL, NULL),
('Aptidão_Arcanismo', 0, 1, NULL, NULL),
('Aptidão_Atletismo', 0, 1, NULL, NULL),
('Aptidão_Enganação', 0, 1, NULL, NULL),
('Aptidão_Furtividade', 0, 1, NULL, NULL),
('Aptidão_História', 0, 1, NULL, NULL),
('Aptidão_Intimidação', 0, 1, NULL, NULL),
('Aptidão_Intuição', 0, 1, NULL, NULL),
('Aptidão_Investigação', 0, 1, NULL, NULL),
('Aptidão_Medicina', 0, 1, NULL, NULL),
('Aptidão_Natureza', 0, 1, NULL, NULL),
('Aptidão_Percepção', 0, 1, NULL, NULL),
('Aptidão_Performance', 0, 1, NULL, NULL),
('Aptidão_Persuasão', 0, 1, NULL, NULL),
('Aptidão_Prestidigitação', 0, 1, NULL, NULL),
('Aptidão_Religião', 0, 1, NULL, NULL),
('Aptidão_Sobrevivência', 0, 1, NULL, NULL),
('Versatilidade', 0, 1, NULL, NULL),
('Talento_Confiável', 0, 1, NULL, NULL),
('1_Conjurador', 0, 1, NULL, NULL),
('1/2_Conjurador', 0, 1, NULL, NULL),
('1/3_Conjurador', 0, 1, NULL, NULL);

select * from statususuarios;
select * from usuarios;
select * from sistemas;
select * from fichas;
select * from atributos;
select * from proficiencias;
select * from mesas;
select * from usuariomesas;
select * from mensagens;

SELECT * FROM Mesas WHERE MesaId = 3;