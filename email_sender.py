import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
import os
from dotenv import load_dotenv

def send_email_async(subject, recipient, body):
    """
    Sends an email asynchronously handling execution in a separate thread.
    """
    thread = threading.Thread(target=_send_email_thread, args=(subject, recipient, body))
    thread.start()

def _send_email_thread(subject, recipient, body):
    # Force reload env vars to pick up changes without restart
    load_dotenv(override=True)
    
    sender_email = os.environ.get('MAIL_USERNAME')
    sender_password = os.environ.get('MAIL_PASSWORD')
    smtp_server = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('MAIL_PORT', 587))
    
    # Mock Mode if credentials are not set
    if not sender_email or not sender_password:
        print(f"\n[MOCK EMAIL] To: {recipient}\nSubject: {subject}\nBody: {body}\n[Server not configured, skipping actual send]\n")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, recipient, text)
        server.quit()
        print(f"Email sent successfully to {recipient}")
    except Exception as e:
        print(f"Failed to send email: {e}")
