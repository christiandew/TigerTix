# Fire 10 concurrent POSTs for the same event id
1..10 | ForEach-Object {
  Start-Job -ScriptBlock { Invoke-RestMethod -Uri "http://localhost:6001/api/events/1/purchase" -Method POST } | Out-Null
}
Get-Job | Wait-Job | Receive-Job | % { $_ }   # collect responses
Invoke-RestMethod -Uri "http://localhost:6001/api/events/1" -Method GET
