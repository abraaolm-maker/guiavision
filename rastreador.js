// =============================================================
// RASTREADOR
// O modelo de IA olha cada quadro do vídeo separadamente.
// Ele não sabe que a pessoa do quadro 10 é a mesma do quadro 11.
// O rastreador faz essa ligação: dá um número (id) para cada pessoa
// e guarda o histórico do tamanho da caixa dela.
// Ideia adaptada do projeto SightWalk (Paly Robotics, licença MIT).
// =============================================================

// Mede quanto duas caixas se sobrepõem, de 0 (nada) a 1 (iguais).
// Esse número se chama IoU: "interseção sobre união".
function sobreposicao(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const intersecao = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const uniao = a.w * a.h + b.w * b.h - intersecao;
  return uniao > 0 ? intersecao / uniao : 0;
}

// Diz de que lado da imagem a caixa está.
function ladoDaCaixa(caixa) {
  const centro = caixa.x + caixa.w / 2;
  if (centro < 1 / 3) return "esquerda";
  if (centro > 2 / 3) return "direita";
  return "frente";
}

// A caixa está na faixa central, por onde o usuário vai passar?
function estaNoCaminho(caixa) {
  const centro = caixa.x + caixa.w / 2;
  return centro >= CONFIG.zonaCentral.inicio && centro <= CONFIG.zonaCentral.fim;
}

class Rastreador {
  constructor() {
    this.trilhas = [];   // cada trilha é uma pessoa sendo seguida
    this.proximoId = 1;
  }

  // Recebe as detecções de um quadro e atualiza as trilhas.
  // Cada detecção: { classe, confianca, caixa: {x, y, w, h} } com valores de 0 a 1.
  atualizar(deteccoes) {
    const usadas = new Set();

    // 1) Para cada trilha existente, procura a detecção mais parecida
    for (const trilha of this.trilhas) {
      let melhor = -1;
      let melhorValor = CONFIG.sobreposicaoMinima;
      deteccoes.forEach((d, i) => {
        if (usadas.has(i) || d.classe !== trilha.classe) return;
        const valor = sobreposicao(trilha.caixa, d.caixa);
        if (valor >= melhorValor) { melhorValor = valor; melhor = i; }
      });

      if (melhor >= 0) {
        const d = deteccoes[melhor];
        usadas.add(melhor);
        trilha.caixa = d.caixa;
        trilha.confianca = d.confianca;
        trilha.vezesVista += 1;
        trilha.quadrosSemVer = 0;
        trilha.historicoArea.push(d.caixa.w * d.caixa.h);
        if (trilha.historicoArea.length > CONFIG.janelaAproximacao) trilha.historicoArea.shift();
      } else {
        trilha.quadrosSemVer += 1;
      }
    }

    // 2) Detecções que não combinaram com ninguém viram trilhas novas
    deteccoes.forEach((d, i) => {
      if (usadas.has(i)) return;
      this.trilhas.push({
        id: this.proximoId++,
        classe: d.classe,
        caixa: d.caixa,
        confianca: d.confianca,
        vezesVista: 1,
        quadrosSemVer: 0,
        historicoArea: [d.caixa.w * d.caixa.h],
        ultimoAviso: 0,
      });
    });

    // 3) Esquece quem sumiu há muitos quadros
    this.trilhas = this.trilhas.filter(t => t.quadrosSemVer <= CONFIG.quadrosParaEsquecer);

    // 4) Calcula a situação de cada trilha
    for (const t of this.trilhas) t.situacao = this.avaliar(t);
    return this.trilhas;
  }

  // Decide a situação de uma trilha:
  // "nova" (ainda não confirmada), "longe", "afastando", "parada", "aproximando" ou "muito perto".
  // "parada" quer dizer que a distância quase não muda.
  avaliar(t) {
    if (t.vezesVista < CONFIG.quadrosParaConfirmar || t.quadrosSemVer > 0) return "nova";

    const area = t.caixa.w * t.caixa.h;
    if (area < CONFIG.areaMinima) return "longe";
    if (area >= CONFIG.areaMuitoPerto && estaNoCaminho(t.caixa)) return "muito perto";

    // Compara a área de agora com a área mais antiga da janela.
    // Se cresceu bastante, a pessoa está ficando mais perto.
    const h = t.historicoArea;
    if (h.length >= Math.min(4, CONFIG.janelaAproximacao)) {
      const crescimento = (h[h.length - 1] - h[0]) / h[0];
      if (crescimento >= CONFIG.crescimentoMinimo && estaNoCaminho(t.caixa)) return "aproximando";
      if (crescimento <= -CONFIG.crescimentoMinimo) return "afastando";
    }
    return "parada";
  }
}
