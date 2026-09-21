import { Outlet, Link } from "react-router-dom";
import Brand from "../components/ui/Brand";
export default function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Main navigation">
          <a className="public-anchor" href="/#platform">
            Platform
          </a>
          <a className="public-anchor" href="/#how-it-works">
            How It Works
          </a>
          <a className="public-anchor" href="/#about">
            About
          </a>
          <Link to="/login">Login</Link>
          <Link className="button button-primary" to="/register">
            Get Started
          </Link>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="public-footer">
        <Brand />
        <p>
          Meteorological training and capacity building
          <br />
          Demonstration environment with synthetic records
        </p>
        <span>Proposed workflows require stakeholder validation</span>
      </footer>
    </>
  );
}
