import schedule
import time
from datetime import datetime, timedelta
import pyperclip
from tkinter import Tk, Button, Label

# Job data as lists (replace this with your data parsing if automated)
jobs = [
    {"name": "edw_ODSP_RMS_DATA_EDWP_box", "start_time": "18:00", "end_time": "06:31"},
    {"name": "hr_SCHEDULE_box", "start_time": "20:30", "end_time": "19:45"},
    {"name": "hr_COMMISSIONS_box", "start_time": "00:59", "end_time": "13:00"},
    {"name": "hr_com_MV_SALEPLUSw", "start_time": "00:59", "end_time": "05:30"},
    {"name": "edp_UK_ECOMM_box", "start_time": "01:00", "end_time": "01:15"},
    {"name": "edw_infa_SISSALES_SLIP_W", "start_time": "04:00", "end_time": "05:15"},
    {"name": "mk_BATCH_END_EMAIL", "start_time": "05:30", "end_time": "05:31"},
    {"name": "edw_infa_SIG_DALLAS_SALES", "start_time": "06:00", "end_time": "06:15"}
]

# Function to display alert with a copy button
def show_alert(job_name):
    root = Tk()
    root.title("Job Alert")
    root.geometry("300x100")
    
    label = Label(root, text=f"It's time to check on {job_name}!")
    label.pack(pady=10)
    
    def copy_to_clipboard():
        pyperclip.copy(job_name)
        root.destroy()
    
    copy_button = Button(root, text="Copy Job Name", command=copy_to_clipboard)
    copy_button.pack(pady=5)
    
    root.mainloop()

# Function to schedule job alerts
def schedule_job_alert(job_name, alert_time):
    alert_time_str = alert_time.strftime("%H:%M")
    schedule.every().day.at(alert_time_str).do(show_alert, job_name=job_name)

# Function to process each job and schedule alerts
def process_jobs(jobs):
    for job in jobs:
        # Parsing start and end times
        start_time = datetime.strptime(job["start_time"], "%H:%M")
        end_time = datetime.strptime(job["end_time"], "%H:%M")
        
        # Adding 15 minutes delay for both start and end times
        start_alert_time = start_time + timedelta(minutes=15)
        end_alert_time = end_time + timedelta(minutes=15)
        
        # Schedule the alerts
        schedule_job_alert(job["name"], start_alert_time)
        schedule_job_alert(job["name"], end_alert_time)

# Initialize job scheduling
process_jobs(jobs)

# Main loop to run scheduled tasks
while True:
    schedule.run_pending()
    time.sleep(1)
