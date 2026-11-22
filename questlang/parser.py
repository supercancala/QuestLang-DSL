"""Parse QuestLang source with the textX grammar and build the plain model."""

from __future__ import annotations

import difflib
import functools
import re
from dataclasses import dataclass, field
from pathlib import Path

from textx import TextXSemanticError, TextXSyntaxError, get_model, metamodel_from_file

from .diagnostics import Diagnostic, DiagnosticList
from .layout import check_layout
from .model import Adventure, Choice, Exit, Scene

GRAMMAR_FILE = Path(__file__).parent / "grammar" / "questlang.tx"

_RESERVED = re.compile(
    r"(?i:adventure|begin|at|scene|narrate|option|leads|to|proceed|conclude|restart)(?![A-Za-z0-9_])"
)

# Friendly names for what the parser expected next.
_FRIENDLY = {
    "SceneID": "a scene name",
    "QuotedText": 'text in double quotes ("...")',
    "EOF": "the end of the file",
    "Reserved": "a scene name",
}


@dataclass
class ParseResult:
    """Outcome of parsing: a model (if the syntax was valid) and diagnostics."""

    adventure: Adventure | None
    diagnostics: list[Diagnostic] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.adventure is not None and not any(d.is_error for d in self.diagnostics)

    @property
    def errors(self) -> list[Diagnostic]:
        return [d for d in self.diagnostics if d.is_error]

    @property
    def warnings(self) -> list[Diagnostic]:
        return [d for d in self.diagnostics if not d.is_error]


class _MissingScene:
    """Placeholder for a reference to an undeclared scene.

    Returning it from the scope provider lets textX finish building the
    model, so *every* broken reference is reported, not only the first.
    """

    def __init__(self, name: str) -> None:
        self.name = name


def _unescape(text: str) -> str:
    return re.sub(r"\\([\"\\])", r"\1", text[1:-1])


def _scene_scope(obj, attr, ref):
    model = get_model(obj)
    for scene in model.scenes:
        if scene.name == ref.obj_name:
            return scene
    line, col = model._tx_parser.pos_to_linecol(ref.position)
    names = [s.name for s in model.scenes]
    hint = [n for n in names if n.lower() == ref.obj_name.lower()] or difflib.get_close_matches(
        ref.obj_name, names, n=1
    )
    message = f'There is no scene named "{ref.obj_name}".'
    if hint:
        message += f' Did you mean "{hint[0]}"?'
    elif names:
        message += " Declare it with `Scene " + ref.obj_name + ":` or fix the name."
    model.__dict__.setdefault("_ql_missing", []).append(
        Diagnostic("error", "QL301", message, line, col)
    )
    return _MissingScene(ref.obj_name)


@functools.lru_cache(maxsize=1)
def metamodel():
    """The QuestLang textX metamodel (built once and cached)."""
    mm = metamodel_from_file(str(GRAMMAR_FILE), autokwd=True)
    mm.register_obj_processors({"QuotedText": _unescape})
    mm.register_scope_providers({"*.*": _scene_scope})
    return mm


def _expected_text(err: TextXSyntaxError) -> list[str]:
    names: list[str] = []
    for rule in getattr(err, "expected_rules", None) or []:
        kind = type(rule).__name__
        rule_name = getattr(rule, "rule_name", "") or ""
        to_match = getattr(rule, "to_match", None)
        if kind == "Not" or rule_name in ("SceneID", "Reserved"):
            label = _FRIENDLY["SceneID"]
        elif kind == "EndOfFile" or rule_name == "EOF":
            label = _FRIENDLY["EOF"]
        elif rule_name in _FRIENDLY:
            label = _FRIENDLY[rule_name]
        elif isinstance(to_match, str) and to_match:
            label = f"'{to_match}'"  # keyword or punctuation
        else:
            label = rule_name or "something else"
        if label not in names:
            names.append(label)
    return names


def _previous_code_line(lines: list[str], line: int) -> int:
    """1-based number of the last non-blank line before ``line``."""
    for number in range(min(line, len(lines) + 1) - 1, 0, -1):
        if lines[number - 1].strip():
            return number
    return line


