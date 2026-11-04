"""The profile timestamp is not proof of repository code activity."""

import httpx

from app.services.github_client import GitHubClient


def test_github_public_activity_uses_nonarchived_nonfork_pushes(monkeypatch):
    requested = []

    def respond(request):
        requested.append(request.url.path)
        if request.url.path == "/users/verified-dev":
            return httpx.Response(200, json={
                "login": "verified-dev", "html_url": "https://github.com/verified-dev",
                "public_repos": 3, "updated_at": "2026-11-04T00:00:00Z"
            })
        if request.url.path == "/users/verified-dev/repos":
            return httpx.Response(200, json=[
                {"name": "active", "owner": {"login": "verified-dev"},
                 "html_url": "https://github.com/verified-dev/active", "fork": False,
                 "archived": False, "pushed_at": "2026-04-02T00:00:00Z"},
                {"name": "archive", "owner": {"login": "verified-dev"},
                 "html_url": "https://github.com/verified-dev/archive", "fork": False,
                 "archived": True, "pushed_at": "2026-11-04T00:00:00Z"},
                {"name": "fork", "owner": {"login": "verified-dev"},
                 "html_url": "https://github.com/verified-dev/fork", "fork": True,
                 "archived": False, "pushed_at": "2026-11-04T00:00:00Z"},
            ])
        if request.url.path.endswith("/languages"):
            return httpx.Response(200, json={"Java": 400})
        return httpx.Response(404)

    transport = httpx.MockTransport(respond)
    original_client = httpx.Client

    def fake_client(*args, **kwargs):
        return original_client(*args, transport=transport, **kwargs)

    monkeypatch.setattr("app.services.github_client.httpx.Client", fake_client)
    result = GitHubClient(api_base_url="https://api.github.com", token="").fetch_user_repositories("verified-dev")

    assert result["status"] == "SYNCED"
    assert result["latest_activity_at"] == "2026-04-02T00:00:00Z"
    assert len(result["repositories"]) == 2  # Archived visible, fork excluded
    assert "/repos/verified-dev/fork/languages" not in requested
