REM Batch script to open specified URLs one at a time in Microsoft Edge

REM @echo off

REM Open the new alert creator
start microsoft-edge:"https://signetjewelers.atlassian.net/jira/ops/teams/46d6c4ba-da5e-4633-b096-2132b4baa969/alerts?view=list&query="
ping localhost -n 3 >nul

REM Open RMJ
start microsoft-edge:"https://portal.runmyjobs.cloud/dashboard"
ping localhost -n 3 >nul

REM Open RHES Production TWS
start microsoft-edge:"http://rhesprodtws01/"
ping localhost -n 3 >nul

REM Open Workday
start microsoft-edge:"https://www.myworkday.com/signetjewelers/d/home.htmld"
ping localhost -n 3 >nul

REM Open Orion Summary View
start microsoft-edge:"https://pwakslwnapp01.jewels.com/Orion/SummaryView.aspx?ViewID=167"
ping localhost -n 3 >nul

REM Open Nagios XI
start microsoft-edge:"https://rhesprodmon01/nagiosxi/"
ping localhost -n 3 >nul

REM Open Secret Server
start microsoft-edge:"https://signet.secretservercloud.com/app/#/secrets/7848/general"
ping localhost -n 3 >nul

REM Open 16 Hour Filter in Jira
start microsoft-edge:"https://signetjewelers.atlassian.net/issues/?filter=45812"
ping localhost -n 3 >nul

REM Open SWAT Incidents in Jira
start microsoft-edge:"https://signetjewelers.atlassian.net/issues/?filter=45837&atlOrigin=eyJpIjoiNjMzMzY5YWUwNjg3NDMxMDkwNWZhYjI1OTBlMTQyNWEiLCJwIjoiaiJ9"
ping localhost -n 3 >nul

REM Open Workday
start microsoft-edge:"https://www.myworkday.com/signetjewelers/d/home.htmld"
ping localhost -n 3 >nul

REM Open Service Catalog - Submit an Issue
start microsoft-edge:"https://signetjewelers.atlassian.net/servicedesk/customer/portal/1010"
ping localhost -n 3 >nul

REM Microsoft Teams in Browser
start microsoft-edge:"https://teams.microsoft.com/v2/"
ping localhost -n 3 >nul

REM Change requests
start microsoft-edge:"https://signetjewelers.atlassian.net/jira/servicedesk/projects/SERVOPS/queues/custom/1542"
ping localhost -n 3 >nul

REM Workday
start microsoft-edge:"https://www.myworkday.com/signetjewelers/d/home.htmld"
ping localhost -n 3 >nul

REM Outlook
start "" "C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE"

echo All specified links have been opened.

REM Connect udrive
net use U: \\nas01.jewels.local\sterling /user:jewels\%username% /persistent:no

REM Open VSCode in the current directory
code .

REM Run Python script
cmd /c python critical_job_reminders.py

pause
