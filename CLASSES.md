# GuiaVision: classes e alertas

Regra principal: **o sistema mostra tudo na tela, mas fala pouco.**
Toda classe ganha caixa na tela, para a demonstração.
A voz usa poucas palavras de grupo (por exemplo, "obstáculo"), e não o nome de cada classe.

## 1. Conjuntos de fotos e como cada classe de origem vira uma classe final

| Conjunto (Roboflow Universe) | Classe de origem | Classe final |
|---|---|---|
| uniworkspace / pothole-zo3am | Severe, Moderate, Minor | `pothole` |
| new-workspace-gwrcq / pothole-qg7ln | pothole | `pothole` |
| new-workspace-gwrcq / pothole-qg7ln | manhole | `manhole_cover` |
| new-workspace-gwrcq / pothole-qg7ln | `\`, `0`, `15` | descartar |
| objectdetection-xkyum / sidewalk-gbw7n | damage-qnnD | `pothole` |
| test-ddogm / manhole-lsxpb | uncovered, broke, lose | `manhole_hazard` |
| test-ddogm / manhole-lsxpb | good, circle | `manhole_cover` |
| tom-lai-8bp7n / stairs-i2yia | stairs | `stairs` |
| ruturaj-uttarwar-s-workspace / stairs-ahqez | Stairs | `stairs` |
| ramp-5cb74 / ramp-ync8p | 0 | `ramp` |
| shin-7ty4z / bollard-ds7rv | bollard_damage, bollard_drop, bollard_nomal, bollard_nomark | `bollard` |
| new-workspace-chdnc / pole-j58jk | light-pole, utility-pole | `pole` |
| new-workspace-chdnc / pole-j58jk | invalid | descartar |
| project-gqeos / cone-fljp6 | cone, Cone-Pole | `cone` |
| laras-workspace-yjyqk / barrier-ckgbn | barrier | `barrier` |
| thomass-workspace-amagh / tree-trunk-more-data | TRONC | `tree_trunk` |
| utem / branch-7qne7 | 0, Branch, branches | `branch` |
| aiot-gdxoa / trash-recognization | garbage | `trash` |
| universty-tqsi7 / dumpster-detection-ugfli | 0, 1, 2 | `dumpster` |

O cone antigo (autory / traffic-cone-osnih) saiu: foi trocado pelo project-gqeos / cone-fljp6.

### Situação no Roboflow (17/10/2026)

Projeto **GuiaVision Base** (privado), com 9.237 imagens.
Contagem de marcações (caixas) por classe depois da renomeação:

| Classe | Marcações |
|---|---|
| `barrier` | 1.831 |
| `bollard` | 2.315 |
| `branch` | 820 |
| `cone` | 4.996 |
| `dumpster` | 500 |
| `manhole_cover` | 506 |
| `manhole_hazard` | 644 |
| `pole` | 744 |
| `pothole` | 2.390 |
| `ramp` | 1.125 |
| `stairs` | 1.091 |
| `trash` | 441 |
| `descartar` | 54 (deixar de fora ao gerar a versão de treino) |

- `tree_trunk` **ainda não entrou**: o conjunto de troncos usa contornos (segmentação) e o Roboflow não copia esse tipo para um projeto de caixas.
- O primeiro projeto, **GuiaVision**, ficou com classes misturadas (a classe `0` juntou rampa, galho e caçamba). Não deve ser usado. Só o dono da conta deve apagá-lo.

## 2. Tipos de objeto e quando avisar

| Tipo | Como o sistema decide que está perto | Quando avisa |
|---|---|---|
| **Móvel** | A caixa cresce de um quadro para o outro | Quando está "se aproximando" ou "muito perto", no caminho |
| **Chão** | A parte de baixo da caixa chega perto da parte de baixo da imagem (fica a poucos passos) | Quando está "perto", no caminho |
| **Fixo em pé** | A caixa fica grande ou chega perto da parte de baixo da imagem | Só quando está "muito perto", no caminho |
| **Silencioso** | Não importa | Nunca. Só aparece na tela |

Objeto parado não "se aproxima": quem se move é o usuário.
Por isso, para objetos de chão e fixos, a distância é medida pela posição da caixa, e não pelo crescimento.

## 3. Tabela de alertas

| Classe final | Modelo | Tipo | Palavra falada | Nível |
|---|---|---|---|---|
| `pothole` | Roboflow | Chão | "Buraco" | Alerta |
| `manhole_hazard` | Roboflow | Chão | "Buraco" | Alerta |
| `stairs` | Roboflow | Chão | "Escada" | Alerta |
| `ramp` | Roboflow | Chão | "Desnível" | Alerta |
| `pole` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `bollard` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `cone` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `barrier` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `tree_trunk` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `trash` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `dumpster` | Roboflow | Fixo em pé | "Obstáculo" | Alerta só muito perto |
| `branch` | Roboflow | Chão | "Obstáculo" | Alerta só muito perto |
| `manhole_cover` | Roboflow | Silencioso | (nada) | Só na tela |
| person | COCO-SSD | Móvel | "Pessoa" | Alerta |
| bicycle, motorcycle, car, bus, truck | COCO-SSD | Móvel | "Veículo" | Alerta |

Exemplos de frases: "Buraco à frente", "Escada à frente", "Obstáculo à frente", "Veículo se aproximando".

## 4. Regras contra excesso de alertas

1. Só avisa o que está na faixa do caminho, no meio da imagem.
2. Só avisa depois de ver o objeto em vários quadros seguidos.
3. Avisa uma vez por objeto, com uma pausa antes de repetir.
4. Se houver vários perigos ao mesmo tempo, fala só o mais urgente, nesta ordem:
   veículo ou pessoa muito perto, buraco, escada, desnível, obstáculo.
5. Vários obstáculos juntos viram um aviso só ("Obstáculo à frente"), e não um por objeto.

## 5. Pontos de atenção

- **Caçamba (`dumpster`):** as fotos desse conjunto mostram o lado de dentro do contêiner. Ele entrou porque a turma escolheu, mas pode atrapalhar. Se o modelo errar muito com caçamba, é o primeiro a sair.
- **Calçada danificada:** são só 49 fotos, com rachaduras que parecem montagem. Entram como `pothole`, mas podem gerar alarme falso em rachadura fina.
- **Escada:** o rótulo não diz se a escada sobe ou desce. O sistema vai dizer só "Escada".
