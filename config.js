// =============================================================
// CONFIGURAÇÕES DO GUIAVISION
// Aqui ficam os números que controlam o comportamento do sistema.
// Mudem um de cada vez e testem para ver o efeito.
// =============================================================

const CONFIG = {
  // --- Modelo de IA ---
  // "lite_mobilenet_v2" é a versão mais leve do COCO-SSD, boa para celular.
  // "mobilenet_v2" acerta um pouco mais, mas é mais lenta.
  modeloBase: "lite_mobilenet_v2",

  // Quais objetos do COCO-SSD queremos acompanhar.
  // O COCO-SSD conhece 80 tipos. Exemplos: "person", "bicycle", "car", "dog".
  classesAcompanhadas: ["person"],

  // Nome em português de cada classe, para a tela e para a voz.
  nomes: { person: "pessoa", bicycle: "bicicleta", car: "carro", dog: "cachorro" },

  // Confiança mínima (de 0 a 1). Abaixo disso, a detecção é ignorada.
  // Pode ser ajustada na tela pelo controle deslizante.
  confiancaMinima: 0.5,

  // --- Rastreamento (seguir a mesma pessoa de um quadro para o outro) ---
  // Quanto duas caixas precisam se sobrepor (de 0 a 1) para serem a mesma pessoa.
  sobreposicaoMinima: 0.3,
  // Quantos quadros seguidos a pessoa precisa aparecer antes de contar como "confirmada".
  // Isso evita alarme falso de um quadro só.
  quadrosParaConfirmar: 4,
  // Depois de quantos quadros sem ver a pessoa ela é esquecida.
  quadrosParaEsquecer: 8,

  // --- Aproximação ---
  // Quantos quadros olhamos para trás para medir se a caixa cresceu.
  janelaAproximacao: 8,
  // Quanto a área da caixa precisa crescer nessa janela para dizer "se aproximando".
  // 0.25 significa crescer 25%.
  crescimentoMinimo: 0.25,
  // Tamanho mínimo da caixa (fração da imagem) para levar a sério.
  // Caixas muito pequenas são pessoas longe demais.
  areaMinima: 0.02,
  // Se a caixa ocupar mais que isso da imagem, a pessoa está muito perto.
  areaMuitoPerto: 0.30,

  // --- Zona de perigo ---
  // Faixa central da imagem por onde o usuário vai passar (de 0 = esquerda a 1 = direita).
  zonaCentral: { inicio: 0.30, fim: 0.70 },

  // --- Avisos ---
  // Tempo mínimo entre dois avisos para a mesma pessoa (milissegundos).
  intervaloMesmaPessoa: 5000,
  // Tempo mínimo entre quaisquer dois avisos, para não embolar a voz (milissegundos).
  intervaloGeral: 2500,
  // Padrão de vibração em milissegundos: vibra, pausa, vibra.
  padraoVibracao: [200, 100, 200],
  // Idioma da voz.
  idiomaVoz: "pt-BR",

  // --- Câmera ---
  // Largura pedida para a câmera. Menor = mais rápido.
  larguraCamera: 640,
};
