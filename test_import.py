import sys
import os
try:
    from utils.email_sender import send_email_async
    print("Import Successful")
    
    # Try reading env
    from dotenv import load_dotenv
    load_dotenv()
    print(f"Mail User: {os.environ.get('MAIL_USERNAME')}")
except Exception as e:
    print(f"Error: {e}")
