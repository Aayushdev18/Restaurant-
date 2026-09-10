import React, { useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import { data } from "../restApi.json";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { api } from "../api";
import { orderDishMessage, whatsappUrl } from "../restaurant";

const MenuPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [diet, setDiet] = useState("All");
  const [orderDish, setOrderDish] = useState(null);
  const [orderForm, setOrderForm] = useState({ customerName: "", phone: "", pickupTime: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const categories = ["All", "Breakfast", "Lunch", "Dinner"];

  const filteredDishes = useMemo(() => {
    return data[0].dishes.filter((dish) => {
      const categoryOk = activeCategory === "All" || dish.category === activeCategory;
      const dietOk = diet === "All" || dish.diet === diet;
      return categoryOk && dietOk;
    });
  }, [activeCategory, diet]);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!orderDish) return;
    try {
      setSubmitting(true);
      const { data: result } = await api.post("/orders", {
        dishTitle: orderDish.title,
        price: orderDish.price,
        ...orderForm,
      });
      toast.success(result.message);
      window.open(whatsappUrl(orderDishMessage(orderDish)), "_blank", "noopener,noreferrer");
      setOrderDish(null);
      setOrderForm({ customerName: "", phone: "", pickupTime: "", notes: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not place the order. Start the API with npm run dev.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <section className="menuPage">
        <div className="container">
          <div className="heading_section">
            <h1 className="heading">OUR MENU</h1>
            <p>
              Prices in rupees. Order is saved in the kitchen, then WhatsApp opens so you can confirm pickup.
            </p>
            <button type="button" className="printMenuBtn no-print" onClick={() => window.print()}>
              Print / save PDF
            </button>
          </div>

          <div className="category_tabs no-print">
            {categories.map((category) => (
              <button
                key={category}
                className={`tab ${activeCategory === category ? "active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="category_tabs diet_tabs no-print">
            {["All", "Veg", "Non-veg"].map((option) => (
              <button
                key={option}
                className={`tab ${diet === option ? "active" : ""}`}
                onClick={() => setDiet(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="menu_items_container">
            {filteredDishes.length === 0 ? (
              <p className="no-dishes">No dishes in this filter.</p>
            ) : (
              filteredDishes.map((dish) => (
                <div className="menu_card" key={dish.id}>
                  <div className="image_wrapper">
                    <img src={dish.image} alt={dish.title} />
                    {dish.seasonal ? <span className="seasonal_badge">Seasonal</span> : null}
                  </div>
                  <div className="content_wrapper">
                    <h3>{dish.title}</h3>
                    <div className="menu_meta">
                      <span className="category">{dish.category}</span>
                      <span className={`diet ${dish.diet === "Veg" ? "veg" : "nonveg"}`}>
                        {dish.diet}
                      </span>
                      <span className="spice">{dish.spice}</span>
                    </div>
                    <p className="description">{dish.description}</p>
                    {dish.chefNote ? <p className="chef_note">Chef&apos;s note: {dish.chefNote}</p> : null}
                    <p className="allergens">Allergens: {dish.allergens.join(", ")}</p>
                    <div className="price_wrapper">
                      <span className="price">₹{dish.price.toLocaleString("en-IN")}</span>
                      <button type="button" className="orderBtn no-print" onClick={() => setOrderDish(dish)}>
                        <FaWhatsapp /> Order
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="menu_disclaimer">
            Allergen information is provided in good faith. Cross-contact is possible in a small
            kitchen. GST extra where applicable.
          </p>
        </div>
      </section>
      {orderDish && (
        <div className="order_modal no-print" role="dialog" aria-modal="true">
          <form className="order_sheet" onSubmit={submitOrder}>
            <h2>Order {orderDish.title}</h2>
            <p>₹{orderDish.price.toLocaleString("en-IN")} · saved to the kitchen</p>
            <input
              required
              placeholder="Your name"
              value={orderForm.customerName}
              onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
            />
            <input
              required
              placeholder="Phone"
              value={orderForm.phone}
              onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
            />
            <input
              type="time"
              aria-label="Pickup time"
              value={orderForm.pickupTime}
              onChange={(e) => setOrderForm({ ...orderForm, pickupTime: e.target.value })}
            />
            <textarea
              placeholder="Notes"
              value={orderForm.notes}
              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
            />
            <div className="order_actions">
              <button type="button" onClick={() => setOrderDish(null)}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Send to kitchen"}
              </button>
            </div>
          </form>
        </div>
      )}
      <Footer />
    </>
  );
};

export default MenuPage;
