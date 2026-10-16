// =============================================================
// AVISOS: voz, bip e vibração
// No celular, som e voz só funcionam depois que o usuário toca na tela.
// Por isso a função "liberar" é chamada no botão "Iniciar".
// =============================================================

const Avisos = {
  audio: null,
  voz: null,
  ultimoAvisoGeral: 0,
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
      const u = new SpeechSynthesisUtterance("");
      speechSynthesis.speak(u);
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

  // Decide se uma trilha merece aviso agora e, se sim, avisa.
  // Devolve o texto do aviso, ou null se não avisou.
  talvezAvisar(trilha) {
    if (trilha.situacao !== "aproximando" && trilha.situacao !== "muito perto") return null;

    const agora = performance.now();
    const urgente = trilha.situacao === "muito perto";
    // Se a situação piorou (de "aproximando" para "muito perto"), avisa na hora,
    // sem esperar a pausa da mesma pessoa.
    const piorou = urgente && trilha.ultimaSituacaoAvisada !== "muito perto";
    if (!piorou && agora - trilha.ultimoAviso < CONFIG.intervaloMesmaPessoa) return null;
    if (!piorou && agora - this.ultimoAvisoGeral < CONFIG.intervaloGeral) return null;

    const nome = CONFIG.nomes[trilha.classe] || trilha.classe;
    const texto = urgente
      ? `Atenção, ${nome} muito perto à frente`
      : `${primeiraMaiuscula(nome)} se aproximando à frente`;

    trilha.ultimoAviso = agora;
    trilha.ultimaSituacaoAvisada = trilha.situacao;
    this.ultimoAvisoGeral = agora;
    this.bip(urgente);
    this.vibrar();
    this.falar(texto);
    return texto;
  },
};

function primeiraMaiuscula(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
