/**
 * KR Restaurant — email verification template.
 *
 * Designed for maximum compatibility across email clients:
 *   - Table-based layout (Outlook safe)
 *   - All styles inlined
 *   - Bulletproof button (works without CSS)
 *   - 600px max width, mobile responsive
 *   - Web-safe fonts with system font stack fallbacks
 *
 * The visual language mirrors the in-app KR aesthetic:
 * warm amber-gold accents on a refined dark hero band over a
 * soft cream/parchment body — editorial, premium, and quiet.
 */

export type VerifyEmailTemplateInput = {
  name: string;
  verifyUrl: string;
  logoUrl: string;
  appUrl: string;
  expiresInHours?: number;
  supportEmail?: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderVerifyEmail({
  name,
  verifyUrl,
  logoUrl,
  appUrl,
  expiresInHours = 24,
  supportEmail = "support@krrestaurant.com",
}: VerifyEmailTemplateInput): RenderedEmail {
  const firstName = (name?.split(/\s+/)[0] ?? "there").trim() || "there";
  const subject = "Confirm your email — KR Restaurant";
  const preheader =
    "One quick step: verify your email to activate your KR Restaurant workspace.";

  const html = buildHtml({
    firstName,
    verifyUrl,
    logoUrl,
    appUrl,
    preheader,
    expiresInHours,
    supportEmail,
  });

  const text = buildText({
    firstName,
    verifyUrl,
    expiresInHours,
    supportEmail,
  });

  return { subject, html, text };
}

function buildText({
  firstName,
  verifyUrl,
  expiresInHours,
  supportEmail,
}: {
  firstName: string;
  verifyUrl: string;
  expiresInHours: number;
  supportEmail: string;
}): string {
  return [
    `Hi ${firstName},`,
    "",
    "Welcome to KR Restaurant — your POS & Management workspace.",
    "",
    `Please confirm your email address by opening the link below. The link expires in ${expiresInHours} hours.`,
    "",
    verifyUrl,
    "",
    "If you did not create this account, you can safely ignore this email.",
    "",
    `Questions? Reach us at ${supportEmail}.`,
    "",
    "— The KR Restaurant Team",
  ].join("\n");
}

function buildHtml({
  firstName,
  verifyUrl,
  logoUrl,
  appUrl,
  preheader,
  expiresInHours,
  supportEmail,
}: {
  firstName: string;
  verifyUrl: string;
  logoUrl: string;
  appUrl: string;
  preheader: string;
  expiresInHours: number;
  supportEmail: string;
}): string {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(verifyUrl);
  const safeLogo = escapeHtml(logoUrl);
  const safeApp = escapeHtml(appUrl);
  const safeSupport = escapeHtml(supportEmail);

  // Color tokens (must be hex/rgb — many clients drop hsl()/CSS vars).
  const bg = "#f3efe8"; // warm parchment page background
  const card = "#ffffff"; // body card
  const hero = "#0f0f12"; // editorial near-black hero
  const heroAccent = "#1a1a20";
  const ink = "#1a1a1f"; // primary text
  const muted = "#6b6a73"; // secondary text
  const hairline = "#e9e4dc"; // soft divider
  const gold = "#d99a2b"; // brand amber-gold (hex of hsl(42 88% 60%))
  const goldDark = "#b67d18";
  const goldSoft = "#fff7e6";

  // 600px max-width, table-based layout.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Confirm your email — KR Restaurant</title>
<style>
  /* These mostly help web clients that respect <style>; everything also has inline styles. */
  @media only screen and (max-width: 620px) {
    .kr-container { width: 100% !important; }
    .kr-px { padding-left: 24px !important; padding-right: 24px !important; }
    .kr-py { padding-top: 32px !important; padding-bottom: 32px !important; }
    .kr-hero-py { padding-top: 36px !important; padding-bottom: 36px !important; }
    .kr-h1 { font-size: 24px !important; line-height: 30px !important; }
    .kr-btn a { display: block !important; width: 100% !important; box-sizing: border-box !important; }
  }
  a { text-decoration: none; }
  a:hover { opacity: 0.92; }
  .kr-link { color: ${gold}; text-decoration: underline; }
</style>
</head>
<body style="margin:0;padding:0;background:${bg};color:${ink};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!-- Preheader (hidden inbox preview text) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${bg};">
    ${escapeHtml(preheader)} &nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Outer container -->
        <table role="presentation" class="kr-container" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">

          <!-- Hero band -->
          <tr>
            <td class="kr-hero-py kr-px"
              style="background:${hero};background-image:linear-gradient(135deg, ${hero} 0%, ${heroAccent} 60%, #232026 100%);
                     border-radius:18px 18px 0 0;padding:44px 44px 40px 44px;text-align:left;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:14px;vertical-align:middle;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:44px;height:44px;background:#ffffff;border-radius:11px;text-align:center;vertical-align:middle;">
                                <img src="${safeLogo}" alt="KR" width="36" height="36"
                                  style="display:inline-block;border:0;outline:none;text-decoration:none;width:36px;height:36px;border-radius:8px;vertical-align:middle;object-fit:contain;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;line-height:1.1;">
                            KR Restaurant
                          </div>
                          <div style="font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:500;color:#a8a4ac;letter-spacing:0.16em;text-transform:uppercase;margin-top:4px;">
                            POS &amp; Management
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr><td style="height:36px;line-height:36px;font-size:0;">&nbsp;</td></tr>

                <tr>
                  <td>
                    <div style="font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;color:${gold};letter-spacing:0.22em;text-transform:uppercase;">
                      Verify your email
                    </div>
                    <h1 class="kr-h1" style="margin:12px 0 0 0;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:30px;line-height:36px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
                      One last step,<br />${safeName}.
                    </h1>
                    <p style="margin:14px 0 0 0;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14.5px;line-height:22px;color:#c7c4cc;max-width:440px;">
                      Confirm this email address so we can activate your KR Restaurant
                      workspace and keep your account secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td class="kr-py kr-px"
              style="background:${card};padding:44px 44px 36px 44px;border-radius:0 0 18px 18px;">

              <p style="margin:0 0 14px 0;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:${ink};">
                Hi ${safeName},
              </p>
              <p style="margin:0 0 22px 0;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:${ink};">
                Welcome aboard. We just need to make sure this inbox really belongs to
                you. Click the button below to verify your email and unlock the full
                KR workspace — orders, inventory, payments, the lot.
              </p>

              <!-- Bulletproof button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="kr-btn" style="margin:8px 0 6px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${safeUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="22%" stroke="f" fillcolor="${gold}">
                      <w:anchorlock/>
                      <center style="color:#1a1306;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:-0.01em;">
                        Verify my email
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${safeUrl}"
                      style="display:inline-block;background:${gold};background-image:linear-gradient(180deg, ${gold} 0%, ${goldDark} 100%);
                             color:#1a1306;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;
                             letter-spacing:-0.01em;line-height:1;text-decoration:none;
                             padding:16px 28px;border-radius:11px;
                             box-shadow:0 1px 0 0 rgba(255,255,255,0.25) inset, 0 8px 20px -10px rgba(217,154,43,0.55);
                             border:1px solid ${goldDark};">
                      Verify my email &nbsp;→
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 8px 0;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:20px;color:${muted};">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 26px 0;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:12px;line-height:20px;color:${ink};word-break:break-all;">
                <a href="${safeUrl}" class="kr-link" style="color:${gold};text-decoration:underline;">${safeUrl}</a>
              </p>

              <!-- Soft expiry/security card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:${goldSoft};border:1px solid #f1e3bd;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:top;padding-right:12px;">
                          <!-- small clock glyph (text fallback) -->
                          <div style="width:26px;height:26px;background:${gold};border-radius:7px;color:#1a1306;
                                      font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;
                                      text-align:center;line-height:26px;">i</div>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:${ink};letter-spacing:-0.005em;line-height:1.3;">
                            This link expires in ${expiresInHours} hours.
                          </div>
                          <div style="margin-top:4px;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:18px;color:${muted};">
                            For your security, you can request a new one anytime from the app.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
                <tr><td style="height:1px;line-height:1px;font-size:0;background:${hairline};">&nbsp;</td></tr>
              </table>

              <p style="margin:24px 0 0 0;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12.5px;line-height:20px;color:${muted};">
                If you did not create a KR Restaurant account, you can safely ignore this
                email — no account will be activated without verification.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 24px 8px 24px;text-align:center;">
              <div style="font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:${muted};">
                Need a hand? Email
                <a href="mailto:${safeSupport}" class="kr-link" style="color:${gold};text-decoration:underline;">${safeSupport}</a>
              </div>
              <div style="margin-top:14px;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:18px;color:${muted};letter-spacing:0.02em;">
                © ${new Date().getFullYear()} KR Restaurant · POS &amp; Management
              </div>
              <div style="margin-top:6px;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:18px;color:${muted};">
                <a href="${safeApp}" class="kr-link" style="color:${muted};text-decoration:underline;">${safeApp.replace(/^https?:\/\//, "")}</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
