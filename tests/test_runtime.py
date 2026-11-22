"""Runtime tests mirroring the use-case table of the Concrete Syntax paper."""

import pytest
from conftest import EXAMPLES, story

from questlang import parse
from questlang.runtime import InvalidChoice, RuntimeLoopError, Session


def play_route(adventure, picks):
    session = Session(adventure)
    for pick in picks:
        session.choose(pick)
    return session


# Expected playthroughs (paper, section 5) ----------------------------------
@pytest.mark.parametrize(
    "picks, route, ending",
    [
        ([1, 1], ["Entrance", "TheTown", "Garage", "RoadHome"], "RoadHome"),
        ([1, 2], ["Entrance", "TheTown", "Inn"], "Inn"),
        ([2, 2, 1], ["Entrance", "FoggyForest", "Clearing", "Cabin"], "Cabin"),
        (
            [2, 3, 2, 1, 1],
            ["Entrance", "FoggyForest", "Entrance", "FoggyForest", "OldRoad",
             "TheTown", "Garage", "RoadHome"],
            "RoadHome",
        ),
    ],
    ids=["return-to-road", "stay-in-town", "forest-shelter", "revisit-and-rejoin"],
)
def test_expected_playthroughs(town, picks, route, ending):
    session = play_route(town, picks)
    assert session.history == route
    assert session.completed and session.ending == ending


def test_new_session_state(town):
    s = Session(town)
    assert (s.current, s.history, s.completed) == ("Entrance", ["Entrance"], False)


def test_us01_labels_in_source_order(town):
    s = Session(town)
    assert [c.label for c in s.choices()] == [
        "Enter the town and ask for help",
        "Look for another route through the forest",
    ]
    assert Session(town).choose(1)[0].scene_id == "TheTown"
    assert Session(town).choose(2)[0].scene_id == "FoggyForest"


def test_us02_rename_keeps_routes(town):
    renamed = (EXAMPLES / "mysterious_town.quest").read_text().replace("Entrance", "Arrival")
    result = parse(renamed)
    assert result.ok and result.adventure.start == "Arrival"
    assert play_route(result.adventure, [1, 3]).current == "Arrival"
    assert play_route(result.adventure, [2, 3]).current == "Arrival"
    assert "Entrance" not in renamed


def test_us02_rename_that_breaks_a_link_is_reported(town):
    source = (EXAMPLES / "mysterious_town.quest").read_text()
    # Rename the declaration and Begin, but forget the two "Return to your car" options.
    broken = source.replace("Scene Entrance:", "Scene Arrival:").replace("Begin at Entrance", "Begin at Arrival")
    result = parse(broken)
    assert [e.code for e in result.errors] == ["QL301", "QL301"]


def test_us03_converging_routes(town):
    a = play_route(town, [1, 3])
    b = play_route(town, [2, 3])
    assert a.history == ["Entrance", "TheTown", "Entrance"]
    assert b.history == ["Entrance", "FoggyForest", "Entrance"]
    assert a.last_entered[-1].passages == town.scene("Entrance").passages


@pytest.mark.parametrize("bad", [0, 3, "0", "3", "abc", "", "1.5", "-1"])
def test_us04_invalid_input_changes_nothing(town, bad):
    s = Session(town)
    with pytest.raises(InvalidChoice):
        s.choose(bad)
    assert (s.current, s.history, s.completed) == ("Entrance", ["Entrance"], False)


def test_us05_deliberate_revisit(town):
    s = play_route(town, [2, 3])
    assert s.history == ["Entrance", "FoggyForest", "Entrance"]
    assert len(s.choices()) == 2
    assert s.last_entered[0].passages == town.scene("Entrance").passages


def test_automatic_jump_and_completion(town):
    s = Session(town)
    s.choose(1)
    entered = s.choose(1)
    assert [v.scene_id for v in entered] == ["Garage", "RoadHome"]
    assert entered[1].via_jump
    assert s.completed and s.current == "RoadHome"
    assert s.choices() == []
    with pytest.raises(InvalidChoice):
        s.choose(1)


def test_restart(town):
    s = play_route(town, [1, 1])
    s.restart()
    assert (s.current, s.history, s.completed) == ("Entrance", ["Entrance"], False)


def test_start_scene_that_jumps_is_followed():
    adventure = parse(story("Scene A:\n    Proceed to B.\n", "Scene B:\n    Conclude.\n")).adventure
    s = Session(adventure)
    assert s.history == ["A", "B"] and s.completed


def test_cycle_guard():
    adventure = parse(story("Scene A:\n    Proceed to A.\n"), analyze=False).adventure
    with pytest.raises(RuntimeLoopError):
        Session(adventure, max_auto_jumps=50)


def test_sessions_are_independent(town):
    one, two = Session(town), Session(town)
    one.choose(1)
    assert two.history == ["Entrance"]
