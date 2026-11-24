import type { ItemTreino, Nivel, Objetivo, Origem, Treino } from '../lib/tipos';

type Par = [string, number?];

function itens(lista: Par[]): ItemTreino[] {
  return lista.map(([ex, s]) => ({ ex, segundos: s ?? 0 }));
}

function treino(
  id: string,
  nome: string,
  emoji: string,
  nivel: Nivel,
  objetivos: Objetivo[],
  descricao: string,
  lista: Par[],
  extra: Partial<Pick<Treino, 'voltas' | 'blocoVolta' | 'descanso' | 'origem'>> = {},
): Treino {
  return { id, nome, emoji, nivel, objetivos, descricao, itens: itens(lista), descanso: 10, ...extra };
}

/** Segundos 0 = usa a duração padrão do exercício. */
export const TREINOS: Treino[] = [
  treino('rajio-taiso', 'Rádio Taiso matinal', '📻', 1, ['energia', 'flexibilidade'],
    'A ginástica do rádio japonesa: uma sequência curta e contínua que milhões de pessoas fazem toda manhã.',
    [['taiso-alongar-cima'], ['taiso-bracos-joelhos'], ['circulos-bracos'], ['flexao-extensao-tronco'],
     ['inclinacao-lateral'], ['torcao-bracos-soltos'], ['taiso-alongar-cima'], ['polichinelo-sem-salto'],
     ['taiso-bracos-joelhos'], ['taiso-respiracao-final', 45]],
    { descanso: 3, origem: 'Japão' }),

  treino('baduanjin', 'Baduanjin – Oito Brocados', '🎎', 1, ['equilibrio', 'flexibilidade', 'relaxar'],
    'O Qigong mais praticado da China: oito movimentos lentos que combinam alongamento, força suave e respiração.',
    [['qg-abrir-fechar', 30], ['bdj-sustentar-ceu', 75], ['bdj-arco', 75], ['bdj-separar-ceu-terra', 75],
     ['bdj-olhar-tras', 60], ['bdj-balancar-cabeca-cauda', 75], ['bdj-tocar-pes', 60], ['bdj-socos', 75],
     ['bdj-calcanhares', 45], ['qg-abrir-fechar', 45]],
    { descanso: 5, origem: 'China' }),

  treino('shuai-shou-10', 'Shuai Shou – 10 minutos', '👐', 1, ['energia', 'emagrecer', 'relaxar'],
    'O famoso balanço de braços: sem impacto, ideal para fazer vendo TV. Ativa a circulação e aquece o corpo.',
    [['rotacao-ombros', 30], ['shuai-shou', 180], ['qg-agitar-corpo', 45], ['shuai-shou', 180],
     ['pai-da', 60], ['shuai-shou', 120], ['qg-abrir-fechar', 45]],
    { descanso: 5, origem: 'China' }),

  treino('calistenia-asiatica-iniciante', 'Calistenia asiática – Iniciante', '🌸', 1, ['emagrecer', 'tonificar', 'energia'],
    'A rotina "viral": exercícios em pé, sem equipamento e sem pulos. Perfeita para começar hoje.',
    [['rotacao-ombros'], ['circulo-quadril'], ['marcha-bracos'], ['step-touch-bracos'],
     ['joelho-cotovelo-cruzado'], ['circulos-bracos-pequenos'], ['agachamento'], ['abdominal-em-pe-lateral'],
     ['shuai-shou', 60], ['polichinelo-sem-salto'], ['taiso-respiracao-final']],
    { blocoVolta: [2, 9], voltas: 2 }),

  treino('queima-em-pe', 'Queima em pé – 20 min', '🔥', 2, ['emagrecer', 'energia'],
    'Cardio de baixo impacto com movimentos coreanos e chineses. Sobe o coração sem castigar os joelhos.',
    [['taiso-bracos-joelhos'], ['circulos-bracos'], ['marcha-bracos', 45], ['step-touch-bracos', 45],
     ['joelho-cotovelo-cruzado', 45], ['socos-cima', 45], ['patinador-leve', 45], ['ma-bu-socos', 45],
     ['polichinelo-sem-salto', 45], ['chute-frontal', 45], ['respiracao-ha']],
    { blocoVolta: [2, 9], voltas: 3, descanso: 15 }),

  treino('barriga-em-pe', 'Barriga em pé', '⏳', 1, ['emagrecer', 'tonificar'],
    'Abdominais sem deitar no chão. Inspirado nos treinos coreanos que viralizaram.',
    [['torcao-bracos-soltos'], ['circulo-quadril'], ['joelho-cotovelo-cruzado'], ['abdominal-em-pe-lateral'],
     ['marcha-bracos', 40], ['inclinacao-lateral'], ['chute-frontal'], ['taiso-respiracao-final']],
    { blocoVolta: [2, 6], voltas: 3 }),

  treino('pernas-gluteos', 'Pernas e glúteos', '🍑', 2, ['tonificar', 'forca'],
    'Coxas e glúteos firmes com posturas do kung fu, do sumô e chutes do taekwondo.',
    [['circulo-quadril'], ['punhos-tornozelos'], ['agachamento'], ['coice-em-pe'], ['elevacao-lateral-perna'],
     ['ma-bu'], ['afundo-tras'], ['agachamento-sumo-panturrilha'], ['chute-lateral'], ['panturrilha'],
     ['quadriceps-em-pe'], ['posterior-em-pe']],
    { blocoVolta: [2, 9], voltas: 2, descanso: 15 }),

  treino('bracos-sem-peso', 'Braços firmes sem peso', '💪', 1, ['tonificar'],
    'Adeus "tchauzinho": braços e ombros trabalhados só com o peso do corpo.',
    [['rotacao-ombros'], ['circulos-bracos'], ['circulos-bracos-pequenos'], ['pulsos-triceps-tras'],
     ['abertura-peito-cotovelos'], ['socos-cima'], ['flexao-parede'], ['bdj-socos', 45],
     ['triceps-alongamento'], ['abrir-peito']],
    { blocoVolta: [2, 7], voltas: 2 }),

  treino('postura-costas', 'Postura e costas', '🧍', 1, ['postura', 'flexibilidade'],
    'Para quem passa o dia sentado ou no celular: abre o peito, fortalece as costas e solta o pescoço.',
    [['pescoco-suave'], ['rotacao-ombros'], ['abertura-peito-cotovelos'], ['bdj-sustentar-ceu'],
     ['bdj-olhar-tras'], ['ruesi-alongamento'], ['perdigueiro'], ['superman'], ['gato-vaca'],
     ['cobra'], ['postura-crianca'], ['abrir-peito']]),

  treino('tai-chi-equilibrio', 'Tai Chi – Equilíbrio', '☁️', 1, ['equilibrio', 'relaxar'],
    'Movimentos lentos do Tai Chi para equilíbrio, coordenação e prevenção de quedas.',
    [['qg-abrir-fechar'], ['tc-maos-nuvem', 90], ['tc-crina-cavalo', 90], ['tc-galo-dourado', 60],
     ['tc-repelir-macaco', 90], ['tc-maos-nuvem', 90], ['bdj-calcanhares'], ['zhan-zhuang', 60],
     ['taiso-respiracao-final']],
    { descanso: 8, origem: 'China' }),

  treino('forca-kung-fu', 'Força Kung Fu', '🥋', 2, ['forca', 'tonificar'],
    'Posturas e golpes das artes marciais chinesas para pernas de aço e braços fortes.',
    [['qg-agitar-corpo', 40], ['circulo-quadril'], ['ma-bu'], ['ma-bu-socos'], ['gong-bu'], ['bdj-arco'],
     ['agachamento'], ['bdj-socos'], ['zhan-zhuang'], ['bdj-balancar-cabeca-cauda'], ['respiracao-ha']],
    { blocoVolta: [2, 9], voltas: 2, descanso: 15, origem: 'China' }),

  treino('core-chao', 'Core no tapete', '🧘', 2, ['tonificar', 'postura', 'forca'],
    'Abdômen e lombar fortes com exercícios no chão.',
    [['gato-vaca'], ['dead-bug'], ['perdigueiro'], ['abdominal-curto'], ['prancha'], ['bicicleta'],
     ['ponte-gluteos'], ['prancha-lateral'], ['elevacao-pernas'], ['postura-crianca'], ['torcao-deitada']],
    { blocoVolta: [1, 8], voltas: 2, descanso: 15 }),

  treino('cadeira-60', 'Na cadeira (60+)', '🪑', 1, ['forca', 'equilibrio', 'energia'],
    'Seguro e eficaz: tudo sentado ou com apoio da cadeira. Ideal para idosos ou recuperação.',
    [['rotacao-ombros'], ['pescoco-suave'], ['marcha-sentada'], ['shuai-shou-sentado'],
     ['extensao-joelho-sentado'], ['sentar-levantar'], ['torcao-sentada'], ['marcha-sentada'],
     ['sentar-levantar'], ['nadi-shodhana', 60]]),

  treino('pausa-escritorio', 'Pausa no escritório – 5 min', '💼', 1, ['postura', 'energia'],
    'Solte o corpo entre uma reunião e outra, sem suar.',
    [['pescoco-suave', 30], ['rotacao-ombros', 30], ['abertura-peito-cotovelos', 30], ['torcao-sentada', 30],
     ['bdj-sustentar-ceu', 40], ['abrir-peito', 30], ['shuai-shou', 60], ['respiracao-ha', 30]],
    { descanso: 3 }),

  treino('antes-dormir', 'Antes de dormir', '🌙', 1, ['relaxar', 'flexibilidade'],
    'Alongamentos suaves e respiração para desacelerar e dormir melhor.',
    [['qg-abrir-fechar'], ['bdj-separar-ceu-terra'], ['postura-crianca', 60], ['gato-vaca'], ['borboleta'],
     ['joelhos-peito'], ['torcao-deitada'], ['respiracao-abdominal', 90], ['nadi-shodhana', 90]],
    { descanso: 5 }),

  treino('desperte', 'Desperte – 7 min', '🌅', 1, ['energia'],
    'Para sair da cama com energia: ativa circulação e articulações.',
    [['qg-agitar-corpo', 40], ['taiso-alongar-cima'], ['pai-da', 60], ['circulos-bracos'],
     ['torcao-bracos-soltos'], ['marcha-bracos'], ['shuai-shou', 60], ['respiracao-ha']],
    { descanso: 5 }),

  treino('caminhada-japonesa', 'Caminhada japonesa intervalada (no lugar)', '🗾', 1, ['emagrecer', 'energia'],
    'Baseada no método de caminhada intervalada estudado no Japão: alterne 3 min rápido e 3 min tranquilo. Pode fazer na rua também!',
    [['punhos-tornozelos'], ['marcha-bracos', 180], ['shuai-shou', 180]],
    { blocoVolta: [1, 2], voltas: 5, descanso: 0, origem: 'Japão' }),

  treino('intermediario-30', 'Calistenia asiática – Intermediário', '🏯', 2, ['emagrecer', 'tonificar', 'forca'],
    'Treino completo de 30 minutos: cardio leve, força e equilíbrio em circuitos.',
    [['taiso-bracos-joelhos'], ['circulos-bracos'], ['circulo-quadril'],
     ['agachamento', 45], ['joelho-cotovelo-cruzado', 45], ['flexao-parede', 45], ['ma-bu-socos', 45],
     ['afundo-tras', 45], ['circulos-bracos-pequenos', 45], ['chute-lateral', 45], ['polichinelo-sem-salto', 45],
     ['tc-galo-dourado'], ['posterior-em-pe'], ['abrir-peito'], ['taiso-respiracao-final']],
    { blocoVolta: [3, 10], voltas: 3, descanso: 15 }),

  treino('avancado-dragao', 'Desafio do Dragão (avançado)', '🐉', 3, ['emagrecer', 'forca'],
    'Intervalado intenso: 40s de esforço, 20s de pausa. Para quem já treina.',
    [['qg-agitar-corpo', 40], ['taiso-bracos-joelhos'], ['polichinelo'], ['agachamento'], ['flexao'],
     ['ma-bu-socos'], ['burpee-sem-salto'], ['afundo-tras'], ['escalador-lento'], ['shiko'], ['prancha', 45],
     ['postura-crianca'], ['respiracao-ha']],
    { blocoVolta: [2, 10], voltas: 3, descanso: 20 }),

  treino('quadril-cocoras', 'Mobilidade de quadril e cócoras', '🧘‍♂️', 1, ['flexibilidade', 'postura'],
    'Recupere o agachamento profundo que é natural em toda a Ásia.',
    [['circulo-quadril'], ['punhos-tornozelos'], ['agachamento', 30], ['agachamento-asiatico'],
     ['agachamento-asiatico-balanco'], ['gong-bu'], ['borboleta'], ['agachamento-asiatico', 60], ['joelhos-peito']]),

  treino('respiracao-relax', 'Respirar e relaxar – 8 min', '🍃', 1, ['relaxar'],
    'Respirações do yoga e do qigong para baixar a ansiedade.',
    [['qg-abrir-fechar'], ['respiracao-ha'], ['respiracao-abdominal', 120], ['nadi-shodhana', 120],
     ['taiso-respiracao-final', 45]],
    { descanso: 5 }),

  treino('qigong-ativacao', 'Pai Da + Qigong de ativação', '👏', 1, ['energia', 'relaxar'],
    'Tapinhas, sacudidas e balanços para "acordar" o corpo e soltar a tensão.',
    [['qg-agitar-corpo'], ['pai-da', 90], ['shuai-shou', 90], ['torcao-bracos-soltos', 60],
     ['bdj-calcanhares'], ['qg-abrir-fechar']],
    { descanso: 5, origem: 'China' }),

  treino('alongamento-completo', 'Alongamento completo', '🤸‍♀️', 1, ['flexibilidade', 'relaxar'],
    'Alongue o corpo inteiro da cabeça aos pés.',
    [['pescoco-suave'], ['alongamento-ombro-cruzado'], ['triceps-alongamento'], ['abrir-peito'],
     ['ruesi-alongamento'], ['inclinacao-lateral'], ['posterior-em-pe'], ['quadriceps-em-pe'],
     ['gato-vaca'], ['cobra'], ['postura-crianca'], ['borboleta'], ['torcao-deitada']],
    { descanso: 5 }),

  treino('saudacao-sol', 'Saudação ao sol – 12 min', '☀️', 2, ['flexibilidade', 'forca', 'energia'],
    'A sequência clássica da Índia repetida em ritmo de respiração.',
    [['taiso-alongar-cima'], ['circulos-bracos'], ['saudacao-sol', 90], ['postura-crianca', 30]],
    { blocoVolta: [2, 3], voltas: 5, descanso: 5, origem: 'Índia' }),

  treino('toalha-postura', 'Toalha japonesa + postura', '🧻', 1, ['postura', 'relaxar'],
    'O método da toalha com preparação e alongamentos complementares.',
    [['gato-vaca'], ['joelhos-peito'], ['toalha-japonesa', 300], ['joelhos-peito'], ['postura-crianca']],
    { descanso: 10, origem: 'Japão' }),

  treino('sumo-forca', 'Força do sumô', '🤼', 3, ['forca'],
    'Pernas e quadril fortes como um rikishi.',
    [['circulo-quadril'], ['agachamento-asiatico', 30], ['agachamento-sumo-panturrilha'], ['shiko'],
     ['cadeira-isometrica'], ['ma-bu'], ['panturrilha'], ['borboleta']],
    { blocoVolta: [2, 6], voltas: 3, descanso: 20, origem: 'Japão' }),

  treino('express-10', 'Corpo todo express – 10 min', '⚡', 1, ['emagrecer', 'tonificar'],
    'Pouco tempo? Este circuito trabalha tudo em 10 minutos.',
    [['taiso-bracos-joelhos'], ['agachamento', 40], ['flexao-parede', 40], ['joelho-cotovelo-cruzado', 40],
     ['coice-em-pe', 40], ['marcha-bracos', 40], ['taiso-respiracao-final']],
    { blocoVolta: [1, 5], voltas: 2, descanso: 10 }),
];

export const ORIGENS: Origem[] = ['Japão', 'China', 'Coreia', 'Índia', 'Tailândia', 'Universal'];
