import React from 'react';
import { data } from '../restApi.json';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';

const Testimonials = () => {
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<AiFillStar key={i} className="star filled" />);
    }
    
    if (hasHalfStar) {
      stars.push(<AiFillStar key="half" className="star half-filled" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<AiOutlineStar key={`empty-${i}`} className="star empty" />);
    }
    
    return stars;
  };

  return (
    <section className='testimonials' id='testimonials'>
      <div className="container">
        <div className="heading_section">
          <h1 className="heading">WHAT OUR CUSTOMERS SAY</h1>
          <p>Don't just take our word for it - hear from our satisfied customers</p>
        </div>
        <div className="testimonials_container">
          {data[0].testimonials.map((testimonial) => (
            <div className="card" key={testimonial.id}>
              <div className="user_info">
                <img src={testimonial.image} alt={testimonial.userName} />
                <div className="user_details">
                  <h3>{testimonial.userName}</h3>
                  <div className="rating">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
              </div>
              <p className="review_text">{testimonial.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
