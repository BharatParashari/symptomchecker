import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SymptomChecker from './pages/SymptomChecker';
import Results from './pages/Results';
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorPortal from './pages/DoctorPortal';
import BookDoctor from './pages/BookDoctor';
import Appointments from './pages/Appointments';
import ChatRoom from './pages/ChatRoom';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="check" element={<SymptomChecker />} />
        <Route path="results" element={<Results />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="doctor" element={<DoctorPortal />} />
        <Route path="book" element={<BookDoctor />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="chat/:appointmentId" element={<ChatRoom />} />
      </Route>
    </Routes>
  );
}
