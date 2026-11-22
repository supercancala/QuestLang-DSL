"""Plain-Python model of an adventure.

The parser turns the textX model into these dataclasses so the analyzer,
the runtime, the graph exporter and the user interfaces never depend on
textX objects. Scene references are stored as scene IDs (strings).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

ExitKind = Literal["choices", "jump", "conclude"]


@dataclass(frozen=True)
class Choice:
    label: str
    target: str
    line: int = 0


@dataclass(frozen=True)
class Exit:
    kind: ExitKind
    choices: tuple[Choice, ...] = ()
    target: str | None = None  # destination of a jump
    line: int = 0

    def targets(self) -> list[str]:
        """Destination scene IDs, in source order."""
        if self.kind == "choices":
            return [c.target for c in self.choices]
        if self.kind == "jump" and self.target is not None:
            return [self.target]
        return []


@dataclass(frozen=True)
class Scene:
    id: str
    passages: tuple[str, ...]
    exit: Exit
    line: int = 0

    @property
    def is_ending(self) -> bool:
        return self.exit.kind == "conclude"


@dataclass
class Adventure:
    title: str
    start: str
    scenes: list[Scene] = field(default_factory=list)
    start_line: int = 0

    def __post_init__(self) -> None:
        self._index: dict[str, Scene] = {}
        for scene in self.scenes:
            # The first declaration wins; duplicates are reported by the analyzer.
            self._index.setdefault(scene.id, scene)

    def scene(self, scene_id: str) -> Scene:
        return self._index[scene_id]

    def has_scene(self, scene_id: str) -> bool:
        return scene_id in self._index

    @property
    def scene_ids(self) -> list[str]:
        return list(self._index)

    def transitions(self) -> list[tuple[str, str, str | None]]:
        """All edges as (source, destination, choice label or None for a jump)."""
        edges: list[tuple[str, str, str | None]] = []
        for scene in self._index.values():
            if scene.exit.kind == "choices":
                edges.extend((scene.id, c.target, c.label) for c in scene.exit.choices)
            elif scene.exit.kind == "jump" and scene.exit.target:
                edges.append((scene.id, scene.exit.target, None))
        return edges
