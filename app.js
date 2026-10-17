// =============================================================
// APP PRINCIPAL
// Liga tudo: câmera -> modelos de IA -> rastreadores -> desenho -> avisos.
// Dois modelos se revezam, um quadro cada, para não pesar no celular:
//   COCO-SSD (pronto): pessoas e veículos
//   Modelo da turma (Roboflow): buracos, escadas, rampas e obstáculos
// =============================================================

const el = {
  inicio: document.getElementById("tela-inicio"),
  camera: document.getElementById("tela-camera"),
  btnIniciar: document.getElementById("btn-iniciar"),
  btnParar: document.getElementById("btn-parar"),
  arquivo: document.getElementById("arquivo-video"),
  carregando: document.getElementById("msg-carregando"),
  video: document.getElementById("video"),
  canvas: document.getElementById("canvas"),
  status: document.getElementById("status"),
  fps: document.getElementById("fps"),
  modeloTurma: document.getElementById("modelo-turma"),
  confianca: document.getElementById("confianca"),
  confiancaValor: document.getElementById("confianca-valor"),
  chkVoz: document.getElementById("chk-voz"),
  chkBip: document.getElementById("chk-bip"),
  chkVibrar: document.getElementById("chk-vibrar"),
  chkZona: document.getElementById("chk-zona"),
  erro: document.getElementById("erro"),
};
const ctx = el.canvas.getContext("2d");

let modeloPessoas = null;    // COCO-SSD
let motorTurma = null;       // inferencejs (modelo da turma)
let workerTurma = null;
let rastreadores = novosRastreadores();
let rodando = false;
let fluxoCamera = null;
let fpsSuave = 0;
let ultimoQuadro = 0;
let vezDoDetector = 0;

// Cada modelo tem seu próprio rastreador. Assim, um objeto do modelo da turma
// não é "esquecido" no quadro em que só o COCO-SSD rodou.
function novosRastreadores() {
  return { coco: new Rastreador(1), roboflow: new Rastreador(1000) };
}
function todasTrilhas() {
  return [...rastreadores.coco.trilhas, ...rastreadores.roboflow.trilhas];
}

// ---------- Mensagens ----------
function mostrarErro(texto) {
  el.erro.textContent = texto;
  el.erro.hidden = false;
}
function situacaoModeloTurma(texto) {
  if (el.modeloTurma) el.modeloTurma.textContent = texto;
}

function explicarErroCamera(e) {
  if (!window.isSecureContext) {
    return "O navegador só libera a câmera em páginas seguras. Abra pelo endereço http://localhost no computador ou por um link https no celular.";
  }
  if (e && e.name === "NotAllowedError") return "A permissão da câmera foi negada. Libere a câmera nas configurações do navegador e tente de novo.";
  if (e && e.name === "NotFoundError") return "Nenhuma câmera foi encontrada neste aparelho.";
  if (e && e.name === "NotReadableError") return "A câmera está sendo usada por outro aplicativo. Feche o outro aplicativo e tente de novo.";
  return "Não foi possível abrir a câmera: " + (e && e.message ? e.message : e);
}

// ---------- Carregar os modelos ----------
async function carregarModeloPessoas() {
  if (modeloPessoas) return;
  await tf.ready();
  modeloPessoas = await cocoSsd.load({ base: CONFIG.modeloBase });
}

function carregarScript(url) {
  return new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = url;
    s.onload = ok;
    s.onerror = () => falha(new Error("não foi possível baixar " + url));
    document.head.appendChild(s);
  });
}

// O modelo da turma é opcional: se falhar, a página continua com pessoas e veículos.
async function carregarModeloTurma() {
  if (workerTurma) return;
  if (!CONFIG.roboflow.chavePublica) {
    situacaoModeloTurma("Modelo de obstáculos desligado: falta a chave pública em config.js");
    return;
  }
  try {
    situacaoModeloTurma("Carregando o modelo de obstáculos…");
    if (!window.inferencejs) await carregarScript("https://cdn.jsdelivr.net/npm/inferencejs@1.3.0/dist/inference.js");
    motorTurma = new inferencejs.InferenceEngine();
    workerTurma = await motorTurma.startWorkerByModelId(
      CONFIG.roboflow.modeloId,
      CONFIG.roboflow.chavePublica,
      [{ scoreThreshold: CONFIG.roboflow.confianca, iouThreshold: 0.5, maxNumBoxes: 20 }],
    );
    situacaoModeloTurma("Modelo de obstáculos carregado");
  } catch (e) {
    console.error(e);
    workerTurma = null;
    situacaoModeloTurma("Não foi possível carregar o modelo de obstáculos: " + (e && e.message ? e.message : e));
  }
}

async function carregarModelos() {
  el.carregando.hidden = false;
  await Promise.all([carregarModeloPessoas(), carregarModeloTurma()]);
  el.carregando.hidden = true;
}

// ---------- Fontes de vídeo ----------
async function abrirCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Este navegador não permite acessar a câmera.");
  }
  fluxoCamera = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" }, // câmera traseira no celular
      width: { ideal: CONFIG.larguraCamera },
    },
  });
  el.video.srcObject = fluxoCamera;
  await el.video.play();
}

