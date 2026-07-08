"""BotForge API Tests - covers all major endpoints"""
import pytest
import requests
import os

BASE_URL = os.environ.get('BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "you@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")


@pytest.fixture(scope="module")
def api(request):
    """Authenticated session with Authorization and X-Instance-ID headers."""
    resp = requests.post(f"{BASE_URL}/api/auth/login",
                         json={"email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["token"]

    instances_resp = requests.get(f"{BASE_URL}/api/admin/instances",
                                  headers={"Authorization": f"Bearer {token}"})
    instances = instances_resp.json() if instances_resp.status_code == 200 else []
    assert instances, "No instances found — create one first"
    instance_id = instances[0]["id"]

    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "X-Instance-ID": instance_id,
    })
    return session


class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "message" in r.json()


class TestBotConfig:
    def test_get_bot_config(self, api):
        r = api.get(f"{BASE_URL}/api/admin/bot-config")
        assert r.status_code == 200
        data = r.json()
        assert "name" in data
        assert "persona" in data

    def test_update_bot_config(self, api):
        original = api.get(f"{BASE_URL}/api/admin/bot-config").json().get("name", "BotForge Assistant")
        r = api.put(f"{BASE_URL}/api/admin/bot-config", json={"name": "TEST_Bot"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Bot"
        api.put(f"{BASE_URL}/api/admin/bot-config", json={"name": original})


class TestKnowledge:
    def test_get_sources(self, api):
        r = api.get(f"{BASE_URL}/api/knowledge/sources")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_faq(self, api):
        r = api.post(f"{BASE_URL}/api/knowledge/sources/faq", json={
            "title": "TEST_FAQ_Title", "content": "TEST_FAQ_Content for testing"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_FAQ_Title"
        assert "id" in data
        api.delete(f"{BASE_URL}/api/knowledge/sources/{data['id']}")

    def test_add_faq_and_verify_in_list(self, api):
        r = api.post(f"{BASE_URL}/api/knowledge/sources/faq", json={
            "title": "TEST_Verify_FAQ", "content": "Verify persistence test"
        })
        assert r.status_code == 200
        faq_id = r.json()["id"]
        sources = api.get(f"{BASE_URL}/api/knowledge/sources").json()
        assert faq_id in [s["id"] for s in sources]
        api.delete(f"{BASE_URL}/api/knowledge/sources/{faq_id}")


class TestConversations:
    def test_get_conversations(self, api):
        r = api.get(f"{BASE_URL}/api/conversations")
        assert r.status_code == 200
        data = r.json()
        assert "conversations" in data
        assert "total" in data


class TestAnalytics:
    def test_overview(self, api):
        r = api.get(f"{BASE_URL}/api/analytics/overview")
        assert r.status_code == 200
        data = r.json()
        assert "total_conversations" in data
        assert "platform_breakdown" in data
        assert "knowledge_sources" in data

    def test_daily(self, api):
        r = api.get(f"{BASE_URL}/api/analytics/daily")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7


class TestDiscord:
    def test_get_discord_config(self, api):
        r = api.get(f"{BASE_URL}/api/discord/config")
        assert r.status_code == 200

    def test_get_discord_status(self, api):
        r = api.get(f"{BASE_URL}/api/discord/status")
        assert r.status_code == 200
        assert "status" in r.json()
