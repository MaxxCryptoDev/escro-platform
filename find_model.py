#!/usr/bin/env python3
import requests
import json

# Read API key from .env
with open("/home/maxx/Desktop/work/zf_editor/.env", 'r') as f:
    for line in f:
        if line.startswith("ANTHROPIC_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
            break

print(f"✅ API Key found: {api_key[:30]}...")

# Try different model names and endpoints
models_to_try = [
    "claude-instant",
    "claude-3-sonnet",
    "claude-2",
    "claude-3-opus",
]

headers = {
    "x-api-key": api_key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
}

print("\n🔍 Testing models...\n")

for model in models_to_try:
    payload = {
        "model": model,
        "max_tokens": 50,
        "messages": [
            {"role": "user", "content": "Hello"}
        ]
    }
    
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload
    )
    
    status = "✅" if response.status_code == 200 else "❌"
    print(f"{status} {model}: {response.status_code}")
    
    if response.status_code == 200:
        print(f"   SUCCESS! Can use: {model}")
        break
    else:
        error = response.json().get("error", {}).get("message", "")
        print(f"   Error: {error}")
