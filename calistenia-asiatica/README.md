# Calistenia Asiática

App de treinos em casa, sem equipamento, inspirado nas práticas asiáticas de movimento:
**Rajio Taiso** (Japão), **Qigong / Baduanjin / Shuai Shou / Pai Da**, **Tai Chi** e **Kung Fu** (China),
treinos coreanos **em pé e de baixo impacto** e **taekwondo**, **yoga e pranayama** (Índia),
**Ruesi Dadton** (Tailândia), **sumô** e o **método japonês da toalha**, além da calistenia clássica.

React + Vite + Tailwind, mesmo padrão do Dicta AI. Funciona 100% offline (PWA) e guarda os dados só no aparelho.

## O que tem
- **99 exercícios** com passo a passo, dica, cuidados e versões mais fácil e mais difícil. Dá para filtrar
  por categoria, área do corpo, posição (em pé, chão, cadeira) e origem.
- **27 treinos prontos**: Rádio Taiso matinal, Baduanjin completo, Shuai Shou 10 min, Barriga em pé,
  Pernas e glúteos, Braços sem peso, Tai Chi para equilíbrio, Força Kung Fu, Na cadeira (60+),
  Pausa no escritório, Antes de dormir, Caminhada japonesa intervalada, Desafio do Dragão (avançado) e outros.
- **Gerador de treinos**: escolha objetivo (8), tempo (5 a 60 min), nível (3), local, foco no corpo e estilo.
  São milhares de combinações, e cada toque em "Gerar outro" cria um treino novo. Dá para salvar nos favoritos.
- **Programas**: Desafio 28 dias, 14 dias de equilíbrio (60+) e 21 dias mente e corpo, com dias marcados
  automaticamente ao concluir o treino.
- **Player guiado**: cronômetro com anel de progresso, instrutor por voz em português, bipes nos 3 últimos
  segundos, aviso de "troque de lado", voltas do circuito, pausa, pular e voltar. A tela fica acesa durante o treino.
- **Progresso**: sequência de dias, melhor sequência, minutos totais, gráfico de 14 dias e histórico.
- **Ajustes**: voz, bipes, tempo de preparação e duração do descanso.

## Rodar
    npm install
    npm run dev        # desenvolvimento
    npm run lint && npm test && npm run build   # checagens + build em dist/

`dist/` pode ser publicado em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages) ou empacotado
numa WebView Android como o Dicta AI (o `base: './'` já está configurado para isso).

## Estrutura
- `src/data/exercicios.ts`: biblioteca de exercícios (para incluir um, adicione um objeto aqui)
- `src/data/treinos.ts`: treinos prontos (`blocoVolta` + `voltas` definem o circuito repetido)
- `src/data/programas.ts`: programas de vários dias
- `src/lib/gerador.ts`: gerador de treinos (determinístico pela semente)
- `src/lib/sequencia.ts`: transforma um treino na sequência exercício/descanso usada pelo player
- `src/components/`: telas

## Aviso
O app não substitui orientação médica ou de um profissional de educação física.