def _syntax_diagnostic(err: TextXSyntaxError, source: str) -> Diagnostic:
    lines = source.splitlines()
    line, col = err.line, err.col
    expected = _expected_text(err)
    text_at = lines[line - 1][col - 1 :] if 0 < line <= len(lines) else ""
    if text_at.strip():  # textX may point at the whitespace before the token
        col += len(text_at) - len(text_at.lstrip())
        text_at = text_at.lstrip()

    if _RESERVED.match(text_at) and ("a scene name" in expected or not expected):
        word = _RESERVED.match(text_at).group()
        return Diagnostic(
            "error",
            "QL202",
            f'"{word}" is a reserved word and cannot be used as a scene name.',
            line,
            col,
        )

    if expected == ["'.'"]:
        # The period belongs at the end of the previous statement.
        prev = _previous_code_line(lines, line) if col == 1 or not text_at.strip() else line
        end = len(lines[prev - 1].rstrip()) + 1 if 0 < prev <= len(lines) else col
        return Diagnostic(
            "error", "QL201", 'Missing period "." at the end of the statement.', prev, end
        )

    if not text_at.strip() and line > len(lines):
        found = "the end of the file"
    else:
        found = f'"{text_at.split()[0]}"' if text_at.split() else "the end of the line"

    if expected:
        wanted = expected[0] if len(expected) == 1 else ", ".join(expected[:-1]) + " or " + expected[-1]
        message = f"Expected {wanted} but found {found}."
    else:
        message = f"Unexpected {found}."

    if text_at.startswith('"') and "QuotedText" not in found and text_at.count('"') % 2 == 1:
        message += " The closing quote is missing; text must start and end on the same line."
    elif text_at.startswith("Narrate") and "'Narrate'" not in expected:
        message += " Narrate lines must come before the scene's Options, Proceed or Conclude."
    elif {"'Narrate'", "'Option'", "'Proceed'", "'Conclude'"} <= set(expected):
        message += " Every scene must end with Options, a Proceed, or Conclude."
    elif "'Option'" in expected and "'Scene'" in expected:
        message += " A scene has exactly one exit: Options cannot be mixed with Proceed or Conclude."
    return Diagnostic("error", "QL201", message, line, col)


def _line_of(model, obj) -> int:
    return model._tx_parser.pos_to_linecol(obj._tx_position)[0]


def _build(tx) -> Adventure:
    scenes: list[Scene] = []
    for s in tx.scenes:
        ex = s.exit
        kind = ex.__class__.__name__
        if kind == "ChoiceBlock":
            exit_ = Exit(
                "choices",
                tuple(Choice(c.label, c.target.name, _line_of(tx, c)) for c in ex.choices),
                line=_line_of(tx, ex),
            )
        elif kind == "Jump":
            exit_ = Exit("jump", target=ex.target.name, line=_line_of(tx, ex))
        else:
            exit_ = Exit("conclude", line=_line_of(tx, ex))
        scenes.append(Scene(s.name, tuple(p.text for p in s.passages), exit_, _line_of(tx, s)))
    return Adventure(tx.title, tx.start.target.name, scenes, _line_of(tx, tx.start))


def parse(source: str, *, analyze: bool = True) -> ParseResult:
    """Parse QuestLang source text.

    Returns a :class:`ParseResult`. ``adventure`` is ``None`` only when the
    source has a syntax error. Reference errors, duplicate scenes and story
    graph problems are returned as diagnostics alongside the model.
    """
    diags = DiagnosticList()
    diags.extend(check_layout(source))

    try:
        tx = metamodel().model_from_str(source)
    except TextXSyntaxError as err:
        diags.items.append(_syntax_diagnostic(err, source))
        return ParseResult(None, _dedupe(diags.sorted()))
    except TextXSemanticError as err:  # pragma: no cover - defensive
        diags.error("QL201", err.message, err.line or 1, err.col or 1)
        return ParseResult(None, _dedupe(diags.sorted()))

    diags.extend(getattr(tx, "_ql_missing", []))
    adventure = _build(tx)
    if analyze:
        from .analyzer import analyze as run_analysis

        diags.extend(run_analysis(adventure))
    return ParseResult(adventure, _dedupe(diags.sorted()))


def parse_file(path: str | Path, *, analyze: bool = True) -> ParseResult:
    return parse(Path(path).read_text(encoding="utf-8"), analyze=analyze)


def _dedupe(items: list[Diagnostic]) -> list[Diagnostic]:
    seen: set[tuple] = set()
    out: list[Diagnostic] = []
    for d in items:
        key = (d.code, d.line, d.column, d.message)
        if key not in seen:
            seen.add(key)
            out.append(d)
    return out
