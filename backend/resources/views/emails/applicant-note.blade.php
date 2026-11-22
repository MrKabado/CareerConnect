<!doctype html>
<html>
<body style="margin:0;background:#f4f8f7;font-family:Arial,sans-serif;color:#263a3c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e5eeec;overflow:hidden;">
        <tr><td style="padding:20px 24px;background:#078b8d;color:#ffffff;">
          <table role="presentation"><tr>
            <td style="width:38px;height:38px;border-radius:10px;background:#ffffff;color:#078b8d;text-align:center;font-size:20px;font-weight:bold;">C</td>
            <td style="padding-left:10px;font-size:18px;font-weight:bold;">CareerConnect</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <p style="margin:0 0 16px;">Hi {{ $applicantName }},</p>
          <p style="margin:0 0 16px;"><strong>{{ $employerName }}</strong> from <strong>{{ $companyName }}</strong> sent you a note about your application for <strong>{{ $jobTitle }}</strong>.</p>
          <div style="margin:20px 0;padding:16px;background:#f1f8f7;border-left:4px solid #078b8d;border-radius:8px;white-space:pre-wrap;">{{ $note }}</div>
          <p style="margin:20px 0 0;font-size:13px;color:#687b7e;">Sign in to CareerConnect to view or continue the conversation.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
