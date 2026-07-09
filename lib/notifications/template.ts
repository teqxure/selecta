/**
 * `{{variableName}}` substitution — deliberately simple (no templating
 * engine dependency). A placeholder with no matching variable is left
 * exactly as written rather than throwing or blanking out, so a typo in a
 * Super-Admin-edited template degrades to "visible but wrong" instead of
 * breaking the send entirely.
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
  });
}

/** Wraps rendered body copy in a minimal, mobile-friendly single-column shell — every template shares this, so brand look-and-feel changes happen in one place. */
export function wrapEmailLayout(bodyHtml: string, options: { previewText?: string } = {}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Selecta</title>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${options.previewText ? `<span style="display:none;font-size:1px;color:#faf8f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.previewText}</span>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0b0b0e;padding:24px 32px;">
                <span style="font-size:20px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Selecta<span style="color:#c96123;">.</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#0b0b0e;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #ddd6cc;color:#6b625b;font-size:12px;">
                © ${new Date().getFullYear()} Selecta. No more bending. Just selecting.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
