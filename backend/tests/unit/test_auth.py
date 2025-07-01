"""
Unit tests for authentication functionality.
"""
import pytest
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User


class TestPasswordHashing:
    """Test password hashing and verification."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert verify_password(password, hashed)
    
    def test_verify_password_success(self):
        """Test successful password verification."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_failure(self):
        """Test failed password verification."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False


class TestTokenGeneration:
    """Test JWT token generation."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        user_id = 1
        token_data = {"sub": str(user_id)}
        token = create_access_token(data=token_data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0


class TestUserModel:
    """Test User model functionality."""
    
    def test_user_creation(self, test_db_session):
        """Test creating a user."""
        user = User(
            email="new@example.com",
            username="newuser",
            hashed_password=get_password_hash("password"),
            full_name="New User"
        )
        
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)
        
        assert user.id is not None
        assert user.email == "new@example.com"
        assert user.username == "newuser"
        assert user.is_active is True  # Default value
    
    def test_user_unique_email(self, test_db_session, test_user):
        """Test that email must be unique."""
        # Try to create another user with same email
        duplicate_user = User(
            email=test_user.email,  # Same email as test_user
            username="different",
            hashed_password=get_password_hash("password")
        )
        
        test_db_session.add(duplicate_user)
        
        # This should raise an integrity error when committing
        with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
            test_db_session.commit()