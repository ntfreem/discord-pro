"""
Multi-tenant auth and instance management tests for BotForge
Tests: auth flow, instance management, user assignment, protected APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "you@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")
TEST_USER_EMAIL = os.environ.get("TEST_USER_EMAIL", "testuser@example.com")
TEST_USER_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "Test@123")


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    return data["token"], data.get("instance_id") or data.get("instances", [{}])[0].get("id", "")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    token, instance_id = admin_token
    return {"Authorization": f"Bearer {token}", "X-Instance-ID": instance_id}


# ==================== AUTH TESTS ====================

class TestAuthFlow:
    """Auth endpoints: register, verify, login, me"""

    def test_admin_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "superadmin"

    def test_login_invalid_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": ADMIN_EMAIL, "password": "wrongpass"})
        assert resp.status_code in [401, 400]

    def test_login_unregistered_user(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": "notexist@example.com", "password": "pass"})
        assert resp.status_code in [401, 404, 400]

    def test_get_me_with_valid_token(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == ADMIN_EMAIL

    def test_get_me_without_token(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401

    def test_register_new_user(self):
        # Register a brand new user
        import random
        email = f"testregister_{random.randint(1000,9999)}@example.com"
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Test@123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data or "email" in str(data)

    def test_register_duplicate_user(self):
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={"email": ADMIN_EMAIL, "password": "Test@123"})
        assert resp.status_code in [400, 409]

    def test_verify_wrong_code(self):
        resp = requests.post(f"{BASE_URL}/api/auth/verify", json={"email": TEST_USER_EMAIL, "code": "000000"})
        assert resp.status_code in [400, 401]

    def test_testuser_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "user"


# ==================== INSTANCE MANAGEMENT TESTS ====================

class TestInstanceManagement:
    """Admin CRUD for bot instances"""

    def test_list_instances_as_admin(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/instances", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_instance(self, admin_headers):
        resp = requests.post(f"{BASE_URL}/api/admin/instances",
                             json={"name": "TEST_Instance_Auth", "description": "Test instance"},
                             headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Instance_Auth"
        assert "id" in data
        TestInstanceManagement.created_instance_id = data["id"]

    def test_assign_user_to_instance(self, admin_headers):
        iid = getattr(TestInstanceManagement, 'created_instance_id', None)
        if not iid:
            pytest.skip("No instance created")
        resp = requests.post(f"{BASE_URL}/api/admin/instances/{iid}/assign-user",
                             json={"user_email": TEST_USER_EMAIL},
                             headers=admin_headers)
        assert resp.status_code == 200

    def test_testuser_has_instance_after_assignment(self, admin_headers):
        iid = getattr(TestInstanceManagement, 'created_instance_id', None)
        if not iid:
            pytest.skip("No instance created")
        # Login as testuser and check instances
        login_resp = requests.post(f"{BASE_URL}/api/auth/login",
                                   json={"email_or_username": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD})
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "instances" in data
        instance_ids = [i["id"] for i in data["instances"]]
        assert iid in instance_ids

    def test_unassign_user_from_instance(self, admin_headers):
        iid = getattr(TestInstanceManagement, 'created_instance_id', None)
        if not iid:
            pytest.skip("No instance created")
        # Get user_id
        users_resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert users_resp.status_code == 200
        users = users_resp.json()
        user = next((u for u in users if u["email"] == TEST_USER_EMAIL), None)
        if not user:
            pytest.skip("Test user not found")
        uid = user["id"]
        resp = requests.delete(f"{BASE_URL}/api/admin/instances/{iid}/unassign-user/{uid}",
                               headers=admin_headers)
        assert resp.status_code == 200

    def test_delete_instance(self, admin_headers):
        iid = getattr(TestInstanceManagement, 'created_instance_id', None)
        if not iid:
            pytest.skip("No instance created")
        resp = requests.delete(f"{BASE_URL}/api/admin/instances/{iid}", headers=admin_headers)
        assert resp.status_code == 200

    def test_list_instances_forbidden_without_auth(self):
        resp = requests.get(f"{BASE_URL}/api/admin/instances")
        assert resp.status_code == 401

    def test_list_users_as_admin(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ==================== PROTECTED API TESTS ====================

class TestProtectedApis:
    """Protected routes need auth + instance header"""

    def test_bot_config_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/admin/bot-config")
        assert resp.status_code == 401

    def test_bot_config_with_auth_returns_200(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/bot-config", headers=admin_headers)
        assert resp.status_code == 200

    def test_knowledge_sources_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/knowledge/sources")
        assert resp.status_code == 401

    def test_knowledge_sources_with_auth_returns_200(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/knowledge/sources", headers=admin_headers)
        assert resp.status_code == 200

    def test_analytics_no_auth_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert resp.status_code == 401

    def test_analytics_with_auth_returns_200(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/analytics/overview", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_conversations" in data or "totalConversations" in data or isinstance(data, dict)
