# GuiaVision

Protótipo escolar de visão computacional para pessoas com deficiência visual.
Página web no celular que detecta obstáculos na calçada e avisa por voz, bip e vibração.

- Site publicado: https://abraaolm-maker.github.io/guiavision/
- Projeto de fotos no Roboflow: **GuiaVision Base** (o projeto "GuiaVision" tem classes misturadas e não deve ser usado)
- Classes, níveis de alerta e origem das fotos: ver `CLASSES.md`
- Os alunos decidem quais classes entram e quais alertas existem. Não decidir isso por eles.

## Treino atual (17/10/2026)

- Versão 2 do GuiaVision Base: 9.337 imagens, 512×512, classe `descartar` excluída, divisão 70/19/11, sem augmentation.
- Modelo: Roboflow 3.0 **Fast** (compatível com YOLOv8, roda no navegador pelo inferencejs).
- Treino concluído em 17/10/2026. Custou 4,53 créditos. O plano gratuito renova em 31/10/2026.
- Modelo: `abrao/guiavision-base-2-yolov8n-t1`. Teste (1.027 imagens): mAP@50 79,0%, precisão 78,9%, revocação 79,3%, confiança ideal 28%.
- Mais fracas: `trash` (mAP@50 26,2%), `branch` (61,6%), `manhole_cover` (62,3%), `pothole` (68,6%).
- O modelo já está ligado na página (`app.js`, pelo inferencejs 1.3.0), mas só funciona depois que a **chave pública** do Roboflow for colada em `config.js` (`roboflow.chavePublica`). Nunca usar a chave privada.

## Pendências para a próxima versão

- **Tronco de árvore (`tree_trunk`):** entraram só cerca de 50 fotos. Na próxima versão, a turma deve mandar mais fotos de tronco tiradas **na altura correta**, ou seja, com o celular na altura do peito, apontando para a frente, como o sistema é usado na rua. Na versão 2, o tronco ficou com só 18 marcações no treino (48 na validação e 37 no teste), porque o reequilíbrio moveu poucas imagens dele.
- **Fotos da turma:** ainda não entraram no treino. Entram na próxima versão, junto com o retreino.
