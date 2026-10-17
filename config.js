// =============================================================
// CONFIGURAÇÕES DO GUIAVISION
// Aqui ficam os números que controlam o comportamento do sistema.
// Mudem um de cada vez e testem para ver o efeito.
// =============================================================

const CONFIG = {
  // --- Modelo pronto (COCO-SSD): pessoas e veículos ---
  // "lite_mobilenet_v2" é a versão mais leve do COCO-SSD, boa para celular.
  modeloBase: "lite_mobilenet_v2",

  // --- Modelo próprio da turma, treinado no Roboflow ---
  roboflow: {
    // Identificador do modelo treinado (projeto GuiaVision Base, versão 2).
    modeloId: "abrao/guiavision-base-2-yolov8n-t1",
    // COLE AQUI a "Publishable API Key" do Roboflow, entre as aspas.
    // Onde achar: Roboflow > Settings > API Keys > Publishable API Key.
    // Essa chave foi feita para ficar visível em sites. NUNCA coloque aqui a "Private API Key".
    chavePublica: "rf_4F9djfIFNKZMOMwW76YwxZxKCY52",
    // Confiança mínima. 0.28 é o valor ideal indicado pela avaliação do modelo.
    confianca: 0.28,
  },

  // --- Classes e alertas (decididos pela turma, ver CLASSES.md) ---
  // nome:    o que aparece na tela
  // palavra: o que a voz fala
  // tipo:    "movel"    -> pessoa e veículo: avisa quando se aproxima ou está muito perto
  //          "chao"     -> buraco, escada, rampa: avisa quando está perto, no caminho
  //          "fixo"     -> obstáculo em pé: avisa só quando está muito perto, no caminho
  //          "silencio" -> só aparece na tela, nunca fala
  // fonte:   "coco" (modelo pronto) ou "roboflow" (modelo da turma)
  classes: {
    // COCO-SSD
    "person":     { nome: "pessoa",    palavra: "pessoa",  tipo: "movel", fonte: "coco" },
    "bicycle":    { nome: "bicicleta", palavra: "veículo", tipo: "movel", fonte: "coco" },
    "motorcycle": { nome: "moto",      palavra: "veículo", tipo: "movel", fonte: "coco" },
    "car":        { nome: "carro",     palavra: "veículo", tipo: "movel", fonte: "coco" },
    "bus":        { nome: "ônibus",    palavra: "veículo", tipo: "movel", fonte: "coco" },
    "truck":      { nome: "caminhão",  palavra: "veículo", tipo: "movel", fonte: "coco" },

    // Modelo da turma (Roboflow)
    "pothole":        { nome: "buraco",          palavra: "buraco",    tipo: "chao",     fonte: "roboflow" },
    "manhole_hazard": { nome: "bueiro com risco", palavra: "buraco",   tipo: "chao",     fonte: "roboflow" },
    "stairs":         { nome: "escada",          palavra: "escada",    tipo: "chao",     fonte: "roboflow" },
    "ramp":           { nome: "rampa",           palavra: "desnível",  tipo: "chao",     fonte: "roboflow" },
    "pole":           { nome: "poste",           palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "bollard":        { nome: "frade",           palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "cone":           { nome: "cone",            palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "barrier":        { nome: "barreira",        palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "tree_trunk":     { nome: "tronco",          palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "trash":          { nome: "lixo",            palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "dumpster":       { nome: "caçamba",         palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    // Galho fica no chão, mas só avisa muito perto, como os obstáculos (CLASSES.md)
    "branch":         { nome: "galho",           palavra: "obstáculo", tipo: "fixo",     fonte: "roboflow" },
    "manhole_cover":  { nome: "tampa de bueiro", palavra: "",          tipo: "silencio", fonte: "roboflow" },
  },

  // Ordem de urgência quando há vários riscos ao mesmo tempo (maior = mais urgente)
  prioridade: {
    "movel muito perto": 6,
    "buraco": 5,
    "escada": 4,
    "desnível": 3,
    "movel aproximando": 2,
    "obstáculo": 1,
  },

  // Confiança mínima do COCO-SSD (de 0 a 1). Ajustável na tela.
  confiancaMinima: 0.5,

  // --- Rastreamento (seguir o mesmo objeto de um quadro para o outro) ---
  sobreposicaoMinima: 0.3,
  // Quantas vezes o objeto precisa aparecer antes de contar como "confirmado"
  quadrosParaConfirmar: 4,
  // Depois de quantas análises sem ver o objeto ele é esquecido
  quadrosParaEsquecer: 8,

  // --- Distância de objetos que se movem (pessoa e veículo) ---
  janelaAproximacao: 8,
  crescimentoMinimo: 0.25,   // a caixa precisa crescer 25% para dizer "se aproximando"
  areaMinima: 0.02,          // caixas menores que isso estão longe demais
  areaMuitoPerto: 0.30,      // caixa maior que 30% da imagem = muito perto

  // --- Distância de objetos parados ---
  // Quem anda é o usuário. Quanto mais baixo na imagem, mais perto do pé.
  // 0 = topo da imagem, 1 = parte de baixo.
  chaoPerto: 0.70,           // buraco, escada, rampa: "perto" quando a base da caixa passa de 70%
  fixoMuitoPertoBase: 0.90,  // obstáculo: "muito perto" quando a base passa de 90%...
  fixoMuitoPertoAltura: 0.55,// ...ou quando ele ocupa mais de 55% da altura da imagem

  // --- Zona de perigo ---
  zonaCentral: { inicio: 0.30, fim: 0.70 },

  // --- Avisos ---
  intervaloMesmaPalavra: 5000, // a mesma palavra ("obstáculo") só repete depois de 5 s
  intervaloGeral: 2500,        // tempo mínimo entre quaisquer dois avisos
  padraoVibracao: [200, 100, 200],
  idiomaVoz: "pt-BR",

  // --- Câmera ---
  larguraCamera: 640,
};
