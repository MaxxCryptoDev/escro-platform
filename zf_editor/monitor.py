"""
Monitor input.txt for changes and save to dated folder
"""

import os
import json
from datetime import datetime
from pathlib import Path
import hashlib
import time

INPUT_FILE = 'input.txt'
OUTPUT_DIR = 'output'
STATE_FILE = '.monitor_state.json'


def get_today_folder():
    """Get today's folder path in YYYY-MM-DD format"""
    today = datetime.now().strftime('%Y-%m-%d')
    folder_path = os.path.join(OUTPUT_DIR, today)
    return folder_path, today


def ensure_folder_exists(folder_path):
    """Create folder if it doesn't exist"""
    os.makedirs(folder_path, exist_ok=True)


def get_file_hash(content):
    """Calculate hash of file content"""
    return hashlib.md5(content.encode()).hexdigest()


def load_state():
    """Load previous monitoring state"""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'last_hash': '', 'last_date': ''}


def save_state(content_hash, current_date):
    """Save current monitoring state"""
    state = {
        'last_hash': content_hash,
        'last_date': current_date
    }
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


def monitor_input():
    """Monitor input.txt for changes"""
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found")
        return
    
    # Load previous state
    state = load_state()
    
    # Read current input
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    current_hash = get_file_hash(content)
    folder_path, current_date = get_today_folder()
    
    # Check if content changed
    if current_hash != state['last_hash']:
        print(f"✓ Text change detected on {current_date}")
        
        # Create folder for today if needed
        ensure_folder_exists(folder_path)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%H%M%S')
        filename = f"input_{timestamp}.txt"
        filepath = os.path.join(folder_path, filename)
        
        # Save the new content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Saved to: {filepath}")
        
        # Update state
        save_state(current_hash, current_date)
    else:
        print(f"No changes detected in {INPUT_FILE}")


def continuous_monitor(check_interval=5):
    """Continuously monitor input.txt"""
    print(f"Monitoring {INPUT_FILE} every {check_interval} seconds...")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            monitor_input()
            time.sleep(check_interval)
    except KeyboardInterrupt:
        print("\n✓ Monitoring stopped")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--continuous':
        continuous_monitor()
    else:
        monitor_input()
