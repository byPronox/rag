def test_logout(test_client):
    """Test the logout endpoint to ensure it returns a successful status code."""
    response = test_client.post("/auth/logout")
    
    assert response.status_code == 200
