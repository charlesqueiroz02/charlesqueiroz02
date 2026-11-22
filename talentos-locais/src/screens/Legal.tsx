import { Button, EmptyState, TopBar } from '../components/ui';
import { go } from '../lib/router';

export function Legal({ kind }: { kind: 'termos' | 'privacidade' | '404' | '403' }) {
  if (kind === '404' || kind === '403')
    return (
      <>
        <TopBar title={kind === '404' ? 'Página não encontrada' : 'Acesso restrito'} back="/" />
        <EmptyState title={kind === '404' ? 'Não encontramos esta página' : 'Você não tem permissão para acessar esta área'} action={<Button onClick={() => go('/')}>Ir para o início</Button>} />
      </>
    );
  return (
    <div>
      <TopBar title={kind === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'} back={true} />
      <article className="space-y-3 px-5 py-5 text-[15px] leading-relaxed [&_h2]:mt-5 [&_h2]:font-bold">
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Rascunho para o MVP. Deve ser revisado por assessoria jurídica antes do lançamento.</p>
        {kind === 'termos' ? (
          <>
            <h2>1. O que é o TalentosLocais</h2>
            <p>Uma ferramenta de conexão entre moradores que precisam de serviços e profissionais da região. A plataforma não presta os serviços anunciados, não é empregadora dos profissionais e, nesta versão, não intermedia pagamentos nem guarda valores.</p>
            <h2>2. Responsabilidades</h2>
            <p>Cada profissional é responsável pelas informações do seu perfil, pela execução dos serviços e por possuir as habilitações exigidas por lei. Qualificações aparecem como "informadas" até serem verificadas pela equipe.</p>
            <h2>3. Avaliações e indicações</h2>
            <p>Avaliações só podem ser publicadas por clientes de pedidos concluídos no app. Indicações do bairro identificam a relação do autor com o profissional. É proibido criar, comprar ou manipular avaliações. Pagamentos nunca removem críticas legítimas.</p>
            <h2>4. Conduta</h2>
            <p>São proibidos perfis falsos, conteúdo ofensivo, spam, golpes e fotos de trabalhos de terceiros. Contas podem ser suspensas após análise, com possibilidade de contestação.</p>
            <h2>5. Planos</h2>
            <p>O uso básico é gratuito e não há comissão sobre serviços contratados. Recursos pagos são opcionais e destaques patrocinados são sempre identificados.</p>
          </>
        ) : (
          <>
            <h2>Quais dados coletamos</h2>
            <p>Conta: nome de exibição, e-mail, cidade e bairro. Opcionais: telefone e foto. Profissionais: dados da vitrine. Uso: solicitações, orçamentos, mensagens, avaliações e visualizações de perfil (contagem agregada).</p>
            <h2>Para que usamos (LGPD, art. 7º)</h2>
            <p>Executar o serviço de conexão (contrato), prevenir fraudes e garantir segurança (legítimo interesse) e enviar novidades somente com o seu consentimento.</p>
            <h2>O que nunca fazemos</h2>
            <p>Não exibimos endereço residencial, documentos, e-mail ou telefone publicamente. Não pedimos sua localização precisa: usamos o bairro informado por você. Não vendemos dados pessoais.</p>
            <h2>Compartilhamento</h2>
            <p>O endereço de um serviço é compartilhado apenas com a outra parte do pedido, quando você o informa. Administradores acessam dados pessoais apenas conforme sua função e com registro das ações.</p>
            <h2>Seus direitos</h2>
            <p>Em "Perfil › Privacidade e dados" você pode baixar seus dados, revogar o consentimento de marketing e excluir sua conta. Avaliações escritas por contas excluídas permanecem anônimas para preservar a integridade das reputações.</p>
            <h2>Armazenamento</h2>
            <p>Nesta versão de demonstração, os dados ficam apenas no seu navegador. Na versão em produção, ficam em banco de dados com controle de acesso por usuário.</p>
          </>
        )}
      </article>
    </div>
  );
}
