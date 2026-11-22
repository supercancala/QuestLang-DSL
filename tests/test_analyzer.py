"""Semantic analysis: references, duplicates, reachability, dead ends."""

from conftest import EXAMPLES, codes, story

from questlang import parse, parse_file


def test_mysterious_town_is_clean():
    assert parse_file(EXAMPLES / "mysterious_town.quest").diagnostics == []


def test_unknown_target_is_an_error_with_suggestion():
    src = story('Scene Arrival:\n    Option "x" leads to Arival.\n', start="Arrival")
    [err] = parse(src).errors
    assert err.code == "QL301"
    assert '"Arival"' in err.message and 'Did you mean "Arrival"' in err.message
    assert (err.line, err.column) == (5, 25)


def test_every_unknown_target_is_reported():
    src = story(
        'Scene A:\n    Option "1" leads to Nowhere.\n    Option "2" leads to Elsewhere.\n',
        "Scene B:\n    Proceed to Gone.\n",
    )
    assert codes(src).count("QL301") == 3


def test_unknown_start_scene():
    src = story("Scene A:\n    Conclude.\n", start="Missing")
    assert codes(src) == ["QL301"]  # no flood of unreachable warnings


def test_case_mismatch_suggests_the_right_name():
    src = story("Scene Entrance:\n    Conclude.\n", start="entrance")
    assert 'Did you mean "Entrance"' in parse(src).errors[0].message


def test_duplicate_scene_id():
    src = story("Scene A:\n    Proceed to B.\n", "Scene B:\n    Conclude.\n", "Scene B:\n    Conclude.\n")
    [err] = parse(src).errors
    assert err.code == "QL302" and "first at line 7" in err.message


def test_unreachable_scene_is_a_warning():
    result = parse_file(EXAMPLES / "lost_crypt.quest")
    assert result.ok
    assert [(w.code, "SecretObservatory" in w.message) for w in result.warnings] == [("QL401", True)]


def test_dead_end_cycle_is_a_warning():
    src = story(
        'Scene A:\n    Option "win" leads to End.\n    Option "trap" leads to T1.\n',
        "Scene End:\n    Conclude.\n",
        'Scene T1:\n    Option "on" leads to T2.\n',
        "Scene T2:\n    Proceed to T1.\n",
    )
    result = parse(src)
    assert result.ok  # warnings do not block play
    dead = sorted(w.message.split('"')[1] for w in result.warnings if w.code == "QL402")
    assert dead == ["T1", "T2"]


def test_proceed_loop_is_an_error():
    src = story("Scene A:\n    Proceed to B.\n", "Scene B:\n    Proceed to A.\n")
    assert "QL403" in codes(src)
    assert not parse(src).ok


def test_self_target_option_is_allowed():
    src = story('Scene A:\n    Option "wait" leads to A.\n    Option "go" leads to B.\n',
                "Scene B:\n    Conclude.\n")
    assert codes(src) == []


def test_no_ending_warning():
    src = story('Scene A:\n    Option "again" leads to A.\n')
    assert codes(src) == ["QL404"]


def test_duplicate_option_label_warning():
    src = story('Scene A:\n    Option "go" leads to B.\n    Option "go" leads to B.\n',
                "Scene B:\n    Conclude.\n")
    assert codes(src) == ["QL405"]


def test_broken_story_example_reports_all_problems():
    found = {d.code for d in parse_file(EXAMPLES / "broken_story.quest").diagnostics}
    assert {"QL301", "QL302", "QL402"} <= found
