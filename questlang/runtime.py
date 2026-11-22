"""Play-session runtime shared by the CLI and QuestLang Studio.

The runtime owns the navigation rules; interfaces only display what it
returns and pass the player's selection back:

* a new session enters the starting scene; history is ``[start]``
* entering a scene records one visit and displays its passages again
* a Proceed jump enters its destination without waiting for input
* a Conclude scene sets ``completed`` to True; it stays the current scene
  and no further choices are offered
* an invalid selection raises :class:`InvalidChoice` and changes nothing
* restart clears history, sets ``completed`` to False and re-enters the start
"""

from __future__ import annotations

from dataclasses import dataclass

from .model import Adventure, Choice


class InvalidChoice(ValueError):
    """The selection is not one of the options currently offered."""


class RuntimeLoopError(RuntimeError):
    """Automatic jumps did not stop (cycle guard)."""


@dataclass(frozen=True)
class SceneView:
    """What an interface shows when a scene is entered."""

    scene_id: str
    passages: tuple[str, ...]
    choices: tuple[Choice, ...]
    is_ending: bool
    via_jump: bool = False  # entered automatically through Proceed


class Session:
    """One playthrough of one adventure."""

    def __init__(self, adventure: Adventure, *, max_auto_jumps: int = 1000) -> None:
        if not adventure.has_scene(adventure.start):
            raise ValueError(f'Starting scene "{adventure.start}" does not exist.')
        self.adventure = adventure
        self.max_auto_jumps = max_auto_jumps
        self.current: str = ""
        self.history: list[str] = []
        self.completed: bool = False
        self.last_entered: list[SceneView] = []
        self.restart()

    # ------------------------------------------------------------ queries --
    def choices(self) -> list[Choice]:
        """Options offered now, in source order (empty once completed)."""
        if self.completed:
            return []
        return list(self.adventure.scene(self.current).exit.choices)

    def view(self) -> SceneView:
        scene = self.adventure.scene(self.current)
        return SceneView(scene.id, scene.passages, tuple(self.choices()), scene.is_ending)

    @property
    def ending(self) -> str | None:
        """ID of the terminal scene reached, if the adventure is complete."""
        return self.current if self.completed else None

    # ------------------------------------------------------------ actions --
    def restart(self) -> list[SceneView]:
        self.history = []
        self.completed = False
        return self._enter(self.adventure.start)

    def choose(self, selection: int | str) -> list[SceneView]:
        """Follow the option numbered ``selection`` (1-based, as shown to the player).

        Returns the scenes entered, in order: the chosen destination plus any
        scenes reached through automatic jumps.
        """
        options = self.choices()
        if self.completed:
            raise InvalidChoice("The adventure is complete. Restart to play again.")
        try:
            number = int(str(selection).strip())
        except ValueError:
            raise InvalidChoice(f'"{selection}" is not a number. Enter 1-{len(options)}.') from None
        if not 1 <= number <= len(options):
            raise InvalidChoice(f"{number} is not an option. Enter 1-{len(options)}.")
        return self._enter(options[number - 1].target)

    # ----------------------------------------------------------- internals --
    def _enter(self, scene_id: str) -> list[SceneView]:
        entered: list[SceneView] = []
        via_jump = False
        for _ in range(self.max_auto_jumps + 1):
            scene = self.adventure.scene(scene_id)
            self.current = scene.id
            self.history.append(scene.id)
            if scene.is_ending:
                self.completed = True
            entered.append(
                SceneView(scene.id, scene.passages, tuple(self.choices()), scene.is_ending, via_jump)
            )
            if scene.exit.kind != "jump":
                self.last_entered = entered
                return entered
            scene_id = scene.exit.target or ""
            via_jump = True
        raise RuntimeLoopError(
            f"Stopped after {self.max_auto_jumps} automatic jumps; the Proceed statements loop forever."
        )
