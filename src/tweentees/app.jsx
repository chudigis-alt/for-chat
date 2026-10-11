"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  ArrowRight,
  Shirt,
  Award,
  Truck,
  FileText,
  Image as ImageIcon,
  Send,
  CheckCircle,
  MapPin,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Music2,
} from "lucide-react";
import { api, money, date, randomToken } from "./api";
import { Action, Field, Notice, Table, PageTitle, useAction } from "./common";
import Admin from "./admin";
const Context = createContext();
export const useTween = () => useContext(Context);
const stored = (key, fallback) => {
  try {
    return JSON.parse(sessionStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};
function Provider({ children }) {
  const [catalog, setCatalog] = useState(null),
    [error, setError] = useState(""),
    [cart, setCart] = useState(() => stored("tween-inquiry", [])),
    [customer, setCustomer] = useState(() => stored("tween-customer", {})),
    [notes, setNotes] = useState(() => stored("tween-notes", ""));
  const refresh = async () => {
    try {
      const value = await api("/catalog");
      setCatalog(value);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    const next = JSON.stringify(cart);
    if (sessionStorage.getItem("tween-inquiry") !== next)
      sessionStorage.removeItem("tween-submit");
    sessionStorage.setItem("tween-inquiry", next);
  }, [cart]);
  useEffect(() => {
    sessionStorage.setItem("tween-customer", JSON.stringify(customer));
  }, [customer]);
  useEffect(() => {
    sessionStorage.setItem("tween-notes", JSON.stringify(notes));
  }, [notes]);
  return (
    <Context.Provider
      value={{
        catalog,
        error,
        refresh,
        cart,
        setCart,
        customer,
        setCustomer,
        notes,
        setNotes,
        records: catalog?.records || [],
        settings: catalog?.settings,
        uploadLimitMB: catalog?.upload_limit_mb || 10,
      }}
    >
      {children}
    </Context.Provider>
  );
}
const links = [
  ["/", "Home"],
  ["/customize", "Customize Product"],
  ["/how-it-works", "How It Works"],
  ["/size-charts", "Size Chart"],
  ["/about", "About Us"],
  ["/contact", "Contact"],
];
function Logo() {
  const { settings } = useTween();
  return (
    <Link to="/" aria-label="TweenTees home">
      <img
        className="tt-logo"
        src={settings?.logo || "/tweentees/logo.webp"}
        alt="TWEENTEES"
      />
    </Link>
  );
}
function Header() {
  const [open, setOpen] = useState(false),
    loc = useLocation(),
    { cart } = useTween();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.search]);
  return (
    <header className="tt-header">
      <div className="tt-header-inner">
        <button
          className="menu-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="tt-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <Logo />
        <nav
          id="tt-nav"
          className={open ? "open" : ""}
          aria-label="Main navigation"
        >
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Action to="/customize" light>
          <span className="desktop-label">Customize Now</span>
          <span className="mobile-label">Customize</span>
        </Action>
        <Link
          className="header-icon"
          to="/inquiry"
          aria-label={"Inquiry bag, " + cart.length + " items"}
        >
          <ShoppingCart />
          <span>{cart.length || ""}</span>
        </Link>
        <Link
          className="header-icon"
          to="/admin"
          aria-label="Administrator login"
        >
          <User />
        </Link>
      </div>
    </header>
  );
}
function Footer() {
  const { settings: s } = useTween();
  return (
    <footer className="tt-footer">
      <Logo />
      <p>
        Custom sportswear for teams, events,
        <br />
        and athletes. Your design. Our craft.
      </p>
      <div>
        <strong>Quick Links</strong>
        <div className="footer-links">
          {links.map(([to, label]) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <strong>Get in Touch</strong>
        <p>
          <MapPin size={14} />
          {s.address}
        </p>
        <a href={"mailto:" + s.email}>
          <Mail size={14} />
          {s.email}
        </a>
        <a href={"tel:" + s.phone.replaceAll(" ", "")}>
          <Phone size={14} />
          {s.phone}
        </a>
      </div>
      <div className="footer-socials">
        {[
          ["facebook", Facebook],
          ["instagram", Instagram],
          ["tiktok", Music2],
        ].map(
          ([key, Icon]) =>
            s[key] && (
              <a
                key={key}
                href={s[key]}
                aria-label={"TweenTees on " + key}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={"/tweentees/social-" + key + ".webp"}
                  alt=""
                  width="24"
                  height="24"
                />
              </a>
            ),
        )}
      </div>
      <Link to="/admin">
        <User size={18} />
        Admin Login
      </Link>
    </footer>
  );
}
function CategoryCards() {
  const { records } = useTween();
  return (
    <div className="category-grid">
      {records
        .filter((r) => r.kind === "category")
        .sort(
          (a, b) =>
            ["running", "cycling", "basketball", "teamwear"].indexOf(a.id) -
            ["running", "cycling", "basketball", "teamwear"].indexOf(b.id),
        )
        .map((c) => (
          <Link
            to={"/customize?category=" + c.id}
            className="category-card"
            key={c.id}
          >
            <picture>
              <source media="(max-width:700px)" srcSet={c.image} />
              <img
                src={c.desktop_image || c.image}
                alt={c.name + " custom sportswear"}
                loading="lazy"
              />
            </picture>
            <div>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <span>
                View Products <ArrowRight size={17} />
              </span>
            </div>
          </Link>
        ))}
    </div>
  );
}
function SectionHeading({ children, to, label }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      <span />
      {to && (
        <Link to={to}>
          <span className="desktop-label">{label}</span>
          <span className="mobile-label">
            {label === "View All Products" ? "View All" : label}
          </span>
          <ArrowRight size={18} />
        </Link>
      )}
    </div>
  );
}
function Process() {
  const { settings } = useTween();
  const icons = [Shirt, FileText, ImageIcon, Send];
  return (
    <div className="process-grid">
      {settings.steps.map((s, i) => {
        const Icon = icons[i];
        return (
          <div className="process-step" key={i}>
            <b className="step-number">0{i + 1}</b>
            <span className="step-icon">
              <Icon />
              <span className="mobile-step-number">
                {i === 0 ? 1 : i === 2 ? 2 : 3}
              </span>
            </span>
            <div>
              <strong className="desktop-step-title">{s.title}</strong>
              <strong className="mobile-step-title">
                {i === 0 ? "Choose" : i === 2 ? "Customize" : "Submit"}
              </strong>
              <p>{s.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Fabrics({ full = false }) {
  const { records } = useTween();
  return (
    <div className="fabric-grid">
      {records
        .filter((r) => r.kind === "fabric")
        .map((f) => (
          <article className="fabric-card" key={f.id}>
            <img
              src={f.image}
              alt={f.name + " fabric texture"}
              loading="lazy"
            />
            <div>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <p className="fabric-tags">
                <Shirt size={18} />
                {f.id === "ripstop"
                  ? "Running Singlet · Running Shirt"
                  : "T-Shirt · Podium Shirt · Pickle Ball Shirt"}
              </p>
              {full && <Link to="/customize">Customize a product →</Link>}
            </div>
          </article>
        ))}
    </div>
  );
}
function Home() {
  const { settings } = useTween();
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">{settings.tagline}</p>
          <h1 className="desktop-hero-title">{settings.hero_title}</h1>
          <h1 className="mobile-hero-title">
            {settings.mobile_title || "CUSTOM SPORTSWEAR"}
          </h1>
          <p className="desktop-hero-description">
            {settings.hero_description}
          </p>
          <p className="mobile-hero-description">
            {settings.mobile_description || "Made for your team."}
          </p>
          <Action to="/customize">Customize Now</Action>
          <div className="benefits">
            <span>
              <Award />
              Premium
              <br />
              quality
            </span>
            <span>
              <Shirt />
              Full
              <br />
              customization
            </span>
            <span>
              <Truck />
              Nationwide
              <br />
              shipping
            </span>
          </div>
        </div>
        <picture>
          <source
            media="(max-width: 700px)"
            srcSet={settings.mobile_hero_image || "/tweentees/mobile-hero.webp"}
          />
          <img
            src={settings.hero_image || "/tweentees/hero.webp"}
            alt="Custom TweenTees running singlet, cycling jersey and basketball jersey"
            fetchPriority="high"
          />
        </picture>
        <p className="hero-caption">
          Sportswear
          <br />
          built for
          <br />
          bigger
          <br />
          stories.
        </p>
      </section>
      <div className="tt-container home-sections">
        <SectionHeading to="/customize" label="View All Products">
          Shop by category
        </SectionHeading>
        <CategoryCards />
        <div className="desktop-fabrics">
          <SectionHeading to="/fabrics" label="View All Fabrics">
            Our fabrics
          </SectionHeading>
          <Fabrics />
        </div>
        <SectionHeading to="/how-it-works" label="View Details">
          How it works
        </SectionHeading>
        <Process />
      </div>
      <section className="chart-banner">
        <div>
          <h2>Size Chart</h2>
          <p>
            View detailed size charts for all products to find your perfect fit.
          </p>
        </div>
        <Action to="/size-charts" light>
          View Size Chart
        </Action>
      </section>
    </>
  );
}
function Catalog() {
  const { records } = useTween(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("name");
  const category = params.get("category") || "",
    categories = records.filter((r) => r.kind === "category"),
    selected = categories.find((c) => c.id === category);
  let products = records.filter(
    (r) =>
      r.kind === "product" &&
      (!category || r.category === category) &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  );
  products = products.sort((a, b) =>
    sort === "price-up"
      ? a.price - b.price
      : sort === "price-down"
        ? b.price - a.price
        : a.name.localeCompare(b.name),
  );
  return (
    <>
      <PageTitle
        title={selected ? selected.name : "Customize Your Product"}
        description={
          selected
            ? selected.description
            : "Choose a category to start customizing your apparel."
        }
        breadcrumb={
          <>
            <Link to="/">Home</Link> › Customize Product{" "}
            {selected && " › " + selected.name}
          </>
        }
      />
      <div className="tt-container tt-section">
        {!category && <CategoryCards />}
        <div className="catalog-toolbar">
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(e) =>
                setParams(e.target.value ? { category: e.target.value } : {})
              }
            >
              <option value="">All products</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
            />
          </label>
          <label>
            Sort
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="price-up">Price: low to high</option>
              <option value="price-down">Price: high to low</option>
            </select>
          </label>
        </div>
        <h2>{selected ? selected.name + " Products" : "All Products"}</h2>
        <div className="product-grid">
          {products.map((p) => (
            <Link key={p.id} className="product-card" to={"/customize/" + p.id}>
              <img src={p.image} alt={p.name} loading="lazy" />
              <div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <strong>{money(p.price)}</strong>
                <span>
                  Customize <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!products.length && (
          <Notice>
            No products match your selection. Try another search or category.
          </Notice>
        )}
      </div>
    </>
  );
}
function Customize() {
  const { records, cart, setCart, uploadLimitMB } = useTween(),
    loc = useLocation(),
    nav = useNavigate(),
    productId = loc.pathname.split("/")[2],
    product = records.find((r) => r.id === productId && r.kind === "product"),
    [fabric, setFabric] = useState(""),
    [quantities, setQuantities] = useState({}),
    [design, setDesign] = useState("assistance"),
    [upload, setUpload] = useState(null),
    [notes, setNotes] = useState(""),
    [image, setImage] = useState(0),
    [mobileSize, setMobileSize] = useState("M"),
    action = useAction();
  useEffect(() => {
    setFabric(product?.fabrics[0] || "");
    setQuantities(
      window.innerWidth <= 700
        ? { [product?.sizes.includes("M") ? "M" : product?.sizes[0] || "M"]: 1 }
        : {},
    );
    setMobileSize(
      product?.sizes.includes("M") ? "M" : product?.sizes[0] || "M",
    );
    setUpload(null);
    setImage(0);
  }, [productId, product?.id]);
  if (!product) return <NotFound />;
  const qty = Object.values(quantities).reduce((s, n) => s + n, 0),
    selectedFabric = records.find((f) => f.id === fabric),
    setQuantity = (size, n) =>
      setQuantities((q) => ({ ...q, [size]: Math.min(1000, Math.max(0, n)) }));
  const add = () =>
    action.run(async () => {
      if (!qty) throw Error("Select at least one size and quantity.");
      if (design === "upload" && !upload)
        throw Error("Upload a design or request design assistance.");
      setCart([
        ...cart,
        {
          key: crypto.randomUUID(),
          product: product.id,
          fabric,
          quantities,
          design,
          upload,
          notes,
        },
      ]);
      nav("/inquiry");
    });
  return (
    <>
      <div className="customize-title">
        <PageTitle
          title={"Customize " + product.name}
          description="Choose your specifications and submit your design."
          breadcrumb={
            <>
              <Link to="/">Home</Link> ›{" "}
              <Link to="/customize">Customize Product</Link> › {product.name}
            </>
          }
        />
      </div>
      <div className="tt-container customize-grid">
        <div className="product-gallery">
          <div className="mobile-product-heading">
            <p className="eyebrow">
              {records.find((r) => r.id === product.category)?.name}
            </p>
            <h1>{product.name}</h1>
            <strong>{money(product.price)}</strong>
            <p>{product.description}</p>
          </div>
          <img
            className="main-product"
            src={product.images?.[image] || product.image}
            alt={product.name}
          />
          <div className="thumbnails">
            {(product.images || [product.image]).map((src, i) => (
              <button
                key={src}
                onClick={() => setImage(i)}
                aria-label={"View " + product.name + " image " + (i + 1)}
                aria-pressed={image === i}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="customize-options">
          <section className="tt-panel numbered">
            <span className="number-circle">1</span>
            <h2>Fabric</h2>
            <p>Choose the fabric for your {product.name.toLowerCase()}.</p>
            {product.fabrics.map((f) => {
              const record = records.find((r) => r.id === f);
              return (
                record && (
                  <label
                    className={
                      "fabric-option" + (fabric === f ? " selected" : "")
                    }
                    key={f}
                  >
                    <input
                      type="radio"
                      name="fabric"
                      value={f}
                      checked={fabric === f}
                      onChange={() => setFabric(f)}
                    />
                    <img src={record.image} alt="" />
                    <span>
                      <strong>{record.name}</strong>
                      <small>{record.description}</small>
                    </span>
                  </label>
                )
              );
            })}
          </section>
          <section className="tt-panel numbered">
            <span className="number-circle">2</span>
            <h2>Sizes & Quantity</h2>
            <p>
              Select the sizes and quantity for your order.{" "}
              <Link to="/size-charts">Size Chart</Link>
            </p>
            <div className="mobile-size-picker">
              <div className="mobile-size-buttons">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    aria-pressed={mobileSize === size}
                    onClick={() => {
                      setMobileSize(size);
                      if (!quantities[size]) setQuantity(size, 1);
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="mobile-quantity">
                <span>Quantity</span>
                <button
                  onClick={() =>
                    setQuantity(mobileSize, (quantities[mobileSize] || 0) - 1)
                  }
                  aria-label={"Decrease selected size"}
                >
                  −
                </button>
                <input
                  aria-label={"Selected size quantity"}
                  type="number"
                  min="0"
                  max="1000"
                  value={quantities[mobileSize] || 0}
                  onChange={(e) =>
                    setQuantity(mobileSize, Number(e.target.value) || 0)
                  }
                />
                <button
                  onClick={() =>
                    setQuantity(mobileSize, (quantities[mobileSize] || 0) + 1)
                  }
                  aria-label={"Increase selected size"}
                >
                  +
                </button>
              </div>
            </div>
            <div className="quantity-grid">
              {product.sizes.map((size) => (
                <div className="quantity-card" key={size}>
                  <strong>{size}</strong>
                  <div>
                    <button
                      onClick={() =>
                        setQuantity(size, (quantities[size] || 0) - 1)
                      }
                      aria-label={"Decrease " + size}
                    >
                      −
                    </button>
                    <input
                      aria-label={size + " quantity"}
                      type="number"
                      min="0"
                      max="1000"
                      value={quantities[size] || 0}
                      onChange={(e) =>
                        setQuantity(size, Number(e.target.value) || 0)
                      }
                    />
                    <button
                      onClick={() =>
                        setQuantity(size, (quantities[size] || 0) + 1)
                      }
                      aria-label={"Increase " + size}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="tt-panel numbered">
            <span className="number-circle">3</span>
            <h2>Design</h2>
            <p>Upload your own design or request design assistance.</p>
            <div className="design-options">
              {[
                [
                  "upload",
                  "Upload Design",
                  `PNG, JPG or PDF (Max ${uploadLimitMB}MB)`,
                ],
                [
                  "assistance",
                  "Request Design Assistance",
                  "Don’t have a design yet? Our team can help.",
                ],
              ].map(([v, title, desc]) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="design"
                    checked={design === v}
                    onChange={() => setDesign(v)}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                </label>
              ))}
            </div>
            {design === "upload" && (
              <Field label="Design file">
                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  disabled={action.busy}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setUpload(null);
                    if (file)
                      action.run(async () => {
                        if (file.size > uploadLimitMB * 1024 * 1024)
                          throw Error(
                            `Choose a file no larger than ${uploadLimitMB} MB.`,
                          );
                        const data = new FormData();
                        data.set("file", file);
                        data.set("purpose", "design");
                        setUpload(
                          await api("/uploads", { method: "POST", body: data }),
                        );
                      });
                  }}
                />
              </Field>
            )}
            {upload && design === "upload" && (
              <Notice>
                Design file uploaded.{" "}
                <a
                  href={upload.url + "?token=" + upload.token}
                  target="_blank"
                  rel="noreferrer"
                >
                  View file
                </a>
              </Notice>
            )}
          </section>
          <section className="tt-panel numbered">
            <span className="number-circle">4</span>
            <Field
              label="Additional Notes (Optional)"
              textarea
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add special instructions, color preferences, or other details…"
            />
            <small>{notes.length}/500</small>
          </section>
        </div>
        <aside className="tt-panel order-summary">
          <h2>Order Summary</h2>
          <div className="summary-product">
            <img src={product.image} alt="" />
            <div>
              <h3>{product.name}</h3>
              <p>Fabric: {selectedFabric?.name}</p>
              <p>
                Design:{" "}
                {design === "upload" ? "Custom Design" : "Design Assistance"}
              </p>
              <Link to="/customize">Change Selection</Link>
            </div>
            <strong>
              {money(product.price)}
              <small>per piece</small>
            </strong>
          </div>
          <Table>
            <thead>
              <tr>
                <th>Size</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {product.sizes.map((size) => (
                <tr key={size}>
                  <td>{size}</td>
                  <td>{quantities[size] || 0}</td>
                  <td>{money(product.price)}</td>
                  <td>{money(product.price * (quantities[size] || 0))}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="summary-total">
            <strong>Estimated Total</strong>
            <strong>{money(qty * product.price)}</strong>
            <span>Total Quantity: {qty} pcs</span>
          </div>
          <Notice error>{action.error}</Notice>
          <Action disabled={action.busy} onClick={add}>
            {action.busy ? "Please wait…" : "Add to Inquiry"}
          </Action>
          <p className="small centered">
            Our team will review your inquiry and contact you through your
            provided information.
          </p>
        </aside>
      </div>
    </>
  );
}
function Inquiry() {
  const { cart, setCart, records, notes, setNotes } = useTween();
  let total = 0,
    qty = 0;
  return (
    <>
      <PageTitle
        title="Inquiry Summary"
        description="Review your selected items and quantities before submitting your inquiry."
      />
      <div className="tt-container inquiry-layout">
        {!cart.length ? (
          <section className="empty-state">
            <ShoppingCart size={42} />
            <h2>Your inquiry bag is empty.</h2>
            <p>Choose a product and tell us how you’d like to customize it.</p>
            <Action to="/customize">Choose Product</Action>
          </section>
        ) : (
          <>
            <div>
              {cart.map((item, i) => {
                const p = records.find((r) => r.id === item.product),
                  fabric = records.find((r) => r.id === item.fabric),
                  quantity = Object.values(item.quantities).reduce(
                    (s, n) => s + n,
                    0,
                  );
                total += (p?.price || 0) * quantity;
                qty += quantity;
                return (
                  <section className="tt-panel inquiry-item" key={item.key}>
                    <div className="summary-product">
                      <img src={p?.image} alt="" />
                      <div>
                        <h2>{p?.name || "Product unavailable"}</h2>
                        <p>
                          {fabric?.name} ·{" "}
                          {item.design === "upload"
                            ? "Custom design uploaded"
                            : "Design assistance requested"}
                        </p>
                        <p>{item.notes}</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setCart(cart.filter((_, n) => n !== i))}
                      >
                        Remove
                      </button>
                    </div>
                    <Table>
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Quantity</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(item.quantities)
                          .filter(([, n]) => n > 0)
                          .map(([size, n]) => (
                            <tr key={size}>
                              <td>{size}</td>
                              <td>
                                <input
                                  type="number"
                                  aria-label={
                                    (p?.name || "Product") +
                                    " " +
                                    size +
                                    " quantity"
                                  }
                                  min={0}
                                  max={1000}
                                  value={n}
                                  onChange={(e) =>
                                    setCart(
                                      cart.map((x, k) =>
                                        k !== i
                                          ? x
                                          : {
                                              ...x,
                                              quantities: {
                                                ...x.quantities,
                                                [size]: Math.max(
                                                  0,
                                                  Math.min(
                                                    1000,
                                                    Number(e.target.value) || 0,
                                                  ),
                                                ),
                                              },
                                            },
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td>{money((p?.price || 0) * n)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                    <Link to={"/customize/" + item.product}>
                      Customize another configuration →
                    </Link>
                  </section>
                );
              })}
            </div>
            <aside className="tt-panel">
              <h2>Order Summary</h2>
              <div className="summary-total">
                <span>Total Quantity</span>
                <strong>{qty} pcs</strong>
                <span>Estimated Total Amount</span>
                <strong>{money(total)}</strong>
              </div>
              <p className="small">
                This is an estimate, not a paid order. Shipping and final
                quotation will be confirmed by our team.
              </p>
              <Field
                label="Additional Notes (Optional)"
                textarea
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Action to="/inquiry/review">Next: Customer Information</Action>
              <Link className="continue-link" to="/customize">
                Add another product
              </Link>
            </aside>
          </>
        )}
      </div>
    </>
  );
}
function Review() {
  const { cart, records, customer, setCustomer, notes, setNotes, setCart } =
      useTween(),
    action = useAction(),
    nav = useNavigate(),
    [reviewing, setReviewing] = useState(false);
  if (!cart.length) return <Inquiry />;
  const update = (key, value) => setCustomer((v) => ({ ...v, [key]: value }));
  const submit = (e) => {
    e.preventDefault();
    if (!reviewing) {
      setReviewing(true);
      return;
    }
    action.run(async () => {
      let reference = stored("tween-submit", null);
      if (!reference) {
        reference = {
          idempotency_key: crypto.randomUUID(),
          access_token: randomToken(),
        };
        sessionStorage.setItem("tween-submit", JSON.stringify(reference));
      }
      const result = await api("/inquiries", {
        method: "POST",
        body: {
          ...reference,
          customer,
          notes,
          website: "",
          items: cart.map((x) => ({ ...x })),
        },
      });
      sessionStorage.setItem(
        "tween-receipt",
        JSON.stringify({
          id: result.inquiry.id,
          token: reference.access_token,
        }),
      );
      setCart([]);
      setCustomer({});
      setNotes("");
      nav("/inquiry/submitted");
    });
  };
  return (
    <>
      <PageTitle
        title={reviewing ? "Review Your Order" : "Customer Information"}
        description={
          reviewing
            ? "Please check your selections and details before submitting."
            : "Tell us about your team or event so we can prepare your custom design."
        }
      />
      <div className="tt-container inquiry-layout">
        <section className="tt-panel">
          <h2>Review Your Order</h2>
          {cart.map((item) => {
            const p = records.find((r) => r.id === item.product);
            return (
              <div className="review-item" key={item.key}>
                <img src={p?.image} alt="" />
                <div>
                  <h3>{p?.name || "Unavailable product"}</h3>
                  <p>{records.find((r) => r.id === item.fabric)?.name}</p>
                  <p>
                    {Object.entries(item.quantities)
                      .filter(([, n]) => n > 0)
                      .map(([s, n]) => s + " — " + n + " pcs")
                      .join(", ")}
                  </p>
                  <p>
                    {item.design === "upload"
                      ? "Design file uploaded"
                      : "Design assistance requested"}
                  </p>
                </div>
              </div>
            );
          })}
          <Link to="/inquiry">Edit selections</Link>
        </section>
        <form className="tt-panel" onSubmit={submit}>
          <h2>
            {reviewing ? "Confirm Your Information" : "Customer Information"}
          </h2>
          <p>Please provide your details so we can process your inquiry.</p>
          {[
            ["name", "Full Name", "text", "Enter your full name"],
            ["phone", "Contact Number", "tel", "e.g. 0910 123 4567"],
            ["email", "Email Address", "email", "yourname@email.com"],
            [
              "team",
              "Organization / Team Name (Optional)",
              "text",
              "Team, company, school or event",
            ],
            ["location", "Location", "text", "Your city or province"],
          ].map(([key, label, type, placeholder]) => (
            <Field
              key={key}
              label={label}
              type={type}
              required={key !== "team"}
              maxLength={key === "phone" ? 30 : key === "email" ? 200 : 150}
              minLength={key === "name" ? 2 : undefined}
              value={customer[key] || ""}
              readOnly={reviewing}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              autoComplete={
                key === "name"
                  ? "name"
                  : key === "email"
                    ? "email"
                    : key === "phone"
                      ? "tel"
                      : undefined
              }
            />
          ))}
          <Field label="Preferred Contact Method">
            <select
              required
              disabled={reviewing}
              value={customer.contact || ""}
              onChange={(e) => update("contact", e.target.value)}
            >
              <option value="">Select preferred contact method</option>
              <option>Phone</option>
              <option>Email</option>
            </select>
          </Field>
          <Field
            label="Additional Notes (Optional)"
            textarea
            readOnly={reviewing}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {reviewing && (
            <Notice>
              Submitting saves an inquiry for review. Payment and production are
              arranged after your quotation is confirmed.
            </Notice>
          )}
          <Notice error>{action.error}</Notice>
          <div className="form-actions">
            {reviewing ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setReviewing(false)}
              >
                Edit Information
              </button>
            ) : (
              <Link to="/inquiry">Back</Link>
            )}
            <Action type="submit" disabled={action.busy}>
              {action.busy
                ? "Submitting…"
                : reviewing
                  ? "Submit Inquiry"
                  : "Review & Submit"}
            </Action>
          </div>
        </form>
      </div>
    </>
  );
}
function Submitted() {
  const [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    reference = stored("tween-receipt", null);
  const load = () => {
    if (reference)
      api("/inquiry-details", { method: "POST", body: reference })
        .then(setResult)
        .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  if (!reference)
    return (
      <>
        <PageTitle title="Inquiry Details" />
        <div className="tt-container tt-section">
          <Notice>
            This browser does not have an inquiry access key. Contact TweenTees
            with your saved reference for assistance.
          </Notice>
          <Action to="/contact">Contact Us</Action>
        </div>
      </>
    );
  return (
    <div className="tt-container confirmation">
      <CheckCircle size={60} />
      <h1>Inquiry Submitted!</h1>
      <p>
        Thank you for reaching out to TWEENTEES.
        <br />
        We’ve received your inquiry and will get back to you as soon as
        possible.
      </p>
      <Notice error>{error}</Notice>
      {error && <button onClick={load}>Retry</button>}
      {result ? (
        <>
          <div className="tt-panel receipt-reference">
            <span>
              Reference Number<strong>{result.inquiry.reference}</strong>
            </span>
            <span>
              Date Submitted<strong>{date(result.inquiry.created)}</strong>
            </span>
            <span>
              Status<strong>{result.inquiry.status}</strong>
            </span>
          </div>
          <div className="form-actions">
            <Action onClick={() => setShow(!show)}>
              {show ? "Hide" : "View"} Inquiry Details
            </Action>
            <Action to="/" light>
              Back to Home
            </Action>
          </div>
          {show && (
            <section className="tt-panel left">
              <h2>Order Summary</h2>
              {result.inquiry.items.map((item, i) => (
                <div key={i}>
                  <h3>{item.name}</h3>
                  <p>{item.fabric}</p>
                  <p>{item.notes}</p>
                  <p>
                    {Object.entries(item.quantities)
                      .filter(([, n]) => n > 0)
                      .map(([s, n]) => s + " — " + n + " pcs")
                      .join(", ")}
                  </p>
                  <p>
                    {item.design === "upload"
                      ? "Design file uploaded"
                      : "Design assistance requested"}
                  </p>
                </div>
              ))}
              <p>
                Estimated Total:{" "}
                <strong>{money(result.inquiry.estimate)}</strong>
              </p>
              <p>{result.inquiry.notes}</p>
              <h3>Inquiry History</h3>
              {result.history.map((h, i) => (
                <p key={i}>
                  {date(h.created)} · {h.status} · {h.note}
                </p>
              ))}
            </section>
          )}
          <div className="tt-panel left">
            <h2>What’s Next?</h2>
            <h3>1. Review of Inquiry</h3>
            <p>
              Our team will check your design, specifications, and quantity.
            </p>
            <h3>2. We Will Contact You</h3>
            <p>
              You will receive a message regarding the quotation and other
              details.
            </p>
            <h3>3. Confirmation & Production</h3>
            <p>
              Once confirmed, we will proceed with the production of your custom
              apparel.
            </p>
            <Link to="/contact">Need to make changes? Contact us →</Link>
          </div>
        </>
      ) : (
        <p role="status">Loading your inquiry…</p>
      )}
    </div>
  );
}
function SizeCharts() {
  const { records } = useTween(),
    charts = records.filter((r) => r.kind === "chart"),
    [selected, setSelected] = useState("t-shirt"),
    chart = charts.find((c) => c.id === selected) || charts[0];
  return (
    <>
      <PageTitle
        title="Size Charts"
        description="Find the perfect fit for your team."
      />
      <div className="tt-container narrow tt-section">
        <div className="tabs" role="group" aria-label="Size charts">
          {charts.map((c) => (
            <button
              key={c.id}
              aria-pressed={chart?.id === c.id}
              className={chart?.id === c.id ? "active" : ""}
              onClick={() => setSelected(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {chart ? (
          <section className="tt-panel">
            <h2>{chart.name} Size Chart</h2>
            <Table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest (cm)</th>
                  <th>Length (cm)</th>
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((r) => (
                  <tr key={r.size}>
                    <td>{r.size}</td>
                    <td>{r.chest}</td>
                    <td>{r.length}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Notice>{chart.note}</Notice>
            <p>
              For product-specific measurements not listed here, contact our
              team before confirming your order.
            </p>
            <Action to="/contact">Ask About Sizing</Action>
          </section>
        ) : (
          <Notice>
            Size charts are being updated. Contact our team for measurements.
          </Notice>
        )}
      </div>
    </>
  );
}
function About() {
  const { settings } = useTween();
  return (
    <>
      <PageTitle title="About Us" />
      <div className="tt-container about-page">
        <img
          src={settings.about_image || "/tweentees/about.webp"}
          alt="TWEENTEES — Your design. Our craft."
        />
        <h1>
          Built for teams,
          <br />
          athletes, and events.
        </h1>
        <p>{settings.about}</p>
        <div className="about-benefits">
          {[
            [
              "Premium Quality",
              "Durable and comfortable materials for peak performance.",
            ],
            [
              "Custom Designs",
              "Your vision, our craft. Full customization for a unique look.",
            ],
            [
              "Team Focus",
              "Made for teams, athletes, and organizations of all sizes.",
            ],
            ["Fast Turnaround", "Reliable production and timely delivery."],
          ].map(([title, desc]) => (
            <article key={title}>
              <CheckCircle />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
        <Action to="/customize">Customize Now</Action>
      </div>
    </>
  );
}
function Contact() {
  const { settings } = useTween(),
    action = useAction(),
    [sent, setSent] = useState(false);
  return (
    <>
      <PageTitle
        title="Contact Us"
        description="We’re here to help! Send us a message and we’ll get back to you as soon as possible."
      />
      <div className="tt-container contact-layout">
        <div>
          <h2>Get in Touch</h2>
          <p>
            <Mail />
            <a href={"mailto:" + settings.email}>{settings.email}</a>
          </p>
          <p>
            <Phone />
            <a href={"tel:" + settings.phone.replaceAll(" ", "")}>
              {settings.phone}
            </a>
          </p>
          <p>
            <MapPin />
            {settings.address}
          </p>
        </div>
        <form
          className="tt-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              b = Object.fromEntries(new FormData(form));
            action.run(async () => {
              await api("/contact", { method: "POST", body: b });
              setSent(true);
              form.reset();
            });
          }}
        >
          <h2>Send us a message</h2>
          <p>
            Fill out the form below and we’ll get back to you as soon as
            possible.
          </p>
          <Field
            label="Name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
          <Field
            label="Message"
            name="message"
            textarea
            required
            maxLength={3000}
          />
          <div className="honeypot" aria-hidden="true">
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <Notice error>{action.error}</Notice>
          <Notice>
            {sent
              ? "Your message was saved. Our team will review it and reply using your email."
              : ""}
          </Notice>
          <Action disabled={action.busy}>
            {action.busy ? "Sending…" : "Send Message"}
          </Action>
        </form>
      </div>
    </>
  );
}
function Gallery() {
  const { records } = useTween(),
    items = records.filter((r) => r.kind === "gallery");
  return (
    <>
      <PageTitle
        title="Gallery"
        description="Custom apparel from our studio."
      />
      <div className="tt-container tt-section product-grid">
        {items.map((i) => (
          <article className="product-card" key={i.id}>
            <img src={i.image} alt={i.name} />
            <h2>{i.name}</h2>
            <p>{i.description}</p>
          </article>
        ))}
        {!items.length && (
          <Notice>
            Our gallery is being prepared. Browse the apparel catalog to start
            your design.
          </Notice>
        )}
      </div>
    </>
  );
}
function NotFound() {
  return (
    <div className="tt-container empty-state">
      <h1>Page not found.</h1>
      <p>The page or product may have moved or is no longer available.</p>
      <Action to="/">Back to Home</Action>
    </div>
  );
}
function Shell() {
  const { catalog, error, refresh } = useTween(),
    loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = loc.pathname.startsWith("/admin")
      ? "Admin | TweenTees"
      : loc.pathname === "/"
        ? "TweenTees — Your Design. Our Craft."
        : loc.pathname
            .split("/")
            .filter(Boolean)
            .map((p) => p.replaceAll("-", " "))
            .join(" · ") + " | TweenTees";
  }, [loc.pathname]);
  if (loc.pathname.startsWith("/admin")) return <Admin />;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {catalog && <Header />}
      <main id="main">
        {error ? (
          <div className="tt-container empty-state">
            <Notice error>{error}</Notice>
            <button onClick={refresh}>Retry</button>
          </div>
        ) : !catalog ? (
          <div className="empty-state" role="status">
            Loading TweenTees…
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/customize" element={<Catalog />} />
            <Route path="/customize/:productId" element={<Customize />} />
            <Route path="/inquiry" element={<Inquiry />} />
            <Route path="/inquiry/review" element={<Review />} />
            <Route path="/inquiry/submitted" element={<Submitted />} />
            <Route path="/size-charts" element={<SizeCharts />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/fabrics"
              element={
                <>
                  <PageTitle title="Our Fabrics" />
                  <div className="tt-container tt-section">
                    <Fabrics full />
                  </div>
                </>
              }
            />
            <Route
              path="/how-it-works"
              element={
                <>
                  <PageTitle
                    title="How It Works"
                    description="Your design. Our craft. From your first idea to your custom apparel."
                  />
                  <div className="tt-container tt-section">
                    <Process />
                    <Action to="/customize">Start Customizing</Action>
                  </div>
                </>
              }
            />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
      {catalog && <Footer />}
    </>
  );
}
export default function TweenTees() {
  return (
    <BrowserRouter>
      <Provider>
        <Shell />
      </Provider>
    </BrowserRouter>
  );
}
