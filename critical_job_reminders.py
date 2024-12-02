import schedule
import time
from datetime import datetime, timedelta
import pyperclip
from tkinter import Tk, Button, Label

print("Reminders console")

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

# List of weekdays for scheduling mk_BATCH_END_EMAIL
WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

import numpy as np
import sounddevice as sd
from chord import play_chord


fsus4_frequencies = [349.22, 466.16, 523.26]


# Function to display alert with a copy button
def show_alert(job_name):
    play_chord(fsus4_frequencies, duration=2, fade_duration=0.5)  # Play the chord with fades
    root = Tk()
    root.title("Job Alert")
    root.geometry("300x100")
    
    # Ensure the window appears on top
    root.attributes("-topmost", True)
    root.lift()
    root.focus_force()
    print(job_name)
    label = Label(root, text=f"{job_name}")
    label.pack(pady=10)
    
    def copy_to_clipboard():
        pyperclip.copy(job_name)
        root.destroy()
    
    copy_button = Button(root, text="Copy Job Name", command=copy_to_clipboard)
    copy_button.pack(pady=5)
    
    root.mainloop()

# Function to schedule job alerts
def schedule_job_alert(job_name, alert_time, days=None):
    alert_time_str = alert_time.strftime("%H:%M")
    if days:
        for day in days:
            # Get the scheduling method based on day string
            schedule_method = getattr(schedule.every(), day)
            schedule_method.at(alert_time_str).do(show_alert, job_name=job_name)
    else:
        schedule.every().day.at(alert_time_str).do(show_alert, job_name=job_name)

# Function to process each job and schedule alerts
def process_jobs(jobs):
    now = datetime.now()
    for job in jobs:
        job_name = job["name"]
        # Parsing start and end times
        start_time = datetime.strptime(job["start_time"], "%H:%M").time()
        end_time = datetime.strptime(job["end_time"], "%H:%M").time()
        
        # Compute alert_time_start by adding 15 minutes
        alert_time_start = datetime.combine(now.date(), start_time) + timedelta(minutes=15)
        if alert_time_start <= now:
            # If the alert time has already passed today, schedule for tomorrow
            alert_time_start += timedelta(days=1)
        
        # Compute alert_time_end by adding 15 minutes
        alert_time_end = datetime.combine(now.date(), end_time) + timedelta(minutes=15)
        # If end_time is earlier than or equal to start_time, it's on the next day
        if end_time <= start_time:
            alert_time_end += timedelta(days=1)
        if alert_time_end <= now:
            # If the alert time has already passed today, schedule for tomorrow
            alert_time_end += timedelta(days=1)
        
        # Determine scheduling days
        if job_name == "mk_BATCH_END_EMAIL":
            # Schedule only on weekdays
            days_to_schedule = WEEKDAYS
        else:
            # Schedule every day
            days_to_schedule = None
        
        # Schedule the start alert
        schedule_job_alert(job_name, alert_time_start, days=days_to_schedule)
        
        # Schedule the end alert
        schedule_job_alert(job_name, alert_time_end, days=days_to_schedule)

# Initialize job scheduling
process_jobs(jobs)

# =======================
# New Scheduling Added Below
# =======================

# Define the days for Final pass prompt
FINAL_PASS_WEEKDAYS = ['sunday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
FINAL_PASS_SUNDAY = ['monday'] # actually monday...

# Define the alert times

final_pass_time_weekdays = datetime.strptime("03:30", "%H:%M").time()
final_pass_time_sunday = datetime.strptime("01:30", "%H:%M").time()

# Schedule "Final pass prompt" for Monday to Saturday at 3:30 AM
schedule_job_alert("Final pass prompt", final_pass_time_weekdays, days=FINAL_PASS_WEEKDAYS)

# Schedule "Final pass prompt" for Sunday at 1:30 AM
schedule_job_alert("Final pass prompt", final_pass_time_sunday, days=FINAL_PASS_SUNDAY)

# =======================
# End of Previous New Scheduling
# =======================

# =======================
# Additional Scheduling for "Time for turnover"
# =======================

# Define the alert time for "Time for turnover"
time_for_turnover_time = datetime.strptime("06:30", "%H:%M").time()
time_for_jims2mds = datetime.strptime("03:45", "%H:%M").time()
time_for_jcycle_crcom = datetime.strptime("05:30", "%H:%M").time()
time_for_jrcs_cj_estimate = datetime.strptime("02:00", "%H:%M").time()

# Schedule "Time for turnover" every day at 6:30 AM
schedule_job_alert("Time for turnover.", time_for_turnover_time)
schedule_job_alert("Check on jims2mds", time_for_jims2mds)
schedule_job_alert("Answer prompt for jcycle_crcom", time_for_jcycle_crcom)
schedule_job_alert("JRCS_CJ_ESTIMATE_IMPORTER_START", time_for_jrcs_cj_estimate)

# Schedule an additional Monday morning alert at 12:30 AM
additional_sunday_alert_time = datetime.strptime("01:30", "%H:%M").time()
schedule_job_alert("SMDS_SLSINVUPD_W Finished, set SMDS_SLSINVUPD_D priority to 10", additional_sunday_alert_time, days=['monday'])


# =======================
# End of Additional Scheduling
# =======================

# Test the chord sound out:
play_chord(fsus4_frequencies, duration=2, fade_duration=0.5)  # Play the chord with fades

# Main loop to run scheduled tasks
while True:
    schedule.run_pending()
    time.sleep(1)
