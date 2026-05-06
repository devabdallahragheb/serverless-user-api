#!/bin/bash

set -e

API_URL="http://127.0.0.1:3000"

echo "🧪 Testing Lambda CRUD Operations Locally"
echo "=========================================="

echo -e "\n1️⃣  Creating user..."
CREATE_RESPONSE=$(curl -s -X POST $API_URL/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Abdullah","email":"abdullah@test.com","role":"developer"}')

echo $CREATE_RESPONSE | jq .

USER_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
echo "Created user with ID: $USER_ID"

echo -e "\n2️⃣  Getting user by ID..."
curl -s $API_URL/users/$USER_ID | jq .

echo -e "\n3️⃣  Listing all users..."
curl -s $API_URL/users | jq .

echo -e "\n4️⃣  Updating user..."
curl -s -X PATCH $API_URL/users/$USER_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Abdullah Updated","role":"senior developer"}' | jq .

echo -e "\n5️⃣  Getting updated user..."
curl -s $API_URL/users/$USER_ID | jq .

echo -e "\n6️⃣  Deleting user..."
curl -s -X DELETE $API_URL/users/$USER_ID | jq .

echo -e "\n7️⃣  Verifying deletion (should return 404)..."
curl -s $API_URL/users/$USER_ID | jq .

echo -e "\n✅ All tests completed!"
