import "../src/tweentees/style.css";
import "../src/tweentees/home.css";
export const metadata = {
  title: {
    default: "TweenTees — Your Design. Our Craft.",
    template: "%s | TweenTees",
  },
  description:
    "Custom sportswear for teams, events and athletes. Choose your apparel, fabric and sizes and request a quotation from TweenTees.",
  icons: { icon: "/tweentees/logo.webp" },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
