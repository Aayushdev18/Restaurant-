import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, kitchenApi, kitchenToken } from "../api";

const Kitchen = () => {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(kitchenToken());
  const [tab, setTab] = useState("reservations");
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [store, setStore] = useState("");

  const load = async (authToken = token) => {
    const client = kitchenApi();
    client.defaults.headers.Authorization = `Bearer ${authToken}`;
    const [health, r, o, i] = await Promise.all([
      api.get("/health"),
      client.get("/reservations"),
      client.get("/orders"),
      client.get("/inquiries"),
    ]);
    setStore(health.data.store);
    setReservations(r.data.reservations || []);
    setOrders(o.data.orders || []);
    setInquiries(i.data.inquiries || []);
  };

  useEffect(() => {
    if (!token) return;
    load(token).catch(() => {
      sessionStorage.removeItem("ayushKitchenToken");
      setToken("");
    });
  }, [token]);

  const login = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { password });
      sessionStorage.setItem("ayushKitchenToken", data.token);
      setToken(data.token);
      toast.success("Kitchen unlocked.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed.");
    }
  };

  const patch = async (path, id, status) => {
    try {
      await kitchenApi().patch(`${path}/${id}`, { status });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed.");
    }
  };

  if (!token) {
    return (
      <section className="kitchen">
        <form className="kitchen_login" onSubmit={login}>
          <h1>Kitchen</h1>
          <p>Staff login for reservations, takeaway, and inquiries.</p>
          <input
            type="password"
            placeholder="Kitchen password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Enter</button>
        </form>
      </section>
    );
  }

  return (
    <section className="kitchen">
      <header className="kitchen_bar">
        <h1>Operations</h1>
        <p>{store === "mongodb" ? "MongoDB" : store === "file" ? "Local store" : "Connecting…"}</p>
        <div className="kitchen_tabs">
          {["reservations", "orders", "inquiries"].map((name) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
              type="button"
            >
              {name[0].toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem("ayushKitchenToken");
            setToken("");
          }}
        >
          Log out
        </button>
      </header>

      {tab === "reservations" && (
        <div className="kitchen_table">
          {reservations.length === 0 && <p>No tables yet.</p>}
          {reservations.map((row) => (
            <article key={row.id}>
              <strong>
                {row.firstName} {row.lastName} · {row.partySize} · {row.date} {row.time}
              </strong>
              <p>
                {row.phone} · {row.email} · {row.seating}
              </p>
              {row.notes ? <p>{row.notes}</p> : null}
              <select value={row.status} onChange={(e) => patch("/reservations", row.id, e.target.value)}>
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="seated">seated</option>
                <option value="cancelled">cancelled</option>
              </select>
            </article>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="kitchen_table">
          {orders.length === 0 && <p>No takeaway orders.</p>}
          {orders.map((row) => (
            <article key={row.id}>
              <strong>
                {row.dishTitle} · ₹{row.price} · {row.customerName}
              </strong>
              <p>
                {row.phone}
                {row.pickupTime ? ` · pickup ${row.pickupTime}` : ""}
              </p>
              <select value={row.status} onChange={(e) => patch("/orders", row.id, e.target.value)}>
                <option value="pending">pending</option>
                <option value="preparing">preparing</option>
                <option value="ready">ready</option>
                <option value="cancelled">cancelled</option>
              </select>
            </article>
          ))}
        </div>
      )}

      {tab === "inquiries" && (
        <div className="kitchen_table">
          {inquiries.length === 0 && <p>No lunch / event / gift inquiries.</p>}
          {inquiries.map((row) => (
            <article key={row.id}>
              <strong>{row.type}</strong>
              <p>{row.message}</p>
              <p>
                {row.name} {row.phone}
              </p>
              <select value={row.status} onChange={(e) => patch("/inquiries", row.id, e.target.value)}>
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="closed">closed</option>
              </select>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Kitchen;
