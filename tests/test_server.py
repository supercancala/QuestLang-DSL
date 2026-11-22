"""Engine API used by QuestLang Studio (the React IDE in src/)."""

import json
import threading
import urllib.error
import urllib.request

import pytest
from conftest import EXAMPLES

from questlang.server import Handler, make_server


@pytest.fixture(scope="module")
def base_url():
    Handler.quiet = True
    httpd = make_server("127.0.0.1", 0)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()
    httpd.server_close()


def call(url, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None), resp.headers
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read()), err.headers


def town_source():
    return (EXAMPLES / "mysterious_town.quest").read_text()


def test_validate_matches_ide_contract(base_url):
    status, body, headers = call(base_url + "/api/validate", "POST", {"source": town_source()})
    assert status == 200
    assert headers["Access-Control-Allow-Origin"] == "*"
    assert set(body) == {"valid", "model", "errors"}
    assert body["valid"] is True and body["errors"] == []
    model = body["model"]
    assert model["title"] == "The mysterious town"
    assert model["startScene"] == "Entrance"
    assert list(model["scenes"])[:2] == ["Entrance", "TheTown"]
    entrance = model["scenes"]["Entrance"]
    assert set(entrance) == {"id", "line", "passages", "exit"}
    assert entrance["line"] == 4
    assert entrance["exit"] == {
        "type": "choices",
        "options": [
            {"label": "Enter the town and ask for help", "target": "TheTown"},
            {"label": "Look for another route through the forest", "target": "FoggyForest"},
        ],
    }
    assert model["scenes"]["Garage"]["exit"] == {"type": "jump", "target": "RoadHome"}
    assert model["scenes"]["Cabin"]["exit"] == {"type": "conclude"}


def test_validate_errors_have_no_model(base_url):
    src = 'Adventure "T":\n    Begin at A.\n\nScene A:\n    Option "x" leads to Nowhere.\n'
    _, body, _ = call(base_url + "/api/validate", "POST", {"source": src})
    assert body["valid"] is False and body["model"] is None
    [err] = [e for e in body["errors"] if e["severity"] == "error"]
    assert err["line"] == 5 and err["code"] == "QL301"
    assert "Nowhere" in err["message"]


def test_warnings_keep_the_story_valid(base_url):
    src = (EXAMPLES / "lost_crypt.quest").read_text()
    _, body, _ = call(base_url + "/api/validate", "POST", {"source": src})
    assert body["valid"] is True and body["model"] is not None
    assert [e["severity"] for e in body["errors"]] == ["warning"]


def test_ide_connection_test_ping(base_url):
    # The exact source ApiSettingsModal.tsx sends when "Test connection" is clicked.
    ping = 'Adventure "Ping":\n    Begin at PingStart.\n\nScene PingStart:\n    Conclude.'
    status, body, _ = call(base_url + "/api/validate", "POST", {"source": ping})
    assert status == 200 and body["valid"]


def test_cors_preflight(base_url):
    req = urllib.request.Request(base_url + "/api/validate", method="OPTIONS")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 204
        assert "POST" in resp.headers["Access-Control-Allow-Methods"]
        assert resp.headers["Access-Control-Allow-Headers"] == "Content-Type"


def test_bad_requests(base_url):
    assert call(base_url + "/api/validate", "POST", {"text": "x"})[0] == 400
    assert call(base_url + "/api/nothing")[0] == 404
    assert call(base_url + "/api/health")[1]["status"] == "ok"


def test_graph_endpoint(base_url):
    status, body, _ = call(base_url + "/api/graph", "POST", {"source": town_source()})
    assert status == 200 and body["dot"].startswith("digraph QuestLang")


def test_session_endpoints_follow_runtime_rules(base_url):
    status, s, _ = call(base_url + "/api/session", "POST", {"source": town_source()})
    assert status == 201
    sid = s["sessionId"]
    assert s["history"] == ["Entrance"] and len(s["options"]) == 2

    # US04: invalid input is rejected and changes nothing
    for bad in [0, 3, "abc"]:
        assert call(f"{base_url}/api/session/{sid}/choose", "POST", {"option": bad})[0] == 400
    assert call(f"{base_url}/api/session/{sid}")[1]["history"] == ["Entrance"]

    call(f"{base_url}/api/session/{sid}/choose", "POST", {"option": 1})
    _, s, _ = call(f"{base_url}/api/session/{sid}/choose", "POST", {"option": 1})
    assert s["history"] == ["Entrance", "TheTown", "Garage", "RoadHome"]
    assert [e["sceneId"] for e in s["entered"]] == ["Garage", "RoadHome"]
    assert s["completed"] and s["ending"] == "RoadHome" and s["options"] == []

    _, s, _ = call(f"{base_url}/api/session/{sid}/restart", "POST", {})
    assert s["history"] == ["Entrance"] and not s["completed"]


def test_session_refuses_story_with_errors(base_url):
    src = (EXAMPLES / "broken_story.quest").read_text()
    status, body, _ = call(base_url + "/api/session", "POST", {"source": src})
    assert status == 422 and body["valid"] is False
