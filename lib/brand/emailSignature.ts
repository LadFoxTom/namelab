import { BrandPalette } from './palette';
import { DesignBrief } from './strategist';

export interface EmailSignatureAsset {
  filename: string;
  buffer: Buffer;
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getVisualPrimary(palette: BrandPalette): string {
  const lum = hexLuminance(palette.primary);
  if (lum > 0.85) return palette.accent && hexLuminance(palette.accent) < 0.8 ? palette.accent : palette.dark;
  if (lum < 0.05) return palette.accent && hexLuminance(palette.accent) > 0.1 ? palette.accent : palette.dark;
  return palette.primary;
}

export function generateEmailSignature(
  palette: BrandPalette,
  domainName: string,
  brief?: DesignBrief
): EmailSignatureAsset[] {
  const brandName = brief?.brandName || domainName.charAt(0).toUpperCase() + domainName.slice(1);
  const visPrimary = getVisualPrimary(palette);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${palette.dark};">
  <tr>
    <td style="padding-right: 16px; vertical-align: top; border-right: 3px solid ${visPrimary};">
      <!-- Replace src with your hosted logo URL -->
      <img src="https://${domainName}.com/logo.png" alt="${brandName}" width="60" height="60" style="display: block; border-radius: 4px;" />
    </td>
    <td style="padding-left: 16px; vertical-align: top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size: 15px; font-weight: bold; color: ${palette.dark}; padding-bottom: 2px;">
            Your Name
          </td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #6B7280; padding-bottom: 8px;">
            Job Title
          </td>
        </tr>
        <tr>
          <td style="border-top: 1px solid #E5E7EB; padding-top: 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size: 12px; color: #6B7280; padding-bottom: 3px;">
                  <a href="mailto:hello@${domainName}.com" style="color: ${visPrimary}; text-decoration: none;">hello@${domainName}.com</a>
                </td>
              </tr>
              <tr>
                <td style="font-size: 12px; color: #6B7280; padding-bottom: 3px;">
                  +1 (555) 000-0000
                </td>
              </tr>
              <tr>
                <td style="font-size: 12px;">
                  <a href="https://${domainName}.com" style="color: ${visPrimary}; text-decoration: none; font-weight: bold;">${domainName}.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return [
    { filename: 'email-signature.html', buffer: Buffer.from(html) },
  ];
}
