"""
Integration tests for authentication endpoints.
"""



class TestAuthEndpoints:
    """Test authentication API endpoints."""

    def test_register_user(self, client):
        """Test user registration."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "testpassword123",
            "full_name": "New User"
        }

        response = client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["full_name"] == user_data["full_name"]
        assert "id" in data
        assert "hashed_password" not in data  # Should not expose password

    def test_register_duplicate_email(self, client, test_user):
        """Test registration with duplicate email."""
        user_data = {
            "email": test_user.email,  # Same email as existing user
            "username": "different",
            "password": "testpassword123"
        }

        response = client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_login_success(self, client, test_user):
        """Test successful login."""
        login_data = {
            "username": test_user.email,  # Can login with email
            "password": "testpassword"  # From test_user fixture
        }

        response = client.post("/api/v1/auth/login", data=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password."""
        login_data = {
            "username": test_user.email,
            "password": "wrongpassword"
        }

        response = client.post("/api/v1/auth/login", data=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "somepassword"
        }

        response = client.post("/api/v1/auth/login", data=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_get_current_user(self, authenticated_client, test_user):
        """Test getting current user information."""
        response = authenticated_client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert "hashed_password" not in data

    def test_unauthorized_access(self, client):
        """Test accessing protected endpoint without authentication."""
        response = client.get("/api/v1/users/me")

        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]


class TestUserEndpoints:
    """Test user management endpoints."""

    def test_update_user_profile(self, authenticated_client, test_user):
        """Test updating user profile."""
        update_data = {
            "full_name": "Updated Name",
            "timezone": "America/Los_Angeles"
        }

        response = authenticated_client.put("/api/v1/users/me", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["timezone"] == "America/Los_Angeles"

    def test_update_user_units(self, authenticated_client):
        """Test updating user unit preferences."""
        update_data = {
            "weight_unit": "kg",
            "temperature_unit": "c",
            "height_unit": "cm"
        }

        response = authenticated_client.put("/api/v1/users/me", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["weight_unit"] == "kg"
        assert data["temperature_unit"] == "c"
        assert data["height_unit"] == "cm"
