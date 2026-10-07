"""Gera os créditos: ../js/creditos.js (rolo na tela, enxuto) e ../CREDITOS.md (completo, com licenças e links).

Uso: .venv/bin/python creditos.py
Fontes: sons/*/fontes.json (restritos a sons/inventario.json, se existir) e vozes/creditos_voz.json, se existir:
  {"modelo": "...", "licenca": "...", "url": "..."}.
"""
import json
from collections import defaultdict
from pathlib import Path

AQUI = Path(__file__).parent
RAIZ = AQUI.parent

TRADICAO = [
    "José de Anchieta, Carta de São Vicente (1560)",
    "Couto de Magalhães, O Selvagem (1876)",
    "João Barbosa Rodrigues, Poranduba Amazonense (1890)",
    "Luís da Câmara Cascudo",
    "e a tradição oral tupi, cabocla e ribeirinha",
]
TIPOGRAFIA = [
    ("Alegreya", "The Alegreya Project Authors, Huerta Tipográfica", "SIL OFL 1.1"),
    ("Piedra", "Angel Koziupa e Alejandro Paul, Sudtipos", "SIL OFL 1.1"),
]
BIBLIOTECAS = [("GSAP 3.15", "GreenSock", "licença padrão gratuita", "https://gsap.com/standard-license")]
INSPIRACAO = "A técnica do teatro de sombras chinês; a xilogravura de cordel; grafismos de povos originários como inspiração geométrica."


def sons_usados():
    inv = AQUI / "sons" / "inventario.json"
    permitidos = None
    if inv.exists():
        permitidos = {a for v in json.loads(inv.read_text(encoding="utf-8")).values() for a in v.get("arquivos", [])}
    itens = []
    for pasta in ("natureza", "musica", "acao"):
        f = AQUI / "sons" / pasta / "fontes.json"
        if not f.exists():
            continue
        for x in json.loads(f.read_text(encoding="utf-8")):
            rel = f"{pasta}/{x['arquivo']}"
            if permitidos is None or rel in permitidos:
                itens.append({**x, "pasta": pasta})
    return itens


def main():
    sons = sons_usados()
    voz = AQUI / "vozes" / "creditos_voz.json"
    voz = json.loads(voz.read_text(encoding="utf-8")) if voz.exists() else None

    por_licenca = defaultdict(list)
    for s in sons:
        por_licenca[s["licenca"]].append(s)
    atribuicao = sorted({s["autor"] for s in sons if "BY" in s["licenca"].upper()})
    cc0 = sorted({s["autor"] for s in sons if "BY" not in s["licenca"].upper()})
    compartilha = [s for s in sons if "SA" in s["licenca"].upper()]

    # Rolo na tela: curto, legível em 14 s.
    rolo = [
        {"secao": "A partir da tradição registrada por", "itens": TRADICAO},
        {"secao": "Vozes", "itens": [f"{voz['modelo']} ({voz['licenca']})" if voz else "síntese de voz de código aberto"]},
        {"secao": "Sons gravados por", "itens": [", ".join(atribuicao)] + ([f"e mais {len(cc0)} pessoas que doaram gravações ao domínio público"] if cc0 else [])},
        {"secao": "Instrumentos", "itens": ["Versilian Community Sample Library (CC0)"]},
        {"secao": "Tipografia", "itens": [f"{n}, {a}" for n, a, _ in TIPOGRAFIA]},
        {"secao": "Animação", "itens": [f"{n}, {a}" for n, a, _, _ in BIBLIOTECAS]},
        {"secao": "Inspiração", "itens": [INSPIRACAO]},
    ]
    (RAIZ / "js" / "creditos.js").write_text(
        "// GERADO por producao/creditos.py — não edite à mão.\nwindow.CREDITOS = "
        + json.dumps(rolo, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

    md = ["# Créditos — Curupira, o guardião da mata", "", "Folclore em Sombras.", "",
          "## Narrativa", "", *[f"- {t}" for t in TRADICAO], "",
          "## Vozes", "", f"- {voz['modelo']} — {voz['licenca']} — {voz.get('url', '')}" if voz else "- síntese de voz de código aberto", "",
          "## Tipografia", "", *[f"- {n} — {a} — {l}" for n, a, l in TIPOGRAFIA], "",
          "## Bibliotecas", "", *[f"- {n} — {a} — {l} — {u}" for n, a, l, u in BIBLIOTECAS], "",
          "## Inspiração", "", INSPIRACAO, "", "## Sons", ""]
    if compartilha:
        md += ["> Atenção: há sons CC BY-SA; obras derivadas que os incluam herdam a mesma licença.", ""]
    for lic in sorted(por_licenca):
        md += [f"### {lic}", "", "| Arquivo | Descrição | Autor | Fonte |", "|---|---|---|---|"]
        for s in sorted(por_licenca[lic], key=lambda s: (s["pasta"], s["arquivo"])):
            md.append(f"| {s['pasta']}/{s['arquivo']} | {s.get('descricao', '')} | {s['autor']} | {s.get('url_pagina', '')} |")
        md.append("")
    (RAIZ / "CREDITOS.md").write_text("\n".join(md), encoding="utf-8")
    print(f"{len(sons)} sons ({', '.join(f'{k}: {len(v)}' for k, v in sorted(por_licenca.items()))}); "
          f"{len(atribuicao)} autores com atribuição obrigatória" + (f"; ATENÇÃO {len(compartilha)} CC BY-SA" if compartilha else ""))


if __name__ == "__main__":
    main()
