#!/usr/bin/env python3
import requests
import json

# Read API key from .env
with open("/home/maxx/Desktop/work/zf_editor/.env", 'r') as f:
    for line in f:
        if line.startswith("ANTHROPIC_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
            break

print(f"✅ API Key: {api_key[:30]}...")
print("\n🔍 Testing legacy completions endpoint...\n")

headers = {
    "x-api-key": api_key,
    "content-type": "application/json",
}

# Claude legacy constants
HUMAN_PROMPT = "\n\nHuman:"
AI_PROMPT = "\n\nAssistant:"

payload = {
    "model": "claude-2",
    "max_tokens_to_sample": 100,
    "prompt": f"{HUMAN_PROMPT} Say hello{AI_PROMPT}"
}

response = requests.post(
    "https://api.anthropic.com/v1/complete",
    headers=headers,
    json=payload
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code == 200:
    print("\n✅ Legacy completions API works!")
else:
    print(f"\n❌ Error: {response.json()}")
