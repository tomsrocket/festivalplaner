import React, { useMemo } from 'react';

const IMAGES = [
  '2hVQ2dAFNFk3oTzg9qsH--1--fwmpr.jpg',
  '3SZWCHq6UoU6skVNL2eR--1--5noy1.jpg',
  'AZrnLsMpj3MoyKKCGHYI--1--pb3zf.jpg',
  'FaZudEYCCSdnjbfgI9f4--1--omiyw.jpg',
  'QwRhbUrhcpsovBSRKAJx--1--n4d7p.jpg',
  'aUhETElKAWzAKptmYQGy--1--iw7p7.jpg',
  'ayodfGPKddR8ipWBUaEy--1--kkbqc.jpg',
  'xBxktklCTYcg7GGSPwj7--1--rrjay.jpg',
];

export function Welcome() {
  const [img, setImg] = React.useState<string | null>(null);
  const [bgIndex, setBgIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    const i = Math.floor(Math.random() * IMAGES.length);
    setImg(`/images/logo/${IMAGES[i]}`);
    setBgIndex(Math.floor(Math.random() * 8) + 1); // 1..8
  }, []);

  return (
    <div className="frontpage">
      <div className="context">
        <div className="h1c">
          <h1 className="h1b">Termininator</h1>
          <h1 className="h1a">Termininator</h1>
        </div>
        <center>
          {/*img && <img className="minator" src={img} alt="Termininator" />*/}
          <img className="minator" src="images/logo/termininator-logo3.png" alt="Termininator Logo" />

<div className="instructions">
        Anleitung:
        <ol>
        <li>Wähle im <a href="/festivals">Festivalplaner</a> alle deine Lieblingsfestivals aus (Stern-Symbol links neben dem Namen anklicken)</li>
        <li>Wechsle zur <a href="/calendar">Kalenderübersicht</a> und schau, wie sich die Festivals über das Jahr verteilen.</li>
        <li>Teile deine Auswahl mit Freunden über den Teilen-Button in der Navigationsleiste oben rechts.</li>
        </ol>
</div>
        </center>
      </div>

      <div
        className={`area${bgIndex ? ` bg${bgIndex}` : ''}`}
      >
        <ul className="circles" style={{ pointerEvents: 'none' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i}></li>
          ))}
        </ul>

        
      </div>

    </div>
  );
}
