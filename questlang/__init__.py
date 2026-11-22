"""QuestLang: a declarative DSL for interactive branching text adventures."""

from .diagnostics import Diagnostic
from .model import Adventure, Choice, Exit, Scene
from .parser import ParseResult, parse, parse_file

__all__ = [
    "Adventure",
    "Choice",
    "Diagnostic",
    "Exit",
    "ParseResult",
    "Scene",
    "parse",
    "parse_file",
]
__version__ = "1.0.0"
