"""Diagnostics shared by the layout check, the parser and the semantic analyzer."""

from __future__ import annotations

from dataclasses import dataclass, field

ERROR = "error"
WARNING = "warning"


@dataclass(frozen=True)
class Diagnostic:
    """One problem found in a .quest source file.

    ``line`` and ``column`` are 1-based. ``code`` is a stable identifier
    (for example ``QL201``) that tests and the Studio can rely on even if
    the wording of ``message`` changes.
    """

    severity: str
    code: str
    message: str
    line: int = 1
    column: int = 1

    @property
    def is_error(self) -> bool:
        return self.severity == ERROR

    def format(self, filename: str = "") -> str:
        where = f"{filename}:" if filename else "line "
        return f"{where}{self.line}:{self.column}: {self.severity} {self.code}: {self.message}"


@dataclass
class DiagnosticList:
    items: list[Diagnostic] = field(default_factory=list)

    def error(self, code: str, message: str, line: int = 1, column: int = 1) -> None:
        self.items.append(Diagnostic(ERROR, code, message, line, column))

    def warning(self, code: str, message: str, line: int = 1, column: int = 1) -> None:
        self.items.append(Diagnostic(WARNING, code, message, line, column))

    def extend(self, other: "DiagnosticList | list[Diagnostic]") -> None:
        self.items.extend(other.items if isinstance(other, DiagnosticList) else other)

    @property
    def has_errors(self) -> bool:
        return any(d.is_error for d in self.items)

    def sorted(self) -> list[Diagnostic]:
        return sorted(self.items, key=lambda d: (d.line, d.column, d.severity != ERROR))


# Diagnostic codes ---------------------------------------------------------
#   QL1xx  layout (indentation, lines)
#   QL2xx  syntax
#   QL3xx  references and declarations
#   QL4xx  story-graph analysis
CODES = {
    "QL101": "Tab character used for indentation",
    "QL102": "Indentation is not a multiple of four spaces",
    "QL103": "Statement at the wrong indentation level",
    "QL104": "More than one statement on a line",
    "QL201": "Syntax error",
    "QL202": "Keyword used as a scene identifier",
    "QL301": "Reference to an undeclared scene",
    "QL302": "Duplicate scene identifier",
    "QL401": "Scene unreachable from the starting scene",
    "QL402": "Dead end: no ending can be reached from this scene",
    "QL403": "Automatic jumps form an endless loop",
    "QL404": "Adventure has no ending",
    "QL405": "Duplicate option label in a scene",
}
