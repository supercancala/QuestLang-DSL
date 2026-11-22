"""QuestLang command-line interface.

    python -m questlang check  story.quest          # validate, print diagnostics
    python -m questlang play   story.quest          # play in the terminal
    python -m questlang graph  story.quest -o map.svg   # export the story graph
    python -m questlang serve  [--port 3000]       # engine API for QuestLang Studio

Exit codes: 0 = OK (warnings allowed), 1 = errors found, 2 = usage/file error.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import textwrap
from collections.abc import Callable
from pathlib import Path

from .graph import to_dot
from .parser import ParseResult, parse
from .runtime import InvalidChoice, SceneView, Session

QUIT_WORDS = {"q", "quit", "exit"}
RESTART_WORDS = {"r", "restart"}


def _load(path: str) -> tuple[str, ParseResult] | None:
    try:
        source = Path(path).read_text(encoding="utf-8")
    except OSError as err:
        print(f"questlang: cannot read {path}: {err.strerror}", file=sys.stderr)
        return None
    return source, parse(source)


def _report(result: ParseResult, filename: str, out: Callable[[str], None]) -> None:
    for d in result.diagnostics:
        out(d.format(filename))
    errors, warnings = len(result.errors), len(result.warnings)
    if result.ok and result.adventure:
        a = result.adventure
        endings = sum(s.is_ending for s in a.scenes)
        out(
            f'OK: "{a.title}" - {len(a.scene_ids)} scenes, {len(a.transitions())} transitions, '
            f"{endings} ending{'s' if endings != 1 else ''} ({warnings} warning{'s' if warnings != 1 else ''})."
        )
    else:
        out(f"{errors} error{'s' if errors != 1 else ''}, {warnings} warning{'s' if warnings != 1 else ''}.")


def cmd_check(args: argparse.Namespace) -> int:
    loaded = _load(args.file)
    if loaded is None:
        return 2
    _, result = loaded
    _report(result, args.file, print)
    return 0 if result.ok else 1


def cmd_graph(args: argparse.Namespace) -> int:
    loaded = _load(args.file)
    if loaded is None:
        return 2
    _, result = loaded
    if result.adventure is None:
        _report(result, args.file, lambda m: print(m, file=sys.stderr))
        return 1
    dot = to_dot(result.adventure)
    if not args.output or args.output.endswith(".dot"):
        if args.output:
            Path(args.output).write_text(dot, encoding="utf-8")
            print(f"Wrote {args.output}")
        else:
            sys.stdout.write(dot)
        return 0
    fmt = Path(args.output).suffix.lstrip(".") or "svg"
    if shutil.which("dot") is None:
        print("questlang: Graphviz `dot` is not installed; use -o file.dot instead.", file=sys.stderr)
        return 2
    subprocess.run(["dot", f"-T{fmt}", "-o", args.output], input=dot.encode(), check=True)
    print(f"Wrote {args.output}")
    return 0


# ------------------------------------------------------------------ play --

def _show(view: SceneView, out: Callable[[str], None], width: int) -> None:
    out("")
    for passage in view.passages:
        out(textwrap.fill(passage, width=width))


def _show_options(session: Session, out: Callable[[str], None]) -> None:
    out("")
    for number, choice in enumerate(session.choices(), start=1):
        out(f"  {number}. {choice.label}")


def play(
    session: Session,
    input_fn: Callable[[str], str] = input,
    out: Callable[[str], None] = print,
    *,
    width: int = 72,
    replay: bool = True,
) -> Session:
    """Interactive terminal loop. ``input_fn``/``out`` are injectable for tests."""
    out(f"=== {session.adventure.title} ===")
    out("(Enter an option number. Type r to restart or q to quit.)")
    for view in session.last_entered:
        _show(view, out, width)

    while True:
        if session.completed:
            out("")
            out(f"*** The End - ending reached: {session.ending} ***")
            if not replay:
                return session
            answer = _ask(input_fn, "Play again? (r = restart, q = quit) > ")
            if answer is None or answer in QUIT_WORDS:
                return session
            if answer in RESTART_WORDS:
                for view in session.restart():
                    _show(view, out, width)
            else:
                out("Please type r or q.")
            continue

        _show_options(session, out)
        answer = _ask(input_fn, "> ")
        if answer is None or answer in QUIT_WORDS:
            out("Goodbye.")
            return session
        if answer in RESTART_WORDS:
            for view in session.restart():
                _show(view, out, width)
            continue
        try:
            entered = session.choose(answer)
        except InvalidChoice as err:
            out(f"  ! {err}")
            continue
        for view in entered:
            _show(view, out, width)


def _ask(input_fn: Callable[[str], str], prompt: str) -> str | None:
    try:
        return input_fn(prompt).strip().lower()
    except (EOFError, KeyboardInterrupt):
        return None


def cmd_play(args: argparse.Namespace) -> int:
    loaded = _load(args.file)
    if loaded is None:
        return 2
    _, result = loaded
    if not result.ok or result.adventure is None:
        _report(result, args.file, lambda m: print(m, file=sys.stderr))
        print("Fix the errors above before playing.", file=sys.stderr)
        return 1
    for warning in result.warnings:
        print(warning.format(args.file), file=sys.stderr)
    play(Session(result.adventure))
    return 0


def cmd_serve(args: argparse.Namespace) -> int:  # pragma: no cover - blocking
    from .server import serve

    serve(args.host, args.port)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="questlang", description="QuestLang toolchain")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("check", help="validate a .quest file")
    p.add_argument("file")
    p.set_defaults(func=cmd_check)
    p = sub.add_parser("play", help="play a .quest file in the terminal")
    p.add_argument("file")
    p.set_defaults(func=cmd_play)
    p = sub.add_parser("graph", help="export the story graph (DOT, SVG, PNG, PDF)")
    p.add_argument("file")
    p.add_argument("-o", "--output", help="output file (.dot, .svg, .png, .pdf); default: DOT to stdout")
    p.set_defaults(func=cmd_graph)
    p = sub.add_parser("serve", help="run the engine API used by QuestLang Studio")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=3000)
    p.set_defaults(func=cmd_serve)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
