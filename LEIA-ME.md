# GuiaVision: guia da turma

Protótipo de visão computacional para ajudar pessoas com deficiência visual.
Esta primeira parte detecta **pessoas** pela câmera e avisa quando alguém se aproxima pela frente.
A detecção de **buracos** entra depois, quando o modelo do Roboflow estiver treinado.

## O que a página faz

1. Abre a câmera (no celular, a traseira).
2. Em cada quadro, o modelo de IA **COCO-SSD** procura pessoas e desenha uma caixa em volta de cada uma.
3. O **rastreador** dá um número para cada pessoa e acompanha o tamanho da caixa dela.
4. Se a caixa cresce e está na faixa amarela do meio, a pessoa está se aproximando pelo caminho.
5. Aí a página avisa com **bip**, **voz** e, no Android, **vibração**.

Cores das caixas:

| Cor | Significado |
|---|---|
| Cinza | Ainda confirmando, ou longe demais |
| Azul | Se afastando |
| Verde | Distância quase não muda |
| Laranja | Se aproximando pela frente (gera aviso) |
| Vermelho | Muito perto pela frente (aviso urgente) |

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | A estrutura da página: botões, vídeo, painel |
| `style.css` | O visual: cores, tamanhos, alto contraste |
| `config.js` | **Os números que controlam o sistema.** É o melhor lugar para experimentar |
| `rastreador.js` | Segue cada pessoa de um quadro para o outro e decide a situação dela |
| `avisos.js` | Bip, voz e vibração |
| `app.js` | Liga tudo: câmera, modelo, rastreador, desenho e avisos |
| `videos_teste/pessoas_andando.mp4` | Vídeo de exemplo do projeto SightWalk (licença MIT) |

## Como rodar no computador

O navegador só libera a câmera em página "segura". No computador, isso vale para o endereço `localhost`.

1. Abra o PowerShell **dentro da pasta `guiavision`**.
2. Rode este comando, que liga um servidor simples:

```bash
python -m http.server 8000
```

3. No Chrome, abra `http://localhost:8000`
4. Clique em **Iniciar câmera** e permita o uso da câmera.

**Se deu certo:** o vídeo aparece com uma faixa amarela no meio. Quando alguém entra na frente, surge uma caixa com "pessoa", um número e a confiança.

Para desligar o servidor, volte ao PowerShell e aperte `Ctrl + C`.

## Como testar sem câmera

- **Vídeo de exemplo:** abra `http://localhost:8000/?video=videos_teste/pessoas_andando.mp4` e clique no botão amarelo.
- **Qualquer vídeo:** clique em **Testar com um vídeo do computador** e escolha um arquivo.

No vídeo de exemplo, perto dos 8 segundos, a pessoa vem na direção da câmera. A caixa deve ficar laranja e depois vermelha, com aviso.

## Experimentos sugeridos em `config.js`

Mudem um número por vez, salvem e recarreguem a página.

- `crescimentoMinimo`: menor deixa o aviso mais sensível, maior deixa mais exigente.
- `quadrosParaConfirmar`: maior evita alarme falso, mas demora mais a avisar.
- `zonaCentral`: deixa a faixa do caminho mais larga ou mais estreita.
- `classesAcompanhadas`: acrescentem `"bicycle"` ou `"car"` para avisar também bicicletas e carros.
- `modeloBase`: troquem para `"mobilenet_v2"` e comparem a velocidade (FPS) e os acertos.

## Limitações conhecidas

- Quem segura o celular também anda. Uma pessoa parada à frente também "cresce" na imagem e gera o aviso. Para quem não enxerga, isso continua útil.
- No celular, a página precisa de um endereço `https`. Isso será resolvido ao publicar no GitHub Pages.
- No iPhone, o navegador não deixa vibrar.
- A primeira abertura precisa de internet para baixar o modelo.

## Próximos passos

1. Testar no computador com a webcam.
2. Publicar no GitHub Pages para testar no celular.
3. Encaixar o modelo de buracos no lugar reservado em `app.js` (procurem por `detectoresExtras`).
