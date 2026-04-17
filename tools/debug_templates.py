import json
import urllib.request


with urllib.request.urlopen("http://localhost:9002/api/whatsapp/templates") as response:
    payload = json.loads(response.read().decode("utf-8"))

print(json.dumps(payload, indent=2, ensure_ascii=True))
