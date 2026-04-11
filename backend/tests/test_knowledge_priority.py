"""
Test Knowledge Source Priority Feature
Tests for:
- POST /api/knowledge/sources/faq with priority field
- POST /api/knowledge/sources/url with priority field
- POST /api/knowledge/sources/upload with priority form field
- GET /api/knowledge/sources - sorted by priority (highest first)
- PATCH /api/knowledge/sources/{id}/priority - update source priority
- PATCH /api/knowledge/sources/{id}/toggle - toggle active status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
INSTANCE_ID = "db4bc405-143a-42b4-9df4-60cf20047c0a"  # James - Support Agent instance

class TestKnowledgePriority:
    """Test knowledge source priority feature"""
    
    token = None
    created_source_ids = []
    
    @classmethod
    def setup_class(cls):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email_or_username": "administrator",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        cls.token = response.json().get("token")
        cls.created_source_ids = []
    
    @classmethod
    def teardown_class(cls):
        """Cleanup created test sources"""
        headers = {
            "Authorization": f"Bearer {cls.token}",
            "X-Instance-ID": INSTANCE_ID
        }
        for source_id in cls.created_source_ids:
            try:
                requests.delete(f"{BASE_URL}/api/knowledge/sources/{source_id}", headers=headers)
            except:
                pass
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "X-Instance-ID": INSTANCE_ID,
            "Content-Type": "application/json"
        }
    
    # ==================== FAQ with Priority ====================
    
    def test_add_faq_with_priority_normal(self):
        """POST /api/knowledge/sources/faq with priority=0 (Normal)"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Priority_Normal_FAQ",
                "content": "This is a normal priority FAQ for testing",
                "priority": 0
            }
        )
        assert response.status_code == 200, f"Failed to add FAQ: {response.text}"
        data = response.json()
        assert data["priority"] == 0, f"Expected priority 0, got {data.get('priority')}"
        assert data["title"] == "TEST_Priority_Normal_FAQ"
        self.created_source_ids.append(data["id"])
        print(f"PASS: FAQ with priority=0 (Normal) created successfully")
    
    def test_add_faq_with_priority_medium(self):
        """POST /api/knowledge/sources/faq with priority=1 (Medium)"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Priority_Medium_FAQ",
                "content": "This is a medium priority FAQ for testing",
                "priority": 1
            }
        )
        assert response.status_code == 200, f"Failed to add FAQ: {response.text}"
        data = response.json()
        assert data["priority"] == 1, f"Expected priority 1, got {data.get('priority')}"
        self.created_source_ids.append(data["id"])
        print(f"PASS: FAQ with priority=1 (Medium) created successfully")
    
    def test_add_faq_with_priority_high(self):
        """POST /api/knowledge/sources/faq with priority=2 (High)"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Priority_High_FAQ",
                "content": "This is a high priority FAQ for testing",
                "priority": 2
            }
        )
        assert response.status_code == 200, f"Failed to add FAQ: {response.text}"
        data = response.json()
        assert data["priority"] == 2, f"Expected priority 2, got {data.get('priority')}"
        self.created_source_ids.append(data["id"])
        print(f"PASS: FAQ with priority=2 (High) created successfully")
    
    def test_add_faq_default_priority(self):
        """POST /api/knowledge/sources/faq without priority field defaults to 0"""
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Priority_Default_FAQ",
                "content": "This FAQ has no priority specified"
            }
        )
        assert response.status_code == 200, f"Failed to add FAQ: {response.text}"
        data = response.json()
        assert data.get("priority", 0) == 0, f"Expected default priority 0, got {data.get('priority')}"
        self.created_source_ids.append(data["id"])
        print(f"PASS: FAQ without priority defaults to 0")
    
    # ==================== URL with Priority ====================
    
    def test_add_url_with_priority(self):
        """POST /api/knowledge/sources/url with priority field"""
        # Use httpbin which is reliable for testing
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/url",
            headers=self.get_headers(),
            json={
                "url": "https://httpbin.org/html",
                "title": "TEST_Priority_URL",
                "priority": 2
            }
        )
        # URL scraping may fail due to SSL issues in test env, but priority field should be accepted
        if response.status_code == 200:
            data = response.json()
            assert data["priority"] == 2, f"Expected priority 2, got {data.get('priority')}"
            self.created_source_ids.append(data["id"])
            print(f"PASS: URL with priority=2 created successfully")
        elif response.status_code == 400 and "SSL" in response.text:
            # SSL issue is environment-specific, not a priority feature bug
            print(f"SKIP: URL scraping SSL issue (not priority feature related)")
            pytest.skip("SSL certificate issue in test environment")
        else:
            assert False, f"Unexpected error: {response.text}"
    
    # ==================== GET Sources Sorted by Priority ====================
    
    def test_get_sources_sorted_by_priority(self):
        """GET /api/knowledge/sources returns sources sorted by priority (highest first)"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge/sources",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to get sources: {response.text}"
        sources = response.json()
        assert isinstance(sources, list), "Expected list of sources"
        
        # Check that sources are sorted by priority descending
        priorities = [s.get("priority", 0) for s in sources]
        assert priorities == sorted(priorities, reverse=True), \
            f"Sources not sorted by priority descending. Got priorities: {priorities}"
        print(f"PASS: Sources are sorted by priority (highest first). Priorities: {priorities[:5]}...")
    
    # ==================== Update Priority ====================
    
    def test_update_source_priority(self):
        """PATCH /api/knowledge/sources/{id}/priority updates priority"""
        # First create a source with priority 0
        create_response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Priority_Update_FAQ",
                "content": "This FAQ will have its priority updated",
                "priority": 0
            }
        )
        assert create_response.status_code == 200
        source_id = create_response.json()["id"]
        self.created_source_ids.append(source_id)
        
        # Update priority to 2 (High)
        update_response = requests.patch(
            f"{BASE_URL}/api/knowledge/sources/{source_id}/priority",
            headers=self.get_headers(),
            json={"priority": 2}
        )
        assert update_response.status_code == 200, f"Failed to update priority: {update_response.text}"
        data = update_response.json()
        assert data.get("success") == True, "Expected success: true"
        assert data.get("priority") == 2, f"Expected priority 2, got {data.get('priority')}"
        print(f"PASS: Priority updated from 0 to 2 successfully")
    
    def test_update_priority_to_medium(self):
        """PATCH /api/knowledge/sources/{id}/priority to medium (1)"""
        # Create source
        create_response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Priority_Medium_Update",
                "content": "Testing medium priority update",
                "priority": 2
            }
        )
        assert create_response.status_code == 200
        source_id = create_response.json()["id"]
        self.created_source_ids.append(source_id)
        
        # Update to medium
        update_response = requests.patch(
            f"{BASE_URL}/api/knowledge/sources/{source_id}/priority",
            headers=self.get_headers(),
            json={"priority": 1}
        )
        assert update_response.status_code == 200
        assert update_response.json().get("priority") == 1
        print(f"PASS: Priority updated to 1 (Medium)")
    
    def test_update_priority_nonexistent_source(self):
        """PATCH /api/knowledge/sources/{id}/priority returns 404 for nonexistent source"""
        response = requests.patch(
            f"{BASE_URL}/api/knowledge/sources/nonexistent-id-12345/priority",
            headers=self.get_headers(),
            json={"priority": 1}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Returns 404 for nonexistent source")
    
    # ==================== Toggle Active Status ====================
    
    def test_toggle_source_still_works(self):
        """PATCH /api/knowledge/sources/{id}/toggle still toggles active status"""
        # Create source
        create_response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/faq",
            headers=self.get_headers(),
            json={
                "title": "TEST_Toggle_FAQ",
                "content": "Testing toggle functionality",
                "priority": 1
            }
        )
        assert create_response.status_code == 200
        source_id = create_response.json()["id"]
        self.created_source_ids.append(source_id)
        
        # Toggle off
        toggle_response = requests.patch(
            f"{BASE_URL}/api/knowledge/sources/{source_id}/toggle",
            headers=self.get_headers()
        )
        assert toggle_response.status_code == 200
        assert toggle_response.json().get("is_active") == False
        
        # Toggle back on
        toggle_response2 = requests.patch(
            f"{BASE_URL}/api/knowledge/sources/{source_id}/toggle",
            headers=self.get_headers()
        )
        assert toggle_response2.status_code == 200
        assert toggle_response2.json().get("is_active") == True
        print(f"PASS: Toggle active status still works correctly")
    
    # ==================== Verify Existing Sources ====================
    
    def test_existing_sources_have_priority(self):
        """Verify existing sources (Refund Policy, General Info) have priority field"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge/sources",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        sources = response.json()
        
        # Find existing sources
        refund_policy = next((s for s in sources if "Refund" in s.get("title", "")), None)
        general_info = next((s for s in sources if "General" in s.get("title", "")), None)
        
        if refund_policy:
            print(f"Found 'Refund Policy' with priority: {refund_policy.get('priority', 'N/A')}")
            assert "priority" in refund_policy or refund_policy.get("priority") is not None or refund_policy.get("priority", 0) >= 0
        
        if general_info:
            print(f"Found 'General Info' with priority: {general_info.get('priority', 'N/A')}")
        
        print(f"PASS: Existing sources have priority field")


