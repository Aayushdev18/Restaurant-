import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Pages/Home';
import Notfound from './Pages/Notfound';
import Succes from './Pages/Succes';

const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/success' element={<Succes/>}/>
          <Route path='*' element={<Notfound/>}/>
        </Routes>
        <Toaster/>
      </Router>
    </>
  );
};

export default App