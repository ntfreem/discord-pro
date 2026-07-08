"""
Test suite for Knowledge Source Editing feature (PUT /api/knowledge/sources/{id})
Tests: update title, content, priority, URL field, 404 for nonexistent, 400 for empty body, updated_at timestamp
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "you@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email_or_username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def instance_id(auth_token):
    """Fetch the first available instance ID from the API"""
    r = requests.get(f"{BASE_URL}/api/admin/instances",
                     headers={"Authorization": f"Bearer {auth_token}"})
    instances = r.json() if r.status_code == 200 else []
    if not instances:
        pytest.skip("No instances found — create one first")
    return instances[0]["id"]

@pytest.fixture(scope="module")
def api_client(auth_token, instance_id):
    """Session with auth header and instance ID"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
        "X-Instance-ID": instance_id
    })
    return session

@pytest.fixture
def test_faq_source(api_client):
    """Create a test FAQ source for editing tests"""
    payload = {
        "title": "TEST_Edit_FAQ_Source",
        "content": "Original content for editing test",
        "priority": 0
    }
    response = api_client.post(f"{BASE_URL}/api/knowledge/sources/faq", json=payload)
    assert response.status_code == 200, f"Failed to create test FAQ: {response.text}"
    source = response.json()
    yield source
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/knowledge/sources/{source['id']}")
    except:
        pass

@pytest.fixture
def test_url_source(api_client):
    """Create a test URL source for editing tests"""
    payload = {
        "url": "https://example.com/test-page",
        "title": "TEST_Edit_URL_Source",
        "priority": 1
    }
    response = api_client.post(f"{BASE_URL}/api/knowledge/sources/url", json=payload)
    if response.status_code != 200:
        pytest.skip(f"URL source creation failed (may be network issue): {response.text}")
    source = response.json()
    yield source
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/knowledge/sources/{source['id']}")
    except:
        pass


class TestSourceEditingAPI:
    """Tests for PUT /api/knowledge/sources/{source_id} endpoint"""

    def test_update_title(self, api_client, test_faq_source):
        """PUT should update title of a source"""
        source_id = test_faq_source["id"]
        new_title = "TEST_Updated_Title"
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"title": new_title}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["title"] == new_title, f"Title not updated: {data.get('title')}"
        assert data["id"] == source_id

    def test_update_content(self, api_client, test_faq_source):
        """PUT should update content of a source"""
        source_id = test_faq_source["id"]
        new_content = "This is the updated content for the FAQ source"
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"content": new_content}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == new_content

    def test_update_priority(self, api_client, test_faq_source):
        """PUT should update priority of a source"""
        source_id = test_faq_source["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"priority": 2}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == 2

    def test_update_multiple_fields(self, api_client, test_faq_source):
        """PUT should update multiple fields at once"""
        source_id = test_faq_source["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={
                "title": "TEST_Multi_Update_Title",
                "content": "Multi-field update content",
                "priority": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Multi_Update_Title"
        assert data["content"] == "Multi-field update content"
        assert data["priority"] == 1

    def test_update_url_field_for_url_type(self, api_client, test_url_source):
        """PUT should update URL field for url-type sources"""
        source_id = test_url_source["id"]
        new_url = "https://example.com/updated-page"
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"url": new_url}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["url"] == new_url

    def test_update_adds_updated_at_timestamp(self, api_client, test_faq_source):
        """PUT should add/update the updated_at timestamp"""
        source_id = test_faq_source["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"title": "TEST_Timestamp_Check"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "updated_at" in data, "updated_at field should be present"
        # Verify it's a valid ISO timestamp
        try:
            datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"updated_at is not a valid ISO timestamp: {data['updated_at']}")

    def test_update_nonexistent_source_returns_404(self, api_client):
        """PUT should return 404 for nonexistent source ID"""
        fake_id = "nonexistent-source-id-12345"
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{fake_id}",
            json={"title": "Should Not Work"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()

    def test_update_empty_body_returns_400(self, api_client, test_faq_source):
        """PUT should return 400 when no fields are provided"""
        source_id = test_faq_source["id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "no fields" in data.get("detail", "").lower() or "update" in data.get("detail", "").lower()

    def test_update_preserves_other_fields(self, api_client, test_faq_source):
        """PUT should preserve fields not included in update"""
        source_id = test_faq_source["id"]
        original_content = test_faq_source["content"]
        original_type = test_faq_source["type"]
        
        # Update only title
        response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"title": "TEST_Preserve_Fields"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Preserve_Fields"
        assert data["content"] == original_content, "Content should be preserved"
        assert data["type"] == original_type, "Type should be preserved"

    def test_verify_update_persisted_via_get(self, api_client, test_faq_source):
        """Verify update is persisted by fetching sources list"""
        source_id = test_faq_source["id"]
        new_title = "TEST_Persistence_Check"
        
        # Update
        update_response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"title": new_title}
        )
        assert update_response.status_code == 200
        
        # Fetch all sources and verify
        get_response = api_client.get(f"{BASE_URL}/api/knowledge/sources")
        assert get_response.status_code == 200
        sources = get_response.json()
        
        updated_source = next((s for s in sources if s["id"] == source_id), None)
        assert updated_source is not None, "Source should exist in list"
        assert updated_source["title"] == new_title, "Title should be persisted"


class TestExistingSourcesEditing:
    """Test editing existing sources mentioned in context"""

    def test_can_fetch_existing_sources(self, api_client):
        """Verify we can fetch existing sources"""
        response = api_client.get(f"{BASE_URL}/api/knowledge/sources")
        assert response.status_code == 200
        sources = response.json()
        assert isinstance(sources, list)
        print(f"Found {len(sources)} sources")
        for s in sources[:5]:
            print(f"  - {s.get('title')} (type={s.get('type')}, priority={s.get('priority')})")

    def test_edit_existing_url_source_if_exists(self, api_client):
        """Test editing an existing URL-type source if one exists"""
        response = api_client.get(f"{BASE_URL}/api/knowledge/sources")
        assert response.status_code == 200
        sources = response.json()
        
        url_source = next((s for s in sources if s.get("type") == "url"), None)
        if not url_source:
            pytest.skip("No URL-type source exists to test")
        
        original_title = url_source["title"]
        source_id = url_source["id"]
        
        # Update title
        update_response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"title": f"{original_title} (Edited)"}
        )
        assert update_response.status_code == 200
        
        # Restore original title
        restore_response = api_client.put(
            f"{BASE_URL}/api/knowledge/sources/{source_id}",
            json={"title": original_title}
        )
        assert restore_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
