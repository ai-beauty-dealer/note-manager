import time
import json
import subprocess
import os
from datetime import datetime
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data" / "articles.json"
SCRIPT_PATH = Path(__file__).parent / "auto_post_note.py"

def check_and_post():
    if not DATA_FILE.exists():
        return
    
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            articles = json.load(f)
    except:
        return

    now = datetime.now().isoformat()
    changed = False

    for article in articles:
        if article['status'] == 'scheduled' and article['publish_at'] <= now:
            print(f"Triggering post for: {article['title']} ({article['id']})")
            # We don't want to block the scheduler, but for simplicity we run it sequentially here
            # In a better setup, we'd use a task queue
            try:
                subprocess.run(['python3', str(SCRIPT_PATH), '--url', article['draft_url'], '--id', article['id']])
                changed = True
            except Exception as e:
                print(f"Failed to post {article['id']}: {e}")

    if changed:
        print("Scheduler cycle complete.")

if __name__ == "__main__":
    print("Note Manager Scheduler started...")
    while True:
        check_and_post()
        time.sleep(60) # Check every minute
