# Sistem expert pentru alegerea sportului potrivit

Proiect realizat pe abordare `bias scoring` (actualizata la recomandarea profesorului):
- baza de cunostinte in format `JSON` cu ponderi pe criterii
- interfata web in `HTML/CSS`
- logica de scorare in `JavaScript`

## Structura proiect
- `index.html` - formularul de interactiune cu utilizatorul
- `styles.css` - stilizarea interfetei
- `knowledge-base.json` - baza de cunostinte (sporturi + bias pe criterii)
- `app.js` - motorul de scorare bias + afisarea rezultatului

## Cum functioneaza scorarea
1. Utilizatorul completeaza formularul.
2. Raspunsurile devin fapte initiale.
3. Pentru fiecare raspuns, sistemul aplica bias-ul corespunzator (ponderi) catre sporturi.
4. Scorurile se aduna peste toate criteriile.
5. Sistemul calculeaza procentul de potrivire pentru fiecare sport si afiseaza primele 5 rezultate.
6. In interfata sunt afisate:
   - criteriile aplicate (bias)
   - explicatia pentru recomandarea de pe locul 1
   - top 5 sporturi cu procent de potrivire

## Rulare
Varianta simpla:
1. Din folderul proiectului ruleaza:
   ```bash
   python3 -m http.server 8080
   ```
2. Deschide in browser:
   `http://localhost:8080`

## Exemple de sporturi recomandate
- alergare
- inot
- ciclism
- fotbal
- tenis
- fitness
- drumetii
# proiectSE
# proiectSE
# proiectSE
