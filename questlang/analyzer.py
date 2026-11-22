"""Static semantic analysis of an adventure (runs after a successful parse).

Errors (the adventure cannot be played safely):
    QL302  duplicate scene identifier
    QL403  automatic jumps that loop forever (Proceed -> Proceed -> ...)
Warnings (the adventure plays, but probably not as intended):
    QL401  scene unreachable from the starting scene
    QL402  dead end: a reachable scene from which no ending can be reached
    QL404  the adventure has no ending at all
    QL405  two options in one scene share the same label

Undeclared scene references (QL301) are reported by the parser, which sees
every reference while textX resolves it.
"""

from __future__ import annotations

from collections import deque

from .diagnostics import Diagnostic, DiagnosticList
from .model import Adventure


def reachable_from(adventure: Adventure, start: str) -> set[str]:
    """Scene IDs reachable from ``start`` by choices and jumps (including itself)."""
    if not adventure.has_scene(start):
        return set()
    seen = {start}
    queue = deque([start])
    while queue:
        for target in adventure.scene(queue.popleft()).exit.targets():
            if adventure.has_scene(target) and target not in seen:
                seen.add(target)
                queue.append(target)
    return seen


def can_reach_ending(adventure: Adventure) -> set[str]:
    """Scene IDs from which at least one Conclude scene is reachable."""
    reverse: dict[str, set[str]] = {sid: set() for sid in adventure.scene_ids}
    for source, target, _ in adventure.transitions():
        if target in reverse:
            reverse[target].add(source)
    ok = {sid for sid in adventure.scene_ids if adventure.scene(sid).is_ending}
    queue = deque(ok)
    while queue:
        for source in reverse[queue.popleft()]:
            if source not in ok:
                ok.add(source)
                queue.append(source)
    return ok


def jump_cycles(adventure: Adventure) -> list[list[str]]:
    """Cycles made only of Proceed jumps; the runtime would never stop on them."""
    cycles: list[list[str]] = []
    reported: set[str] = set()
    for sid in adventure.scene_ids:
        path: list[str] = []
        current = sid
        while (
            adventure.has_scene(current)
            and adventure.scene(current).exit.kind == "jump"
            and current not in path
        ):
            path.append(current)
            current = adventure.scene(current).exit.target or ""
        if current in path:
            cycle = path[path.index(current) :]
            if not reported.intersection(cycle):
                reported.update(cycle)
                cycles.append(cycle)
    return cycles


def analyze(adventure: Adventure) -> list[Diagnostic]:
    diags = DiagnosticList()

    first_seen: dict[str, int] = {}
    for scene in adventure.scenes:
        if scene.id in first_seen:
            diags.error(
                "QL302",
                f'Scene "{scene.id}" is declared twice (first at line {first_seen[scene.id]}). '
                "Scene names must be unique.",
                scene.line,
            )
        else:
            first_seen[scene.id] = scene.line

    for cycle in jump_cycles(adventure):
        loop = " -> ".join(cycle + [cycle[0]])
        diags.error(
            "QL403",
            f"These scenes jump to each other automatically forever: {loop}. "
            "Give one of them Options or Conclude.",
            adventure.scene(cycle[0]).line,
        )

    if not any(s.is_ending for s in adventure.scenes):
        diags.warning(
            "QL404", "The adventure has no ending: no scene uses Conclude.", adventure.start_line
        )

    reachable = reachable_from(adventure, adventure.start)
    for sid in adventure.scene_ids:
        if reachable and sid not in reachable:  # skip if the start scene itself is missing
            diags.warning(
                "QL401",
                f'Scene "{sid}" can never be reached from the starting scene "{adventure.start}".',
                adventure.scene(sid).line,
            )

    finishable = can_reach_ending(adventure)
    if any(s.is_ending for s in adventure.scenes):
        for sid in adventure.scene_ids:
            if sid in reachable and sid not in finishable:
                diags.warning(
                    "QL402",
                    f'Dead end: a player who enters "{sid}" can never reach an ending.',
                    adventure.scene(sid).line,
                )

    for scene in adventure.scenes:
        seen: dict[str, int] = {}
        for choice in scene.exit.choices:
            if choice.label in seen:
                diags.warning(
                    "QL405",
                    f'Scene "{scene.id}" offers the option "{choice.label}" twice '
                    f"(also at line {seen[choice.label]}).",
                    choice.line,
                )
            seen.setdefault(choice.label, choice.line)

    return diags.items
