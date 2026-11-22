"""HTTP API that connects QuestLang Studio (the React IDE) to the Python engine.

    python -m questlang serve            # http://localhost:3000

The IDE's "API" engine mode posts to ``/api/validate`` (src/services/engineService.ts)
and expects the ``EngineResponse`` contract from ``src/types/questlang.ts``:

    { "valid": bool, "model": AdventureModel | null, "errors": ValidationError[] }

Endpoints
---------
POST /api/validate                 {source}            -> EngineResponse
POST /api/graph                    {source}            -> {dot}
POST /api/session                  {source}            -> SessionState (new play session)
POST /api/session/<id>/choose      {option: 1-based}   -> SessionState
POST /api/session/<id>/restart                         -> SessionState
GET  /api/session/<id>                                 -> SessionState
GET  /api/health                                       -> {status, engine, version}

Only the Python standard library is used. CORS is open so the Vite dev server
(another port) can call it.
"""

from __future__ import annotations

import json
import re
import threading
import uuid
from collections import OrderedDict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from . import __version__
from .diagnostics import Diagnostic
from .graph import to_dot
from .model import Adventure
from .parser import ParseResult, parse
from .runtime import InvalidChoice, Session

MAX_BODY = 1_000_000  # bytes
MAX_SESSIONS = 200


# ----------------------------------------------------------- contract --

def error_to_json(d: Diagnostic) -> dict[str, Any]:
    """ValidationError: {line, column?, severity, message} (+ code, ignored by the IDE)."""
    return {
        "line": d.line,
        "column": d.column,
        "severity": d.severity,
        "message": d.message,
        "code": d.code,
    }


def model_to_json(adventure: Adventure) -> dict[str, Any]:
    """AdventureModel: {title, startScene, scenes: Record<id, SceneNode>}."""
    scenes: dict[str, Any] = {}
    for sid in adventure.scene_ids:
        scene = adventure.scene(sid)
        if scene.exit.kind == "choices":
            exit_: dict[str, Any] = {
                "type": "choices",
                "options": [{"label": c.label, "target": c.target} for c in scene.exit.choices],
            }
        elif scene.exit.kind == "jump":
            exit_ = {"type": "jump", "target": scene.exit.target}
        else:
            exit_ = {"type": "conclude"}
        scenes[sid] = {"id": sid, "line": scene.line, "passages": list(scene.passages), "exit": exit_}
    return {"title": adventure.title, "startScene": adventure.start, "scenes": scenes}


def engine_response(result: ParseResult) -> dict[str, Any]:
    """EngineResponse. As in the IDE's mock engine, warnings keep the story valid
    and the model is only returned when there are no errors."""
    valid = result.ok
    return {
        "valid": valid,
        "model": model_to_json(result.adventure) if valid and result.adventure else None,
        "errors": [error_to_json(d) for d in result.diagnostics],
    }


def session_to_json(session_id: str, session: Session) -> dict[str, Any]:
    return {
        "sessionId": session_id,
        "currentScene": session.current,
        "history": list(session.history),
        "completed": session.completed,
        "ending": session.ending,
        "entered": [
            {
                "sceneId": v.scene_id,
                "passages": list(v.passages),
                "isEnding": v.is_ending,
                "viaJump": v.via_jump,
            }
            for v in session.last_entered
        ],
        "options": [
            {"number": n, "label": c.label, "target": c.target}
            for n, c in enumerate(session.choices(), start=1)
        ],
    }


# ------------------------------------------------------------- server --

class _Sessions:
    """In-memory play sessions (oldest dropped after MAX_SESSIONS)."""

    def __init__(self) -> None:
        self._items: OrderedDict[str, Session] = OrderedDict()
        self._lock = threading.Lock()

    def add(self, session: Session) -> str:
        with self._lock:
            sid = uuid.uuid4().hex
            self._items[sid] = session
            while len(self._items) > MAX_SESSIONS:
                self._items.popitem(last=False)
            return sid

    def get(self, sid: str) -> Session | None:
        with self._lock:
            return self._items.get(sid)


class ApiError(Exception):
    def __init__(self, status: HTTPStatus, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


_SESSION_PATH = re.compile(r"^/api/session/([0-9a-f]{32})(?:/(choose|restart))?$")


class Handler(BaseHTTPRequestHandler):
    server_version = f"QuestLangEngine/{__version__}"
    sessions = _Sessions()
    quiet = False

    # -- plumbing ----------------------------------------------------------
    def log_message(self, fmt: str, *args: Any) -> None:  # pragma: no cover
        if not self.quiet:
            super().log_message(fmt, *args)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send(self, status: HTTPStatus, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Request body is too large.")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be JSON.") from None
        if not isinstance(data, dict):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be a JSON object.")
        return data

    def _source(self, data: dict[str, Any]) -> str:
        source = data.get("source")
        if not isinstance(source, str):
            raise ApiError(HTTPStatus.BAD_REQUEST, 'Expected {"source": "<QuestLang text>"}.')
        return source

    def _dispatch(self, method: str) -> None:
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        try:
            status, payload = self._route(method, path)
        except ApiError as err:
            status, payload = err.status, {"error": err.message}
        except Exception as err:  # pragma: no cover - never crash the IDE's backend
            status, payload = HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Engine error: {err}"}
        self._send(status, payload)

    def do_OPTIONS(self) -> None:  # CORS preflight
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors()
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")

    # -- routes ----------------------------------------------------------------
    def _route(self, method: str, path: str) -> tuple[HTTPStatus, Any]:
        ok = HTTPStatus.OK
        if path == "/api/health" and method == "GET":
            return ok, {"status": "ok", "engine": "questlang-textx", "version": __version__}

        if path == "/api/validate" and method == "POST":
            return ok, engine_response(parse(self._source(self._json_body())))

        if path == "/api/graph" and method == "POST":
            result = parse(self._source(self._json_body()))
            if result.adventure is None:
                return HTTPStatus.UNPROCESSABLE_ENTITY, engine_response(result)
            return ok, {"dot": to_dot(result.adventure)}

        if path == "/api/session" and method == "POST":
            result = parse(self._source(self._json_body()))
            if not result.ok or result.adventure is None:
                return HTTPStatus.UNPROCESSABLE_ENTITY, engine_response(result)
            session = Session(result.adventure)
            sid = self.sessions.add(session)
            return HTTPStatus.CREATED, session_to_json(sid, session)

        match = _SESSION_PATH.match(path)
        if match:
            sid, action = match.groups()
            session = self.sessions.get(sid)
            if session is None:
                raise ApiError(HTTPStatus.NOT_FOUND, "No such play session (it may have expired).")
            if action is None and method == "GET":
                return ok, session_to_json(sid, session)
            if action == "restart" and method == "POST":
                session.restart()
                return ok, session_to_json(sid, session)
            if action == "choose" and method == "POST":
                option = self._json_body().get("option")
                try:
                    session.choose(option if option is not None else "")
                except InvalidChoice as err:
                    raise ApiError(HTTPStatus.BAD_REQUEST, str(err)) from None
                return ok, session_to_json(sid, session)

        raise ApiError(HTTPStatus.NOT_FOUND, f"No endpoint {method} {path}.")


def make_server(host: str = "127.0.0.1", port: int = 3000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), Handler)


def serve(host: str = "127.0.0.1", port: int = 3000) -> None:  # pragma: no cover
    httpd = make_server(host, port)
    print(f"QuestLang engine listening on http://{host}:{port}")
    print(f"In QuestLang Studio choose the API engine with http://localhost:{port}/api/validate")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()
