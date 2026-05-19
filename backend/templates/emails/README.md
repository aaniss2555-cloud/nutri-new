SUMB Password Reset Email Template

Location:

- backend/templates/emails/sumb_password_reset_email.html

Quick integration steps (Django):

1. Replace placeholders in the template file:
   - `[RESET_PASSWORD_URL]` → replace with your templating variable (Django example: `{{ reset_url }}`) or use a programmatic string replace before sending.
   - `Abdou` → replace with your username variable (Django example: `{{ first_name }}` or `{{ user.first_name }}`).
   - Update footer links and logo comment as needed.

2. Example Django snippet to render and send the HTML email:

```python
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.mail import send_mail

def send_password_reset_email(user, reset_url):
    # Option A: edit the template file to use Django variables like {{ first_name }} and {{ reset_url }}
    html_message = render_to_string('emails/sumb_password_reset_email.html', {
        'first_name': user.first_name or user.username,
        'reset_url': reset_url,
    })
    plain_message = strip_tags(html_message)
    subject = 'Reset your SUMB Health password'
    send_mail(
        subject,
        plain_message,
        'no-reply@your-domain.com',
        [user.email],
        html_message=html_message,
    )

# Option B: if you prefer not to modify the file, do a quick string replace on the file contents
# before sending (less ideal because templating is cleaner):
# with open('backend/templates/emails/sumb_password_reset_email.html') as f:
#     html = f.read()
# html = html.replace('[RESET_PASSWORD_URL]', reset_url).replace('Abdou', user.first_name or user.username)

```

3. Test steps:

- Open `backend/templates/emails/sumb_password_reset_email.html` in a browser to preview the layout.
- Send a test email via Django shell or a test endpoint.
- Verify rendering in Gmail, Outlook, and Apple Mail; inline CSS and simple layouts are generally best for email client compatibility.

Notes:

- The HTML file includes embedded CSS and is self-contained for email client compatibility.
- Use absolute URLs for any images or links in production emails.

If you want, I can:

- Replace the placeholders now with Django variables (`{{ first_name }}` and `{{ reset_url }}`) and add a preview-only copy, or
- Wire a test-send helper (Django management command) to send a test email to a provided address.
