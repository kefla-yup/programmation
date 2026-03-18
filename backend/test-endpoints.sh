#!/bin/bash

BASE="http://localhost:3000/api"

echo "=== Testing Endpoints ==="
echo ""

echo "1. GET /races"
curl -s "$BASE/races" | python3 -m json.tool | head -20
echo ""

echo "2. GET /races/1/genetics"
curl -s "$BASE/races/1/genetics" | python3 -m json.tool
echo ""

echo "3. GET /config-prix"
curl -s "$BASE/config-prix" | python3 -m json.tool | head -20
echo ""

echo "4. GET /lots"
curl -s "$BASE/lots" | python3 -m json.tool | head -20
echo ""

echo "5. GET /oeufs"
curl -s "$BASE/oeufs" | python3 -m json.tool | head -20
echo ""

echo "6. GET /stock"
curl -s "$BASE/stock" | python3 -m json.tool | head -20
echo ""
