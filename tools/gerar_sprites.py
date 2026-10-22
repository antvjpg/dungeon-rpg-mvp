#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os sprites (pixel art 16x16) do jogo em PNG.

Nao depende de nenhuma biblioteca externa: escreve o PNG na mao (zlib + struct).

Saida:
  assets/sprites/<nome>.png     -> 1 ou 2 quadros lado a lado (16x16 cada)
  tools/preview_sprites.png     -> folha de contato ampliada 8x para conferir a arte

Uso:  python tools/gerar_sprites.py
"""

import os
import struct
import zlib

W = 16
H = 16
PIX = 16          # tamanho de cada quadro
SCALE = 8         # ampliacao da folha de contato

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_SPRITES = os.path.join(RAIZ, "assets", "sprites")
PREVIEW = os.path.join(RAIZ, "tools", "preview_sprites.png")

TRANSPARENTE = (0, 0, 0, 0)


# --------------------------------------------------------------------------
# Escrita de PNG (sem PIL)
# --------------------------------------------------------------------------

def escrever_png(caminho, largura, altura, linhas):
    """linhas[y][x] -> (r, g, b, a)"""
    cru = bytearray()
    for y in range(altura):
        cru.append(0)                      # filtro "none"
        for x in range(largura):
            r, g, b, a = linhas[y][x]
            cru += bytes((r, g, b, a))

    def bloco(tipo, dados):
        return (struct.pack(">I", len(dados)) + tipo + dados
                + struct.pack(">I", zlib.crc32(tipo + dados) & 0xffffffff))

    png = b"\x89PNG\r\n\x1a\n"
    png += bloco(b"IHDR", struct.pack(">IIBBBBB", largura, altura, 8, 6, 0, 0, 0))
    png += bloco(b"IDAT", zlib.compress(bytes(cru), 9))
    png += bloco(b"IEND", b"")

    with open(caminho, "wb") as f:
        f.write(png)


def cor(hexstr, a=255):
    hexstr = hexstr.lstrip("#")
    return (int(hexstr[0:2], 16), int(hexstr[2:4], 16), int(hexstr[4:6], 16), a)


def renderizar(linhas, paleta):
    """Converte linhas de caracteres em pixels RGBA, validando o tamanho."""
    if len(linhas) != H:
        raise SystemExit("sprite com %d linhas (esperado %d)" % (len(linhas), H))
    saida = []
    for y, linha in enumerate(linhas):
        if len(linha) != W:
            raise SystemExit("linha %d tem %d caracteres (esperado %d): %r"
                             % (y, len(linha), W, linha))
        saida.append([paleta.get(ch, TRANSPARENTE) for ch in linha])
    return saida


def pernas(ch):
    """Dois quadros de 'passo' para personagens de duas pernas."""
    quadro_a = [
        ".....%s%s...%s%s...." % (ch, ch, ch, ch),
        ".....%s%s...%s....." % (ch, ch, ch),
    ]
    quadro_b = [
        ".....%s%s...%s%s...." % (ch, ch, ch, ch),
        ".....%s....%s%s...." % (ch, ch, ch),
    ]
    for linha in quadro_a + quadro_b:
        assert len(linha) == W, repr(linha)
    return quadro_a, quadro_b


# --------------------------------------------------------------------------
# Paletas
# --------------------------------------------------------------------------

P_HERO = {
    ".": TRANSPARENTE,
    "0": cor("#0d1117"),   # contorno
    "1": cor("#d7e3f4"),   # aco claro
    "2": cor("#9fb3cc"),   # aco medio
    "3": cor("#64748b"),   # aco escuro
    "4": cor("#f2c49b"),   # pele
    "5": cor("#1b2430"),   # olhos
    "9": cor("#7a5230"),   # cinto
    "c": cor("#6fe0ff"),   # capa clara
    "C": cor("#2fa8d8"),   # capa media
    "a": cor("#4a5f7f"),   # botas
}

P_RATO = {
    ".": TRANSPARENTE,
    "0": cor("#123018"),
    "1": cor("#9ee37d"),
    "2": cor("#5fa84a"),
    "3": cor("#121a10"),
}

P_ESQ = {
    ".": TRANSPARENTE,
    "0": cor("#12161d"),
    "b": cor("#eceff5"),
    "d": cor("#10131a"),
}

P_ORC = {
    ".": TRANSPARENTE,
    "0": cor("#1d1109"),
    "1": cor("#ff8a3d"),
    "2": cor("#b95c1c"),
    "3": cor("#fff4d6"),   # presas
    "4": cor("#1a0d05"),   # olhos
    "5": cor("#5a3a22"),   # armadura
}

P_GOLEM = {
    ".": TRANSPARENTE,
    "0": cor("#170d2b"),
    "1": cor("#b07cff"),
    "2": cor("#7d4fd0"),
    "4": cor("#ffe066"),   # olhos
}

P_POCAO = {
    ".": TRANSPARENTE,
    "0": cor("#0d2a16"),
    "1": cor("#7cfc9e"),
    "2": cor("#3fae66"),
    "3": cor("#a9743c"),
}

def paleta_armadura(claro, medio, escuro):
    return {
        ".": TRANSPARENTE,
        "0": cor("#101319"),
        "1": cor(claro),
        "2": cor(medio),
        "3": cor(escuro),
    }

P_COBRE = paleta_armadura("#e8a97a", "#d98a5a", "#a35c33")
P_FERRO = paleta_armadura("#eef3fa", "#c9d3de", "#8d99a8")


# --------------------------------------------------------------------------
# Arte (16 x 16). Os 14 primeiros sao o corpo; as pernas entram depois.
# --------------------------------------------------------------------------

HERO_CORPO = [
    "................",
    ".....000000.....",
    "....01111110....",
    "...0111111110...",
    "...0112222110...",
    "...0144444410...",
    "...0145445410...",
    "....01444410....",
    "....0cccccc0....",
    "..0cccccccccc0..",
    "..0cCCCCCCCCc0..",
    "..0cCC9999CCc0..",
    "...0cCCCCCCc0...",
    "....0cCCCCc0....",
]

RATO_CORPO = [
    "................",
    "................",
    "....00....00....",
    "...0110..0110...",
    "...0110..0110...",
    "..011111111110..",
    "..011111111110..",
    "..011311113110..",
    "..011111111110..",
    "..022111111220..",
    "..011111111110..",
    "...0211111120...",
    "....02111120....",
    ".....022220.....",
]

ESQ_CORPO = [
    "................",
    ".....000000.....",
    "....0bbbbbb0....",
    "...0bbbbbbbb0...",
    "...0bddbbddb0...",
    "...0bbbbbbbb0...",
    "....0b0bb0b0....",
    ".....0bbbb0.....",
    "....0bbbbbb0....",
    "...0bbdbbdbb0...",
    "...0bbbbbbbb0...",
    "...0bdbbbbdb0...",
    "...0bbbbbbbb0...",
    "....0bbbbbb0....",
]

ORC_CORPO = [
    "................",
    "....00000000....",
    "..011111111110..",
    "..011111111110..",
    "..011411114110..",
    "..011111111110..",
    "..011111111110..",
    "..034111111430..",
    "...0111111110...",
    ".05111111111150.",
    ".05111111111150.",
    "..099999999990..",
    "..011111111110..",
    "..022222222220..",
]

GOLEM_CORPO = [
    "................",
    "...0000000000...",
    "..011111111110..",
    "..011111111110..",
    "..011411114110..",
    "..011111111110..",
    "..011122221110..",
    "..011111111110..",
    "..011122221110..",
    ".02211111111220.",
    ".02211111111220.",
    ".02211111111220.",
    "..022111111220..",
    "..022222222220..",
]

POCAO = [
    "................",
    "................",
    "......0000......",
    "......0330......",
    "......0330......",
    "......0000......",
    ".....011110.....",
    "....01111110....",
    "....01222110....",
    "....01222110....",
    "....01222110....",
    "....01111110....",
    ".....011110.....",
    "......0000......",
    "................",
    "................",
]

ARMADURA = [
    "................",
    "................",
    "................",
    "...00......00...",
    "..0110....0110..",
    "..01110..01110..",
    "..011111111110..",
    "..012222222210..",
    "..012222222210..",
    "..012223322210..",
    "..012222222210..",
    "...0122222210...",
    "...0122222210...",
    "....01222210....",
    "....01222210....",
    ".....012210.....",
]


def montar():
    """Lista de (nome, paleta, lista_de_quadros)."""
    lista = []

    a, b = pernas("a")
    lista.append(("heroi", P_HERO, [HERO_CORPO + a, HERO_CORPO + b]))

    a, b = pernas("1")
    lista.append(("rato", P_RATO, [RATO_CORPO + a, RATO_CORPO + b]))

    a, b = pernas("b")
    lista.append(("esqueleto", P_ESQ, [ESQ_CORPO + a, ESQ_CORPO + b]))

    a, b = pernas("1")
    lista.append(("orc", P_ORC, [ORC_CORPO + a, ORC_CORPO + b]))

    a, b = pernas("2")
    lista.append(("golem", P_GOLEM, [GOLEM_CORPO + a, GOLEM_CORPO + b]))

    lista.append(("pocao", P_POCAO, [POCAO]))
    lista.append(("armadura_cobre", P_COBRE, [ARMADURA]))
    lista.append(("armadura_ferro", P_FERRO, [ARMADURA]))

    return lista


def gerar_quadros(paleta, quadros):
    return [renderizar(q, paleta) for q in quadros]


def montar_folha(itens):
    FUNDO_A = cor("#3a3a4e")
    FUNDO_B = cor("#444459")
    PAD = 4
    linhas_folha = []
    largura_folha = 0

    for _nome, paleta, quadros in itens:
        quadros = gerar_quadros(paleta, quadros)[0]
        largura_total = len(quadros[0]) * SCALE + PAD * 2
        largura_folha = max(largura_folha, largura_total)

    for _nome, paleta, quadros in itens:
        quadros = gerar_quadros(paleta, quadros)
        altura = H * SCALE + PAD * 2
        bloco = []
        for _ in range(PAD):
            bloco.append([cor("#2a2a38")] * largura_folha)
        for y in range(H * SCALE):
            linha = [cor("#2a2a38")] * largura_folha
            for fi, quadro in enumerate(quadros):
                x0 = PAD + fi * (PIX * SCALE + PAD)
                for x in range(PIX * SCALE):
                    px = quadro[y // SCALE][x // SCALE]
                    if px[3] == 0:
                        px = FUNDO_A if ((x // 4) + (y // 4)) % 2 == 0 else FUNDO_B
                    alvo = x0 + x
                    if 0 <= alvo < largura_folha:
                        linha[alvo] = px
            bloco.append(linha)
        for _ in range(PAD):
            bloco.append([cor("#2a2a38")] * largura_folha)
        linhas_folha.extend(bloco)

    return largura_folha, len(linhas_folha), linhas_folha


def main():
    os.makedirs(PASTA_SPRITES, exist_ok=True)
    itens = montar()

    for nome, paleta, quadros in itens:
        render = gerar_quadros(paleta, quadros)
        n = len(render)
        largura = PIX * n
        linhas = []
        for y in range(H):
            linha = []
            for q in render:
                linha.extend(q[y])
            linhas.append(linha)
        destino = os.path.join(PASTA_SPRITES, nome + ".png")
        escrever_png(destino, largura, H, linhas)
        print("gerado: assets/sprites/%s.png (%dx%d, %d quadro(s))"
              % (nome, largura, H, n))

    largura, altura, linhas = montar_folha(itens)
    escrever_png(PREVIEW, largura, altura, linhas)
    print("preview: tools/preview_sprites.png (%dx%d)" % (largura, altura))


if __name__ == "__main__":
    main()
