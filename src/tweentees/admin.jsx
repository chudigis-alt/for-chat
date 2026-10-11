import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Shirt,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { api, money, date, setCsrf } from "./api";
import {
  Action,
  Field,
  Notice,
  PasswordField,
  Table,
  useAction,
} from "./common";
import { useTween } from "./app";
const statuses = [
  "Pending",
  "In Review",
  "Quoted",
  "Confirmed",
  "In Production",
  "Shipped",
  "Completed",
  "Cancelled",
];
const transitions = {
  Pending: ["In Review", "Cancelled"],
  "In Review": ["Quoted", "Cancelled"],
  Quoted: ["In Review", "Confirmed", "Cancelled"],
  Confirmed: ["In Production", "Cancelled"],
  "In Production": ["Shipped", "Completed", "Cancelled"],
  Shipped: ["Completed"],
  Completed: [],
  Cancelled: [],
};
const sections = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["inquiries", "Inquiries", MessageSquare],
  ["products", "Products", Shirt],
  ["orders", "Orders", Shirt],
  ["content", "Website Content", ImageIcon],
  ["gallery", "Gallery", ImageIcon],
  ["customers", "Customers", Users],
  ["categories", "Categories", Shirt],
  ["fabrics", "Fabric Options", Shirt],
  ["charts", "Size Charts", Shirt],
  ["messages", "Messages", MessageSquare],
  ["accounts", "Admin Accounts", Users],
  ["settings", "Settings", Settings],
];
function Status({ children }) {
  return (
    <span
      className={
        "status status-" + String(children).toLowerCase().replaceAll(" ", "-")
      }
    >
      {children}
    </span>
  );
}
function PasswordForm({ initial = false, onChanged }) {
  const action = useAction(),
    [done, setDone] = useState(false);
  return (
    <form
      className="tt-panel password-form"
      onSubmit={(e) => {
        e.preventDefault();
        const b = Object.fromEntries(new FormData(e.currentTarget));
        action.run(async () => {
          if (b.password !== b.confirm)
            throw Error("New passwords do not match.");
          await api("/admin/password", { method: "POST", body: b });
          setDone(true);
          setCsrf("");
          onChanged();
        });
      }}
    >
      <h2>{initial ? "Make Your Account Yours" : "Change Password"}</h2>
      <p>
        {initial
          ? "Replace the temporary password before accessing the dashboard."
          : "Verify your current password and choose a new private password."}
      </p>
      <p className="small">
        Use 12–72 bytes, uppercase and lowercase letters and a number. Avoid
        common passwords and your username.
      </p>
      <PasswordField
        label="Current Password"
        name="current"
        required
        autoComplete="current-password"
        maxLength={72}
      />
      <PasswordField
        label="New Password"
        name="password"
        required
        autoComplete="new-password"
        minLength={12}
        maxLength={72}
      />
      <PasswordField
        label="Confirm New Password"
        name="confirm"
        required
        autoComplete="new-password"
        minLength={12}
        maxLength={72}
      />
      <Notice error>{action.error}</Notice>
      <Notice>
        {done ? "Password updated. Sign in again with your new password." : ""}
      </Notice>
      <Action disabled={action.busy}>
        {action.busy ? "Updating…" : "Change Password"}
      </Action>
    </form>
  );
}
function UploadImage({ value, onChange }) {
  const { uploadLimitMB } = useTween();
  const action = useAction();
  return (
    <div className="image-editor">
      {value && <img src={value} alt="Selected website image" />}
      <Field label="Upload PNG or JPG">
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={action.busy}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file)
              action.run(async () => {
                if (file.size > uploadLimitMB * 1024 * 1024)
                  throw Error(
                    `Choose a file no larger than ${uploadLimitMB} MB.`,
                  );
                const form = new FormData();
                form.set("file", file);
                form.set("purpose", "image");
                const r = await api("/uploads", { method: "POST", body: form });
                onChange(r.url);
              });
          }}
        />
      </Field>
      <Notice error>{action.error}</Notice>
      {action.busy && <p role="status">Uploading…</p>}
    </div>
  );
}
function CatalogManager({ kind, data, changed }) {
  const dialogRef = useRef(null);
  const records = data.records.filter((r) => r.kind === kind),
    [editing, setEditing] = useState(null),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("name"),
    action = useAction();
  useEffect(() => {
    if (editing && dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, [editing]);
  const fresh = () => ({
    id: "",
    kind,
    active: true,
    name: "",
    description: "",
    image: "",
    price: 35000,
    category: data.records.find((r) => r.kind === "category")?.id || "",
    fabrics: data.records
      .filter((r) => r.kind === "fabric")
      .slice(0, 1)
      .map((r) => r.id),
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    rows: [{ size: "M", chest: 50, length: 70 }],
    note: "",
  });
  const update = (key, v) => setEditing((d) => ({ ...d, [key]: v }));
  const filtered = records
    .filter(
      (r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) &&
        (!active || r.active === (active === "active")),
    )
    .sort((a, b) =>
      sort === "price"
        ? (a.price || 0) - (b.price || 0)
        : a.name.localeCompare(b.name),
    );
  useEffect(() => {
    setPage(1);
  }, [query, active]);
  const title = {
    product: "Products",
    category: "Categories",
    fabric: "Fabric Options",
    chart: "Size Charts",
    gallery: "Gallery",
  }[kind];
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>{title}</h1>
          <p>
            Manage published {title.toLowerCase()} and keep your website up to
            date.
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => setEditing(fresh())}
        >
          <Plus size={18} />
          Add {kind === "chart" ? "Size Chart" : kind}
        </button>
      </div>
      <div className="catalog-toolbar">
        <Field label="Search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Status">
          <select value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Unpublished</option>
          </select>
        </Field>
        <Field label="Sort">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Name</option>
            {kind === "product" && <option value="price">Price</option>}
          </select>
        </Field>
      </div>
      <Notice error>{action.error}</Notice>
      <section className="tt-panel">
        <Table>
          <thead>
            <tr>
              <th>{kind === "product" ? "Product" : "Name"}</th>
              {kind === "product" && (
                <>
                  <th>Category</th>
                  <th>Price</th>
                </>
              )}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * 20, page * 20).map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="table-product">
                    {r.image && <img src={r.image} alt="" />}
                    {r.name}
                  </div>
                </td>
                {kind === "product" && (
                  <>
                    <td>
                      {data.records.find((c) => c.id === r.category)?.name}
                    </td>
                    <td>{money(r.price)}</td>
                  </>
                )}
                <td>
                  <Status>{r.active ? "Active" : "Unpublished"}</Status>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditing({ ...r, rows: r.rows?.map((x) => ({ ...x })) })
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="text-button danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete " +
                            r.name +
                            "? Saved inquiry history will be preserved.",
                        )
                      )
                        action.run(async () => {
                          await api("/admin/catalog/" + r.id, {
                            method: "DELETE",
                            body: { version: r.version },
                          });
                          await changed();
                        });
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!filtered.length && <p>No matching records.</p>}
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} · {filtered.length} records
          </span>
          <button
            disabled={page * 20 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>
      {editing && (
        <dialog
          ref={dialogRef}
          onCancel={() => setEditing(null)}
          className="editor-dialog"
          aria-labelledby="editor-title"
        >
          <div className="dialog-backdrop" />
          <form
            className="tt-panel dialog-body"
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                const { id, kind, version, active, ...record } = editing;
                await api("/admin/catalog" + (version ? "/" + id : ""), {
                  method: version ? "PUT" : "POST",
                  body: { id, kind, version, active, data: record },
                });
                await changed();
                setEditing(null);
              });
            }}
          >
            <div className="admin-heading">
              <h2 id="editor-title">
                {editing.version ? "Edit" : "Add"} {kind}
              </h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <Field
              label="Name"
              required
              maxLength={150}
              value={editing.name}
              onChange={(e) => update("name", e.target.value)}
            />
            {!editing.version && (
              <Field
                label="Unique ID (lowercase words separated by hyphens)"
                required
                pattern="([a-z0-9]|-){1,100}"
                maxLength={100}
                value={editing.id}
                onChange={(e) => update("id", e.target.value)}
              />
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => update("active", e.target.checked)}
              />
              Published
            </label>
            {kind !== "chart" && (
              <>
                <Field
                  label="Description"
                  textarea
                  required={kind === "product"}
                  maxLength={3000}
                  value={editing.description || ""}
                  onChange={(e) => update("description", e.target.value)}
                />
                <UploadImage
                  value={editing.image}
                  onChange={(v) => {
                    update("image", v);
                    if (kind === "product") update("images", [v]);
                    if (kind === "category") update("desktop_image", v);
                  }}
                />
              </>
            )}
            {kind === "product" && (
              <>
                <Field
                  label="Unit Price (₱)"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="1000000"
                  value={editing.price / 100}
                  onChange={(e) =>
                    update("price", Math.round(Number(e.target.value) * 100))
                  }
                />
                <Field label="Category">
                  <select
                    required
                    value={editing.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    {data.records
                      .filter((r) => r.kind === "category")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <fieldset>
                  <legend>Available Fabrics</legend>
                  {data.records
                    .filter((r) => r.kind === "fabric")
                    .map((f) => (
                      <label key={f.id} className="check">
                        <input
                          type="checkbox"
                          checked={editing.fabrics.includes(f.id)}
                          onChange={(e) =>
                            update(
                              "fabrics",
                              e.target.checked
                                ? [...editing.fabrics, f.id]
                                : editing.fabrics.filter((id) => id !== f.id),
                            )
                          }
                        />
                        {f.name}
                      </label>
                    ))}
                </fieldset>
                <Field
                  label="Available Sizes (comma separated)"
                  required
                  value={editing.sizes.join(", ")}
                  onChange={(e) =>
                    update(
                      "sizes",
                      e.target.value.split(",").map((s) => s.trim()),
                    )
                  }
                />
              </>
            )}
            {kind === "chart" && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Chest (cm)</th>
                      <th>Length (cm)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editing.rows.map((r, i) => (
                      <tr key={i}>
                        {["size", "chest", "length"].map((k) => (
                          <td key={k}>
                            <input
                              aria-label={k + " row " + (i + 1)}
                              required
                              type={k === "size" ? "text" : "number"}
                              min={k === "size" ? undefined : 1}
                              max={k === "size" ? undefined : 300}
                              value={r[k]}
                              onChange={(e) =>
                                update(
                                  "rows",
                                  editing.rows.map((v, n) =>
                                    n === i
                                      ? {
                                          ...v,
                                          [k]:
                                            k === "size"
                                              ? e.target.value
                                              : Number(e.target.value),
                                        }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              update(
                                "rows",
                                editing.rows.filter((_, n) => n !== i),
                              )
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    update("rows", [
                      ...editing.rows,
                      { size: "", chest: 50, length: 70 },
                    ])
                  }
                >
                  Add Row
                </button>
                <Field
                  label="Measurement Note"
                  textarea
                  maxLength={500}
                  value={editing.note}
                  onChange={(e) => update("note", e.target.value)}
                />
              </>
            )}
            <Notice error>{action.error}</Notice>
            <Action disabled={action.busy}>
              {action.busy ? "Saving…" : "Save " + kind}
            </Action>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
function InquiryManager({ orders = false, searchDefault = "" }) {
  const [search, setSearch] = useState(searchDefault),
    [status, setStatus] = useState(orders ? "Confirmed" : ""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1),
    [results, setResults] = useState(null),
    [selected, setSelected] = useState(null),
    [next, setNext] = useState(""),
    [note, setNote] = useState(""),
    action = useAction();
  const load = () =>
    api(
      "/admin/inquiries?" +
        new URLSearchParams({ search, status, page: String(page), sort }),
    ).then(setResults);
  useEffect(() => {
    const timer = setTimeout(() => action.run(load), 200);
    return () => clearTimeout(timer);
  }, [search, status, page, sort]);
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>{orders ? "Orders & Production" : "Inquiries"}</h1>
          <p>
            {orders
              ? "Manage confirmed custom apparel through production and delivery."
              : "Review customer specifications and respond with your quotation."}
          </p>
        </div>
      </div>
      <div className="catalog-toolbar">
        <Field label="Search">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Reference, name or email"
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Sort">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </Field>
      </div>
      <Notice error>{action.error}</Notice>
      <section className="tt-panel">
        <Table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer Name</th>
              <th>Product</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results?.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reference}</td>
                <td>{r.customer.name}</td>
                <td>{r.items.map((i) => i.name).join(", ")}</td>
                <td>{date(r.created)}</td>
                <td>
                  <Status>{r.status}</Status>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() =>
                      action.run(async () => {
                        const detail = await api("/admin/inquiries/" + r.id);
                        setSelected(detail);
                        setNext("");
                        setNote("");
                      })
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!results ? (
          <p role="status">Loading inquiries…</p>
        ) : !results.rows.length ? (
          <p>No matching inquiries.</p>
        ) : null}
        <div className="pagination">
          <button
            disabled={page === 1 || action.busy}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} · {results?.total || 0} inquiries
          </span>
          <button
            disabled={!results || page * 20 >= results.total || action.busy}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>
      {selected && (
        <section className="tt-panel inquiry-detail">
          <div className="admin-heading">
            <h2>{selected.inquiry.reference}</h2>
            <button
              aria-label="Close inquiry details"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
          </div>
          <h3>Customer Information</h3>
          <p>
            {selected.inquiry.customer.name} · {selected.inquiry.customer.team}
          </p>
          <p>
            <a href={"mailto:" + selected.inquiry.customer.email}>
              {selected.inquiry.customer.email}
            </a>{" "}
            ·{" "}
            <a href={"tel:" + selected.inquiry.customer.phone}>
              {selected.inquiry.customer.phone}
            </a>
          </p>
          <p>
            {selected.inquiry.customer.location} · Preferred contact:{" "}
            {selected.inquiry.customer.contact}
          </p>
          {selected.inquiry.items.map((i, n) => (
            <div key={n} className="tt-panel">
              <h3>{i.name}</h3>
              <p>
                {i.fabric} ·{" "}
                {Object.entries(i.quantities)
                  .filter(([, qty]) => qty > 0)
                  .map(([s, qty]) => s + " — " + qty + " pcs")
                  .join(", ")}
              </p>
              <p>{i.notes}</p>
              <p>
                {money(i.unit_price)} per piece · {money(i.subtotal)}
              </p>
              {i.upload_id ? (
                <a
                  href={"/api/tt/files/" + i.upload_id}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Design
                </a>
              ) : (
                <p>Design assistance requested</p>
              )}
            </div>
          ))}
          <p>
            Estimated total: <strong>{money(selected.inquiry.estimate)}</strong>
            . Final quotation and payment confirmation are arranged manually.
          </p>
          <p>{selected.inquiry.notes}</p>
          <h3>Status History</h3>
          {selected.history.map((h, i) => (
            <p key={i}>
              {date(h.created)} · <Status>{h.status}</Status> {h.note}
            </p>
          ))}
          {transitions[selected.inquiry.status].length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  next === "Cancelled" &&
                  !window.confirm("Cancel this inquiry?")
                )
                  return;
                action.run(async () => {
                  await api("/admin/inquiries/" + selected.inquiry.id, {
                    method: "PUT",
                    body: {
                      status: next,
                      note,
                      version: selected.inquiry.version,
                    },
                  });
                  setSelected(
                    await api("/admin/inquiries/" + selected.inquiry.id),
                  );
                  await load();
                  setNext("");
                  setNote("");
                });
              }}
            >
              <Field label="New Status">
                <select
                  required
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                >
                  <option value="">Choose next status</option>
                  {transitions[selected.inquiry.status].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Customer-visible Status Note"
                textarea
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Notice error>{action.error}</Notice>
              <Action disabled={action.busy}>Update Status</Action>
            </form>
          )}
        </section>
      )}
    </>
  );
}
function ContentEditor({ data, changed }) {
  const [form, setForm] = useState(data.settings),
    action = useAction(),
    [saved, setSaved] = useState(false);
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Website Content</h1>
          <p>Edit your homepage, company information and contact details.</p>
        </div>
      </div>
      <form
        className="tt-panel"
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await api("/admin/settings", { method: "PUT", body: form });
            await changed();
            setForm((f) => ({ ...f, version: f.version + 1 }));
            setSaved(true);
          });
        }}
      >
        <div className="settings-grid">
          {[
            ["business_name", "Business Name"],
            ["tagline", "Brand Promise"],
            ["hero_title", "Homepage Heading"],
            ["hero_description", "Homepage Description"],
            ["mobile_title", "Mobile Homepage Heading"],
            ["mobile_description", "Mobile Homepage Description"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["address", "Business Location"],
            ["about", "About Us"],
            ["facebook", "Facebook Profile URL (Optional)"],
            ["instagram", "Instagram Profile URL (Optional)"],
            ["tiktok", "TikTok Profile URL (Optional)"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              required={!["facebook", "instagram", "tiktok"].includes(key)}
              type={
                ["facebook", "instagram", "tiktok"].includes(key)
                  ? "url"
                  : key === "email"
                    ? "email"
                    : "text"
              }
              textarea={[
                "about",
                "hero_title",
                "mobile_title",
                "hero_description",
              ].includes(key)}
              maxLength={key === "about" ? 3000 : 500}
              value={form[key] || ""}
              onChange={(e) => {
                setSaved(false);
                setForm((v) => ({ ...v, [key]: e.target.value }));
              }}
            />
          ))}
        </div>
        <h2>Branding & Artwork</h2>
        <div className="settings-grid">
          {[
            ["logo", "Logo"],
            ["hero_image", "Desktop Hero Artwork"],
            ["mobile_hero_image", "Mobile Hero Artwork"],
            ["about_image", "About Artwork"],
          ].map(([key, label]) => (
            <section key={key}>
              <h3>{label}</h3>
              <UploadImage
                value={form[key] || ""}
                onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
              />
            </section>
          ))}
        </div>
        <h2>How It Works</h2>
        <div className="settings-grid">
          {form.steps.map((s, i) => (
            <section key={i}>
              <Field
                label={"Step " + (i + 1) + " Title"}
                required
                maxLength={100}
                value={s.title}
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    steps: v.steps.map((x, n) =>
                      n === i ? { ...x, title: e.target.value } : x,
                    ),
                  }))
                }
              />
              <Field
                label="Description"
                textarea
                required
                maxLength={500}
                value={s.description}
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    steps: v.steps.map((x, n) =>
                      n === i ? { ...x, description: e.target.value } : x,
                    ),
                  }))
                }
              />
            </section>
          ))}
        </div>
        <Notice error>{action.error}</Notice>
        <Notice>{saved ? "Website content saved." : ""}</Notice>
        <Action disabled={action.busy}>
          {action.busy ? "Saving…" : "Save Content"}
        </Action>
      </form>
    </>
  );
}
function Dashboard({ data }) {
  const [recent, setRecent] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("/admin/inquiries?page=1")
      .then((d) => setRecent(d.rows.slice(0, 5)))
      .catch((e) => setError(e.message));
  }, [data]);
  const statistics = data.statistics,
    total = Object.values(statistics).reduce((s, n) => s + n, 0);
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Manage your products, inquiries, and website content all in one
            place.
          </p>
        </div>
        <p className="small">{date(Date.now())}</p>
      </div>
      <div className="stats-grid">
        {[
          ["Total Inquiries", total, "All received requests"],
          [
            "Pending Inquiries",
            (statistics.Pending || 0) + (statistics["In Review"] || 0),
            "Needs response",
          ],
          [
            "Completed Inquiries",
            statistics.Completed || 0,
            "Completed requests",
          ],
          [
            "Total Products",
            data.records.filter((r) => r.kind === "product" && r.active).length,
            "Active products",
          ],
        ].map(([name, count, desc]) => (
          <article className="tt-panel" key={name}>
            <span>{name}</span>
            <strong>{count}</strong>
            <small>{desc}</small>
          </article>
        ))}
      </div>
      <Notice error>{error}</Notice>
      <section className="tt-panel">
        <div className="admin-heading">
          <div>
            <h2>Product Management</h2>
            <p>Add, edit, or remove products and set prices.</p>
          </div>
          <Link className="secondary-button" to="/admin/products">
            + Add Product
          </Link>
        </div>
        <Table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price (₱)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.records
              .filter((r) => r.kind === "product")
              .slice(0, 10)
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-product">
                      <img src={p.image} alt="" />
                      {p.name}
                    </div>
                  </td>
                  <td>{data.records.find((c) => c.id === p.category)?.name}</td>
                  <td>{money(p.price)}</td>
                  <td>
                    <Status>{p.active ? "Active" : "Unpublished"}</Status>
                  </td>
                  <td>
                    <Link to="/admin/products">Manage</Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </section>
      <section className="tt-panel">
        <div className="admin-heading">
          <div>
            <h2>Recent Inquiries</h2>
            <p>View and manage customer inquiries.</p>
          </div>
          <Link to="/admin/inquiries">View All →</Link>
        </div>
        <Table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer Name</th>
              <th>Product</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to="/admin/inquiries">{r.reference}</Link>
                </td>
                <td>{r.customer.name}</td>
                <td>{r.items.map((i) => i.name).join(", ")}</td>
                <td>{date(r.created)}</td>
                <td>
                  <Status>{r.status}</Status>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!recent.length && <p>No inquiries received yet.</p>}
      </section>
      <section className="tt-panel">
        <h2>Website Content</h2>
        <p>Manage homepage, banners and other content.</p>
        <div className="quick-grid">
          {[
            ["Homepage Banner", "/admin/content"],
            ["About Us", "/admin/content"],
            ["How It Works", "/admin/content"],
            ["Contact Information", "/admin/content"],
          ].map(([label, to]) => (
            <Link key={label} to={to}>
              {label} →
            </Link>
          ))}
        </div>
      </section>
      <section className="tt-panel">
        <h2>Quick Actions</h2>
        <div className="quick-grid">
          {[
            ["Add Product", "products"],
            ["View Inquiries", "inquiries"],
            ["Upload Gallery", "gallery"],
            ["Manage Size Charts", "charts"],
          ].map(([label, path]) => (
            <Link key={path} to={"/admin/" + path}>
              {label} →
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
function Customers() {
  const [result, setResult] = useState(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    action = useAction();
  useEffect(() => {
    const timer = setTimeout(
      () =>
        action.run(async () =>
          setResult(
            await api(
              "/admin/inquiries?" +
                new URLSearchParams({ page: String(page), search }),
            ),
          ),
        ),
      200,
    );
    return () => clearTimeout(timer);
  }, [search, page]);
  return (
    <>
      <h1>Customers</h1>
      <p>Customer contact details from received inquiries.</p>
      <Field label="Search customers">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Field>
      <Notice error>{action.error}</Notice>
      <section className="tt-panel">
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Team/Event</th>
              <th>Location</th>
              <th>Inquiry</th>
            </tr>
          </thead>
          <tbody>
            {result?.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.customer.name}</td>
                <td>{r.customer.email}</td>
                <td>{r.customer.phone}</td>
                <td>{r.customer.team}</td>
                <td>{r.customer.location}</td>
                <td>{r.reference}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>Page {page}</span>
          <button
            disabled={!result || page * 20 >= result.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </>
  );
}
function Messages() {
  const action = useAction(),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null);
  const load = async () =>
    setResult(
      await api(
        "/admin/messages?" +
          new URLSearchParams({ search: query, status, page: String(page) }),
      ),
    );
  useEffect(() => {
    const timer = setTimeout(() => action.run(load), 200);
    return () => clearTimeout(timer);
  }, [query, status, page]);
  return (
    <>
      <h1>Messages</h1>
      <div className="catalog-toolbar">
        <Field label="Search messages">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {["Unread", "Read", "Replied"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Notice error>{action.error}</Notice>
      {result?.rows.map((m) => (
        <article key={m.id} className="tt-panel">
          <h2>{m.name}</h2>
          <p>
            <a href={"mailto:" + m.email}>{m.email}</a> · {date(m.created)}
          </p>
          <p className="preserve-text">{m.message}</p>
          <Field label="Message Status">
            <select
              value={m.status}
              disabled={action.busy}
              onChange={(e) => {
                const value = e.target.value;
                action.run(async () => {
                  await api("/admin/messages/" + m.id, {
                    method: "PUT",
                    body: { status: value },
                  });
                  await load();
                });
              }}
            >
              {["Unread", "Read", "Replied"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </article>
      ))}
      {result && !result.rows.length && <Notice>No matching messages.</Notice>}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} · {result?.total || 0} messages
        </span>
        <button
          disabled={!result || page * 20 >= result.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
export default function Admin() {
  const loc = useLocation(),
    nav = useNavigate(),
    { refresh } = useTween(),
    [session, setSession] = useState(undefined),
    [data, setData] = useState(null),
    [drawer, setDrawer] = useState(false),
    [message, setMessage] = useState(""),
    [globalSearch, setGlobalSearch] = useState(""),
    action = useAction(),
    section = loc.pathname.split("/")[2] || "dashboard";
  const load = async () => {
    setData(await api("/admin/overview"));
  };
  const changed = async () => {
    await load();
    await refresh();
  };
  useEffect(() => {
    action.run(async () => {
      const s = await api("/admin/session");
      setCsrf(s.csrf);
      setSession(s.username ? s : null);
    });
    const expire = () => {
      setCsrf("");
      setSession(null);
      setData(null);
      nav("/admin");
    };
    window.addEventListener("tween-session-expired", expire);
    return () => window.removeEventListener("tween-session-expired", expire);
  }, []);
  useEffect(() => {
    if (session?.must_change) {
      if (section !== "change-password")
        nav("/admin/change-password", { replace: true });
    } else if (session) {
      action.run(load);
      if (loc.pathname === "/admin") nav("/admin/dashboard", { replace: true });
    } else if (session === null && loc.pathname !== "/admin")
      nav("/admin", { replace: true });
  }, [session]);
  useEffect(() => {
    setDrawer(false);
  }, [section]);
  useEffect(() => {
    if (!session) return;
    const check = () =>
      api("/admin/session")
        .then((s) => {
          if (!s.username) {
            setCsrf("");
            setSession(null);
            setData(null);
            nav("/admin");
          }
        })
        .catch(() => {});
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [session]);
  const passwordChanged = () => {
    setSession(null);
    setData(null);
    setMessage(
      "Password updated. Sign in with your new password. All previous sessions were revoked.",
    );
    nav("/admin");
  };
  if (session === undefined)
    return (
      <div className="admin-login">
        <img src="/tweentees/logo.webp" alt="TWEENTEES" />
        <Notice error>{action.error}</Notice>
        <p role="status">Loading secure login…</p>
        {action.error && (
          <button onClick={() => window.location.reload()}>Retry</button>
        )}
      </div>
    );
  if (!session)
    return (
      <div className="admin-login">
        <Link to="/">
          <img src="/tweentees/logo.webp" alt="TWEENTEES" />
        </Link>
        <form
          className="tt-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const b = Object.fromEntries(new FormData(e.currentTarget));
            action.run(async () => {
              const s = await api("/admin/login", { method: "POST", body: b });
              setCsrf(s.csrf);
              setSession(s);
            });
          }}
        >
          <h1>Admin Login</h1>
          <p>Access your admin dashboard.</p>
          <Notice>{message}</Notice>
          <Field
            label="Username"
            name="username"
            required
            maxLength={100}
            autoComplete="username"
          />
          <PasswordField
            label="Password"
            name="password"
            required
            maxLength={72}
            autoComplete="current-password"
          />
          <Notice error>{action.error}</Notice>
          <Action disabled={action.busy}>
            {action.busy ? "Signing in…" : "Login"}
          </Action>
          <p className="small">
            Forgot your password? Ask the account owner for a secure reset.
          </p>
          <Link to="/">Back to Home</Link>
        </form>
        <small>
          © {new Date().getFullYear()} TWEENTEES. All rights reserved.
        </small>
      </div>
    );
  if (session.must_change)
    return (
      <div className="admin-login">
        <Link to="/">
          <img src="/tweentees/logo.webp" alt="TWEENTEES" />
        </Link>
        <PasswordForm initial onChanged={passwordChanged} />
        <button
          className="secondary-button"
          onClick={() =>
            action.run(async () => {
              await api("/admin/logout", { method: "POST", body: {} });
              setCsrf("");
              setSession(null);
              nav("/admin");
            })
          }
        >
          Logout
        </button>
        <Notice error>{action.error}</Notice>
      </div>
    );
  const managers = {
    products: "product",
    categories: "category",
    fabrics: "fabric",
    charts: "chart",
    gallery: "gallery",
  };
  return (
    <div className="admin-shell">
      <aside className={"admin-sidebar" + (drawer ? " open" : "")}>
        <Link to="/">
          <img src="/tweentees/logo.webp" alt="TWEENTEES" />
        </Link>
        <nav aria-label="Admin navigation">
          {sections.map(([path, label, Icon]) => (
            <Link
              key={path}
              className={section === path ? "active" : ""}
              to={"/admin/" + path}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <p>
          Custom sportswear for teams,
          <br />
          events, and athletes.
        </p>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="menu-button"
            aria-label="Toggle admin navigation"
            aria-expanded={drawer}
            onClick={() => setDrawer(!drawer)}
          >
            <Menu />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nav(
                "/admin/inquiries?search=" + encodeURIComponent(globalSearch),
              );
            }}
          >
            <Search size={18} />
            <input
              type="search"
              aria-label="Search inquiries or customers"
              placeholder="Search inquiries or customers…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </form>
          <span>
            {session.username}
            <small>Administrator</small>
          </span>
          <button
            className="text-button"
            onClick={() =>
              action.run(async () => {
                await api("/admin/logout", { method: "POST", body: {} });
                setCsrf("");
                setSession(null);
                setData(null);
                nav("/admin");
              })
            }
          >
            <LogOut size={16} />
            Logout
          </button>
        </header>
        <main className="admin-content">
          <Notice error>{action.error}</Notice>
          {!data ? (
            <>
              <p role="status">Loading dashboard…</p>
              {action.error && (
                <button onClick={() => action.run(load)}>Retry</button>
              )}
            </>
          ) : managers[section] ? (
            <CatalogManager
              key={section}
              kind={managers[section]}
              data={data}
              changed={changed}
            />
          ) : section === "dashboard" ? (
            <Dashboard data={data} />
          ) : ["inquiries", "orders"].includes(section) ? (
            <InquiryManager
              key={loc.search + section}
              orders={section === "orders"}
              searchDefault={
                new URLSearchParams(loc.search).get("search") || ""
              }
            />
          ) : section === "content" ? (
            <ContentEditor data={data} changed={changed} />
          ) : section === "customers" ? (
            <Customers />
          ) : section === "messages" ? (
            <Messages data={data} changed={changed} />
          ) : ["settings", "change-password"].includes(section) ? (
            <>
              <h1>Account Settings</h1>
              <PasswordForm onChanged={passwordChanged} />
              <section className="tt-panel">
                <h2>Recent Administrative Activity</h2>
                {data.audit.map((a, i) => (
                  <p key={i}>
                    {date(a.created)} · {a.action.replaceAll("_", " ")} ·{" "}
                    {a.entity}
                  </p>
                ))}
              </section>
            </>
          ) : section === "accounts" ? (
            <>
              <h1>Admin Accounts</h1>
              <section className="tt-panel">
                <Table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Password Replacement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((a) => (
                      <tr key={a.id}>
                        <td>{a.username}</td>
                        <td>{a.must_change ? "Required" : "Completed"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <p>
                  Administrator provisioning and recovery require an authorized
                  account owner. There is no public administrator registration.
                </p>
                <Link to="/admin/settings">Change your password</Link>
              </section>
            </>
          ) : (
            <>
              <h1>Page Not Found</h1>
              <Link to="/admin/dashboard">Go to Dashboard</Link>
            </>
          )}
        </main>
      </div>
      <nav className="admin-mobile-tabs" aria-label="Mobile admin navigation">
        {sections
          .filter(([p]) =>
            ["dashboard", "products", "inquiries", "settings"].includes(p),
          )
          .map(([p, label, Icon]) => (
            <Link
              className={section === p ? "active" : ""}
              key={p}
              to={"/admin/" + p}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
      </nav>
    </div>
  );
}
