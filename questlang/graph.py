"""Graphviz DOT export of the story graph.

Every scene becomes a node and every choice or automatic jump becomes an
edge (US03). The Studio renders the DOT with ``st.graphviz_chart``; the CLI
writes it to a file or, when Graphviz is installed, renders SVG/PNG.
"""

from __future__ import annotations

from collections.abc import Iterable

from .analyzer import can_reach_ending, reachable_from
from .model import Adventure

PALETTE = {
    "paper": "#FAF9F6",
    "card": "#FFFFFF",
    "ink": "#1C1917",
    "muted": "#78716C",
    "border": "#D6D3CD",
    "start": "#B45309",  # terracotta / amber
    "ending": "#3F6212",  # forest green
    "warn": "#C2410C",
    "warn_fill": "#FFEDD5",
    "current": "#FDE68A",
    "visited": "#F5F5F4",
    "error": "#B91C1C",
}


def _esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def _q(*lines: str) -> str:
    """Quote a DOT string; several arguments become separate centred lines."""
    return '"' + "\\n".join(_esc(line) for line in lines) + '"'


def _short(text: str, width: int) -> str:
    return text if len(text) <= width else text[: width - 1].rstrip() + "…"


def to_dot(
    adventure: Adventure,
    *,
    current: str | None = None,
    visited: Iterable[str] = (),
    rankdir: str = "LR",
) -> str:
    """Return a DOT ``digraph`` for the adventure.

    ``current`` and ``visited`` highlight a play session on the map.
    """
    p = PALETTE
    visited = set(visited)
    reachable = reachable_from(adventure, adventure.start)
    finishable = can_reach_ending(adventure)
    has_endings = any(s.is_ending for s in adventure.scenes)

    out = [
        "digraph QuestLang {",
        f"  graph [rankdir={rankdir}, bgcolor={_q(p['paper'])}, pad=0.3, nodesep=0.35, "
        f"ranksep=0.6, label={_q(adventure.title)}, labelloc=t, fontname=Georgia, "
        f"fontsize=18, fontcolor={_q(p['ink'])}];",
        f"  node [shape=box, style=\"rounded,filled\", fillcolor={_q(p['card'])}, "
        f"color={_q(p['border'])}, fontname=Helvetica, fontsize=11, fontcolor={_q(p['ink'])}, "
        "margin=\"0.18,0.1\"];",
        f"  edge [color={_q(p['muted'])}, fontname=Helvetica, fontsize=9, "
        f"fontcolor={_q(p['muted'])}, arrowsize=0.7];",
    ]

    for scene in adventure.scenes:
        if not adventure.has_scene(scene.id) or adventure.scene(scene.id) is not scene:
            continue  # duplicate declaration: draw only the first one
        snippet = _short(scene.passages[0], 38) if scene.passages else ""
        tags = []
        if scene.id == adventure.start:
            tags.append("Opening scene")
        if scene.is_ending:
            tags.append("Ending")
        lines = [scene.id] + ([snippet] if snippet else []) + (["[" + " · ".join(tags) + "]"] if tags else [])
        attrs = [f"label={_q(*lines)}"]
        if scene.id == adventure.start:
            attrs += [f"color={_q(p['start'])}", "penwidth=2"]
        if scene.is_ending:
            attrs += [f"color={_q(p['ending'])}", "peripheries=2"]
        if scene.id not in reachable:
            attrs += ["style=\"rounded,dashed\"", f"fontcolor={_q(p['muted'])}",
                      'tooltip="Unreachable from the starting scene"']
        elif has_endings and scene.id not in finishable:
            attrs += [f"color={_q(p['warn'])}", f"fillcolor={_q(p['warn_fill'])}", "penwidth=2",
                      'tooltip="Dead end: no ending can be reached"']
        if scene.id in visited:
            attrs.append(f"fillcolor={_q(p['visited'])}")
        if scene.id == current:
            attrs += [f"fillcolor={_q(p['current'])}", "penwidth=2.5"]
        out.append(f"  {_q(scene.id)} [{', '.join(attrs)}];")

    missing = sorted({t for _, t, _ in adventure.transitions() if not adventure.has_scene(t)})
    for name in missing:
        out.append(
            f"  {_q(name)} [label={_q(name + ' (missing)')}, style=\"rounded,dashed\", "
            f"color={_q(p['error'])}, fontcolor={_q(p['error'])}];"
        )

    for source, target, label in adventure.transitions():
        if label is None:
            out.append(f"  {_q(source)} -> {_q(target)} [style=dashed, label=\"auto\"];")
        else:
            out.append(f"  {_q(source)} -> {_q(target)} [label={_q(_short(label, 28))}];")

    out.append("}")
    return "\n".join(out) + "\n"
