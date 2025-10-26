import React from 'react';
import { data } from '../restApi.json';
import Navbar from '../components/Navbar';

const MenuPage = () => {
  return (
    <>
      <Navbar />
      <section className='menuPage'>
        <div className="container">
          <div className="heading_section">
            <h1 className="heading">OUR MENU</h1>
            <p>Discover our complete selection of delicious dishes, crafted with passion and served with excellence.</p>
          </div>
          
          <div className="menu_items_container">
            {data[0].dishes.map((dish) => (
              <div className="menu_card" key={dish.id}>
                <div className="image_wrapper">
                  <img src={dish.image} alt={dish.title} />
                </div>
                <div className="content_wrapper">
                  <h3>{dish.title}</h3>
                  <span className="category">{dish.category}</span>
                  <div className="price_wrapper">
                    <span className="price">${dish.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default MenuPage;