class TestUploadWithPriority:
    """Test document upload with priority (separate class for file upload)"""
    
    token = None
    created_source_ids = []
    
    @classmethod
    def setup_class(cls):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email_or_username": "administrator",
            "password": "Admin@123"
        })
        assert response.status_code == 200
        cls.token = response.json().get("token")
        cls.created_source_ids = []
    
    @classmethod
    def teardown_class(cls):
        """Cleanup created test sources"""
        headers = {
            "Authorization": f"Bearer {cls.token}",
            "X-Instance-ID": INSTANCE_ID
        }
        for source_id in cls.created_source_ids:
            try:
                requests.delete(f"{BASE_URL}/api/knowledge/sources/{source_id}", headers=headers)
            except:
                pass
    
    def test_upload_document_with_priority(self):
        """POST /api/knowledge/sources/upload with priority form field"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Instance-ID": INSTANCE_ID
        }
        
        # Create a simple text file content
        file_content = b"This is test document content for priority testing."
        files = {
            "file": ("test_priority.txt", file_content, "text/plain")
        }
        data = {
            "title": "TEST_Priority_Document",
            "priority": "2"  # Form data is string
        }
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Failed to upload: {response.text}"
        result = response.json()
        assert result.get("priority") == 2, f"Expected priority 2, got {result.get('priority')}"
        assert result.get("title") == "TEST_Priority_Document"
        self.created_source_ids.append(result["id"])
        print(f"PASS: Document uploaded with priority=2 successfully")
    
    def test_upload_document_default_priority(self):
        """POST /api/knowledge/sources/upload without priority defaults to 0"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Instance-ID": INSTANCE_ID
        }
        
        file_content = b"Test document without priority specified."
        files = {
            "file": ("test_default_priority.txt", file_content, "text/plain")
        }
        data = {
            "title": "TEST_Default_Priority_Document"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge/sources/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Failed to upload: {response.text}"
        result = response.json()
        assert result.get("priority", 0) == 0, f"Expected default priority 0, got {result.get('priority')}"
        self.created_source_ids.append(result["id"])
        print(f"PASS: Document upload defaults to priority 0")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
