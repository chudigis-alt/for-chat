import { randomUUID } from "node:crypto";
export const sizes = ["XS", "S", "M", "L", "XL", "2XL"];
export const defaults = {
  hero_image: "/tweentees/hero.webp",
  mobile_hero_image: "/tweentees/mobile-hero.webp",
  logo: "/tweentees/logo.webp",
  about_image: "/tweentees/about.webp",
  business_name: "TWEENTEES",
  tagline: "YOUR DESIGN. OUR CRAFT.",
  hero_title: "CUSTOM\nSPORTSWEAR\nFOR TEAMS, EVENTS,\nAND ATHLETES.",
  hero_description:
    "High-quality, fully customizable sportswear made to represent your team, organization, or personal style.",
  mobile_title: "CUSTOM\nSPORTSWEAR",
  mobile_description: "Made for your team.",
  phone: "0910 143 8872",
  email: "rodelmarkpontaoy@gmail.com",
  facebook: "https://www.facebook.com/TwenteespPH",
  instagram: "https://www.instagram.com/twenteescycling",
  tiktok: "https://www.tiktok.com/@twentees_ph?_r=1&_t=ZS-9ARUraVINAg",
  address: "Lubao, Philippines",
  about:
    "TWEENTEES is a custom sportswear brand dedicated to providing high-quality, stylish, and functional apparel for teams, athletes, and individuals. We turn your designs into performance-ready wear.",
  steps: [
    {
      title: "Choose Product",
      description: "Select the apparel you want to customize.",
    },
    {
      title: "Fill Up Form",
      description: "Provide the necessary details about your order.",
    },
    {
      title: "Upload Design or Request Design Help",
      description: "Send your design or let our team help you create one.",
    },
    {
      title: "Submit Inquiry",
      description:
        "Review and submit your inquiry. We’ll get back to you shortly!",
    },
  ],
};
export async function seed(db) {
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO tt_settings (id,data) VALUES (?,?) ON CONFLICT(id) DO NOTHING",
      ["website", JSON.stringify(defaults)],
    );
    const insert = (id, kind, data) =>
      tx.query(
        "INSERT INTO tt_catalog (id,kind,data) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING",
        [id, kind, JSON.stringify(data)],
      );
    for (const [id, name, description] of [
      ["running", "Running", "Running singlets and speed suits."],
      ["cycling", "Cycling", "Jerseys, bibshorts, and base layers."],
      ["basketball", "Basketball", "Jerseys, shorts, and complete sets."],
      [
        "teamwear",
        "Casual & Teamwear",
        "T-shirts, polo shirts, Chinese collar, warmers.",
      ],
    ])
      await insert(id, "category", {
        name,
        description,
        image: "/tweentees/" + id + ".webp",
        desktop_image: "/tweentees/desktop-" + id + ".webp",
      });
    await insert("ripstop", "fabric", {
      name: "Ripstop 90gsm",
      description:
        "Lightweight, breathable, and durable. Ideal for running apparel.",
      image: "/tweentees/ripstop.webp",
    });
    await insert("polydex", "fabric", {
      name: "Polydex 200gsm / 150gsm",
      description:
        "Good for t-shirt, podium shirts, pickle ball shirts, with shining texture.",
      image: "/tweentees/polydex.webp",
    });
    const products = [
      [
        "running-singlet",
        "Running Singlet",
        "running",
        350,
        "/tweentees/singlet.webp",
      ],
      [
        "running-speed-suit",
        "Running Speed Suit (Top Only)",
        "running",
        400,
        "/tweentees/speed-suit.webp",
      ],
      [
        "polo-shirt",
        "Polo Shirt",
        "teamwear",
        450,
        "/tweentees/product-0.webp",
      ],
      ["warmer", "Warmer", "teamwear", 500, "/tweentees/product-1.webp"],
      [
        "chinese-collar",
        "Chinese Collar",
        "teamwear",
        450,
        "/tweentees/product-2.webp",
      ],
      [
        "basketball-shorts",
        "Basketball Shorts",
        "basketball",
        350,
        "/tweentees/product-3.webp",
      ],
      [
        "basketball-shorts-pocket",
        "Basketball Shorts with Pocket",
        "basketball",
        400,
        "/tweentees/product-4.webp",
      ],
      [
        "basketball-set",
        "Basketball Set (Jersey + Shorts)",
        "basketball",
        650,
        "/tweentees/product-5.webp",
      ],
      [
        "cycling-bibshort",
        "Cycling Bibshort",
        "cycling",
        750,
        "/tweentees/product-6.webp",
      ],
      [
        "cycling-base-layer",
        "Cycling Base Layer",
        "cycling",
        300,
        "/tweentees/product-7.webp",
      ],
    ];
    for (const [id, name, category, price, image] of products)
      await insert(id, "product", {
        name,
        category,
        price: price * 100,
        image,
        description:
          category === "running"
            ? "Lightweight, breathable, and made for peak performance. Designed for running and high-intensity activities."
            : "Fully customizable sportswear for your team, event, or organization.",
        fabrics: [category === "running" ? "ripstop" : "polydex"],
        sizes,
        images:
          id === "running-singlet"
            ? [
                "/tweentees/singlet.webp",
                "/tweentees/singlet-back.webp",
                "/tweentees/singlet-side.webp",
                "/tweentees/singlet-detail.webp",
              ]
            : [image],
      });
    // Only this measurement table is supplied by the design. Other charts must be entered by the owner.
    await insert("t-shirt", "chart", {
      name: "T-Shirt",
      rows: sizes.map((size, i) => ({
        size,
        chest: 46 + i * 2,
        length: 66 + i * 2,
      })),
      note: "Measurements may vary by ±1–2cm due to manual production.",
    });
  });
}
