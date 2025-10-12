import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Button from 'react-bootstrap/Button';

function MyNavBar() {
  const [copied, setCopied] = useState(false);
  const storageKey = 'likedFestivals2026';

  const shareLiked = async () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids || ids.length === 0) {
        // nothing to share
        alert('Du hast noch keine Festivals geliked.');
        return;
      }

      const encoded = ids.map(encodeURIComponent).join(',');
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch (e) {
        // fallback
        window.prompt('Link zum Teilen (kopieren):', url);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Fehler beim Erstellen des Share-Links', e);
      alert('Konnte Link nicht erstellen.');
    }
  };

  return (
    <Navbar expand="lg" className="bg-dark navbar-dark" style={{ position: 'relative', zIndex: 2000 }}>
      <Container>
        <Navbar.Brand href="/">Termininator</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="/festivals">Festivalplaner</Nav.Link>
            <Nav.Link href="/calendar">Kalenderübersicht</Nav.Link>
            <Nav.Link target="_blank" href="https://www.input23.de/impressum.html">Impressum</Nav.Link>

            
            {/*<NavDropdown title="Dropdown" id="basic-nav-dropdown">
              <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
              <NavDropdown.Item href="#action/3.2">
                Another action
              </NavDropdown.Item>
              <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item href="#action/3.4">
                Separated link
              </NavDropdown.Item>
            </NavDropdown>*/}
          </Nav>

          <div className="d-flex align-items-center">
            <Button variant="outline-primary" size="sm" onClick={shareLiked}>
              Teilen
            </Button>
            {copied && <span style={{ marginLeft: 8, color: 'green' }}>kopiert</span>}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default MyNavBar;