# Protocollo bug

## Regola base

Se Giampiero segnala un bug, il bug esiste. Ha già testato. Non dire "è la cache", non dire "il codice è corretto", non dire "aspetta il deploy". Trova la causa.

## Processo obbligatorio

### 1. Leggi prima di toccare
- Traccia il rendering end-to-end del componente incriminato
- Leggi come componenti analoghi (es. 2v2) risolvono lo stesso problema
- Identifica la causa root, non il sintomo

### 2. Fai un report prima di agire
- Descrivi cosa hai trovato
- Spiega perché succede
- Proponi la soluzione
- Aspetta conferma

### 3. Fix chirurgico
- Cambia solo quello che serve
- Non toccare altri componenti senza ordine esplicito
- Verifica TypeScript dopo ogni modifica

### 4. Verifica
- Controlla che il fix non rompa altro
- Conferma che il problema segnalato è risolto nel codice

## Cosa NON fare

- Non dire "è la cache" come prima risposta
- Non aggiungere webkit prefix a caso sperando che risolva
- Non cambiare visual style mentre si debugga un bug di rendering
- Non usare Terminal se GitHub Desktop è aperto
- Non toccare componenti non coinvolti nel bug
