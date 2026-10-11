# TweenTees Figma audit

Decoded the supplied tweentees.fig: 17 top-level frames, 2,060 nodes and 34 embedded image entries. Frame text and geometry were inspected. Original embedded screen artwork was inspected and cropped to extract brand/product/fabric assets; cropped assets are used as images, not substitutes for functional UI.

## Business workflow

Made-to-order custom sportswear inquiry and quotation. No online payment or stock deduction is shown. Estimates are recalculated on the server; submission is Pending and unpaid. Production can proceed after manual quotation/confirmation.

## Route mapping

| Figma frame                                         | Implemented route           |
| --------------------------------------------------- | --------------------------- |
| Desktop category selection (1798 × 1012)            | /customize                  |
| Desktop homepage (1524 × 1016)                      | /                           |
| Desktop running singlet customization (1799 × 1012) | /customize/running-singlet  |
| Desktop review order (1801 × 1014)                  | /inquiry/review             |
| Desktop submitted inquiry (1798 × 1012)             | /inquiry/submitted          |
| Desktop admin dashboard (1798 × 1012)               | /admin                      |
| Mobile homepage (1028 × 2108)                       | /                           |
| Mobile running products (1184 × 2104)               | /customize?category=running |
| Mobile singlet product details (1188 × 2111)        | /customize/running-singlet  |
| Mobile inquiry summary (1188 × 2111)                | /inquiry                    |
| Mobile customer information (1185 × 2106)           | /inquiry/review             |
| Mobile submission confirmation (1184 × 2104)        | /inquiry/submitted          |
| Mobile size charts (1185 × 2106)                    | /size-charts                |
| Mobile about (1172 × 2082)                          | /about                      |
| Mobile contact (1169 × 2077)                        | /contact                    |
| Mobile admin login (1171 × 2081)                    | /admin                      |
| Mobile admin dashboard (1172 × 2082)                | /admin                      |

## Tokens and interpretation

Black/white with pale gray borders and surfaces; Arimo regular/bold text. Rounded pill actions, black numbered circles, geometric sportswear artwork. Desktop homepage is 1524 × 1016; mobile frames are scaled source canvases and are translated into responsive layouts rather than literal 1000px mobile widths.

The desktop has six public navigation items, desktop four-column categories, fabric cards and four process steps; mobile uses a centered logo, menu, two-column categories and three condensed steps. Desktop customization shows all six size counters; mobile shows selectable sizes and a quantity control.

Missing error/loading/empty/password-change states follow the same tokens. Admin subpages are inferred from the dashboard navigation; no supplied frame for their complete layouts.

## Conflicts and integration limits

Desktop contact email is twenteesph@gmail.com; mobile shows rodelmarkpontaoy@gmail.com. The user resolved this conflict by supplying rodelmarkpontaoy@gmail.com, phone 0910 143 8872, and the Facebook, Instagram and TikTok profile URLs now used by the editable site settings. The desktop business address is the editable default. Reference numbers and dates in designs are illustrative; actual submissions generate unique references and timestamps. Fabric spelling differs (RIBSTOP/Ripstop); catalog uses Ripstop 90gsm.

No production database, email transport, payment gateway or courier integration has been supplied. Contact and inquiries persist in the database and require manual admin review. No automatic payment verification or email delivery is claimed.

## Owner-requested visual revisions

After reviewing the implementation, the owner requested clearer spacing and removal of the apparel image backgrounds. Homepage hero and category garment images now use transparent edited cutouts on white surfaces; category copy and images occupy separate grid cells, and desktop/mobile layouts were checked again. These revisions intentionally follow the later user direction. Other supplied design assets remain in use.
