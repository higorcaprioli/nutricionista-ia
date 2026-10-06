// Plano alimentar (do protocolo nutricional em PDF) e plano de treino sugerido.

export const MEALS = [
  {
    id: "cafe", time: "08:00", name: "Café da manhã", kcal: 500, water: null,
    options: [
      {
        id: "A", name: "Panqueca de frango",
        ingredients: ["3 ovos inteiros", "40 g aveia em flocos finos", "80 g peito de frango cozido e desfiado", "1 tomate em cubos", "orégano, sal, pimenta"],
        prep: "Bata ovos + aveia e descanse 5 min (a aveia hidrata; a massa não quebra). Antiaderente em fogo médio-baixo, sem óleo: metade da massa, tampe 2-3 min, vire. Recheie com frango + tomate + orégano e dobre.",
        kcal: 500, p: 48, f: 21, c: 28, fiber: 4,
      },
      {
        id: "B", name: "Omelete recheada com batata",
        ingredients: ["3 ovos + 2 claras", "100 g batata inglesa cozida com casca, em cubos", "40 g queijo minas frescal", "cebolinha, sal"],
        prep: "Doure a batata já cozida 2 min na antiaderente. Bata ovos e claras, despeje em fogo baixo; quando a borda firmar, distribua batata + queijo em metade, dobre e tampe 2 min.",
        kcal: 495, p: 44, f: 22, c: 26, fiber: 2,
      },
      {
        id: "C", name: "Panqueca doce de banana com whey",
        ingredients: ["2 ovos", "20 g whey isolado", "40 g aveia", "1 banana média (100 g)", "canela", "15 g pasta de amendoim integral"],
        prep: "Amasse a banana e misture ovos, aveia e whey até massa espessa. Fogo baixo — whey queima fácil, 3 min de cada lado. Finalize com a pasta de amendoim e canela.",
        kcal: 510, p: 42, f: 20, c: 40, fiber: 5,
      },
    ],
  },
  {
    id: "lanche", time: "11:00", name: "Lanche da manhã", kcal: 180, water: 400,
    options: [
      {
        id: "A", name: "Iogurte com banana",
        ingredients: ["200 g iogurte natural desnatado", "1 banana média amassada", "canela a gosto"],
        prep: "Amasse a banana com garfo e incorpore ao iogurte. Canela por cima.",
        kcal: 180, p: 13, f: 1, c: 31, fiber: 2,
      },
      {
        id: "B", name: "Ovos cozidos com maçã",
        ingredients: ["2 ovos cozidos", "1 maçã média com casca"],
        prep: "Ovos em água já fervente por 10 min; transfira para água gelada para facilitar a casca. Maçã sempre com casca — é onde está a fibra.",
        kcal: 215, p: 13, f: 10, c: 20, fiber: 3,
      },
      {
        id: "C", name: "Shake de mamão",
        ingredients: ["150 g mamão papaia", "20 g whey isolado", "150 mL água", "gelo", "canela"],
        prep: "Bata tudo até homogeneizar. Consumir imediatamente — o mamão oxida rápido e a textura se perde.",
        kcal: 165, p: 19, f: 1, c: 20, fiber: 2,
      },
    ],
  },
  {
    id: "almoco", time: "13:30", name: "Almoço", kcal: 510, water: 500,
    options: [
      {
        id: "A", name: "Hambúrguer de patinho na air fryer",
        ingredients: ["180 g patinho moído", "1 pão francês (50 g)", "alface, tomate, cebola roxa", "10 mL azeite extravirgem na salada", "sal, pimenta, alho em pó"],
        prep: "Modele disco de ~2 cm — não compacte demais, resseca. Air fryer preaquecida 200 °C, 10-12 min, virando aos 6 min, sem óleo. Monte no pão. Sem maionese.",
        kcal: 510, p: 43, f: 20, c: 32, fiber: 3,
      },
      {
        id: "B", name: "Patinho em cubos com batata rústica",
        ingredients: ["170 g patinho em cubos", "180 g batata inglesa com casca em gomos", "150 g salada", "10 mL azeite", "páprica, alho, alecrim"],
        prep: "Pré-cozinhe a batata 8 min — garante interior macio e casca crocante. Escorra, seque bem, tempere; air fryer 200 °C por 15 min sacudindo na metade. Carne selada 4-5 min em antiaderente quente.",
        kcal: 520, p: 42, f: 19, c: 36, fiber: 4,
      },
      {
        id: "C", name: "Panqueca salgada com molho de tomate",
        ingredients: ["3 ovos", "30 g aveia", "130 g frango desfiado", "80 g molho de tomate sem açúcar", "30 g queijo minas", "10 mL azeite na salada"],
        prep: "Massa igual à do café (ovos + aveia, 5 min de descanso). Recheie com frango + molho, cubra com queijo e tampe 2 min para derreter. Salada à parte.",
        kcal: 505, p: 47, f: 22, c: 24, fiber: 3,
      },
    ],
  },
  {
    id: "pretreino", time: "16:30", name: "Pré-treino", kcal: 190, water: null, note: "Treino 17:30-19:00",
    options: [
      {
        id: "A", name: "Whey com maçã",
        ingredients: ["30 g whey isolado em 300 mL de água", "1 maçã média com casca"],
        prep: "Dissolva o whey e consuma junto com a fruta, cerca de 60 min antes do treino.",
        kcal: 190, p: 25, f: 1, c: 19, fiber: 3,
      },
      {
        id: "B", name: "Whey com banana",
        ingredients: ["25 g whey isolado", "1 banana média", "300 mL água"],
        prep: "Bata tudo junto. Carboidrato de absorção mais rápida — preferível em dias de treino mais pesado de pernas.",
        kcal: 195, p: 21, f: 1, c: 26, fiber: 2,
      },
      {
        id: "C", name: "Frango com batata",
        ingredients: ["70 g frango desfiado", "80 g batata inglesa cozida com casca"],
        prep: "Alimento sólido — exige 90 min de antecedência em vez de 60. Cozinhe a batata na véspera; resfriada, forma amido resistente (efeito prebiótico).",
        kcal: 190, p: 23, f: 2, c: 20, fiber: 2,
      },
    ],
  },
  {
    id: "jantar", time: "20:00", name: "Jantar", kcal: 490, water: 500,
    options: [
      {
        id: "A", name: "Frango grelhado com batata e legumes",
        ingredients: ["130 g peito de frango", "200 g batata inglesa cozida com casca", "200 g brócolis, abobrinha e cenoura", "10 mL azeite", "limão, alho, ervas"],
        prep: "Frango selado 4 min de cada lado em antiaderente bem quente, sem óleo; descanse 3 min antes de cortar. Legumes no vapor 6-8 min, al dente. Azeite só ao servir.",
        kcal: 490, p: 44, f: 14, c: 45, fiber: 7,
      },
      {
        id: "B", name: "Hambúrguer com purê rústico",
        ingredients: ["150 g patinho moído", "180 g batata inglesa cozida com casca", "30 mL leite desnatado", "150 g salada verde", "10 mL azeite"],
        prep: "Hambúrguer na air fryer 200 °C por 10 min. Amasse a batata com garfo — processador transforma em goma. Incorpore o leite e o sal.",
        kcal: 495, p: 41, f: 18, c: 41, fiber: 5,
      },
      {
        id: "C", name: "Omelete robusta com batata sauté",
        ingredients: ["4 ovos + 2 claras", "150 g batata inglesa cozida em cubos", "100 g abobrinha e tomate", "10 mL azeite", "cebolinha"],
        prep: "Doure a batata sem óleo 4 min e reserve. Refogue os legumes. Despeje os ovos em fogo baixo, devolva batata e legumes, tampe 4 min. Azeite ao servir.",
        kcal: 500, p: 40, f: 22, c: 36, fiber: 5,
      },
    ],
  },
  {
    id: "ceia", time: "22:45", name: "Ceia", kcal: 165, water: null,
    options: [
      {
        id: "A", name: "Iogurte com mamão",
        ingredients: ["200 g iogurte natural integral", "150 g mamão papaia em cubos"],
        prep: "Integral, não desnatado — a gordura retarda o esvaziamento gástrico e sustenta melhor a madrugada.",
        kcal: 165, p: 14, f: 6, c: 25, fiber: 2,
      },
      {
        id: "B", name: "Ovos mexidos",
        ingredients: ["3 ovos inteiros", "sal, cebolinha"],
        prep: "Fogo baixo, mexendo continuamente, sem óleo. Retire ainda cremoso. Opção de menor carboidrato — útil nos dias em que o café foi a opção C.",
        kcal: 215, p: 19, f: 15, c: 2, fiber: 0,
      },
      {
        id: "C", name: "Proteína de digestão lenta",
        ingredients: ["25 g whey isolado", "100 g iogurte natural integral", "canela"],
        prep: "A matriz do iogurte retarda o esvaziamento gástrico e prolonga a liberação de aminoácidos. Preferível nos dias de treino tardio.",
        kcal: 175, p: 24, f: 5, c: 8, fiber: 0,
      },
    ],
  },
];

