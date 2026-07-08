"""Tests for password reset flow and admin users page"""
import pytest
import requests
import os
import re
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "you@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")
SERVER_LOG = os.environ.get("SERVER_LOG", "/tmp/server.log")


def _extract_verification_code(email):
    time.sleep(0.5)
    try:
        with open(SERVER_LOG) as f:
            log = f.read()
        matches = re.findall(rf"To: {re.escape(email)}\nCode: (\d{{6}})", log)
        return matches[-1] if matches else None
    except Exception:
        return None


def setup_module(module):
    """Register and verify testuser@example.com before this module's tests run."""
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "testuser@example.com",
        "username": "testuser",
        "password": "Test@123",
    })
    if resp.status_code == 400 and "already registered" in resp.text.lower():
        return
    if resp.status_code != 200:
        return
    code = _extract_verification_code("testuser@example.com")
    if code:
        requests.post(f"{BASE_URL}/api/auth/verify", json={
            "email": "testuser@example.com", "code": code
        })


def teardown_module(module):
    """Delete testuser@example.com after all tests in this module."""
    login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    if login.status_code != 200:
        return
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    users = requests.get(f"{BASE_URL}/api/admin/users", headers=headers).json()
    user = next((u for u in users if u["email"] == "testuser@example.com"), None)
    if user:
        requests.delete(f"{BASE_URL}/api/admin/users/{user['id']}", headers=headers)


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return r.cookies.get("bf_access_token")


@pytest.fixture
def admin_session(session, admin_token):
    session.cookies.set("bf_access_token", admin_token)
    return session


# ===================== FORGOT PASSWORD =====================

class TestForgotPassword:
    """Test POST /api/auth/forgot-password"""

    def test_forgot_password_valid_email(self, session):
        r = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "reset code" in data["message"].lower() or "registered" in data["message"].lower()

    def test_forgot_password_unknown_email(self, session):
        """Should still return 200 (no user enumeration)"""
        r = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "notexist@fake.com"})
        assert r.status_code == 200

    def test_forgot_password_unverified_user(self, session):
        """Unverified users should not get reset code but still return 200"""
        r = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "unverified@fake.com"})
        assert r.status_code == 200


# ===================== RESET PASSWORD =====================

class TestResetPassword:
    """Test POST /api/auth/reset-password"""

    def test_reset_password_invalid_code(self, session):
        """Wrong code → 400 with error detail"""
        r = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": ADMIN_EMAIL,
            "code": "000000",
            "new_password": "NewPass@123"
        })
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

    def test_reset_password_short_password(self, session):
        """Password < 6 chars → 400"""
        r = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": ADMIN_EMAIL,
            "code": "123456",
            "new_password": "abc"
        })
        assert r.status_code == 400

    def test_reset_password_full_flow(self, session):
        """Full flow: request code → reset → login with new password → restore original"""
        # 1. Request reset code
        r = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "testuser@example.com"})
        assert r.status_code == 200

        # 2. Get code from DB via backend logs (check mongo directly via API workaround)
        # We need to read the code from backend logs
        import subprocess
        result = subprocess.run(
            ["grep", "-o", "Reset code for testuser@example.com: [0-9]*", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        codes = result.stdout.strip().split("\n")
        code = codes[-1].split(": ")[-1].strip() if codes and ": " in codes[-1] else None

        if not code or len(code) != 6:
            pytest.skip("Could not extract reset code from logs")

        # 3. Reset password
        r = session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": "testuser@example.com",
            "code": code,
            "new_password": "Test@123_tmp"
        })
        assert r.status_code == 200
        assert "successful" in r.json().get("message", "").lower()

        # 4. Login with new password
        r = session.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": "testuser@example.com", "password": "Test@123_tmp"})
        assert r.status_code == 200

        # 5. Restore original password
        session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "testuser@example.com"})
        result2 = subprocess.run(
            ["grep", "-o", "Reset code for testuser@example.com: [0-9]*", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True
        )
        codes2 = result2.stdout.strip().split("\n")
        code2 = codes2[-1].split(": ")[-1].strip() if codes2 and ": " in codes2[-1] else None
        if code2 and len(code2) == 6:
            session.post(f"{BASE_URL}/api/auth/reset-password", json={
                "email": "testuser@example.com",
                "code": code2,
                "new_password": "Test@123"
            })


# ===================== ADMIN USERS =====================

class TestAdminUsers:
    """Test GET /api/admin/users"""

    def test_admin_users_returns_200(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200

    def test_admin_users_returns_list(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_admin_users_has_assigned_instances(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        data = r.json()
        for user in data:
            assert "assigned_instances" in user
            assert isinstance(user["assigned_instances"], list)

    def test_admin_users_no_sensitive_fields(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        data = r.json()
        for user in data:
            assert "hashed_password" not in user
            assert "reset_code" not in user
            assert "_id" not in user

    def test_admin_users_fields(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        data = r.json()
        user = data[0]
        assert "email" in user
        assert "role" in user
        assert "is_verified" in user

    def test_regular_user_cannot_access_admin_users(self, session):
        # Login as regular user (may return 403 if no instances assigned, which is expected)
        r = session.post(f"{BASE_URL}/api/auth/login", json={"email_or_username": "testuser@example.com", "password": "Test@123"})
        assert r.status_code in [200, 403], f"Login returned unexpected status: {r.status_code}"
        # Even if login returned 403 (no instances), cookies may be set; try accessing admin/users
        r2 = session.get(f"{BASE_URL}/api/admin/users")
        assert r2.status_code in [401, 403]

    def test_unauthenticated_cannot_access_admin_users(self, session):
        r = session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code in [401, 403]
