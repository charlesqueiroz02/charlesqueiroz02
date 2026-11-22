# TalentosLocais

> **Quem sabe fazer, merece ser encontrado.**

Aplicativo (PWA, mobile-first) que conecta moradores a profissionais técnicos e autônomos do próprio bairro, com reputação baseada em experiências reais e sem comissão sobre os serviços.

## Rodar

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # produção (pasta dist/, hospedagem estática)
npm test           # testes da busca e do ranqueamento
npm run lint       # checagem de tipos
```

### Contas de demonstração (senha `demo1234`)

| Papel | E-mail |
|---|---|
| Cliente | `cliente@demo.talentoslocais.app` |
| Profissional (perfil novo, sem avaliações) | `profissional@demo.talentoslocais.app` |
| Administrador geral | `admin@demo.talentoslocais.app` |

A tela de login tem botões para entrar com cada uma. Em **Perfil › Restaurar dados de demonstração** o banco local volta ao estado inicial.

## Modo demonstração — o que é real e o que não é

Esta versão roda **inteiramente no navegador**: os dados ficam no `localStorage` do aparelho. Tudo que aparece com o selo **Fictício** é dado inventado (pessoas, avaliações, pedidos), e nenhum selo de verificação desses perfis representa uma verificação real.

| Recurso | Situação |
|---|---|
| Cadastro, login, sessão | Funciona localmente (senha com PBKDF2, bloqueio após 5 tentativas, honeypot + tempo mínimo contra robôs) |
| Recuperação de senha / SMS | **Sem e-mail/SMS integrado**: o código aparece numa "caixa de demonstração" na tela |
| Login com telefone / Google | Botões visíveis e desativados ("integração não configurada") |
| Notificações | Só dentro do app; push/e-mail não integrados |
| Pagamentos | **Não processa pagamentos**. Cliente e profissional apenas *informam* a forma de pagamento combinada; o app mostra "não confirmado por provedor" |
| Plano Profissional | Ativa um "teste demonstrativo (sem cobrança)" |
| Moderação, verificação, disputas | Funcionam pelo painel admin (a conferência de documentos em si acontece fora do protótipo) |

## Funcionalidades (MVP)

**Prioridade 1 — essencial**
- Entrada com escolha de intenção (contratar / oferecer / ambos), consentimento LGPD obrigatório e opcional separados.
- Vitrine do profissional: serviços e preços iniciais, bairros atendidos (nunca endereço), disponibilidade, modalidades, portfólio por categoria com **antes/depois**, avaliações, indicações e **Passaporte de Habilidades**.
- Cadastro do profissional guiado em 3 passos (**Modo de Baixa Complexidade** aumenta fonte e botões).
- **Busca em linguagem natural** ("preciso de um soldador para consertar um portão") convertida em filtros removíveis; 11 filtros e 5 ordenações.
- Solicitação → **orçamentos estruturados** (mão de obra, materiais, deslocamento, prazo, validade, pagamento, garantia, observações) → aceitar / recusar / pedir alteração → **Orçamento Comparável** lado a lado.
- Pedido com fluxo completo: proposta aceita → agendado → em andamento → concluído → avaliação pendente → encerrado, além de **cancelado** e **em disputa**; reagendamento só com confirmação da outra parte; histórico de alterações.
- Chat por profissional, mensagens rápidas, bloqueio e denúncia.

**Prioridade 2 — suporte**
- Notificações no app, configurações de conta, exportação de dados e exclusão de conta (LGPD).
- Painel do profissional: visualizações, solicitações, orçamentos enviados/aceitos, concluídos, conversão, nota média, faturamento **informado** × **confirmado**, filtro semana/mês/período, agenda, atalhos e lembrete de portfólio.
- Painel administrativo com funções (Administrador geral, Moderação, Suporte) e permissões distintas: denúncias, moderação de fotos, verificações, usuários (e-mails mascarados para quem não tem permissão), pedidos/disputas, categorias e regiões, planos, auditoria, exportação de indicadores agregados.

**Prioridade 3/4 — diferenciais já presentes**
- Mural de Oportunidades (o cliente controla quem vê descrição e fotos), Profissional Revelação, Rede de Indicações, Perfil Compartilhável (`#/p/<slug>`, Web Share/copiar link), PWA instalável com estado offline.

## Regras de confiança implementadas

- Três sinais **separados**: *Identidade verificada* (só por aprovação da equipe), *Contratação confirmada* (avaliações vinculadas a pedidos concluídos) e *Indicação do bairro* (declara a relação; "declara ter contratado" aparece como **não confirmado** se não há pedido no app).
- Avaliação: só o cliente do pedido, só após confirmar a conclusão, uma por pedido. Contestação vai para moderação; **pagamento nunca remove críticas**.
- Ranqueamento: média bayesiana (nota pondera a quantidade de avaliações); **ausência de avaliações é neutra**, não negativa; impulso para perfis novos e completos; patrocínio aparece rotulado e **não altera** a pontuação orgânica.
- Telefone confirmado ≠ identidade; qualificações aparecem como "Informado pelo profissional" até verificação.
- Localização só por bairro escolhido manualmente; fotos são re-codificadas (remove metadados/GPS).

## Arquitetura

```
src/
  types.ts            entidades (espelham o banco)
  data/actions.ts     regras de negócio + autorização (o "backend" do modo demo)
  data/store.ts       persistência local + hook useStore
  data/seed.ts        dados FICTÍCIOS
  lib/search.ts       interpretação de linguagem natural e ranqueamento
  lib/permissions.ts  matriz de permissões administrativas
  screens/            telas
supabase/migrations/0001_init.sql   esquema PostgreSQL + RLS + funções transacionais
```

### Indo para produção (Supabase)

`supabase/migrations/0001_init.sql` contém as tabelas para todas as entidades (usuários, perfis profissionais, categorias, serviços, portfólios, referências, avaliações, solicitações, orçamentos, conversas, mensagens, agendamentos/pedidos, pagamentos, denúncias, planos, notificações, auditoria), **políticas RLS** e funções `accept_quote`, `submit_review` e `advance_order`, que aplicam no banco as mesmas regras de `actions.ts`. A migração foi aplicada e testada num PostgreSQL 16 local com um stub do `auth` do Supabase (cliente não vira admin, profissional não convidado não envia orçamento nem lê a solicitação, ninguém se autoverifica, avaliação só após conclusão, transições de status por papel).

Próximos passos:
1. Criar o projeto Supabase, aplicar a migração e preencher `.env` a partir de `.env.example` (apenas a chave **publicável**).
2. Trocar as funções de `data/actions.ts` por chamadas ao Supabase (mesma assinatura); Auth do Supabase substitui o hash local.
3. Buckets de Storage: `avatars` (público), `portfolio` (público só após moderação), `verifications` (privado, só admin).
4. Integrações: e-mail/SMS transacional, push, mapa (posições aproximadas por bairro), e — somente se necessário e após análise jurídica — provedor de pagamentos com Pix (webhook preenche `payments.confirmed_at`).

Os textos de Termos e Privacidade são rascunhos e precisam de revisão jurídica antes do lançamento.
