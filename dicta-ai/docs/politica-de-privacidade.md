# Política de Privacidade — Dicta AI

**Última atualização:** 18 de novembro de 2026

Esta política explica como o aplicativo **Dicta AI** (pacote `dictaai.app.com`), incluindo o
**teclado Dicta**, trata os seus dados. Ela segue a Lei Geral de Proteção de Dados
(LGPD — Lei nº 13.709/2018).

- **Responsável pelo app:** Charles F. Queiroz
- **Contato:** charlesferreiradequeiroz@gmail.com

## 1. Resumo
- O Dicta AI **não tem servidor próprio** e **não cria conta** para você.
- Sua voz e os textos que você pede para refinar são enviados **diretamente do seu celular
  para a API Google Gemini**, usando a chave de API que **você** cadastra no app.
- O histórico, o dicionário e as preferências ficam **somente no seu aparelho**.
- **Não vendemos** dados, não exibimos anúncios e não usamos ferramentas de rastreamento.

## 2. Quais dados o app usa e por quê

| Dado | Quando | Para quê | Para onde vai |
|---|---|---|---|
| Áudio do microfone | Só enquanto você grava (botão de ditar ou microfone do teclado) | Transcrever e refinar o que você disse | Google Gemini, para processamento |
| Texto ditado e textos que você pede para editar | Quando você dita, troca o estilo ou dá um comando de edição | Gerar o texto refinado | Google Gemini, para processamento |
| Texto já digitado antes do cursor (até 600 caracteres) | **Só no teclado Dicta**, quando você toca no microfone | Dar contexto para a IA não repetir nem contradizer o que já está escrito | Google Gemini, para processamento |
| Arquivos de áudio que você importa | Quando você escolhe um arquivo | Transcrever o arquivo | Google Gemini, para processamento |
| Chave da API do Gemini | Quando você a cadastra | Autorizar as chamadas à IA | Fica no aparelho; é enviada apenas ao Google em cada chamada |
| Histórico, dicionário pessoal e preferências | Durante o uso | Mostrar seus ditados anteriores e personalizar o app | Ficam só no aparelho |

O teclado Dicta **não lê nem envia** o que você digita normalmente. Ele só acessa o texto
antes do cursor no momento em que você toca no microfone para ditar.

## 3. Google Gemini
O processamento de voz e texto é feito pela API Google Gemini, operada pelo Google LLC,
nos termos da chave de API que você cadastrou. O tratamento desses dados pelo Google segue os
[Termos adicionais da API Gemini](https://ai.google.dev/gemini-api/terms) e a
[Política de Privacidade do Google](https://policies.google.com/privacy). No nível gratuito
da API, o Google pode usar o conteúdo enviado para melhorar os produtos dele; se isso for
uma preocupação, use uma chave com faturamento ativo ou não dite informações sensíveis.

## 4. Armazenamento e segurança
- Os dados locais ficam na área privada do app no seu celular.
- O app **desativa o backup na nuvem e a transferência para outro aparelho**, para que a sua
  chave e o seu histórico não saiam do celular.
- Toda comunicação com o Google é feita por conexão criptografada (HTTPS).
- Backups que você exportar manualmente (arquivo JSON) **não incluem** a chave da API e
  ficam sob a sua guarda.

## 5. Seus direitos e exclusão de dados
Como os dados ficam no seu aparelho, você mesmo controla tudo:
- **Apagar o histórico:** Preferências › Apagar histórico.
- **Apagar todos os dados:** Configurações do Android › Apps › Dicta AI › Armazenamento ›
  Limpar dados, ou desinstalar o app.
- **Remover a chave:** apague o campo em Preferências › Chave da IA, ou revogue a chave em
  aistudio.google.com/apikey.

Para dúvidas ou para exercer seus direitos previstos na LGPD, escreva para
charlesferreiradequeiroz@gmail.com.

## 6. Permissões do Android
- **Microfone (RECORD_AUDIO):** gravar sua voz somente quando você toca para ditar.
- **Internet:** enviar o áudio e o texto ao Google Gemini.
- **Vibração:** feedback ao gravar (pode ser desligado em Preferências).

## 7. Crianças
O Dicta AI não é destinado a menores de 18 anos e não coleta dados de crianças de forma
intencional.

## 8. Alterações
Se esta política mudar (por exemplo, quando o app passar a oferecer um plano pago com
servidor próprio), a nova versão será publicada neste mesmo endereço com a data atualizada,
e mudanças relevantes serão avisadas no app.
