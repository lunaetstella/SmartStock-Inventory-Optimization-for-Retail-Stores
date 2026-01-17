import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

def test_smtp():
    sender = os.environ.get('MAIL_USERNAME')
    password = os.environ.get('MAIL_PASSWORD')
    server_host = os.environ.get('MAIL_SERVER')
    port = int(os.environ.get('MAIL_PORT'))
    
    print(f"Attempting to send as: {sender}")
    # print(f"Password: {password}") # Security: Do not print
    
    try:
        server = smtplib.SMTP(server_host, port)
        server.starttls()
        print("Connected to server. Logging in...")
        server.login(sender, password)
        print("Login Successful!")
        
        msg = MIMEText("This is a test email from the Inventory System.")
        msg['Subject'] = "Test Email"
        msg['From'] = sender
        msg['To'] = sender # Send to self
        
        server.sendmail(sender, sender, msg.as_string())
        server.quit()
        print("Test Email Sent Successfully!")
    except smtplib.SMTPAuthenticationError:
        print("ERROR: Authentication Failed. \nIf using Gmail, you MUST use an App Password, not your regular password.\nUser provided password likely rejected by Google.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_smtp()
