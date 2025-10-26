import React, { useState } from 'react';
import { data } from '../restApi.json';
import Navbar from '../components/Navbar';

const MenuPage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  
  const categories = ['All', 'Breakfast', 'Lunch', 'Dinner'];
  
  const filteredDishes = activeCategory === 'All' 
    ? data[0].dishes 
    : data[0].dishes.filter(dish => dish.category === activeCategory);

  return (
    <>
      <Navbar />
      <section className='menuPage'>
        <div className="container">
          <div className="heading_section">
            <h1 className="heading">OUR MENU</h1>
            <p>Discover our complete selection of delicious dishes, crafted with passion and served with excellence.</p>
          </div>
          
          <div className="category_tabs">
            {categories.map((category) => (
              <button
                key={category}
                className={`tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="menu_items_container">
            {filteredDishes.length === 0 ? (
              <p className="no-dishes">No dishes found in this category.</p>
            ) : (
              filteredDishes.map((dish) => (
                <div className="menu_card" key={dish.id}>
                  <div className="image_wrapper">
                    <img src={dish.image} alt={dish.title} />
                  </div>
                  <div className="content_wrapper">
                    <h3>{dish.title}</h3>
                    <span className="category">{dish.category}</span>
                    <p className="description">{dish.description}</p>
                    <div className="price_wrapper">
                      <span className="price">${dish.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default MenuPage;
