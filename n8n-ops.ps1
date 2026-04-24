# ============================================================
# n8n-ops.ps1 — helpers for talking to local n8n via REST API
# ============================================================

$script:N8N_BASE = "http://localhost:5678/api/v1"
$script:N8N_KEY  = $env:N8N_API_KEY
if (-not $script:N8N_KEY) {
    Write-Warning "N8N_API_KEY env var not set."
    throw "Missing N8N_API_KEY"
}
$script:HEADERS  = @{ "X-N8N-API-KEY" = $script:N8N_KEY }

function N8N-List {
    Invoke-RestMethod -Uri "$script:N8N_BASE/workflows" -Headers $script:HEADERS |
      Select-Object -ExpandProperty data |
      Select-Object id, name, active, updatedAt |
      Format-Table -AutoSize
}

function N8N-Get($id) {
    Invoke-RestMethod -Uri "$script:N8N_BASE/workflows/$id" -Headers $script:HEADERS |
      ConvertTo-Json -Depth 20
}

function N8N-Activate($id) {
    $h = $script:HEADERS.Clone()
    $h["Content-Type"] = "application/json"
    Invoke-RestMethod -Uri "$script:N8N_BASE/workflows/$id/activate" -Method Post -Headers $h -Body "{}"
}
function N8N-Deactivate($id) {
    $h = $script:HEADERS.Clone()
    $h["Content-Type"] = "application/json"
    Invoke-RestMethod -Uri "$script:N8N_BASE/workflows/$id/deactivate" -Method Post -Headers $h -Body "{}"
}

function N8N-Executions($id = $null, $limit = 5) {
    $uri = "$script:N8N_BASE/executions?limit=$limit"
    if ($id) { $uri += "&workflowId=$id" }
    Invoke-RestMethod -Uri $uri -Headers $script:HEADERS |
      Select-Object -ExpandProperty data |
      Select-Object id, workflowId, status, startedAt, stoppedAt |
      Format-Table -AutoSize
}

function N8N-Execution($executionId) {
    Invoke-RestMethod -Uri "$script:N8N_BASE/executions/$executionId?includeData=true" -Headers $script:HEADERS |
      ConvertTo-Json -Depth 20
}

# ============================================================
