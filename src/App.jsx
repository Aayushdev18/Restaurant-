import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Pages/Home';
import Notfound from './Pages/Notfound';
import Success from './Pages/Success';
import MenuPage from './Pages/MenuPage';
import Kitchen from './Pages/Kitchen';
import ScrollToTop from './components/ScrollToTop';

const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/menu' element={<MenuPage/>}/>
          <Route path='/success' element={<Success/>}/>
          <Route path='/kitchen' element={<Kitchen/>}/>
          <Route path='*' element={<Notfound/>}/>
        </Routes>
        <Toaster/>
        <ScrollToTop/>
      </Router>
    </>
  );
};

export default App