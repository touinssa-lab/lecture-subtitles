// Vercel Serverless Function: /api/send-email
// 학생 상담 안내 이메일 서버 사이드 자동 발송 API (CORS 프리)

let nodemailer;
try {
  nodemailer = (await import('nodemailer')).default;
} catch (e) {
  try {
    const n = await import('nodemailer');
    nodemailer = n.default || n;
  } catch (err) {
    console.warn('[Email API] Nodemailer import failed or optional:', err.message);
  }
}

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Only POST is accepted.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const {
      to,
      subject,
      text,
      html,
      senderName = '이지호 교수',
      senderEmail = 'ljh@jangan.ac.kr',
    } = body || {};

    const cleanTo = (to || '').trim();
    if (!cleanTo || !cleanTo.includes('@')) {
      return res.status(400).json({
        success: false,
        error: '유효한 수신자 이메일 주소가 전달되지 않았습니다.',
      });
    }

    const finalSubject = (subject || '[상담 안내] 1:1 학생 상담 일정').trim();
    const finalText = (text || '').trim();
    const finalHtml = (html || '').trim() || `<div style="font-family: sans-serif; white-space: pre-line;">${finalText}</div>`;

    // 1. Resend API 우선 시도
    const resendApiKey = process.env.RESEND_API_KEY || '';
    if (resendApiKey) {
      try {
        const fromAddress = process.env.RESEND_FROM_EMAIL || `${senderName} <onboarding@resend.dev>`;
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanTo],
            subject: finalSubject,
            text: finalText,
            html: finalHtml,
            reply_to: senderEmail,
          }),
          signal: AbortSignal.timeout(6000),
        });

        const resendData = await resendRes.json();
        if (resendRes.ok && resendData?.id) {
          console.log('[Email API] Sent successfully via Resend:', resendData.id);
          return res.status(200).json({
            success: true,
            engine: 'resend',
            id: resendData.id,
            message: `${cleanTo} 주소로 안내 메일이 자동 발송되었습니다. (Resend)`,
          });
        } else {
          console.warn('[Email API] Resend returned error, trying SMTP:', resendData);
        }
      } catch (resendErr) {
        console.warn('[Email API] Resend request failed:', resendErr.message);
      }
    }

    // 2. SMTP 발송 시도 (Gmail / 네이버 / 학교 웹메일)
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    if (nodemailer && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport(
          smtpHost
            ? {
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass },
              }
            : {
                service: 'gmail',
                auth: { user: smtpUser, pass: smtpPass },
              }
        );

        const info = await transporter.sendMail({
          from: `"${senderName}" <${smtpUser}>`,
          replyTo: senderEmail,
          to: cleanTo,
          subject: finalSubject,
          text: finalText,
          html: finalHtml,
        });

        console.log('[Email API] Sent successfully via SMTP:', info.messageId);
        return res.status(200).json({
          success: true,
          engine: 'smtp',
          messageId: info.messageId,
          message: `${cleanTo} 주소로 안내 메일이 자동 발송되었습니다. (SMTP)`,
        });
      } catch (smtpErr) {
        console.warn('[Email API] SMTP sending failed:', smtpErr.message);
      }
    }

    // 3. Web3Forms 공개 트랜잭셔널 백업 브릿지
    const web3formsKey = process.env.WEB3FORMS_ACCESS_KEY || '';
    if (web3formsKey) {
      try {
        const formRes = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: web3formsKey,
            to: cleanTo,
            from_name: senderName,
            subject: finalSubject,
            message: finalText,
          }),
          signal: AbortSignal.timeout(5000),
        });

        const formData = await formRes.json();
        if (formRes.ok && formData?.success) {
          console.log('[Email API] Sent via Web3Forms bridge');
          return res.status(200).json({
            success: true,
            engine: 'web3forms',
            message: `${cleanTo} 주소로 안내 메일이 자동 발송되었습니다.`,
          });
        }
      } catch (wErr) {
        console.warn('[Email API] Web3Forms bridge failed:', wErr.message);
      }
    }

    // 4. 발송 키가 아직 환경변수에 등록되지 않은 경우
    console.warn('[Email API] No active email credentials (RESEND_API_KEY or SMTP_USER/PASS) configured.');
    return res.status(200).json({
      success: false,
      configured: false,
      requiresFallback: true,
      error: 'Vercel 환경 변수에 이메일 발송 키(RESEND_API_KEY 또는 SMTP_USER/PASS)가 설정되지 않았습니다.',
      message: '서버 메일 키 미설정으로 클라이언트 메일 앱(mailto)으로 자동 전환합니다.',
    });
  } catch (err) {
    console.error('[Email API] Unexpected server error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || '이메일 서버 오류가 발생했습니다.',
    });
  }
}
