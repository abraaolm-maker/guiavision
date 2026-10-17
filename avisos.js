// =============================================================
// AVISOS: voz, bip e vibração (Fase 1)
// No celular, som e voz só funcionam depois que o usuário toca na tela.
// Por isso a função "liberar" é chamada no botão "Iniciar".
//
// Regra: o sistema mostra tudo na tela, mas fala pouco.
// - Só avisa o que está no caminho e perto (ver rastreador.js)
// - Fala no máximo um aviso por vez: o mais urgente
// - A mesma palavra ("obstáculo", "buraco"...) não repete antes de alguns segundos
// =============================================================

// Diz quão urgente é uma trilha. 0 = não avisa.
function prioridade(trilha) {
  if (trilha.quadrosSemVer > 0) return 0;
  const tipo = tipoDe(trilha.classe);
  const s = trilha.situacao;
  if (tipo === "movel") {
    if (s === "muito perto") return CONFIG.prioridade["movel muito perto"];
    if (s === "aproximando") return CONFIG.prioridade["movel aproximando"];
    return 0;
  }
  if (tipo === "chao" && s === "perto") return CONFIG.prioridade[palavraDe(trilha.classe)] || 1;
  if (tipo === "fixo" && s === "muito perto") return CONFIG.prioridade["obstáculo"];
  return 0;
}

// Texto falado para uma trilha
function textoDoAviso(trilha) {
  const palavra = palavraDe(trilha.classe);
  const Palavra = primeiraMaiuscula(palavra);
  if (tipoDe(trilha.classe) === "movel") {
    return trilha.situacao === "muito perto"
      ? `Atenção, ${palavra} muito perto à frente`
      : `${Palavra} se aproximando à frente`;
  }
  return `${Palavra} à frente`;
}

const Avisos = {
  audio: null,
  voz: null,
  ultimoAvisoGeral: 0,
  ultimaPrioridade: 0,
  ultimoPorPalavra: {},
  ligado: { voz: true, bip: true, vibrar: true },

  // Chamado no toque do botão Iniciar
  liberar() {
    try {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (Contexto && !this.audio) this.audio = new Contexto();
      if (this.audio && this.audio.state === "suspended") this.audio.resume();
    } catch (e) { console.warn("Som indisponível", e); }

    if ("speechSynthesis" in window) {
      // Fala vazia: "acorda" a voz no iPhone
      speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      this.escolherVoz();
      speechSynthesis.onvoiceschanged = () => this.escolherVoz();
    }
  },

  escolherVoz() {
    const vozes = speechSynthesis.getVoices();
    this.voz = vozes.find(v => v.lang === CONFIG.idiomaVoz)
      || vozes.find(v => v.lang && v.lang.startsWith("pt"))
      || null;
  },

  // Bip curto. "agudo" = mais urgente.
  bip(agudo) {
    if (!this.ligado.bip || !this.audio) return;
    const agora = this.audio.currentTime;
    const osc = this.audio.createOscillator();
    const volume = this.audio.createGain();
    osc.type = "sine";
    osc.frequency.value = agudo ? 1200 : 800;
    volume.gain.setValueAtTime(0.0001, agora);
    volume.gain.exponentialRampToValueAtTime(0.4, agora + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, agora + 0.25);
    osc.connect(volume).connect(this.audio.destination);
    osc.start(agora);
    osc.stop(agora + 0.3);
  },

  falar(texto) {
    if (!this.ligado.voz || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel(); // corta a frase anterior para não acumular
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = CONFIG.idiomaVoz;
    if (this.voz) u.voice = this.voz;
    u.rate = 1.1;
    speechSynthesis.speak(u);
  },

  // Vibração funciona no Android. No iPhone, o navegador não permite.
  vibrar() {
    if (this.ligado.vibrar && navigator.vibrate) navigator.vibrate(CONFIG.padraoVibracao);
  },

  // Recebe todas as trilhas e avisa NO MÁXIMO UMA: a mais urgente.
  // Devolve o texto do aviso, ou null se não avisou.
  avisarMaisUrgente(trilhas) {
    const candidatas = trilhas
      .map(t => ({ t, p: prioridade(t) }))
      .filter(x => x.p > 0)
      .sort((a, b) => b.p - a.p);
    for (const { t, p } of candidatas) {
      const texto = this.talvezAvisar(t, p);
      if (texto) return texto;
    }
    return null;
  },

  talvezAvisar(trilha, p) {
    const agora = performance.now();
    const palavra = palavraDe(trilha.classe);
    const chave = palavra + "|" + trilha.situacao;

    // Se a situação piorou (ex.: de "aproximando" para "muito perto"), avisa na hora
    const piorou = trilha.situacao === "muito perto" && trilha.ultimaSituacaoAvisada !== "muito perto"
      && tipoDe(trilha.classe) === "movel";
    // Um aviso mais urgente que o último pode passar na frente da pausa geral
    const maisUrgente = p > this.ultimaPrioridade;

    if (!piorou && agora - (this.ultimoPorPalavra[chave] || 0) < CONFIG.intervaloMesmaPalavra) return null;
    if (!piorou && !maisUrgente && agora - this.ultimoAvisoGeral < CONFIG.intervaloGeral) return null;

    trilha.ultimaSituacaoAvisada = trilha.situacao;
    this.ultimoPorPalavra[chave] = agora;
    this.ultimoAvisoGeral = agora;
    this.ultimaPrioridade = p;
    setTimeout(() => { if (performance.now() - this.ultimoAvisoGeral >= CONFIG.intervaloGeral) this.ultimaPrioridade = 0; }, CONFIG.intervaloGeral);

    const texto = textoDoAviso(trilha);
    this.bip(p >= CONFIG.prioridade["buraco"]);
    this.vibrar();
    this.falar(texto);
    return texto;
  },
};

function primeiraMaiuscula(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
