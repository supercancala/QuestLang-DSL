import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from questlang import parse, parse_file  # noqa: E402

EXAMPLES = ROOT / "examples"


@pytest.fixture
def town():
    """'The mysterious town' from the Concrete Syntax paper (section 5)."""
    result = parse_file(EXAMPLES / "mysterious_town.quest")
    assert result.ok, result.diagnostics
    return result.adventure


def story(*scene_blocks: str, start: str = "A", title: str = "T") -> str:
    """Build a small adventure from scene blocks (helper for tests)."""
    return f'Adventure "{title}":\n    Begin at {start}.\n\n' + "\n".join(scene_blocks)


def codes(source: str) -> list[str]:
    return [d.code for d in parse(source).diagnostics]
