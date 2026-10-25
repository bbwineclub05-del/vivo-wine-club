# I video che scorrono in home

Butta i file qui dentro: la riga in home si ricompone da sola, senza
toccare il codice.

- `verticali/` — clip in piedi (9:16, come un reel). La scheda esce alta e stretta.
- `orizzontali/` — clip sdraiate (16:9). La scheda esce bassa e larga.

**La forma della scheda la decide la cartella, non il file.** Se un
video girato in orizzontale finisce in `verticali/` viene tagliato ai
lati, quindi mettilo dove gli corrisponde.

## Come preparare i file

- **Formato**: `.mp4` (H.264). È l'unico che va su tutti i telefoni.
- **Peso**: sotto i 3 MB l'uno. Partono da soli e sono sei o sette in
  fila: un file da 20 MB fa aspettare chi apre il sito col telefono.
- **Audio**: non serve, parte sempre muto. Toglierlo fa risparmiare peso.
- **Durata**: 4–8 secondi. Girano in loop.
- **Nome**: come vuoi, senza spazi strani. L'ordine nella riga segue
  l'ordine alfabetico, quindi `01-festa.mp4`, `02-cantina.mp4` se vuoi
  deciderlo tu.

## La foto di copertina (consigliata)

Accanto al video, un'immagine con **lo stesso nome**:

    verticali/01-festa.mp4
    verticali/01-festa.jpg

Si vede prima che il video parta, e resta ferma lì per chi ha chiesto
al telefono di non far muovere le animazioni. Vanno bene `.jpg`,
`.png` e `.webp`.

Se non la metti non si rompe niente: al suo posto c'è lo sfondo scuro.

## Una cosa sul caricamento

Questi file vanno **messi nel progetto e salvati con un commit**, come
le altre immagini del sito: è da lì che il server li prende quando va
online. Non basta copiarli sul proprio computer.

## Finché queste cartelle sono vuote

In home resta il video di prima ripetuto sei volte, così la pagina non
sembra rotta. Appena arriva il primo file vero, prende il suo posto.
