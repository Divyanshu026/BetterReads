import Navbar from './Navbar.jsx';
export default function PageShell({ children }) {
  return <div className="catalog-page"><Navbar />{children}</div>;
}
