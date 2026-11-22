"""CLI runner and Graphviz export."""

import re
import shutil

import pytest
from conftest import EXAMPLES

from questlang.cli import main, play
from questlang.graph import to_dot
from questlang.runtime import Session


def scripted(inputs):
    it = iter(inputs)
    return lambda prompt="": next(it)


def test_check_exit_codes(capsys):
    assert main(["check", str(EXAMPLES / "mysterious_town.quest")]) == 0
    assert "9 scenes" in capsys.readouterr().out
    assert main(["check", str(EXAMPLES / "lost_crypt.quest")]) == 0  # warnings only
    assert main(["check", str(EXAMPLES / "broken_story.quest")]) == 1
    assert main(["check", "does-not-exist.quest"]) == 2


def test_cli_us04_invalid_input_then_valid(town):
    out = []
    session = play(Session(town), scripted(["0", "3", "abc", "1", "q"]), out.append)
    assert session.history == ["Entrance", "TheTown"]
    assert sum("is not" in line for line in out) == 3


def test_cli_full_playthrough_and_restart(town):
    out = []
    session = play(Session(town), scripted(["1", "1", "r", "2", "2", "1", "q"]), out.append)
    assert session.history == ["Entrance", "FoggyForest", "Clearing", "Cabin"]
    assert sum("The End" in line for line in out) == 2
    assert "Ending: Shelter in the forest." in out


def test_cli_quit_on_eof(town):
    def eof(prompt=""):
        raise EOFError

    assert play(Session(town), eof, lambda _: None).history == ["Entrance"]


def test_play_refuses_story_with_errors(capsys):
    assert main(["play", str(EXAMPLES / "broken_story.quest")]) == 1
    assert "Fix the errors" in capsys.readouterr().err


def test_us03_every_scene_and_transition_in_graph(town):
    dot = to_dot(town)
    nodes = set(re.findall(r'^\s+"(\w+)" \[label=', dot, re.M))
    edges = re.findall(r'^\s+"(\w+)" -> "(\w+)"', dot, re.M)
    assert nodes == set(town.scene_ids)
    assert sorted(edges) == sorted((s, t) for s, t, _ in town.transitions())
    assert len(edges) == 12
    assert dot.count("style=dashed, label=\"auto\"") == 2  # Garage and OldRoad


def test_graph_highlights_session(town):
    dot = to_dot(town, current="TheTown", visited=["Entrance", "TheTown"])
    assert re.search(r'"TheTown" \[[^\]]*#FDE68A', dot)


def test_graph_command_writes_dot(tmp_path):
    target = tmp_path / "map.dot"
    assert main(["graph", str(EXAMPLES / "lighthouse.quest"), "-o", str(target)]) == 0
    assert target.read_text().startswith("digraph QuestLang")


@pytest.mark.skipif(shutil.which("dot") is None, reason="Graphviz not installed")
def test_graph_command_renders_svg(tmp_path):
    target = tmp_path / "map.svg"
    assert main(["graph", str(EXAMPLES / "mysterious_town.quest"), "-o", str(target)]) == 0
    assert "<svg" in target.read_text()
