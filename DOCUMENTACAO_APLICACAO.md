# Oracle PIM - Visao Atualizada da Aplicacao

## O que o projeto resolve?

Empresas como a Oracle gerenciam dezenas de servidores distribuidos pelo mundo e precisam saber em tempo real onde estao, quanto armazenam e se estao operacionais. Sem uma ferramenta centralizada, esse controle costuma ser feito em planilhas e sistemas dispersos, gerando erro humano, desperdicio de capacidade e atraso na tomada de decisao.

A aplicacao resolve isso com visibilidade centralizada e controle operacional da infraestrutura global de servidores.

---

## Problemas que soluciona

- Falta de visibilidade: mapa mundial mostrando onde cada servidor esta
- Desperdicio de capacidade: monitoramento de uso em GB por servidor
- Expansao desorganizada: regra de negocio que libera novo servidor apenas quando o atual atinge 80%
- Indisponibilidade nao gerenciada: ativacao e desativacao de servidores com rastreabilidade
- Falta de comunicacao operacional: notificacoes e relatorios tecnicos automaticos

---

## Disciplinas que o projeto cobre

### Infraestrutura Computacional

Servidores, capacidade de armazenamento, localizacao fisica e status operacional.

### TIC

API REST, banco em nuvem, interface web e comunicacao frontend/backend.

### Etica e Sustentabilidade

Uso eficiente de recursos, evitando expansao prematura de hardware e consumo energetico desnecessario.

### Educacao Ambiental

Otimizar capacidade e acionamento energetico reduz a pegada de carbono da infraestrutura.

### Estatistica

Dados de uso por servidor, por pais e por continente habilitam analise descritiva e comparativa.

### Pensamento Logico-Computacional com Python

Regras de negocio, validacoes, automacoes por agendamento e controle de capacidade via backend em Python.

---

## O que foi construido hoje (mensagens, clima e automacao)

### 1) Mensagens automaticas por evento operacional

Quando ha mudanca no ciclo de vida do servidor, o sistema envia notificacoes tecnicas por e-mail:

- Servidor Criado
- Servidor Editado
- Servidor Ativado
- Servidor Desativado
- Servidor Excluido
- Arquivo Adicionado

Cada notificacao pode incluir snapshot de antes/depois e contexto tecnico (ex.: capacidade atual e total).

### 2) Relatorios automaticos diarios e mensais

A aplicacao gera relatorios consolidados por pais com:

- servidor e status
- consumo energetico estimado (simulado com variacao diaria)
- custo local e custo em USD
- decisao de uso de energia solar com justificativa
- resumo final com consumo total e custo total do pais

### 3) Controle de clima e decisao energetica solar

O backend consulta clima por localizacao e define se a energia solar deve ser ativada.

- Horario padrao de decisao: 06:00 da manha local de cada pais
- Configuravel por ambiente: `SOLAR_DECISION_HOUR` e `SOLAR_DECISION_MINUTE`
- Mensagem tecnica inclui codigo meteorologico e motivo da decisao

### 4) Agendador interno e controle seguro de jobs

- Jobs internos para: clima, relatorio diario, relatorio mensal e decisao solar
- Endpoints internos protegidos por segredo configurado via ambiente
- Suporte a idempotencia para evitar envio duplicado no mesmo periodo

---

## Como funciona o gerenciamento total de informacoes

Fluxo resumido:

1. Frontend registra e atualiza dados dos servidores e arquivos.
2. Backend aplica regras de negocio (capacidade, limite por pais, ativacao/desativacao).
3. Cada evento relevante gera notificacao tecnica.
4. O monitor de clima atualiza snapshots periodicamente.
5. Nos horarios definidos, os relatorios sao disparados automaticamente.
6. O sistema registra envio para nao duplicar relatorios no mesmo dia/mes.

---

## Exemplos de mensagens enviadas

### Exemplo 1: evento de servidor

Assunto:

`[Servidor Desativado] Oracle-BR-01`

Trecho do corpo:

- Tipo do evento: Servidor Desativado
- Servidor: Oracle-BR-01
- Pais: Brasil
- Continente: America do Sul
- Timestamp local: 2026-04-17T21:14:10-03:00 (America/Sao_Paulo)
- Descricao: Servidor Oracle-BR-01 foi desativado.

### Exemplo 2: relatorio tecnico de decisao solar

Assunto:

`Decisao Energetica Solar - Brasil`

Trecho do corpo:

- Relatorio Tecnico - Decisao Diaria de Energia Solar
- Pais: Brasil
- Continente: America do Sul
- Horario local de decisao: 06:00
- Condicao climatica atual: ensolarado
- Codigo meteorologico: 1
- Motivo tecnico: Alta irradiacao prevista para o periodo
- 06:00 da manha em Brasil: Sera ativado o uso de energia solar.

### Exemplo 3: relatorio diario por pais

Assunto:

`Relatorio Diario - Brasil`

Trecho do corpo:

- Servidor: Oracle-DE-01
- Status: Ativo
- Consumo: 128.4 kWh
- Custo: EUR 46.12 | USD 50.08
- Energia Solar: Ativada
- Resumo do pais: consumo total e custo total do dia

---

## Beneficios praticos para operacao

- Menos decisao manual em operacoes repetitivas
- Mais previsibilidade de custo energetico
- Rapidez para identificar riscos de capacidade
- Comunicacao tecnica padronizada para auditoria e governanca
- Escalabilidade para operacao multi-pais com fuso horario local
