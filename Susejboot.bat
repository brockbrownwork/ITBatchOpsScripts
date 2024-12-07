@echo off

start chrome.exe "https://pwakslwnapp01.jewels.com/Orion/SummaryView.aspx?ViewID=167"
ping localhost -n 2 >nul
start chrome "https://signet-prod.saas.appdynamics.com/controller/#/location=AD_HOME_OVERVIEW"
ping localhost -n 2 >nul
start chrome "https://signet-prod.saas.appdynamics.com/controller/#/location=AD_HOME_OVERVIEW"
ping localhost -n 2 >nul
start chrome "http://rhesprodnagios01/nagiosxi"
ping localhost -n 2 >nul
start chrome "http://rhesprodnagios01/nagiosxi"
ping localhost -n 2 >nul
start "ie" "C:\Program Files (x86)\Internet Explorer\iexplore.exe"
ping localhost -n 2 >nul
start "outlook" "C:\Program Files (x86)\Microsoft Office\root\Office16\OUTLOOK.EXE"
ping localhost -n 2 >nul
start /wait chrome "https://signetjewelers.atlassian.net/jira/servicedesk/projects/SERVOPS/queues/custom/1112" --new-window