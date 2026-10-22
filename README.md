# Dungeon RPG (MVP) — JavaScript puro

RPG 2D top-down com **dungeon roguelike gerada proceduralmente**, escrito em
**JavaScript puro + HTML5 Canvas**, rodando direto no navegador — **sem Godot,
sem GDScript e sem build**.

- Jogue no PC (teclado) ou no celular (joystick e botoes na tela).
- Repositorio: <https://github.com/antvjpg/dungeon-rpg-mvp>

## Como jogar

O jogo roda em **tempo real**: os monstros se movem sozinhos, nao esperam o seu turno.

| Tecla | Acao |
| --- | --- |
| `W` `A` `S` `D` ou setas | Mover (pode segurar a tecla) |
| Andar contra o inimigo | Atacar |
| `Espaco` / `Enter` | Golpe na direcao para onde esta olhando |
| `Q` | Beber uma pocao de cura |
| `P` | Pausar / despausar |
| `R` | Reiniciar a partida |

No **celular**: arraste o dedo na metade esquerda da tela para andar (joystick)
e use os botoes **ATK**, **Q**, **P** e **R** na direita.

Regras:

- Derrote **todos os inimigos** do andar para descer ao proximo.
- A **sala onde voce nasce** e uma **zona segura** (contorno verde tracejado):
  monstros nao entram e nao causam dano enquanto voce estiver dentro dela.
- **Pocoes verdes** ficam no chao: pise nelas para pegar (voce comeca com 2).
- **Armaduras** (blocos metalicos) tambem ficam no chao e alguns monstros dropam.
- Subir de nivel: **+3 de vida maxima**, **+8 de vida** e **+1 de dano** (minimo e maximo).
- Limpar um andar cura **20% da vida maxima**.
- Se sua vida chegar a 0, e game over (`R` reinicia).

### Efeitos ao levar dano

- O personagem **pisca em vermelho** e ganha uma aura pulsante.
- A tela **treme** por alguns instantes.
- Uma **vinheta vermelha** aparece nas bordas da tela.
- O **numero do dano** sobe flutuando em cima do personagem.

### Armaduras

| Armadura | Reducao de dano | Como conseguir |
| --- | --- | --- |
| **Cobre** | **−2** | chao dos andares 1–2, drop de Esqueleto (6%) e Orc (30%) |
| **Ferro** | **−4** | chao do andar 3+, drop de Golem (40%) |

- A armadura equipada **nunca zera o dano**: voce sempre leva pelo menos **1**.
- Ao pisar numa armadura melhor, ela e equipada automaticamente (mensagem no HUD).
- O **aro colorido** embaixo do personagem mostra a armadura atual (laranja = cobre, prateado = ferro).
- O andar so gera armadura se ela for melhor que a sua (nao fica lixo no chao).

### Tipos de monstro

| Monstro | Cor | Vida | Dano | Velocidade | XP |
| --- | --- | --- | --- | --- | --- |
| **Rato** | verde | baixa | baixo | rapido | baixo |
| **Esqueleto** | branco | media | medio | medio | medio |
| **Orc** | laranja | alta | alto | lento | alto |
| **Golem** | roxo | muito alta | medio | muito lento | muito alto |

Aparecem conforme o andar: Rato e Esqueleto desde o inicio, Orc a partir do 2, Golem a partir do 3.
Cada tipo usa um **sprite proprio** (`assets/sprites/`), com tamanho diferente e
**animacao de caminhada em 2 quadros** (quando o PNG tem 32x16).

## Como rodar

### Opcao 1 - Atalho (mais rapido)

De duplo clique em **`executar.bat`** (ou **`jogar_web.bat`**).
Ele sobe um servidor local e abre o jogo no navegador em
**<http://localhost:8060/>**.

### Opcao 2 - Sem servidor

Abra **`js/index.html`** direto no navegador (duplo clique). O jogo e 100% estatico,
nao precisa de build nem de servidor.

### Opcao 3 - Publicado na web (GitHub Pages)

O `index.html` da raiz redireciona para `js/index.html`, entao basta ativar o
**GitHub Pages** no repositorio (branch `master`, pasta `/`) e acessar:

<https://antvjpg.github.io/dungeon-rpg-mvp/>

Tambem funciona em qualquer hospedagem estatica (Netlify, Cloudflare Pages, itch.io):
basta publicar a pasta do projeto.

### Testar no celular na mesma rede Wi-Fi

```
python servir_web.py --host
```

Depois abra `http://IP-DO-PC:8060/` no celular.

## Estrutura

```
Projeto/
  index.html           Redireciona para js/index.html (raiz, para hospedagem)
  js/
    index.html         Pagina do jogo (HUD responsivo + botoes touch)
    game.js            Jogo completo: dungeon, jogador, monstros, combate, HUD
  executar.bat         Atalho: sobe o servidor e abre no navegador
  jogar_web.bat        Mesmo atalho (servidor + navegador)
  servir_web.py        Servidor HTTP local (Python, sem dependencias)
  assets/sprites/      Pixel art 16x16 usada no jogo (heroi, monstros, pocoes e armaduras)
  tools/
    gerar_sprites.py   Gerador dos PNGs de assets/sprites/ (opcional)
    preview_sprites.png  Folha de contato 8x dos sprites
```

## Tecnologia

- **JavaScript puro** (ES6+), sem frameworks, sem bibliotecas e sem transpilacao.
- **Canvas 2D** para desenhar o mapa, monstros, itens e efeitos.
- **HTML/CSS** para o HUD e os controles de toque (escalam sozinhos em qualquer tela).
- **Geracao procedural**: salas retangulares sem sobreposicao ligadas por corredores.
- **Loop com delta time** (`requestAnimationFrame`), entao a velocidade nao depende do FPS.
- **Sprites em pixel art** (`assets/sprites/`, quadros de 16x16) desenhados no canvas
  com `imageSmoothingEnabled = false`, sombras, animacao de caminhada e barra de vida.
  Enquanto uma imagem nao carrega, o jogo usa formas geometricas como fallback.

## Roadmap (proximos passos sugeridos)

1. **Cenarios**: variar o visual dos andares (masmorra, caverna, castelo).
2. **Mais atributos**: defesa, chance de critico, velocidade de ataque.
3. **Mais itens**: pocoes grandes, equipamentos e baus com recompensa.
4. **Mais monstros**: variantes e um **chefe** ao final de cada 5 andares.
5. **Nevoa / visao**: revelar o mapa conforme se aproxima.
6. **Save/Load**: salvar nivel, andar e inventario no `localStorage`.
7. **Audio**: efeitos simples de ataque, dano e vitoria com Web Audio API.