export const PROTOCOL_NOTES = [
  { title: "Fechamento do dia", text: "Qualquer combinação das opções mantém o dia entre 1.980 e 2.090 kcal, com proteína sempre ≥ 180 g. Dia A-A-A-A-A-A: 2.035 kcal · P 187 g · G 63 g · C 180 g · Fibra 21 g · Água 3,0 L." },
  { title: "Não reduzir a gordura abaixo de 0,8 g/kg", text: "Dietas muito baixas em gordura reduzem a testosterona total. Mantenha o azeite e os ovos inteiros." },
  { title: "Fibra é o elo fraco (21-24 g)", text: "Mantenha sempre a casca da batata e da maçã. Se houver queixa intestinal, troque o pão francês por pão integral (farinha integral como 1º ingrediente)." },
  { title: "Reavaliar em 4 semanas", text: "Perda < 0,3 kg/sem: cortar 150-200 kcal só de carboidrato. Perda > 0,8 kg/sem: acrescentar 150 kcal." },
];

// Plano de musculação sugerido: 4x/semana (o protocolo exige 3-4x), upper/lower.
// day: 0=domingo ... 6=sábado
export const WORKOUT_PLAN = [
  {
    day: 1, name: "Superiores A (empurrar + puxar)", focus: "Peito · Costas · Ombros",
    exercises: [
      ["Supino reto com halteres", "4 × 8-10"],
      ["Remada curvada com barra", "4 × 8-10"],
      ["Desenvolvimento com halteres", "3 × 10-12"],
      ["Puxada frontal", "3 × 10-12"],
      ["Elevação lateral", "3 × 12-15"],
      ["Tríceps corda", "3 × 12-15"],
      ["Rosca direta", "3 × 10-12"],
    ],
    cardio: "Esteira 20 min caminhada inclinada (5,5 km/h · 8-10%)",
  },
  {
    day: 2, name: "Inferiores A (quadríceps)", focus: "Pernas · Core",
    exercises: [
      ["Agachamento livre ou no smith", "4 × 6-8"],
      ["Leg press 45°", "3 × 10-12"],
      ["Cadeira extensora", "3 × 12-15"],
      ["Mesa flexora", "3 × 10-12"],
      ["Panturrilha em pé", "4 × 12-15"],
      ["Prancha", "3 × 40 s"],
    ],
    cardio: "Opcional: 10 min bike leve para soltar",
  },
  {
    day: 4, name: "Superiores B (puxar + empurrar)", focus: "Costas · Peito · Braços",
    exercises: [
      ["Barra fixa (ou graviton)", "4 × 6-10"],
      ["Supino inclinado com halteres", "4 × 8-10"],
      ["Remada baixa / cavalinho", "3 × 10-12"],
      ["Crucifixo ou peck deck", "3 × 12-15"],
      ["Face pull", "3 × 15"],
      ["Rosca martelo", "3 × 10-12"],
      ["Tríceps francês", "3 × 10-12"],
    ],
    cardio: "Esteira 20 min caminhada inclinada (5,5 km/h · 8-10%)",
  },
  {
    day: 5, name: "Inferiores B (posterior + glúteo)", focus: "Posterior · Glúteo · Core",
    exercises: [
      ["Levantamento terra romeno", "4 × 8-10"],
      ["Afundo / passada com halteres", "3 × 10 cada perna"],
      ["Elevação pélvica (hip thrust)", "3 × 10-12"],
      ["Cadeira flexora", "3 × 12-15"],
      ["Panturrilha sentado", "4 × 15"],
      ["Abdominal na polia", "3 × 12-15"],
    ],
    cardio: "Esteira 15-20 min caminhada",
  },
];

