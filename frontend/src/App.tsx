import { Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Catalog } from './pages/Catalog';
import { About } from './pages/About';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { CheckoutReturn } from './pages/CheckoutReturn';
import { Orders } from './pages/Orders';
import { Sales } from './pages/Sales';
import { SellerDashboard } from './pages/SellerDashboard';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Favorites } from './pages/Favorites';

export function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/carrinho" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/checkout/retorno" element={<ProtectedRoute><CheckoutReturn /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/vendas" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/vender" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/favoritos" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
              <h1 style={{ fontSize: '4rem', color: 'var(--gold-500)' }}>404</h1>
              <p className="muted">Esta página não existe no fórum romano.</p>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
