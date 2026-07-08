"""
Tests for instance management and dashboard behavior (iteration 3)
Focus: instance CRUD, refreshInstances flow, dashboard no-instance state
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "you@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_session(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s

# --- Auth/Me ---
class TestAuthMe:
    def test_auth_me_returns_instances(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert "instances" in data
        assert isinstance(data["instances"], list)

    def test_auth_me_instance_has_id_and_name(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        data = r.json()
        if data["instances"]:
            inst = data["instances"][0]
            assert "id" in inst
            assert "name" in inst

# --- List Instances ---
class TestListInstances:
    def test_list_instances_returns_200(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/instances")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_instances_no_error_on_empty(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/instances")
        assert r.status_code == 200
        # Must be a list (not 500), even if empty
        assert isinstance(r.json(), list)

    def test_default_instance_exists(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/instances")
        instances = r.json()
        names = [i["name"] for i in instances]
        assert any("Default" in n for n in names), f"Expected 'Default Instance', got {names}"

    def test_instances_no_mongo_id(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/instances")
        for inst in r.json():
            assert "_id" not in inst

# --- Create Instance ---
class TestCreateInstance:
    def test_create_instance(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/instances", json={"name": "TEST_Iter3_Instance", "description": "testing"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Iter3_Instance"
        assert "id" in data
        return data["id"]

    def test_create_instance_persists(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/instances", json={"name": "TEST_Iter3_Persist"})
        assert r.status_code == 200
        created_id = r.json()["id"]
        # Verify it appears in list
        r2 = admin_session.get(f"{BASE_URL}/api/admin/instances")
        ids = [i["id"] for i in r2.json()]
        assert created_id in ids
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/admin/instances/{created_id}")

    def test_create_instance_unauthorized(self):
        r = requests.post(f"{BASE_URL}/api/admin/instances", json={"name": "UnauthorizedInstance"})
        assert r.status_code == 401

# --- Delete Instance ---
class TestDeleteInstance:
    def test_create_and_delete_instance(self, admin_session):
        # Create
        r = admin_session.post(f"{BASE_URL}/api/admin/instances", json={"name": "TEST_DeleteMe"})
        assert r.status_code == 200
        inst_id = r.json()["id"]
        # Delete
        r2 = admin_session.delete(f"{BASE_URL}/api/admin/instances/{inst_id}")
        assert r2.status_code == 200
        # Verify removed
        r3 = admin_session.get(f"{BASE_URL}/api/admin/instances")
        ids = [i["id"] for i in r3.json()]
        assert inst_id not in ids

    def test_delete_nonexistent_returns_404(self, admin_session):
        r = admin_session.delete(f"{BASE_URL}/api/admin/instances/nonexistent-id-000")
        assert r.status_code == 404

# --- Analytics (Dashboard) ---
class TestAnalyticsDashboard:
    def test_analytics_overview_with_instance(self, admin_session):
        # Get first instance
        r = admin_session.get(f"{BASE_URL}/api/admin/instances")
        instances = r.json()
        assert len(instances) > 0
        iid = instances[0]["id"]
        r2 = admin_session.get(f"{BASE_URL}/api/analytics/overview", headers={"X-Instance-ID": iid})
        assert r2.status_code == 200
        data = r2.json()
        assert "total_conversations" in data
        assert "knowledge_sources" in data

    def test_analytics_without_instance_returns_400(self, admin_session):
        # Remove X-Instance-ID header
        s = requests.Session()
        s.headers.update({"Authorization": admin_session.headers["Authorization"]})
        r = s.get(f"{BASE_URL}/api/analytics/overview")
        assert r.status_code == 400

# cleanup TEST_ instances
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    yield
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = r.json().get("token")
        if not token:
            return
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {token}"})
        instances = s.get(f"{BASE_URL}/api/admin/instances").json()
        for inst in instances:
            if inst["name"].startswith("TEST_"):
                s.delete(f"{BASE_URL}/api/admin/instances/{inst['id']}")
    except Exception:
        pass
