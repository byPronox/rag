def test_logout(test_client):
    response = test_client.post("/auth/logout")
    
    assert response.status_code == 200
