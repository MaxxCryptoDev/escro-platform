#!/usr/bin/env python3
import requests
import os
import sys

# Add the .env file path
env_file = "/home/maxx/Desktop/work/zf_editor/.env"

# Read .env file
print(f"📂 Reading {env_file}...")
api_key = None

with open(env_file, 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith("ANTHROPIC_API_KEY="):
            api_key = line.split("=", 1)[1].strip()

if not api_key:
    print("❌ Could not find ANTHROPIC_API_KEY in .env")
    sys.exit(1)

print(f"✅ API Key found: {api_key[:30]}...")

# Test the API
print("\n🧪 Testing API connection...")
headers = {
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
}

test_payload = {
    "model": "claude-2.1",
    "max_tokens": 100,
    "messages": [
        {"role": "user", "content": "Say hello"}
    ]
}

response = requests.post(
    "https://api.anthropic.com/v1/messages",
    headers=headers,
    json=test_payload
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code == 200:
    print("✅ API connection works!")
else:
    print(f"❌ API error: {response.json()}")