async function abrirArquivo(origem) {
  el.video.srcObject = null;
  el.video.src = origem;
  el.video.loop = true;
  await el.video.play();
}

// ---------- Início e parada ----------
async function iniciar(origemVideo) {
  el.erro.hidden = true;
  el.btnIniciar.disabled = true;
  Avisos.liberar(); // precisa acontecer logo no toque do botão
  try {
    await carregarModelos();
    // A área do vídeo precisa estar visível antes do play, senão o navegador pausa o vídeo
    el.inicio.hidden = true;
    el.camera.hidden = false;
    if (origemVideo) await abrirArquivo(origemVideo);
    else await abrirCamera();
  } catch (e) {
    el.camera.hidden = true;
    el.inicio.hidden = false;
    el.btnIniciar.disabled = false;
    el.carregando.hidden = true;
    mostrarErro(origemVideo ? "Não foi possível abrir o vídeo: " + e.message : explicarErroCamera(e));
    return;
  }
  rastreadores = novosRastreadores();
  rodando = true;
  ultimoQuadro = performance.now();
  requestAnimationFrame(laco);
}

function parar() {
  rodando = false;
  if (fluxoCamera) fluxoCamera.getTracks().forEach(t => t.stop());
  fluxoCamera = null;
  el.video.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  el.camera.hidden = true;
  el.inicio.hidden = false;
  el.btnIniciar.disabled = false;
}

// ---------- Detectores ----------
// Os dois devolvem uma lista no mesmo formato:
// { classe, confianca, caixa: {x, y, w, h} } com valores de 0 a 1.
function tamanhoDe(fonte) {
  return { W: fonte.videoWidth || fonte.naturalWidth || fonte.width, H: fonte.videoHeight || fonte.naturalHeight || fonte.height };
}

async function detectarPessoas(fonte) {
  const brutas = await modeloPessoas.detect(fonte, 20, CONFIG.confiancaMinima);
  const { W, H } = tamanhoDe(fonte);
  return brutas
    .filter(d => CONFIG.classes[d.class] && CONFIG.classes[d.class].fonte === "coco")
    .map(d => ({
      classe: d.class,
      confianca: d.score,
      caixa: { x: d.bbox[0] / W, y: d.bbox[1] / H, w: d.bbox[2] / W, h: d.bbox[3] / H },
    }));
}

// O modelo da turma devolve a caixa pelo CENTRO (x, y), largura e altura, em pixels
async function detectarObstaculos(fonte) {
  const { W, H } = tamanhoDe(fonte);
  const previsoes = await motorTurma.infer(workerTurma, new inferencejs.CVImage(fonte));
  return previsoes
    .filter(p => CONFIG.classes[p.class] && p.confidence >= CONFIG.roboflow.confianca)
    .map(p => ({
      classe: p.class,
      confianca: p.confidence,
      caixa: {
        x: (p.bbox.x - p.bbox.width / 2) / W,
        y: (p.bbox.y - p.bbox.height / 2) / H,
        w: p.bbox.width / W,
        h: p.bbox.height / H,
      },
    }));
}

// Roda um dos detectores (revezando) e atualiza o rastreador dele
async function analisar(fonte) {
  const usarTurma = workerTurma && vezDoDetector % 2 === 1;
  vezDoDetector += 1;
  if (usarTurma) rastreadores.roboflow.atualizar(await detectarObstaculos(fonte));
  else rastreadores.coco.atualizar(await detectarPessoas(fonte));
}

// ---------- Laço principal: roda uma vez por quadro ----------
async function laco() {
  if (!rodando) return;

  const video = el.video;
  if (video.readyState >= 2 && video.videoWidth > 0) {
    if (el.canvas.width !== video.videoWidth) {
      el.canvas.width = video.videoWidth;
      el.canvas.height = video.videoHeight;
    }
    try {
      await analisar(video);
    } catch (e) {
      console.error(e);
    }
    desenhar();
    atualizarStatus();
    medirFps();
  }

  requestAnimationFrame(laco);
}

// ---------- Desenho ----------
const CORES = {
  "nova": "#9e9e9e",
  "longe": "#9e9e9e",
  "à vista": "#34c759",
  "afastando": "#5ac8fa",
  "parada": "#34c759",
  "perto": "#ff9500",
  "aproximando": "#ff9500",
  "muito perto": "#ff3b30",
};

