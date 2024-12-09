@echo off
REM Batch script to open specified URLs one at a time in Google Chrome

REM Open Autosys UI
start chrome.exe "https://autosys-ui.auto.cloud.jewels.com/wcc/ui/Launcher.html"
ping localhost -n 3 >nul

REM Open Opsgenie Alert List
start chrome.exe "https://signetjewelers.app.opsgenie.com/alert/list"
ping localhost -n 3 >nul

REM Open RHES Production TWS
start chrome.exe "http://rhesprodtws01/"
ping localhost -n 3 >nul

REM Open Orion Summary View
start chrome.exe "https://pwakslwnapp01.jewels.com/Orion/SummaryView.aspx?ViewID=167"
ping localhost -n 3 >nul

REM Open Nagios XI
start chrome.exe "https://rhesprodmon01/nagiosxi/"
ping localhost -n 3 >nul

REM Open Secret Server
start chrome.exe "https://signet.secretservercloud.com/app/#/secrets/7848/general"
ping localhost -n 3 >nul

REM Open 16 Hour Filter in Jira
start chrome.exe "https://signetjewelers.atlassian.net/issues/?filter=45812"
ping localhost -n 3 >nul

REM Open SWAT Incidents in Jira
start chrome.exe "https://signetjewelers.atlassian.net/issues/?filter=45837&atlOrigin=eyJpIjoiNjMzMzY5YWUwNjg3NDMxMDkwNWZhYjI1OTBlMTQyNWEiLCJwIjoiaiJ9"
ping localhost -n 3 >nul

REM Open Workday
start chrome.exe "https://www.myworkday.com/signetjewelers/d/home.htmld"
ping localhost -n 3 >nul

REM Open RPA Bot Incidents in Jira
start chrome.exe "https://signetjewelers.atlassian.net/issues/?filter=45835&atlOrigin=eyJpIjoiZjBlOTA0NTg0Y2Q0NDc1YThjMjA0YWU0MmQwNjc5NjUiLCJwIjoiaiJ9"
ping localhost -n 3 >nul

REM Open Service Catalog - Submit an Issue
start chrome.exe "https://signetjewelers.atlassian.net/servicedesk/customer/portal/1010"
ping localhost -n 3 >nul

REM Open Workday Again (Duplicate Link)
start chrome.exe "https://www.myworkday.com/signetjewelers/d/home.htmld"
ping localhost -n 3 >nul

echo All specified links have been opened.

code .

python critical_job_reminders.py

pause
