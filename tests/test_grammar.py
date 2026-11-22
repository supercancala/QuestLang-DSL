"""Parser tests: valid syntax is accepted, malformed syntax is rejected."""

import pytest
from conftest import EXAMPLES, codes, story

from questlang import parse, parse_file


@pytest.mark.parametrize("path", sorted(EXAMPLES.glob("*.quest")), ids=lambda p: p.name)
def test_every_example_parses(path):
    assert parse_file(path).adventure is not None


def test_mysterious_town_model(town):
    assert town.title == "The mysterious town"
    assert town.start == "Entrance"
    assert town.scene_ids == [
        "Entrance", "TheTown", "Garage", "RoadHome", "Inn",
        "FoggyForest", "OldRoad", "Clearing", "Cabin",
    ]
    assert town.scene("Garage").exit.kind == "jump"
    assert town.scene("Garage").exit.target == "RoadHome"
    assert town.scene("Clearing").exit.kind == "choices"
    assert {s.id for s in town.scenes if s.is_ending} == {"RoadHome", "Inn", "Cabin"}
    assert town.scene("Entrance").passages == (
        "Your car is out of gasoline outside a small, foggy town.",
        "You need fuel or a place to spend the night.",
    )


def test_scene_without_passages_is_valid():
    result = parse(story("Scene A:\n    Conclude.\n"))
    assert result.ok
    assert result.adventure.scene("A").passages == ()


def test_forward_reference_resolves():
    src = story(
        'Scene A:\n    Option "next" leads to B.\n',
        "Scene B:\n    Conclude.\n",
    )
    assert parse(src).ok


def test_escaped_quote_and_backslash():
    src = story('Scene A:\n    Narrate "She said \\"hi\\" \\\\ bye"\n    Conclude.\n')
    assert parse(src).adventure.scene("A").passages == ('She said "hi" \\ bye',)


def test_blank_lines_are_ignored():
    src = story('\n\nScene A:\n\n    Narrate "x"\n\n    Conclude.\n\n')
    assert parse(src).ok


def test_identifiers_may_contain_keywords_as_prefix():
    src = story(
        'Scene A:\n    Option "x" leads to Totem.\n    Option "y" leads to Atlas.\n',
        "Scene Totem:\n    Conclude.\n",
        "Scene Atlas:\n    Conclude.\n",
    )
    assert parse(src).ok


def test_identifiers_are_case_sensitive():
    src = story("Scene A:\n    Proceed to a.\n", "Scene a:\n    Conclude.\n")
    result = parse(src)
    assert result.ok
    assert result.adventure.scene_ids == ["A", "a"]


@pytest.mark.parametrize(
    "source, code",
    [
        # missing period after Option / Proceed / Conclude / Begin
        (story('Scene A:\n    Option "x" leads to A\n'), "QL201"),
        (story("Scene A:\n    Proceed to A\n"), "QL201"),
        (story("Scene A:\n    Conclude\n"), "QL201"),
        ('Adventure "T":\n    Begin at A\nScene A:\n    Conclude.\n', "QL201"),
        # missing exit clause
        (story('Scene A:\n    Narrate "no exit"\n'), "QL201"),
        # mixed exits
        (story('Scene A:\n    Option "x" leads to A.\n    Conclude.\n'), "QL201"),
        (story("Scene A:\n    Proceed to A.\n    Conclude.\n"), "QL201"),
        # Narrate after the exit
        (story('Scene A:\n    Conclude.\n    Narrate "late"\n'), "QL201"),
        # missing colon
        (story("Scene A\n    Conclude.\n"), "QL201"),
        ('Adventure "T"\n    Begin at A.\nScene A:\n    Conclude.\n', "QL201"),
        # unquoted / unterminated text
        (story("Scene A:\n    Narrate hello\n    Conclude.\n"), "QL201"),
        (story('Scene A:\n    Narrate "open\n    Conclude.\n'), "QL201"),
        # no scenes / no Begin
        ('Adventure "T":\n    Begin at A.\n', "QL201"),
        ('Adventure "T":\nScene A:\n    Conclude.\n', "QL201"),
        # keyword (any capitalization) or Restart as a scene name
        (story("Scene to:\n    Conclude.\n"), "QL202"),
        (story("Scene RESTART:\n    Conclude.\n"), "QL202"),
        (story("Scene Scene:\n    Conclude.\n"), "QL202"),
        # lexical: digits first, non-English letters
        (story("Scene 1A:\n    Conclude.\n"), "QL201"),
        (story("Scene Café:\n    Conclude.\n"), "QL201"),
        # layout
        (story("Scene A:\n\tConclude.\n"), "QL101"),
        (story("Scene A:\n  Conclude.\n"), "QL102"),
        (story("Scene A:\nConclude.\n"), "QL103"),
        (story("    Scene A:\n    Conclude.\n"), "QL103"),
        ('Adventure "T":\nBegin at A.\nScene A:\n    Conclude.\n', "QL103"),
        (story('Scene A:\n    Narrate "x" Conclude.\n'), "QL104"),
    ],
)
def test_malformed_syntax_is_rejected(source, code):
    result = parse(source)
    assert not result.ok
    assert code in [d.code for d in result.errors]


def test_keyword_text_inside_quotes_is_fine():
    src = story('Scene A:\n    Narrate "Scene Option Proceed to Conclude."\n    Conclude.\n')
    assert parse(src).ok


def test_missing_period_points_at_the_statement():
    src = story('Scene A:\n    Option "x" leads to A\n\nScene B:\n    Conclude.\n')
    [err] = parse(src).errors
    assert err.line == 5 and "period" in err.message


def test_syntax_error_reports_line_number():
    src = story('Scene A:\n    Narrate "ok"\n    Narate "typo"\n    Conclude.\n')
    [err] = parse(src).errors
    assert (err.line, err.column) == (6, 5)


def test_codes_helper_empty_for_valid_story():
    assert codes(story("Scene A:\n    Conclude.\n")) == []
