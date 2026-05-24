#!/bin/bash
# Watches workflow.json and pushes changes to n8n via REST API.
# Usage: ./sync.sh <workflow-id>
# Example: ./sync.sh 1

WORKFLOW_ID=${1:?Usage: ./sync.sh <workflow-id>}
N8N_URL="http://localhost:5678"
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDU4ZGRhMy1jZTIxLTQ3MGYtYTg1Zi03ZTkxZWNjOWUwYzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZTljZTJiMTQtY2VlNy00MGQ5LWEzYjktODhiMGM0ZDgyYWIxIiwiaWF0IjoxNzc5NTY0OTIwLCJleHAiOjE3ODIwODY0MDB9.AoUBzHncgBWL4AB8Fm3sVzdMQiz308-_eUasOAhlcMk"
FILE="workflow.json"

push() {
  HTTP_CODE=$(jq 'del(.active, .versionId, .triggerCount, .updatedAt, .tags, .staticData)' "$FILE" | curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "$N8N_URL/api/v1/workflows/$WORKFLOW_ID" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @-)
  echo "$(date '+%H:%M:%S') — pushed workflow.json → HTTP $HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ]; then
    curl -s -X POST "$N8N_URL/api/v1/workflows/$WORKFLOW_ID/deactivate" -H "X-N8N-API-KEY: $N8N_API_KEY" > /dev/null
    sleep 1
    curl -s -X POST "$N8N_URL/api/v1/workflows/$WORKFLOW_ID/activate" -H "X-N8N-API-KEY: $N8N_API_KEY" > /dev/null
    echo "$(date '+%H:%M:%S') — webhook re-registered"
  fi
}

echo "Watching $FILE for changes (workflow ID: $WORKFLOW_ID) ..."
push  # push once immediately on start

fswatch -o "$FILE" | while read; do
  push
done
