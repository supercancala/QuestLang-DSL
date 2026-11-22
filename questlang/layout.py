"""Layout check: the NEWLINE / INDENT / DEDENT part of the QuestLang grammar.

The BNF uses newline and indentation tokens. textX skips whitespace, so this
pass enforces those rules on the raw text before parsing:

* tabs are not allowed (QL101)
* indentation is a multiple of four spaces (QL102)
* ``Adventure`` and ``Scene`` start at column 1; ``Begin``, ``Narrate``,
  ``Option``, ``Proceed`` and ``Conclude`` are indented one level (QL103)
* one statement per line (QL104)
* blank lines are ignored
"""

from __future__ import annotations

import re

from .diagnostics import DiagnosticList

INDENT = 4
TOP_LEVEL = ("Adventure", "Scene")
BODY = ("Begin", "Narrate", "Option", "Proceed", "Conclude")
STATEMENT_KEYWORDS = TOP_LEVEL + BODY

_STRING = re.compile(r'"(?:\\["\\]|[^"\\\r\n])*"')
_KEYWORD = re.compile(r"(?<![A-Za-z0-9_])(" + "|".join(STATEMENT_KEYWORDS) + r")(?![A-Za-z0-9_])")


def check_layout(source: str) -> DiagnosticList:
    diags = DiagnosticList()
    for number, raw in enumerate(source.splitlines(), start=1):
        if not raw.strip():
            continue

        if "\t" in raw:
            col = raw.index("\t") + 1
            diags.error("QL101", "Tabs are not allowed. Indent with four spaces.", number, col)
            continue

        indent = len(raw) - len(raw.lstrip(" "))
        if indent % INDENT:
            diags.error(
                "QL102",
                f"Indentation is {indent} spaces; use a multiple of four (0 or 4).",
                number,
                1,
            )
            continue

        code = _STRING.sub(lambda m: " " * len(m.group()), raw)
        keywords = [(m.group(1), m.start()) for m in _KEYWORD.finditer(code)]
        if not keywords:
            continue  # unknown statement: the parser reports it

        first, first_col = keywords[0]
        if first_col == indent:  # the line starts with a statement keyword
            expected = 0 if first in TOP_LEVEL else INDENT
            if indent != expected:
                if first in TOP_LEVEL:
                    msg = f'"{first}" declarations start at the beginning of the line (no indentation).'
                else:
                    owner = "Adventure" if first == "Begin" else "Scene"
                    msg = f'"{first}" must be indented four spaces under its {owner} declaration.'
                diags.error("QL103", msg, number, 1)

        if len(keywords) > 1:
            second, col = keywords[1]
            diags.error(
                "QL104",
                f'Only one statement per line: put "{second}" on its own line.',
                number,
                col + 1,
            )
    return diags
