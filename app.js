// =============================================================
// APP PRINCIPAL
// Liga tudo: câmera -> modelo de IA -> rastreador -> desenho -> avisos.
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
  confianca: document.getElementById("confianca"),
  confiancaValor: document.getElementById("confianca-valor"),
  chkVoz: document.getElementById("chk-voz"),
  chkBip: document.getElementById("chk-bip"),
  chkVibrar: document.getElementById("chk-vibrar"),
  chkZona: document.getElementById("chk-zona"),
  erro: document.getElementById("erro"),
};
const ctx = el.canvas.getContext("2d");

let modeloPessoas = null;
let rastreador = new Rastreador();
let rodando = false;
let fluxoCamera = null;
let fpsSuave = 0;
let ultimoQuadro = 0;

// -------------------------------------------------------------
// LUGAR RESERVADO PARA O MODELO DE BURACOS
// Quando o modelo do Roboflow estiver treinado, ele entra aqui.
// Cada detector é uma função que recebe o vídeo e devolve uma lista
// no formato: { classe, confianca, caixa: {x, y, w, h} } com valores de 0 a 1.
// Os detectores se revezam: um quadro para pessoas, outro para buracos.
// -------------------------------------------------------------
const detectoresExtras = [
  // exemplo futuro: detectarBuracos,
];
let vezDoDetector = 0;

// ---------- Mensagens de erro em português ----------
function mostrarErro(texto) {
  el.erro.textContent = texto;
  el.erro.hidden = false;
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

// ---------- Carregar o modelo de IA ----------
async function carregarModelo() {
  if (modeloPessoas) return;
  el.carregando.hidden = false;
  await tf.ready();
  modeloPessoas = await cocoSsd.load({ base: CONFIG.modeloBase });
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
    await carregarModelo();
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
  rastreador = new Rastreador();
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

// ---------- Detecção de pessoas com o COCO-SSD ----------
async function detectarPessoas(video) {
  const brutas = await modeloPessoas.detect(video, 20, CONFIG.confiancaMinima);
  const largura = video.videoWidth;
  const altura = video.videoHeight;
  return brutas
    .filter(d => CONFIG.classesAcompanhadas.includes(d.class))
    .map(d => ({
      classe: d.class,
      confianca: d.score,
      caixa: {
        x: d.bbox[0] / largura,
        y: d.bbox[1] / altura,
        w: d.bbox[2] / largura,
        h: d.bbox[3] / altura,
      },
    }));
}

// ---------- Laço principal: roda uma vez por quadro ----------
async function laco() {
  if (!rodando) return;

  const video = el.video;
  if (video.readyState >= 2 && video.videoWidth > 0) {
    // Ajusta o canvas ao tamanho do vídeo
    if (el.canvas.width !== video.videoWidth) {
      el.canvas.width = video.videoWidth;
      el.canvas.height = video.videoHeight;
    }

    try {
      // Reveza os detectores. Sem modelo de buracos, só pessoas rodam.
      const todos = [detectarPessoas, ...detectoresExtras];
      const detector = todos[vezDoDetector % todos.length];
      vezDoDetector += 1;

      if (detector === detectarPessoas) {
        const deteccoes = await detectarPessoas(video);
        rastreador.atualizar(deteccoes);
      } else {
        await detector(video); // os buracos terão o próprio tratamento depois
      }
    } catch (e) {
      console.error(e);
    }

    desenhar(video);
    atualizarStatus();
    medirFps();
  }

  requestAnimationFrame(laco);
}

// ---------- Desenho ----------
function desenhar(video) {
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

  for (const t of rastreador.trilhas) {
    if (t.quadrosSemVer > 0) continue;
    const cor = {
      "nova": "#9e9e9e",
      "longe": "#9e9e9e",
      "afastando": "#5ac8fa",
      "parada": "#34c759",
      "aproximando": "#ff9500",
      "muito perto": "#ff3b30",
    }[t.situacao] || "#34c759";

    const x = t.caixa.x * W, y = t.caixa.y * H, w = t.caixa.w * W, h = t.caixa.h * H;
    ctx.strokeStyle = cor;
    ctx.lineWidth = espessura;
    ctx.strokeRect(x, y, w, h);

    const nome = CONFIG.nomes[t.classe] || t.classe;
    const texto = `${nome} #${t.id} ${Math.round(t.confianca * 100)}% ${t.situacao}`;
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
  for (const t of rastreador.trilhas) {
    const aviso = Avisos.talvezAvisar(t);
    if (aviso) {
      textoAviso = aviso;
      avisoAte = performance.now() + 2500;
    }
  }

  if (performance.now() < avisoAte) {
    el.status.textContent = textoAviso;
    el.status.className = "status alerta";
    return;
  }

  const confirmadas = rastreador.trilhas.filter(t => t.situacao !== "nova" && t.quadrosSemVer === 0);
  if (confirmadas.length === 0) {
    el.status.textContent = "Caminho livre";
    el.status.className = "status";
  } else {
    const n = confirmadas.length;
    el.status.textContent = n === 1 ? "1 pessoa à vista" : `${n} pessoas à vista`;
    el.status.className = "status atencao";
  }
}

// ---------- FPS: quantos quadros por segundo o sistema analisa ----------
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
