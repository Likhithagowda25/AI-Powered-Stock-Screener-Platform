# Alert Scheduler - Windows Task Scheduler Setup
# Run this PowerShell script as Administrator to set up scheduled task

$taskName = "StockScreenerAlertScheduler"
$pythonPath = "python"  # Update if using specific Python installation
$scriptPath = "$PSScriptRoot\alert_scheduler.py"
$workingDir = "$PSScriptRoot"

# Create scheduled task to run daily at 9 AM
$action = New-ScheduledTaskAction -Execute $pythonPath -Argument $scriptPath -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Stock Screener Alert Evaluation"

Write-Host "✓ Scheduled task '$taskName' created successfully"
Write-Host "  Runs daily at 9:00 AM"
Write-Host ""
Write-Host "To view task: taskschd.msc"
Write-Host "To run manually: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "To remove: Unregister-ScheduledTask -TaskName '$taskName'"
