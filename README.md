# Alien Sprung Spiel 🚀

Ein browser-basiertes 2D Jump-n-Run Spiel mit einem Alien-Charakter, der durch endlose Level springt und Hindernisse überwindet.

![Alien Sprung Spiel](https://img.shields.io/badge/Status-Spielbereit-brightgreen)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow)
![Responsive](https://img.shields.io/badge/Design-Responsive-blue)

## 🎮 Spielbeschreibung

Das Alien Sprung Spiel ist ein endloser Plattformsprung-Titel, bei dem der Spieler einen Alien-Charakter steuert, der automatisch läuft und über Stachel-Hindernisse springen muss. Das Spiel bietet:

- **Endloses Gameplay**: Prozedural generierte Level mit steigender Schwierigkeit
- **Physik-Engine**: Realistische Sprung- und Gravitationsmechanik
- **Power-ups**: Sammelbare Pilze für zusätzliche Leben und Punkte
- **Touch-Unterstützung**: Vollständig kompatibel mit Tablets und Smartphones
- **Responsive Design**: Passt sich verschiedenen Bildschirmgrößen an
- **Deutsche Lokalisierung**: Vollständig ins Deutsche übersetzte Benutzeroberfläche

## 🕹️ Steuerung

- **Springen**: Leertaste, Pfeil nach oben, Mausklick oder Touch
- **Pausieren**: P-Taste
- **Neustarten**: R-Taste (nach Game Over)
- **Automatisches Laufen**: Der Charakter läuft kontinuierlich vorwärts

## 🛠️ Technische Architektur

Das Spiel wurde mit **Kiro IDE** entwickelt und folgt einer modularen Architektur:

### Kern-Komponenten

- **GameEngine**: Zentrale Spielschleife mit 60 FPS
- **Renderer**: Canvas-basiertes Rendering mit Kamera-System
- **PhysicsEngine**: Gravitation, Kollisionserkennung und Bewegungsphysik
- **LevelManager**: Endlose Level-Generierung mit Sprungbarkeits-Validierung
- **InputHandler**: Plattformübergreifende Eingabeverarbeitung

### Spiel-Entitäten

- **AlienCharacter**: Spieler-Charakter mit Animationen und Zustandsverwaltung
- **SpikeObstacle**: Gefährliche Hindernisse mit visuellen Effekten
- **Mushroom**: Sammelbare Power-ups mit Floating-Animationen

### Technologie-Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API
- **Audio**: Web Audio API (bereit für Erweiterung)
- **Persistierung**: LocalStorage für Highscores
- **Build-Tool**: Kiro IDE für Entwicklung und Spezifikation

## 📁 Projektstruktur

```
alien-sprung-spiel/
├── index.html              # Haupt-HTML-Datei
├── game.js                 # Kern-Spiellogik (3400+ Zeilen)
├── styles.css              # Responsive Styling
├── integration-tests.html  # Automatisierte Tests
├── .kiro/                  # Kiro IDE Spezifikationen
│   └── specs/
│       └── alien-jump-game/
│           ├── requirements.md  # Anforderungsspezifikation
│           ├── design.md       # Architektur-Design
│           └── tasks.md        # Implementierungsplan
├── README.md               # Diese Datei
└── LICENSE                 # BSD-3-Clause Lizenz
```

## 🚀 Installation & Ausführung

### Lokale Ausführung

1. Repository klonen:
```bash
git clone <repository-url>
cd alien-sprung-spiel
```

2. Lokalen Server starten:
```bash
# Mit Python
python3 -m http.server 8000

# Mit Node.js
npx serve .

# Mit PHP
php -S localhost:8000
```

3. Browser öffnen: `http://localhost:8000`

### Direkte Ausführung

Das Spiel kann auch direkt durch Öffnen der `index.html` in einem modernen Browser gespielt werden.

## 🎯 Spielmechanik

### Kern-Gameplay

- **Automatisches Laufen**: Der Alien läuft konstant mit 3 Pixeln/Frame vorwärts
- **Sprung-Physik**: Variable Sprunghöhe basierend auf realistischer Physik
- **Kollisionssystem**: Präzise Kollisionserkennung mit Unverwundbarkeits-Frames
- **Kamera-System**: Smooth-Following Kamera mit Parallax-Hintergrund

### Level-System

- **Endlose Generierung**: Prozedural generierte Hindernisse
- **Sprungbarkeits-Validierung**: Algorithmus stellt sicher, dass alle Hindernisse überwindbar sind
- **Schwierigkeits-Skalierung**: Graduelle Erhöhung der Herausforderung
- **Level-Progression**: Alle 1000 Pixel wird ein neues Level erreicht

### Power-up System

- **Boden-Pilze**: Standardmäßige Sammelobjekte (50 Punkte, +1 Leben)
- **Schwebende Pilze**: Seltene, wertvollere Varianten (75 Punkte, +1 Leben)
- **Partikel-Effekte**: Visuelle Feedback-Systeme für Sammelaktionen

## 🧪 Testing

Das Spiel enthält eine umfassende Test-Suite:

```bash
# Integration Tests ausführen
open integration-tests.html
```

### Test-Kategorien

- **Gameplay-Flow**: Vollständige Spielablauf-Tests
- **Kollisionssystem**: Physik und Kollisionserkennung
- **Level-Generierung**: Sprungbarkeits-Validierung
- **Performance**: FPS und Rendering-Optimierung
- **Input-System**: Plattformübergreifende Eingabe-Tests

## 🎨 Visuelle Features

### Rendering-System

- **Parallax-Scrolling**: Mehrschichtige Hintergrund-Animation
- **Planeten-System**: Dynamische Weltraum-Atmosphäre mit Ringen
- **Partikel-Effekte**: Staub, Funken und Sammel-Animationen
- **Screen-Shake**: Feedback-Effekte bei Kollisionen

### Animationen

- **Charakter-Animationen**: Laufen, Springen, Fallen mit Frame-basierten Sprites
- **Hinderniss-Effekte**: Pulsierender Glow und Gefahr-Indikatoren
- **UI-Animationen**: Touch-Feedback und Statusübergänge

## 📊 Performance

- **Ziel-FPS**: 60 FPS konstant
- **Optimierungen**: Objekt-Pooling, Culling, Delta-Time-basierte Updates
- **Memory Management**: Automatische Bereinigung alter Objekte
- **Responsive**: Skaliert auf verschiedene Bildschirmgrößen

## 🔧 Entwicklung mit Kiro

Dieses Spiel wurde vollständig mit **Kiro IDE** entwickelt, einem KI-gestützten Entwicklungsumgebung:

### Kiro-Features verwendet:

- **Spezifikations-getriebene Entwicklung**: Strukturierte Requirements, Design und Tasks
- **Iterative Implementierung**: 30+ Tasks systematisch abgearbeitet
- **Code-Generierung**: KI-unterstützte Implementierung komplexer Systeme
- **Testing-Integration**: Automatisierte Test-Generierung und -Validierung
- **Refactoring**: Kontinuierliche Code-Verbesserung und Optimierung

### Entwicklungsprozess:

1. **Requirements Engineering**: EARS-konforme Anforderungsspezifikation
2. **Architektur-Design**: Komponentenbasierte Systemarchitektur
3. **Task-Planung**: Granulare Implementierungsschritte
4. **Iterative Entwicklung**: Schrittweise Feature-Implementierung
5. **Testing & Validierung**: Kontinuierliche Qualitätssicherung

## 🌍 Lokalisierung

Das Spiel ist vollständig ins Deutsche lokalisiert:

- **UI-Elemente**: Alle Menüs und Anzeigen
- **Spielnachrichten**: Status-Updates und Feedback
- **Steuerungshinweise**: Touch- und Tastatur-Anleitungen
- **Fehlermeldungen**: Benutzerfreundliche deutsche Texte

## 🤝 Beitragen

Beiträge sind willkommen! Bitte beachten Sie:

1. Fork des Repositories
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

## 📝 Lizenz

Dieses Projekt steht unter der BSD-3-Clause Lizenz. Siehe `LICENSE` Datei für Details.

## 🙏 Danksagungen

- **Kiro IDE**: Für die revolutionäre KI-gestützte Entwicklungsumgebung
- **HTML5 Canvas**: Für die mächtige 2D-Rendering-API
- **Open Source Community**: Für Inspiration und Best Practices

## 📞 Kontakt

Bei Fragen oder Feedback zum Spiel, öffnen Sie bitte ein Issue in diesem Repository.

---

**Entwickelt mit ❤️ und Kiro IDE**