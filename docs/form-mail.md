# Envio dos formulários

Ouvidoria: `POST /api/ouvidoria`. Avaliações: `POST /api/avaliacoes`.
Somente o servidor lê `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASS` e `CONTACT_EMAIL_TO`. Não usar prefixo `NEXT_PUBLIC_`.
Não versionar `.env.local` nem colar credenciais em comandos, logs ou testes.

O remetente é sempre `SMTP_USER`, o destinatário é sempre `CONTACT_EMAIL_TO`,
e apenas a Ouvidoria define Reply-To com o e-mail validado do visitante.
As mensagens são texto simples. Não há publicação automática de avaliações.
O formulário não persiste os dados no navegador; após o envio, o conteúdo
passa pelo Gmail e deve ser gerenciado pela loja. Nenhum prazo de retenção
ou política de privacidade é presumido por este código.

## Testes sem envio

Executar `pnpm test:forms`. Os testes usam configuração fictícia, não carregam
`.env.local` e bloqueiam conexões TCP. O transporte SMTP é substituído por uma
função em memória; o teste MIME usa o streamTransport local do Nodemailer.
Não chamar `verify()` nem enviar payloads válidos às rotas reais durante esta etapa.
Nos testes de navegador, interceptar `/api/*` antes de preencher/enviar os formulários.

## Proteções e limites

- Corpo JSON de até 64 KiB, contado durante a leitura, sem anexos.
- Validação independente no servidor, limites por campo e rejeição de campos extras.
- Verificação de mesma origem; isso não substitui proteção contra bots.
- Upstash Redis obrigatório: operações Lua atômicas no primário via REST, sem dependência adicional.
- Cada formulário tem contadores independentes: 5 tentativas por origem de rede e
  100 tentativas totais por janela de 15 minutos. Inclui tentativas inválidas.
  Reinícios e múltiplas instâncias compartilham os mesmos contadores.
- As chaves usam namespace `onne:forms:v2:<ambiente>:...`, com `production`,
  `preview` ou `development` obtido da variável de sistema `VERCEL_ENV`.
  Fora da Vercel, a ausência dessa variável usa `development`. Na Vercel, ambiente
  ausente ou desconhecido bloqueia o envio com 503. Não é necessário criar outra
  variável privada. Manter as variáveis de sistema disponíveis na Vercel.
- Production e Preview podem usar o mesmo banco e segredo sem compartilhar
  contadores, teto total, reservas de duplicidade ou resultados confirmados.
  O primeiro deploy desta versão inicia o namespace v2; as chaves antigas v1
  permanecem até sua expiração natural, sem exclusão indiscriminada.
- Contadores expiram em 900 segundos desde a primeira tentativa; bloqueios retornam
  HTTP 429 e Retry-After de 900 segundos (espera conservadora).
- Idempotência compartilhada: reserva atômica por formulário, origem e UUID por
  24 horas. Conclusão confirmada permite responder sucesso a uma repetição sem enviar
  outro e-mail. Solicitação em andamento retorna 409; payload diferente com a mesma
  chave também retorna 409.
- Timeout/falha de SMTP mantém a reserva por 24 horas: o Gmail pode ter aceitado antes
  da falha. Falha ao registrar a conclusão no Redis retorna erro seguro. Não há
  garantia de entrega exatamente uma vez entre SMTP e Redis, nem reenvio automático.
- Somente contadores, HMACs e estados pending/done são guardados no Redis. Não são
  guardados conteúdo dos formulários, nomes, e-mails, telefones ou IPs brutos.
- RATE_LIMIT_SECRET protege identificadores e impressões de payload com HMAC-SHA256.
  Use segredo aleatório de pelo menos 32 caracteres, estável entre instâncias.
  A troca do segredo muda o namespace e reinicia a proteção: não rotacionar durante
  solicitações em andamento sem planejamento.
- Sem logs de credenciais, mensagens, endereços ou respostas SMTP/Redis.
- Falta de configuração, token sem permissão, erro ou timeout do Redis bloqueiam o
  envio com HTTP 503. Nunca há fallback em memória ou sucesso fictício.
- TLS obrigatório e timeouts; respostas não expõem detalhes dos provedores.

### Variáveis privadas do Upstash

- `UPSTASH_REDIS_REST_URL`: endpoint HTTPS REST do banco Upstash (sem caminho extra).
- `UPSTASH_REDIS_REST_TOKEN`: token com permissão de leitura, escrita e EVAL.
- `RATE_LIMIT_SECRET`: segredo criptograficamente aleatório e privado.

Cadastrar em `.env.local` e no ambiente Vercel usado pelos formulários. Não usar
NEXT_PUBLIC_, não versionar valores. Todas as instâncias do mesmo ambiente devem
usar o mesmo banco e segredo. Banco/segredo separados por ambiente são opcionais;
o namespace já isola os limites de Preview, Production e Development.
Usar endpoint primário consistente e manter as chaves de
proteção sem eviction antecipada; monitore limites/capacidade do plano Upstash.
No desenvolvimento, todos os clientes locais compartilham a origem "local".

Os testes simulam um Redis compartilhado entre handlers independentes, expiração,
limites separados, teto total, concorrência, replay, conflitos, indisponibilidade,
permissões, ausência de configuração e resultado SMTP incerto, sem e-mails reais.
Também comprovam isolamento dos três ambientes no mesmo banco/segredo, incluindo
contadores, teto total, duplicidade pendente/concluída, conflitos e expiração.
O teste de conexão autorizado usa somente uma chave temporária com expiração,
exercita leitura/escrita/EVAL e a remove ao terminar. Não envia formulários.

## Teste real controlado, somente após autorização

1. Confirmar em ambiente privado que as seis variáveis estão preenchidas, sem mostrá-las.
2. Reiniciar apenas este servidor se ele ainda estiver usando configuração antiga.
3. Combinar uma única manifestação e uma única avaliação com dados fictícios e
   identificação de teste, sem dados sensíveis. Confirmar a caixa destinatária.
4. Com autorização explícita, enviar uma vez cada formulário e conferir no Gmail:
   recebimento, assuntos diferentes, acentos, quebras de linha, Reply-To na Ouvidoria
   e autorização de publicação na avaliação.
5. Confirmar que nenhuma avaliação apareceu automaticamente no site.

Uma resposta de sucesso significa aceitação pelo servidor SMTP, não prova de
entrega na caixa de entrada. Sem esse teste, autenticação real e entrega não
estão verificadas.

## Vercel

Cadastrar as seis variáveis SMTP/contato no ambiente Production. Só cadastrar em
Preview quando envios de teste nesse ambiente forem deliberadamente autorizados.
Cadastrar também as três variáveis privadas do Upstash listadas acima.
Conferir a conexão Redis antes da ativação pública, sem enviar e-mails reais.
As novas variáveis exigem uma implantação posterior, que não foi feita nesta etapa.
