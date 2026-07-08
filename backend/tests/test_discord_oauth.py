"""Discord OAuth API Tests - Tests new OAuth endpoints and updated config endpoint"""
import pytest
import requests
import os
from urllib.parse import urlparse, parse_qs

BASE_URL = os.environ.get('BACKEND_URL', '').rstrip('/')
INSTANCE_ID = "96966c6c-2c2e-47e5-91f9-0518dfe25e34"

# Test credentials
ADMIN_USERNAME = "administrator"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")
DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email_or_username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token and instance ID"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "X-Instance-Id": INSTANCE_ID,
        "Content-Type": "application/json"
    }


class TestLogin:
    """Test login flow with admin credentials"""
    
    def test_login_with_username(self):
        """Login with username 'administrator' and password 'Admin@123'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email_or_username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["username"] == ADMIN_USERNAME


class TestDiscordOAuthUrl:
    """Test GET /api/discord/oauth-url endpoint"""
    
    def test_oauth_url_returns_valid_discord_url(self, auth_headers):
        """Should return a JSON with 'url' field containing Discord OAuth2 authorize URL"""
        response = requests.get(f"{BASE_URL}/api/discord/oauth-url", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check 'url' field exists
        assert "url" in data, "Response should contain 'url' field"
        url = data["url"]
        
        # Parse the URL
        parsed = urlparse(url)
        assert parsed.scheme == "https", "URL should use HTTPS"
        assert parsed.netloc == "discord.com", "URL should be discord.com"
        assert "/oauth2/authorize" in parsed.path, "URL should contain /oauth2/authorize"
        
        # Parse query parameters
        params = parse_qs(parsed.query)
        
        # Verify required parameters
        assert "client_id" in params, "URL should contain client_id"
        if DISCORD_CLIENT_ID:
            assert params["client_id"][0] == DISCORD_CLIENT_ID, \
                f"client_id mismatch: got {params['client_id'][0]}, expected {DISCORD_CLIENT_ID}"
        
        assert "permissions" in params, "URL should contain permissions"
        
        assert "scope" in params, "URL should contain scope"
        assert params["scope"][0] == "bot", "scope should be 'bot'"
        
        assert "redirect_uri" in params, "URL should contain redirect_uri"
        assert "callback" in params["redirect_uri"][0], "redirect_uri should contain callback"
        
        assert "response_type" in params, "URL should contain response_type"
        assert params["response_type"][0] == "code", "response_type should be 'code'"
        
        assert "state" in params, "URL should contain state"
        assert params["state"][0] == INSTANCE_ID, f"state should be instance_id: {INSTANCE_ID}"
    
    def test_oauth_url_requires_auth(self):
        """Should return 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/discord/oauth-url")
        assert response.status_code == 401, "Should require authentication"
    
    def test_oauth_url_requires_instance_id(self, auth_token):
        """Should return error without X-Instance-Id header"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/discord/oauth-url", headers=headers)
        # Should fail without instance ID
        assert response.status_code in [400, 422], f"Should require instance ID, got {response.status_code}"


class TestDiscordConfig:
    """Test GET /api/discord/config endpoint"""
    
    def test_config_returns_oauth_enabled(self, auth_headers):
        """Should return oauth_enabled: true when DISCORD_CLIENT_ID is set"""
        response = requests.get(f"{BASE_URL}/api/discord/config", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check oauth_enabled field
        assert "oauth_enabled" in data, "Response should contain 'oauth_enabled' field"
        assert data["oauth_enabled"] is True, "oauth_enabled should be True when DISCORD_CLIENT_ID is set"
    
    def test_config_returns_has_bot_token_field(self, auth_headers):
        """Should return has_bot_token field"""
        response = requests.get(f"{BASE_URL}/api/discord/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "has_bot_token" in data, "Response should contain 'has_bot_token' field"
        assert isinstance(data["has_bot_token"], bool), "has_bot_token should be boolean"
    
    def test_config_returns_oauth_connected_field(self, auth_headers):
        """Should return oauth_connected field"""
        response = requests.get(f"{BASE_URL}/api/discord/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # oauth_connected may or may not be present depending on state
        # If present, should be boolean
        if "oauth_connected" in data:
            assert isinstance(data["oauth_connected"], bool), "oauth_connected should be boolean"
    
    def test_config_does_not_expose_bot_token(self, auth_headers):
        """Should not expose the actual bot_token in response"""
        response = requests.get(f"{BASE_URL}/api/discord/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # bot_token should not be in response (only bot_token_display if token exists)
        assert "bot_token" not in data, "Should not expose actual bot_token"


class TestDiscordCallback:
    """Test GET /api/discord/callback endpoint - error handling paths"""
    
    def test_callback_handles_error_param(self):
        """Should redirect to frontend with error query when error param is present"""
        response = requests.get(
            f"{BASE_URL}/api/discord/callback",
            params={"error": "access_denied", "error_description": "User cancelled"},
            allow_redirects=False
        )
        # Should redirect (302 or 307)
        assert response.status_code in [302, 307], f"Should redirect, got {response.status_code}"
        
        # Check redirect location
        location = response.headers.get("location", "")
        assert "/admin/discord" in location, "Should redirect to /admin/discord"
        assert "oauth=error" in location, "Should include oauth=error in redirect"
        assert "reason=access_denied" in location, "Should include reason in redirect"
    
    def test_callback_handles_missing_code(self):
        """Should redirect to frontend with error when code is missing"""
        response = requests.get(
            f"{BASE_URL}/api/discord/callback",
            params={"state": INSTANCE_ID},  # No code param
            allow_redirects=False
        )
        # Should redirect
        assert response.status_code in [302, 307], f"Should redirect, got {response.status_code}"
        
        # Check redirect location
        location = response.headers.get("location", "")
        assert "/admin/discord" in location, "Should redirect to /admin/discord"
        assert "oauth=error" in location, "Should include oauth=error in redirect"
        assert "reason=no_code" in location, "Should include reason=no_code"
    
    def test_callback_not_behind_auth(self):
        """Callback endpoint should NOT require authentication (accessed by Discord redirect)"""
        # This should not return 401 - it's a public endpoint
        response = requests.get(
            f"{BASE_URL}/api/discord/callback",
            params={"error": "test"},
            allow_redirects=False
        )
        # Should NOT be 401 - should redirect instead
        assert response.status_code != 401, "Callback should not require authentication"
        assert response.status_code in [302, 307], "Should redirect"


class TestDiscordConfigUpdate:
    """Test PUT /api/discord/config endpoint - should still work"""
    
    def test_update_config_works(self, auth_headers):
        """PUT /api/discord/config should still work to save configuration"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/discord/config", headers=auth_headers)
        current_config = get_response.json()
        
        # Update with same values (safe update)
        update_data = {
            "is_active": current_config.get("is_active", False),
            "listen_mode": current_config.get("listen_mode", "mention_only"),
            "reply_style": current_config.get("reply_style", "natural")
        }
        
        response = requests.put(f"{BASE_URL}/api/discord/config", headers=auth_headers, json=update_data)
        assert response.status_code == 200, f"Failed to update config: {response.text}"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/discord/config", headers=auth_headers)
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data.get("listen_mode") == update_data["listen_mode"]


class TestDiscordRestart:
    """Test POST /api/discord/restart endpoint - should still work"""
    
    def test_restart_endpoint_exists(self, auth_headers):
        """POST /api/discord/restart should be accessible"""
        response = requests.post(f"{BASE_URL}/api/discord/restart", headers=auth_headers)
        # May fail if no token configured, but should not be 404 or 401
        assert response.status_code != 404, "Restart endpoint should exist"
        assert response.status_code != 401, "Should be authenticated"
        # 400 is acceptable if bot token not configured
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"


class TestDiscordStatus:
    """Test GET /api/discord/status endpoint"""
    
    def test_status_endpoint_works(self, auth_headers):
        """GET /api/discord/status should return bot status"""
        response = requests.get(f"{BASE_URL}/api/discord/status", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
