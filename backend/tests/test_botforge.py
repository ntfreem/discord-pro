"""BotForge API Tests - covers all major endpoints"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data

class TestBotConfig:
    def test_get_bot_config(self):
        r = requests.get(f"{BASE_URL}/api/admin/bot-config")
        assert r.status_code == 200
        data = r.json()
        assert "name" in data
        assert "persona" in data

    def test_update_bot_config(self):
        r = requests.put(f"{BASE_URL}/api/admin/bot-config", json={"name": "TEST_Bot"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Bot"
        # Restore
        requests.put(f"{BASE_URL}/api/admin/bot-config", json={"name": "BotForge Assistant"})

class TestKnowledge:
    def test_get_sources(self):
        r = requests.get(f"{BASE_URL}/api/knowledge/sources")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_faq(self):
        r = requests.post(f"{BASE_URL}/api/knowledge/sources/faq", json={
            "title": "TEST_FAQ_Title", "content": "TEST_FAQ_Content for testing"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_FAQ_Title"
        assert "id" in data
        # Cleanup
        requests.delete(f"{BASE_URL}/api/knowledge/sources/{data['id']}")

    def test_add_faq_and_verify_in_list(self):
        # Create
        r = requests.post(f"{BASE_URL}/api/knowledge/sources/faq", json={
            "title": "TEST_Verify_FAQ", "content": "Verify persistence test"
        })
        assert r.status_code == 200
        faq_id = r.json()["id"]
        # Verify in list
        sources = requests.get(f"{BASE_URL}/api/knowledge/sources").json()
        ids = [s["id"] for s in sources]
        assert faq_id in ids
        # Cleanup
        requests.delete(f"{BASE_URL}/api/knowledge/sources/{faq_id}")

class TestConversations:
    def test_get_conversations(self):
        r = requests.get(f"{BASE_URL}/api/conversations")
        assert r.status_code == 200
        data = r.json()
        assert "conversations" in data
        assert "total" in data

class TestAnalytics:
    def test_overview(self):
        r = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert r.status_code == 200
        data = r.json()
        assert "total_conversations" in data
        assert "platform_breakdown" in data
        assert "knowledge_sources" in data

    def test_daily(self):
        r = requests.get(f"{BASE_URL}/api/analytics/daily")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7

class TestDiscord:
    def test_get_discord_config(self):
        r = requests.get(f"{BASE_URL}/api/discord/config")
        assert r.status_code == 200

    def test_get_discord_status(self):
        r = requests.get(f"{BASE_URL}/api/discord/status")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