// Atividades e MET (Compendium of Physical Activities). treadmill = usa equação ACSM.
export const ACTIVITIES = [
  { id: "musculacao", name: "Musculação", met: { leve: 3.5, moderada: 5.0, intensa: 6.0 } },
  { id: "esteira", name: "Esteira", treadmill: true },
  { id: "caminhada", name: "Caminhada (rua)", met: { leve: 3.0, moderada: 3.8, intensa: 5.0 } },
  { id: "corrida", name: "Corrida (rua)", met: { leve: 8.0, moderada: 9.8, intensa: 11.5 } },
  { id: "bike", name: "Bicicleta / bike ergométrica", met: { leve: 5.5, moderada: 7.0, intensa: 10.0 } },
  { id: "hiit", name: "HIIT / funcional", met: { leve: 6.0, moderada: 8.0, intensa: 10.0 } },
  { id: "esporte", name: "Esporte (futebol, etc.)", met: { leve: 6.0, moderada: 7.0, intensa: 9.0 } },
  { id: "outro", name: "Outro", met: { leve: 3.0, moderada: 4.5, intensa: 6.5 } },
];

export const FAST_PHASES = [
  { h: 0, label: "Início", text: "Última refeição digerindo. Hidrate-se." },
  { h: 4, label: "Pós-absortivo", text: "Insulina caindo, corpo usa o que foi comido." },
  { h: 12, label: "Glicogênio em queda", text: "Maior uso de gordura como combustível." },
  { h: 16, label: "Cetose leve", text: "Fome costuma vir em ondas — passa em 15-20 min. Água + sal." },
  { h: 20, label: "Reta final", text: "Evite treino pesado. Café preto/chá ajudam." },
  { h: 24, label: "Concluído", text: "Quebre o jejum com proteína e refeição leve (ovos, iogurte)." },
];
