# Klassenquiz

Öffentliche Teilnehmer- und Spielleiteroberfläche für das Klassenquiz.

Teilnehmen: https://thor-the-dwarf.github.io/klassenquiz/

GitHub Pages veröffentlicht diese statischen HTML-Dateien. Der separate Online-Dienst verarbeitet Räume, Antworten und Punkte. Die Kursleitung startet über ihre lokale Klassenquiz.html; Kursaufgaben werden erst beim Start einer Übung an den Dienst übergeben. Dieses Repository enthält keine Kursbank und keine Zugangsdaten.

## Wissenscluster

Die Home-Ansicht zeigt Cluster als Knoten. Die Zuordnung in `platform/core-clusters.js` verwendet redaktionelle Themenzugehörigkeiten, ausdrücklich benannte Grundlagencluster und geprüfte Core-Abhängigkeiten. Nur die vom Server freigegebenen Cores werden aufgenommen. Gemeinsame Core-IDs erzeugen Cluster-Verbindungen; die Lernstände bleiben identisch.

Cores erscheinen erst im ausgewählten Cluster ab 180 % Zoom. Die Gruppierungsbuttons ordnen Cluster anhand vorhandener Ausbildungsrahmenplan-, Lernfeld- oder Prüfungsteil-Zuordnungen an. Fehlende fachliche Zuordnungen werden als solche angezeigt. Auswahl und Kamera bleiben beim Neuladen erhalten.
