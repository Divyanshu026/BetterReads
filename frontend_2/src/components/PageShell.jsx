import Navbar from './Navbar.jsx';
export default function PageShell({ children }) {
  return <div className="min-h-screen bg-background font-sans text-foreground"><Navbar />{children}</div>;
}