function desenhar() {
  const W = el.canvas.width;
  const H = el.canvas.height;
  ctx.clearRect(0, 0, W, H); // apaga as caixas do quadro anterior; o vídeo aparece por baixo

  // Zona de perigo: faixa central por onde o usuário passa
  if (el.chkZona.checked) {
    ctx.fillStyle = "rgba(255, 212, 0, 0.12)";
    ctx.fillRect(CONFIG.zonaCentral.inicio * W, 0, (CONFIG.zonaCentral.fim - CONFIG.zonaCentral.inicio) * W, H);
    ctx.strokeStyle = "rgba(255, 212, 0, 0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(CONFIG.zonaCentral.inicio * W, 0, (CONFIG.zonaCentral.fim - CONFIG.zonaCentral.inicio) * W, H);
    ctx.setLineDash([]);
  }

  const espessura = Math.max(3, Math.round(W / 160));
  const fonte = Math.max(16, Math.round(W / 32));
  ctx.font = `bold ${fonte}px system-ui, sans-serif`;

  for (const t of todasTrilhas()) {
    if (t.quadrosSemVer > 0) continue;
    const cor = CORES[t.situacao] || "#34c759";
    // Objetos silenciosos aparecem com caixa tracejada: o sistema viu, mas não avisa.
    const silencioso = tipoDe(t.classe) === "silencio";

    const x = t.caixa.x * W, y = t.caixa.y * H, w = t.caixa.w * W, h = t.caixa.h * H;
    ctx.strokeStyle = cor;
    ctx.lineWidth = espessura;
    if (silencioso) ctx.setLineDash([12, 8]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    const texto = `${nomeDe(t.classe)} ${Math.round(t.confianca * 100)}% ${t.situacao}`;
    const larguraTexto = ctx.measureText(texto).width + 12;
    const yTexto = y > fonte + 8 ? y - fonte - 8 : y;
    ctx.fillStyle = cor;
    ctx.fillRect(x, yTexto, larguraTexto, fonte + 8);
    ctx.fillStyle = "#000";
    ctx.fillText(texto, x + 6, yTexto + fonte);
  }
}

// ---------- Texto grande de status e avisos ----------
let textoAviso = "";
let avisoAte = 0;

function atualizarStatus() {
  const trilhas = todasTrilhas();

  // No máximo um aviso por vez: o mais urgente
  const aviso = Avisos.avisarMaisUrgente(trilhas);
  if (aviso) {
    textoAviso = aviso;
    avisoAte = performance.now() + 2500;
  }

  if (performance.now() < avisoAte) {
    el.status.textContent = textoAviso;
    el.status.className = "status alerta";
    return;
  }

  const confirmadas = trilhas.filter(t => t.situacao !== "nova" && t.quadrosSemVer === 0);
  if (confirmadas.length === 0) {
    el.status.textContent = "Caminho livre";
    el.status.className = "status";
  } else {
    // Conta quantos de cada tipo, por exemplo: "2 × pessoa, 1 × cone"
    const contagem = {};
    for (const t of confirmadas) contagem[nomeDe(t.classe)] = (contagem[nomeDe(t.classe)] || 0) + 1;
    el.status.textContent = Object.entries(contagem).map(([nome, n]) => `${n} × ${nome}`).join(", ") + " à vista";
    el.status.className = "status atencao";
  }
}

// ---------- FPS: quantas análises por segundo o sistema faz ----------
function medirFps() {
  const agora = performance.now();
  const instantaneo = 1000 / Math.max(1, agora - ultimoQuadro);
  ultimoQuadro = agora;
  fpsSuave = fpsSuave ? fpsSuave * 0.9 + instantaneo * 0.1 : instantaneo;
  el.fps.textContent = `${fpsSuave.toFixed(1)} FPS`;
}

// ---------- Controles da tela ----------
el.confianca.addEventListener("input", () => {
  CONFIG.confiancaMinima = Number(el.confianca.value) / 100;
  el.confiancaValor.textContent = `${el.confianca.value}%`;
});
el.confianca.value = Math.round(CONFIG.confiancaMinima * 100);
el.confiancaValor.textContent = `${el.confianca.value}%`;

el.chkVoz.addEventListener("change", () => { Avisos.ligado.voz = el.chkVoz.checked; });
el.chkBip.addEventListener("change", () => { Avisos.ligado.bip = el.chkBip.checked; });
el.chkVibrar.addEventListener("change", () => { Avisos.ligado.vibrar = el.chkVibrar.checked; });
if (!navigator.vibrate) {
  el.chkVibrar.checked = false;
  el.chkVibrar.disabled = true;
  el.chkVibrar.parentElement.title = "Este aparelho não permite vibração pelo navegador";
}

// Se o usuário trocar de aplicativo e voltar, o navegador pode ter pausado o vídeo
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && rodando && el.video.paused) el.video.play().catch(() => {});
});

// Endereço de teste: index.html?video=caminho/do/video.mp4 usa um vídeo no lugar da câmera
const videoDeTeste = new URLSearchParams(location.search).get("video");

el.btnIniciar.addEventListener("click", () => iniciar(videoDeTeste));
el.btnParar.addEventListener("click", parar);
el.arquivo.addEventListener("change", () => {
  const f = el.arquivo.files && el.arquivo.files[0];
  if (f) iniciar(URL.createObjectURL(f));
});

if (videoDeTeste) el.btnIniciar.textContent = "Iniciar com vídeo de teste";
if (!CONFIG.roboflow.chavePublica) situacaoModeloTurma("Modelo de obstáculos desligado: falta a chave pública em config.js");
